import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import { evidenceRoot, directory, stop } from "./files.mjs";

const [origin, folder, phase] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(origin ?? "") ||
    !folder?.startsWith(evidenceRoot + "/") || !["before", "after", "restored"].includes(phase)) stop("invalid-browser-input", "Invalid local browser run.");
await directory(folder);
const booking = "/bookings/confirmation";
const api = "**/api/booking-status?*";
const text = {
  demonstration: "Your room is confirmed.",
  awaiting: "We are waiting for the reservation to be confirmed.",
  rejected: "We could not find your reservation.",
  cancelled: "This reservation was cancelled.",
};
const notice = page => page.getByText("Receipt ready", { exact: true });
const trigger = page => page.getByRole("button", { name: "Refresh reservation", exact: true });
const condition = (page, ref) => expect(page.getByText(text[ref], { exact: true })).toBeVisible({ timeout: 5000 });
const select = (page, ref) => page.goto(origin + booking + "?booking=" + ref, { waitUntil: "networkidle", timeout: 15000 });
const ids = [];
const record = (name, detail) => ids.push({ name, status: "passed", detail });
const notices = [];

async function context(browser, options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: "block", ...options });
  await ctx.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  ctx.on("page", page => page.on("pageerror", error => notices.push(String(error.message).slice(0, 160))));
  return ctx;
}

async function seedChecks(page) {
  for (const ref of Object.keys(text)) {
    await select(page, ref);
    await condition(page, ref);
    await expect(notice(page)).toHaveCount(0);
    if (ref !== "demonstration") await expect(page.getByText(text.demonstration, { exact: true })).toHaveCount(0);
  }
  record("server-state-matrix", "Confirmed, pending, rejected and cancelled initial states from the fictional server ledger.");
  await page.goto(origin + "/checkout", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Find booking" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Enter your booking reference.");
  await expect(page.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("[data-motionux-source]")).toHaveCount(0);
  record("checkout-stillness", "Validation rendered its original inline error and no provider component.");
}

const percentile = (list, p) => +[...list].sort((a, b) => a - b)[Math.ceil(list.length * p) - 1].toFixed(2);
async function timing(browser) {
  const samples = [];
  for (let i = 0; i < 6; i++) {
    const ctx = await context(browser);
    try {
      await ctx.addInitScript(() => {
        window.fixtureCls = 0;
        if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
          new PerformanceObserver(list => { for (const shift of list.getEntries()) if (!shift.hadRecentInput) window.fixtureCls += shift.value; })
            .observe({ type: "layout-shift", buffered: true });
        }
      });
      const page = await ctx.newPage();
      await select(page, "demonstration");
      const probe = await page.evaluate(async () => {
        const navigation = performance.getEntriesByType("navigation")[0];
        const action = document.querySelector("summary");
        const details = action.parentElement;
        const start = performance.now();
        action.click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (!details.open) throw new Error("Native disclosure failed");
        return { domReadyMs: navigation.domContentLoadedEventEnd, detailFrameMs: performance.now() - start, cls: window.fixtureCls,
          jsBytes: performance.getEntriesByType("resource").filter(item => item.name.includes(".js")).reduce((sum, item) => sum + item.encodedBodySize, 0),
          iframes: document.querySelectorAll("iframe").length };
      });
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Performance.enable");
      const { metrics } = await cdp.send("Performance.getMetrics");
      probe.heapMiB = metrics.find(item => item.name === "JSHeapUsedSize").value / 1024 ** 2;
      if (i) samples.push(probe);
    } finally { await ctx.close(); }
  }
  return Object.fromEntries(Object.keys(samples[0]).map(key => [key, {
    p50: percentile(samples.map(row => row[key]), 0.5), p95: percentile(samples.map(row => row[key]), 0.95),
  }]));
}

