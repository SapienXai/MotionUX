import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { chromium } from "playwright";

const { origin, digest, pages, code, journeys } = JSON.parse(process.env.MOTIONUX_SOURCE_VERIFICATION);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const unauthorized = new Set();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && !url.pathname.startsWith("/api/")) return route.continue();
    unauthorized.add(url.origin + url.pathname);
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.setDefaultTimeout(4500);
  page.on("response", (response) => {
    if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith("/favicon.ico"))
      errors.push(new URL(response.url()).pathname + " returned " + response.status());
  });
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 160)));
  const observed = new Set();
  async function collectInstances(route) {
    if (!code) return;
    for (const item of pages.find((page) => page.route === route)?.instances ?? []) {
      const region = page.locator('[data-instance="' + item.id + '"]');
      if (!await region.count() || !await region.first().isVisible()) continue;
      await expect(region).toHaveCount(1);
      assert.equal(await region.getAttribute("data-source"), item.source, "Source mount identity changed.");
      if (await region.locator("button,input,output,select,[role=tab],[role=spinbutton],[role=slider],textarea").count())
        observed.add(route + "#" + item.id);
    }
  }
  for (const definition of pages) {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(origin + definition.route, { waitUntil: "networkidle" });
    assert(response?.ok(), "A planned route returned an error.");
    assert.equal(response.headers()["x-motionux-document"], digest, "The runtime digest changed.");
    if (!code) for (const item of definition.instances) {
      const region = page.locator('[data-instance="' + item.id + '"]');
      await region.waitFor({ state: "visible" });
      assert.equal(await region.getAttribute("data-kind"), item.kind);
      if (item.kind === "source" || item.kind === "generated")
        assert(await region.locator("button,input,output,select,[role=tab],span,.mx-source-content").count(), "A source instance produced no usable output.");
    }
    await collectInstances(definition.route);
    if (code) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Overflow at " + definition.route + " width " + width);
        await collectInstances(definition.route);
      }
    }
    const layout = await page.evaluate(() => {
      if (document.documentElement.scrollWidth <= innerWidth + 1) return null;
      return [...document.querySelectorAll(".mx-app, .mx-main, .mx-section, .mx-source-mount, .mx-chrome")]
        .filter((node) => node.getBoundingClientRect().right > innerWidth || node.scrollWidth > node.clientWidth + 2)
        .map((node) => [node.className, node.clientWidth, node.scrollWidth]).slice(0, 5);
    });
    assert.equal(layout, null, "The generated route overflows at 390px: " + JSON.stringify(layout));
  }
  let journeySteps = 0;
  if (code) for (const journey of journeys ?? []) {
    await page.goto(origin + journey.route, { waitUntil: "networkidle" });
    for (const step of journey.steps) {
      const target = page.getByRole(step.role, { name: step.name, exact: true });
      try {
        if (step.action === "fill") await target.fill(step.value);
        else if (step.action === "select") await target.selectOption(step.value);
        else if (step.action === "press") await target.press(step.value);
        else await target.click();
        await expect(page.locator("body")).toContainText(step.expected);
        await collectInstances(journey.route);
        journeySteps++;
      } catch (error) {
        assert.fail("Journey " + journey.title + " failed at " + step.name + ": " + error.message.slice(0, 600));
      }
    }
  }
  if (code) for (const definition of pages) for (const item of definition.instances)
    assert(observed.has(definition.route + "#" + item.id), "Source mount never became usable in the declared journeys: " + definition.route + "#" + item.id);
  assert.deepEqual([...unauthorized], [], "The application attempted an unauthorized resource request");
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(JSON.stringify({ routes: pages.length, instances: pages.reduce((n, p) => n + p.instances.length, 0), width: 390, journeySteps, engine: browser.version() }));
} catch (error) {
  console.error("MOTIONUX_VERIFY_DIAGNOSTIC=" + JSON.stringify(error.message.slice(0, 2800)));
  process.exitCode = 1;
} finally {
  await browser.close();
}
