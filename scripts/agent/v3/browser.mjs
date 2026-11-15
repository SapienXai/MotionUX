import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { directory } from "../v2/files.mjs";
import { output } from "./workspace.mjs";

const [origin, route, fixture, phase, logs, mode] = process.argv.slice(2);
assert(/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(origin));
assert(["/details", "/"].includes(route) && ["next", "vite"].includes(fixture));
assert(["before", "after", "restored"].includes(phase) && logs.startsWith(output + "/runs/"));
await directory(logs);
const integrated = phase === "after";
const checks = [];
const faults = [];
const record = name => checks.push({ name, status: "passed" });
const isNext = fixture === "next";
const title = isNext ? "Konaklama bilgileri" : "Başlangıç saatini seç";
const nextLabel = "Giriş ve anahtar teslimi hakkında ayrıntılar";
const pickerLabel = "Atölye için tercih ettiğiniz başlama saati";
const option = "10:00";

async function pageOf(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: "block", ...opts });
  await ctx.route("**/*", request => {
    if (new URL(request.request().url()).origin === origin) return request.continue();
    faults.push("external-request");
    return request.abort();
  });
  const page = await ctx.newPage();
  page.on("pageerror", error => faults.push(String(error.message).slice(0, 160)));
  page.on("console", msg => { if (msg.type() === "error" && /hydrati|did not match/i.test(msg.text())) faults.push("hydration"); });
  page.on("response", res => { if (res.status() >= 400 && ["document", "script", "stylesheet"].includes(res.request().resourceType())) faults.push("required-request"); });
  await page.addInitScript(() => {
    window.motionuxPerf = { lcp: null, cls: 0 };
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.motionuxPerf.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.motionuxPerf.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
  const response = await page.goto(origin + route, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return { ctx, page };
}

const control = page => isNext ? integrated ? page.getByRole("button", { name: nextLabel }) : page.locator("summary").first() :
  page.getByRole(integrated ? "spinbutton" : "combobox", { name: pickerLabel });
async function checkAction(page, touch = false, pointer = false) {
  const input = control(page);
  if (isNext) {
    if (touch) await input.tap();
    else { await input.focus(); await input.press("Enter"); }
    await expect(page.getByText("Oda anahtarı", { exact: false })).toBeVisible();
    if (integrated) await expect(input).toHaveAttribute("aria-expanded", "true");
  } else {
    if ((touch || pointer) && integrated) {
      const box = await input.boundingBox();
      assert(box);
      await input[touch ? "tap" : "click"]({ position: { x: box.width / 2, y: box.height / 2 + 34 } });
    } else if (integrated) { await input.focus(); await input.press("ArrowUp"); }
    else await input.selectOption("10");
    await expect(page.locator("main strong")).toHaveText(option);
    if (integrated) await expect(input).toHaveAttribute("aria-valuetext", option);
  }
  if (!touch && !pointer && (isNext || integrated)) await expect(input).toBeFocused();
}
async function sample(page, action) {
  await page.evaluate(() => {
    window.motionuxFrames = new Promise(done => {
      const rows = [];
      function capture(time) {
        const elements = document.querySelectorAll('[data-slot="accordion-panel"], [role="spinbutton"] div[style*="preserve-3d"]');
        rows.push([time, [...elements].slice(0, 8).map(node => {
          const style = getComputedStyle(node);
          return [style.transform, style.opacity, style.height, style.maskImage].join("/");
        }).join("|")]);
        if (rows.length < 34) requestAnimationFrame(capture);
        else done(rows);
      }
      requestAnimationFrame(capture);
    });
  });
  await action();
  const frames = await page.evaluate(() => window.motionuxFrames);
  const interval = frames.slice(1).map(([time], index) => time - frames[index][0]).sort((a, b) => a - b);
  return { frames: frames.length, unique: new Set(frames.map(row => row[1])).size, p95FrameMs: interval[Math.ceil(interval.length * .95) - 1] };
}
async function timing(browser, ctx, page) {
  const devtools = await ctx.newCDPSession(page);
  await devtools.send("Performance.enable");
  const system = await browser.newBrowserCDPSession();
  const metrics = Object.fromEntries((await devtools.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
  const renderers = (await system.send("SystemInfo.getProcessInfo")).processInfo.filter(row => row.type === "renderer");
  return { ...await page.evaluate(() => ({
    ...window.motionuxPerf, startupMs: performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd,
    jsBytes: performance.getEntriesByType("resource").filter(row => row.initiatorType === "script" || /\.js(?:\?|$)/.test(row.name))
      .reduce((sum, row) => sum + row.encodedBodySize, 0),
    background: getComputedStyle(document.body).backgroundColor, foreground: getComputedStyle(document.body).color,
  })), rendererCpuSeconds: renderers.reduce((sum, row) => sum + row.cpuTime, 0), heapBytes: metrics.JSHeapUsedSize, rendererRssKiB: null, rendererRssStatus: "unknown-under-process-sandbox" };
}

let browser;
try {
  browser = await chromium.launch({ args: ["--disable-background-networking"] });
  const { ctx, page } = await pageOf(browser);
  await ctx.tracing.start({ screenshots: false, snapshots: true, sources: false });
  const measured = await timing(browser, ctx, page);
  const frames = await sample(page, () => checkAction(page, false, !isNext && integrated));
  if (integrated) {
    assert(frames.frames >= 12 && frames.unique >= 4, "No sampled visual progression from the upstream component");
    record("rendered-animation");
  }
  assert.deepEqual((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(row => row.id), []);
  if (isNext) {
    await control(page).press("Space");
    await expect(page.getByText("Oda anahtarı", { exact: false })).toBeHidden();
    await control(page).press("Enter");
    await expect(page.getByText("Oda anahtarı", { exact: false })).toBeVisible();
    await page.screenshot({ path: resolve(logs, phase + "-desktop.png"), fullPage: true });
    await page.getByRole("link", { name: "İletişim bilgileri" }).click();
    await expect(page.locator("#contact")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Geçerli bir e-posta adresi girin.")).toBeVisible();
    await expect(page.getByRole("spinbutton")).toHaveCount(0);
    record("checkout-stillness");
  } else {
    await page.screenshot({ path: resolve(logs, phase + "-desktop.png"), fullPage: true });
    if (integrated) {
      await control(page).press("ArrowUp");
      await expect(page.locator("main strong")).toHaveText("11:00");
      await expect(control(page)).toBeFocused();
      await control(page).press("End");
      await expect(page.locator("main strong")).toHaveText("14:00");
      await control(page).press("Home");
      await expect(page.locator("main strong")).toHaveText("08:00");
    }
  }
  assert.deepEqual((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(row => row.id), []);
  record("keyboard-focus-and-axe");
  if (isNext) {
    const ssr = await pageOf(browser, { javaScriptEnabled: false });
    await expect(ssr.page.getByRole("heading", { name: title })).toBeVisible();
    await ssr.ctx.close();
    record("next-ssr");
  }
  await ctx.tracing.stop({ path: resolve(logs, phase + "-trace.zip") });
  await ctx.close();
  for (const width of [320, 390]) {
    const touch = await pageOf(browser, { viewport: { width, height: 780 }, hasTouch: true, isMobile: true, colorScheme: width === 320 ? "dark" : "light" });
    await checkAction(touch.page, isNext || integrated);
    assert(await touch.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await touch.ctx.close();
    record("touch-" + width);
  }
  if (integrated) {
    const reduced = await pageOf(browser, { reducedMotion: "reduce" });
    const still = await sample(reduced.page, () => checkAction(reduced.page, false, !isNext));
    assert(still.unique <= 3, "Reduced-motion transition did not settle immediately: " + still.unique);
    await reduced.ctx.close();
    record("reduced-motion");
  }
  await browser.close();
  browser = null;
  if (integrated) {
    for (const engine of [firefox, webkit]) {
      const env = engine === firefox ? { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: "1", MOZ_DISABLE_GMP_SANDBOX: "1", MOZ_DISABLE_RDD_SANDBOX: "1" } : process.env;
      const other = await engine.launch({ env });
      try {
        const { ctx: context, page: secondary } = await pageOf(other);
        await checkAction(secondary);
        await context.close();
        record(engine.name() + "-interaction");
      } finally { await other.close(); }
    }
  }
  assert.deepEqual(faults, [], "Hydration or required resource failures");
  if (mode === "fault") assert.fail("Controlled browser acceptance failure");
  await writeFile(resolve(logs, phase + "-browser.json"), JSON.stringify({ checks, measured, frames, unavailable: ["physical-device", "manual-screen-reader", "rtl", "live-backend"] }) + "\n", { flag: "wx", mode: 0o600 });
} finally {
  await browser?.close();
}
