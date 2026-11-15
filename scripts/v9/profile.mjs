import { gzipSync } from "node:zlib";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const privateOrigin = "http://127.0.0.1:5199";
const publicServer = await preview({ logLevel: "error", preview: { host: "127.0.0.1", port: 0 } });
const publicOrigin = "http://127.0.0.1:" + publicServer.httpServer.address().port;
const browser = await chromium.launch();
const result = { browser: "Chromium", throttle: 4, profileRuns: [] };

try {
  for (const [width, height] of [[1536, 1024], [768, 1024], [390, 844], [320, 740]]) for (const lane of ["public", "private"]) {
    const origin = lane === "private" ? privateOrigin : publicOrigin;
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: width === 768 || width === 320 ? "dark" : "light",
      reducedMotion: width < 768 ? "reduce" : "no-preference" });
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const scripts = new Set();
    const documents = new Set();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => {
      if (request.resourceType() === "script" && request.url().startsWith(origin)) scripts.add(request.url());
      if (request.resourceType() === "document" && request.url().startsWith(origin)) documents.add(request.url());
    });
    await page.addInitScript(() => {
      if (self !== top) return;
      window.motionuxPerf = { lcp: 0, cls: 0 };
      new PerformanceObserver(list => list.getEntries().forEach(entry => { window.motionuxPerf.lcp = entry.startTime; }))
        .observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) window.motionuxPerf.cls += entry.value;
      })).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(origin);
    await page.locator("[data-card]").first().waitFor();
    await page.locator(lane === "private" ? ".mx-gallery-stage iframe" : ".mx-gallery-stage .mx-demo").first().waitFor();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(450);
    const bytes = async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not measure " + url);
      return gzipSync(Buffer.from(await response.arrayBuffer())).length;
    };
    const [sizes, documentSizes] = await Promise.all([scripts, documents].map(set => Promise.all([...set].map(bytes))));
    const metadata = lane === "private" ? await fetch(origin + "/v9/catalog.json").then(response => response.arrayBuffer()) : null;
    const summary = await page.evaluate(() => ({
      ...window.motionuxPerf, mounted: document.querySelectorAll('[data-preview-mounted="true"]').length,
      iframes: document.querySelectorAll("iframe").length, documentOverflow: document.documentElement.scrollWidth > innerWidth,
    }));
    result.profileRuns.push({ width, height, lane, firstScriptsGzipB: sizes.reduce((a, b) => a + b, 0),
      scriptRequests: sizes.length, briefCatalogGzipB: metadata ? gzipSync(Buffer.from(metadata)).length : 0, errors, ...summary });
    result.profileRuns.at(-1).documentGzipB = documentSizes.reduce((a, b) => a + b, 0);
    await page.close();
  }
  const sweep = await browser.newPage({ viewport: { width: 1536, height: 1024 }, reducedMotion: "reduce" });
  const client = await sweep.context().newCDPSession(sweep);
  await client.send("Performance.enable");
  const heap = async () => {
    const metrics = await client.send("Performance.getMetrics");
    return metrics.metrics.find(metric => metric.name === "JSHeapUsedSize")?.value;
  };
  await sweep.goto(privateOrigin + "/?view=sources");
  await sweep.getByLabel("Live previews").check();
  const more = sweep.getByRole("button", { name: "Show 30 more", exact: true });
  while (await more.isVisible()) await more.click();
  const cards = sweep.locator("[data-original-card]");
  const count = await cards.count();
  const before = await heap();
  await client.send("HeapProfiler.collectGarbage");
  const baselineRetained = await heap();
  let peakFrames = 0;
  const started = performance.now();
  for (let index = 0; index < count; index++) {
    const card = cards.nth(index);
    await card.evaluate(node => node.scrollIntoView({ block: "center" }));
    await card.locator("iframe").waitFor();
    peakFrames = Math.max(peakFrames, await sweep.locator("iframe").count());
  }
  const after = await heap();
  await sweep.evaluate(() => scrollTo(0, 0));
  await sweep.waitForTimeout(300);
  await client.send("HeapProfiler.collectGarbage");
  result.sweep = { visited: count, peakFrames, initialHeapBytes: before, finalHeapBytes: after,
    baselineRetainedBytes: baselineRetained, returnedRetainedBytes: await heap(),
    returnedFrames: await sweep.locator("iframe").count(), elapsedMs: Math.round(performance.now() - started) };
  result.v8 = (JSON.parse(await readFile("docs/evidence/studio-v8/performance.json", "utf8"))).v8;
  await sweep.close();
  await mkdir(".motionux-v9/evidence", { recursive: true });
  await writeFile(".motionux-v9/evidence/performance.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ runs: result.profileRuns, sweep: result.sweep }));
} finally {
  await browser.close();
  await new Promise(resolve => publicServer.httpServer.close(resolve));
}
