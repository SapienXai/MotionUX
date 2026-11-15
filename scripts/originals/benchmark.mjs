import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const phase = process.argv[2];
if (!["baseline", "current"].includes(phase)) throw new Error("Use baseline or current.");
const output = resolve(".motionux-v9/evidence/v13");
const origin = process.env.MOTIONUX_BENCH_ORIGIN ?? "http://127.0.0.1:5199";
const catalog = await fetch(origin + "/v9/catalog.json").then(response => response.json());
const report = { count: catalog.length, samples: [], stress: [] };
const browser = await chromium.launch();
report.chromium = browser.version();
report.viewport = { width: 1536, height: 1024 };
report.throttle = 2;
const system = await browser.newBrowserCDPSession();
async function rendererRSS() {
  const { processInfo } = await system.send("SystemInfo.getProcessInfo");
  const pids = processInfo.filter(info => info.type === "renderer").map(info => info.id);
  if (!pids.length) return null;
  const result = execFileSync("ps", ["-o", "rss=", "-p", pids.join(",")], { encoding: "utf8" });
  return Number((result.trim().split(/\s+/).reduce((sum, value) => sum + Number(value), 0) / 1024).toFixed(2));
}
const cards = "[data-original-card]";
const live = "[data-original-stage] > [data-preview-lane]";
try {
  for (let sample = 0; sample < 3; sample++) {
    const context = await browser.newContext({ viewport: report.viewport, colorScheme: "light" });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: report.throttle });
    await page.addInitScript(() => {
      if (top !== self) return;
      window.mxScale = { cls: 0, lcp: 0 };
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.mxScale.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.mxScale.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    let peak = 0;
    let requests = 0;
    let scriptBytes = 0;
    page.on("request", request => { if (request.resourceType() === "script") requests++; });
    page.on("response", response => {
      if (response.request().resourceType() === "script") scriptBytes += Number(response.headers()["content-length"] ?? 0);
    });
    page.on("frameattached", () => { peak = Math.max(peak, page.frames().length - 1); });
    const start = performance.now();
    await page.goto(origin);
    await expect(page.locator(cards)).toHaveCount(catalog.length);
    await expect(page.locator('[data-preview-state="ready"]').first()).toBeVisible();
    const firstPreviewMs = Math.round(performance.now() - start);
    await page.waitForTimeout(850);
    // Programmatic search changes the visible layout. Capture navigation metrics first.
    const initial = { requests, scriptBytes, ...await page.evaluate(() => window.mxScale) };
    const search = page.getByRole("searchbox");
    const before = performance.now();
    await search.fill("kokonut wheel picker");
    await expect(page.locator(cards)).toHaveCount(1);
    report.samples.push({ firstPreviewMs, searchMs: Math.round(performance.now()-before), ...initial });
    if (sample === 0) {
      await search.fill("");
      await expect(page.locator(cards)).toHaveCount(catalog.length);
      async function snapshot(pass) {
        await cdp.send("HeapProfiler.collectGarbage");
        const { usedSize } = await cdp.send("Runtime.getHeapUsage");
        report.stress.push({ pass, rootHeapMiB: Number((usedSize / 1024**2).toFixed(2)),
          rendererRSSMiB: await rendererRSS(), live: await page.locator(live).count(), peakDocuments: peak });
      }
      await snapshot(0);
      for (let pass = 1; pass <= 3; pass++) {
        const stages = page.locator("[data-original-stage]");
        for (let i = 0; i < catalog.length; i += 3) {
          await stages.nth(i).evaluate(node => node.scrollIntoView({ block: "center" }));
          if (await page.locator(live).count() > 8) throw new Error("Exceeded eight live cards");
        }
        await page.evaluate(() => scrollTo(0, 0));
        await expect(page.locator('[data-preview-state="ready"]').first()).toBeVisible();
        await snapshot(pass);
      }
    }
    await context.close();
  }
} finally { await browser.close(); }
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "performance-" + phase + ".json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
