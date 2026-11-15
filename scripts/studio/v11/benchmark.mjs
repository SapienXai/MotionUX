import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const phase = process.argv[2];
if (!["baseline", "matched-baseline", "current", "no-cache"].includes(phase)) throw new Error("Choose baseline, current or no-cache.");
const out = resolve(".motionux-v9/evidence/v11", phase);
await mkdir(out, { recursive: true });
const url = process.env.MOTIONUX_BENCH_ORIGIN ?? "http://127.0.0.1:5199/";
const options = { viewport: { width: 1536, height: 1024 }, colorScheme: "light" };
const report = { phase, version: "", samples: [], stress: {} };
const browser = await chromium.launch();
try {
  report.version = browser.version();
  const browserCDP = await browser.newBrowserCDPSession();
  async function rss() {
    try {
      const { processInfo } = await browserCDP.send("SystemInfo.getProcessInfo");
      const pids = processInfo.map(item => item.id).join(",");
      const values = execFileSync("ps", ["-o", "rss=", "-p", pids], { encoding: "utf8" });
      return { processes: processInfo.length, rssMiB: values.trim().split(/\s+/).reduce((sum, value) => sum + Number(value), 0) / 1024 };
    } catch { return null; }
  }
  for (let repeat = 0; repeat < 4; repeat++) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    if (phase === "no-cache") await page.route("**/v11/thumbnails.json", route => route.fulfill({ json: {} }));
    await page.addInitScript(() => {
      if (self !== top) return;
      window.mxBench = { cls: 0, lcp: 0, longEvent: 0 };
      for (const [type, measure] of [
        ["layout-shift", entry => { if (!entry.hadRecentInput) window.mxBench.cls += entry.value; }],
        ["largest-contentful-paint", entry => { window.mxBench.lcp = entry.startTime; }],
        ["event", entry => { window.mxBench.longEvent = Math.max(window.mxBench.longEvent, entry.duration); }],
      ]) if (PerformanceObserver.supportedEntryTypes.includes(type)) {
        new PerformanceObserver(list => list.getEntries().forEach(measure)).observe({ type, buffered: true, ...(type === "event" ? { durationThreshold: 16 } : {}) });
      }
    });
    let all = 0;
    let js = 0;
    let peak = 0;
    page.on("request", request => { all++; if (request.resourceType() === "script") js++; });
    page.on("frameattached", () => { peak = Math.max(peak, page.frames().length - 1); });
    for (const warm of [false, true]) {
      all = js = peak = 0;
      const start = performance.now();
      await page.goto(url, { waitUntil: "commit" });
      await expect(page.locator('[data-preview-state="ready"]').first()).toBeVisible();
      const firstMs = Math.round(performance.now() - start);
      await page.waitForTimeout(700);
      const before = { all, js, peak };
      const begin = performance.now();
      await page.getByRole("searchbox").fill("wheel picker");
      await expect(page.locator("[data-original-card]")).toHaveCount(1);
      const searchMs = Math.round(performance.now() - begin);
      report.samples.push({ warm, firstMs, searchMs, ...before, ...await page.evaluate(() => window.mxBench) });
    }
    if (repeat === 0) {
      const cdp = await context.newCDPSession(page);
      const memory = async () => {
        await cdp.send("HeapProfiler.collectGarbage");
        return (await cdp.send("Runtime.getHeapUsage")).usedSize;
      };
      await page.getByRole("searchbox").fill("");
      const before = await memory();
      const rssBefore = await rss();
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < 140; i += 3) {
          await page.locator("[data-original-stage]").nth(i).evaluate(node => node.scrollIntoView({ block: "center" }));
          await page.waitForTimeout(45);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await expect(page.locator('[data-original-card]').first().locator('[data-preview-state="ready"]')).toBeVisible();
      report.stress = { before, after: await memory(), rssBefore, rssAfter: await rss(), peakDocuments: peak,
        liveCards: await page.locator("[data-original-stage] > [data-preview-lane]").count() };
    }
    await context.close();
  }
  for (const [name, width, height, colorScheme] of [
    ["desktop-light", 1536, 1024, "light"], ["desktop-dark", 1536, 1024, "dark"], ["tablet", 768, 1024, "light"],
    ["mobile", 390, 844, "light"], ["mobile-320", 320, 780, "light"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme });
    await page.goto(url);
    await expect(page.locator('[data-preview-state="ready"]').first()).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(out, name + ".png") });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(out, "benchmark.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
