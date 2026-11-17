import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { chromium } from "playwright";

const { origin, digest, pages, code, journeys } = JSON.parse(process.env.MOTIONUX_SOURCE_VERIFICATION);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.setDefaultTimeout(4500);
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 160)));
  for (const definition of pages) {
    const response = await page.goto(origin + definition.route, { waitUntil: "networkidle" });
    assert(response?.ok(), "A planned route returned an error.");
    assert.equal(response.headers()["x-motionux-document"], digest, "The runtime digest changed.");
    for (const item of definition.instances) {
      const region = page.locator('[data-instance="' + item.id + '"]');
      await region.waitFor({ state: "visible" });
      if (!code) assert.equal(await region.getAttribute("data-kind"), item.kind);
      else assert.equal(await region.getAttribute("data-source"), item.source, "Source mount identity changed.");
      if (item.kind === "source" || item.kind === "generated") {
        assert(await region.locator(code ? "button,input,output,select,[role=tab],[role=spinbutton],[role=slider],textarea" : "button,input,output,select,[role=tab],span,.mx-source-content").count(), "A source instance produced no usable output at " + definition.route + "#" + item.id + ".");
      }
    }
    if (code) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Overflow at " + definition.route + " width " + width);
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
        journeySteps++;
      } catch (error) {
        assert.fail("Journey " + journey.title + " failed at " + step.name + ": " + error.message.slice(0, 600));
      }
    }
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(JSON.stringify({ routes: pages.length, instances: pages.reduce((n, p) => n + p.instances.length, 0), width: 390, journeySteps, engine: browser.version() }));
} finally {
  await browser.close();
}