async function interactive(page) {
  await select(page, "demonstration");
  await page.keyboard.press("Tab");
  await expect(page.getByText("Room details", { exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByText("Courtyard room", { exact: true })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await page.getByText("Room details", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Courtyard room", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Return to reservation heading" }).focus();
  await page.keyboard.press("Tab");
  await expect(trigger(page)).toBeFocused();
  await page.evaluate(() => { window.fixtureFrameSample = new Promise(resolve => {
    const frames = [];
    const started = performance.now();
    function frame() {
      const node = document.querySelector("[data-motionux-source] ol > li");
      if (node) {
        const style = getComputedStyle(node);
        frames.push({ transform: style.transform, opacity: style.opacity, time: performance.now() - started });
      }
      if (performance.now() - started < 1000) requestAnimationFrame(frame);
      else resolve(frames);
    }
    requestAnimationFrame(frame);
  }); });
  await page.keyboard.press("Enter");
  await expect(notice(page)).toBeVisible();
  const frames = await page.evaluate(() => window.fixtureFrameSample);
  const distinct = new Set(frames.map(row => row.transform + "/" + row.opacity)).size;
  assert.ok(frames.length >= 12 && distinct >= 3, "Expected sampled change across the installed animation");
  await expect(page.getByRole("region", { name: "Notifications" })).toHaveAttribute("aria-live", "polite");
  await expect(trigger(page)).toBeFocused();
  await page.screenshot({ path: resolve(folder, "after-confirmed-animation.png"), fullPage: true });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Dismiss" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(notice(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();
  await trigger(page).press("Space");
  await expect(notice(page)).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).press("Enter");
  await expect(notice(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();
  record("upstream-motion-and-keyboard", "Real provider toast animated after a confirmed API response. Keyboard activation, Escape and native dismissal returned focus.");

  for (const ref of ["awaiting", "rejected", "cancelled"]) {
    await select(page, ref);
    const completed = page.waitForResponse(response => response.url().includes("/api/booking-status"));
    await trigger(page).click();
    assert.equal((await completed).status(), 200);
    await condition(page, ref);
    await expect(page.getByRole("button", { name: "Cancel refresh" })).toHaveCount(0);
    await expect(notice(page)).toHaveCount(0);
  }
  record("api-business-state", "Confirmed, pending, rejected and cancelled API payloads controlled the visible state. Only confirmed opened a receipt toast.");

  await select(page, "demonstration");
  await page.route(api, route => route.abort(), { times: 1 });
  await trigger(page).click();
  await expect(page.getByRole("region", { name: "Reservation updates" }).getByRole("alert")).toHaveText("Status is unavailable. Try refreshing again.");
  await expect(trigger(page)).toBeFocused();
  await expect(notice(page)).toHaveCount(0);
  await trigger(page).click();
  await expect(notice(page)).toBeVisible();
  await page.route(api, route => route.fulfill({ status: 503, json: { error: "Fixture network failure" } }), { times: 1 });
  await trigger(page).click();
  await expect(page.getByRole("region", { name: "Reservation updates" }).getByRole("alert")).toBeVisible();
  await expect(notice(page)).toBeHidden();
  record("network-failure-and-retry", "An aborted network request and HTTP 503 kept confirmation feedback absent. A local API retry succeeded.");

  await select(page, "awaiting");
  let started;
  let release;
  const pending = new Promise(resolve => { started = resolve; });
  const older = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const race = async route => {
    if (++calls === 1) {
      started();
      await older;
      await route.fulfill({ status: 200, json: { status: "confirmed", room: "Courtyard room" } }).catch(() => {});
    } else await route.fulfill({ status: 200, json: { status: "cancelled", room: "Garden room" } });
  };
  await page.route(api, race);
  await trigger(page).click();
  await pending;
  await expect(page.getByText("Checking the latest reservation status.")).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  await trigger(page).click();
  await condition(page, "cancelled");
  release();
  await page.unroute(api, race);
  await condition(page, "cancelled");
  await expect(notice(page)).toHaveCount(0);
  record("stale-api-response", "An older in-flight confirmed response could not override the newest cancelled state.");

  for (const action of ["cancel", "navigate"]) {
    await select(page, "awaiting");
    let unblock;
    let entered;
    const waiting = new Promise(resolve => { unblock = resolve; });
    const intercepted = new Promise(resolve => { entered = resolve; });
    const delayed = async route => { entered(); await waiting; await route.continue().catch(() => {}); };
    await page.route(api, delayed, { times: 1 });
    await trigger(page).click();
    await intercepted;
    if (action === "cancel") {
      await page.getByRole("button", { name: "Cancel refresh" }).click();
      await expect(trigger(page)).toBeFocused();
    } else await page.goto(origin + "/details", { waitUntil: "domcontentloaded" });
    unblock();
    await page.waitForLoadState("networkidle");
    await expect(notice(page)).toHaveCount(0);
  }
  record("cancellation-and-navigation", "Cancelling an in-flight request restored focus. Navigation interrupted the old request without displaying its feedback.");
  return { observedFrames: frames.length, distinctTransformsOrOpacity: distinct,
    averageFrameIntervalMs: +((frames.at(-1).time - frames[0].time) / (frames.length - 1)).toFixed(2) };
}

let browser;
let report;
try {
  browser = await chromium.launch({ args: ["--disable-background-networking"] });
  const ctx = await context(browser);
  const page = await ctx.newPage();
  await seedChecks(page);
  await select(page, "demonstration");
  await page.screenshot({ path: resolve(folder, phase + "-desktop.png"), fullPage: true });
  const palette = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    foreground: getComputedStyle(document.body).color,
    headingFont: getComputedStyle(document.querySelector("h1")).fontFamily,
  }));
  const metrics = phase === "restored" ? null : await timing(browser);
  let animation = null;
  if (phase === "after") {
    animation = await interactive(page);
    await select(page, "demonstration");
    await trigger(page).click();
    await expect(notice(page)).toBeVisible();
  } else await expect(page.locator("[data-motionux-source]")).toHaveCount(0);
  if (phase === "after") {
    // Check the established state after the source's transition, and record the transition separately.
    await expect.poll(() => notice(page).evaluate(element => {
      for (let node = element; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < 0.98) return false;
      }
      return true;
    }), { timeout: 4000 }).toBe(true);
  }
  const a11y = await new AxeBuilder({ page }).analyze();
  const axeViolations = a11y.violations.map(row => row.id);
  assert.deepEqual(axeViolations, phase === "after" ? [] : ["document-title"],
    a11y.violations.flatMap(issue => issue.nodes.map(node => node.failureSummary)).join("\n"));
  record("axe-host-page", phase === "after" ?
    "Zero automated Axe violations with the installed toast visible. Manual assistive-technology acceptance remains open." :
    "Baseline Axe found the existing missing document title. It is fixed in the reviewed integrated copy.");
  await ctx.close();

  if (phase === "after") {
    const stored = await context(browser, { reducedMotion: "reduce" });
    const reduced = await stored.newPage();
    await select(reduced, "demonstration");
    await reduced.getByRole("button", { name: "Refresh reservation" }).click();
    await condition(reduced, "demonstration");
    await expect(reduced.getByRole("button", { name: "Cancel refresh" })).toHaveCount(0);
    await expect(notice(reduced)).toHaveCount(0);
    await stored.close();
    const initial = await context(browser, { javaScriptEnabled: false });
    const initialPage = await initial.newPage();
    await select(initialPage, "demonstration");
    await condition(initialPage, "demonstration");
    await initial.close();
    record("reduced-motion-and-ssr", "Confirmation remained visible with reduced motion and before hydration. The decorative toast was skipped for reduced motion.");
  }
  for (const width of [320, 390]) {
    const mobile = await context(browser, { viewport: { width, height: 740 }, hasTouch: true, isMobile: true });
    const handset = await mobile.newPage();
    await select(handset, "demonstration");
    if (phase === "after") {
      await trigger(handset).tap();
      await expect(notice(handset)).toBeVisible();
    }
    assert.ok(await handset.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await handset.screenshot({ path: resolve(folder, phase + "-touch-" + width + ".png"), fullPage: true });
    if (phase === "after") {
      await handset.getByRole("button", { name: "Dismiss" }).tap();
      await expect(notice(handset)).toBeHidden();
    }
    await mobile.close();
  }
  record("chromium-touch-emulation", "320 and 390 CSS px without horizontal overflow. The integrated source opened and dismissed via tap.");

  const traces = await context(browser);
  await traces.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const traced = await traces.newPage();
  await select(traced, "demonstration");
  if (phase === "after") {
    await trigger(traced).click();
    await expect(notice(traced)).toBeVisible();
  }
  await traces.tracing.stop({ path: resolve(folder, phase + "-trace.zip") });
  await traces.close();
  await browser.close();
  browser = null;

  if (phase === "after") {
    for (const engine of [firefox, webkit]) {
      // Firefox's nested sandbox cannot initialize under the inherited, narrower macOS policy.
      // The outer process sandbox still restricts every engine to the reviewed files and port.
      const env = engine === firefox ? { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: "1",
        MOZ_DISABLE_GMP_SANDBOX: "1", MOZ_DISABLE_RDD_SANDBOX: "1" } : process.env;
      const secondary = await engine.launch({ env });
      try {
        const smoke = await context(secondary);
        const other = await smoke.newPage();
        await select(other, "demonstration");
        await condition(other, "demonstration");
        await trigger(other).click();
        await expect(notice(other)).toBeVisible();
        await smoke.close();
      } finally { await secondary.close(); }
      record(engine.name() + "-smoke", "The production route rendered and the real source displayed after local API confirmation.");
    }
  }
  assert.deepEqual(notices, []);
  report = { phase, checks: ids, palette, metrics, animation, axeViolations, sampleCount: metrics ? 5 : 0 };
} finally {
  await browser?.close();
}
await writeFile(resolve(folder, phase + "-browser.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
