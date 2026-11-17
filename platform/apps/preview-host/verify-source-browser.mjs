import { hasRenderedSource, performSourceStep } from "./source-target.mjs";
import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import { galleryOrigin } from "../../../scripts/studio/build-local-sources.mjs";

const { origin, digest, pages, code, journeys, localFrames = [] } = JSON.parse(process.env.MOTIONUX_SOURCE_VERIFICATION);
const frameByID = new Map(localFrames.map((frame) => [frame.id, frame]));
const frameByURL = new Map(localFrames.map((frame) => [frame.url, frame]));
function localFrameRequest(request, url) {
  if (url.origin !== galleryOrigin || !frameByURL.size) return false;
  if (request.isNavigationRequest()) return frameByURL.has(url.href);
  let owner;
  try { owner = request.frame().url(); } catch { return false; }
  const frame = frameByURL.get(owner);
  if (!frame) return false;
  const prefix = `/v9/live/${frame.group}/original/`;
  return url.pathname.startsWith(prefix) && /^[a-f0-9]{36}\/assets\//.test(url.pathname.slice(prefix.length));
}
const browser = await chromium.launch();
try {
  const errors = [];
  const unauthorized = new Set();
  async function scenario(width, reducedMotion = "reduce") {
    const context = await browser.newContext({ serviceWorkers: "block", viewport: { width, height: 1000 }, reducedMotion });
    await context.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin && !url.pathname.startsWith("/api/")) return route.continue();
      if (localFrameRequest(request, url)) return route.continue();
      unauthorized.add(url.origin + url.pathname);
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(4500);
    page.on("response", (response) => {
      if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith("/favicon.ico"))
        errors.push(new URL(response.url()).pathname + " returned " + response.status());
    });
    page.on("pageerror", (error) => errors.push(error.message.slice(0, 160)));
    return { context, page };
  }
  let { context, page } = await scenario(390);
  const observed = new Set();
  async function collectInstances(route) {
    if (!code) return;
    for (const item of pages.find((page) => page.route === route)?.instances ?? []) {
      const region = page.locator('[data-instance="' + item.id + '"]');
      if (!await region.count() || !await region.first().isVisible()) continue;
      await expect(region).toHaveCount(1);
      assert.equal(await region.getAttribute("data-source"), item.source, "Source mount identity changed.");
      const local = frameByID.get(item.source);
      if (local) {
        const original = region.locator('[data-local-source-frame="ready"] iframe');
        await expect(original).toHaveAttribute("src", local.url);
        await expect(original).toHaveAttribute("sandbox", "allow-scripts");
        observed.add(route + "#" + item.id);
        continue;
      }
      const rendered = await hasRenderedSource(region);
      if (rendered) observed.add(route + "#" + item.id);
    }
  }
  async function assertAccessible(route, width) {
    await page.evaluate(async () => {
      const deadline = performance.now() + 1500;
      while (performance.now() < deadline) {
        const fading = document.getAnimations().filter((animation) => animation.playState === "running" &&
          animation.effect?.getTiming().iterations !== Infinity && animation.effect?.getKeyframes().some((frame) => "opacity" in frame));
        if (!fading.length) break;
        await Promise.race([Promise.allSettled(fading.map((animation) => animation.finished)), new Promise((done) => setTimeout(done, 80))]);
      }
    });
    const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
      .filter(({ impact }) => impact === "critical" || impact === "serious");
    const details = [];
    for (const violation of violations.slice(0, 3)) for (const node of violation.nodes.slice(0, 3)) {
      const selector = node.target[0];
      const text = typeof selector === "string" ? await page.locator(selector).first().evaluate((element) => ({
        visibleText: element.innerText, textContent: element.textContent, ariaLabel: element.getAttribute("aria-label"),
      })).catch(() => null) : null;
      details.push({ rule: violation.id, html: node.html.slice(0, 400), text, failure: node.failureSummary });
    }
    assert.equal(violations.length, 0, "Accessibility at " + route + " width " + width + ": " + JSON.stringify(details));
  }
  for (const mode of code ? ["reduce", "no-preference"] : ["reduce"]) {
    await context.close();
    ({ context, page } = await scenario(390, mode));
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
          if (width === 390 || width === 1440) {
            await assertAccessible(definition.route, width);
          }
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
  }
  let journeySteps = 0;
  if (code) for (const journey of journeys ?? []) {
    await context.close();
    const pointer = journey.steps.some(({ action }) => ["hover", "drag", "wheel"].includes(action));
    ({ context, page } = await scenario(1440, pointer ? "no-preference" : "reduce"));
    await page.goto(origin + journey.route, { waitUntil: "networkidle" });
    for (const step of journey.steps) {
      try {
        const target = await performSourceStep(page, step);
        if (["fill", "select"].includes(step.action)) await expect(target).toHaveValue(step.value);
        await expect(page.locator("body")).toContainText(step.expected, { useInnerText: true });
        await collectInstances(journey.route);
        journeySteps++;
      } catch (error) {
        assert.fail("Journey " + journey.title + " failed at " + step.name + ": " + error.message.slice(0, 600));
      }
    }
    await assertAccessible(journey.route, 1440);
  }
  if (code) for (const definition of pages) for (const item of definition.instances)
    assert(observed.has(definition.route + "#" + item.id), "Source mount never became usable in the declared journeys: " + definition.route + "#" + item.id);
  assert.deepEqual([...unauthorized], [], "The application attempted an unauthorized resource request");
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(JSON.stringify({ routes: pages.length, instances: pages.reduce((n, p) => n + p.instances.length, 0), width: 390, journeySteps, motionModes: code ? 2 : 1, engine: browser.version() }));
} catch (error) {
  console.error("MOTIONUX_VERIFY_DIAGNOSTIC=" + JSON.stringify(error.message.slice(0, 2800)));
  process.exitCode = 1;
} finally {
  await browser.close();
}
