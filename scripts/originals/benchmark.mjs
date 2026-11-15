import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { collectGalleryOrder } from "../studio/gallery-checks.mjs";

const phase = process.argv[2];
if (!["baseline", "current", "v13-1-before", "v13-1-after", "scale"].includes(phase)) {
  throw new Error("Use baseline, current, v13-1-before, v13-1-after, or scale.");
}
const modern = phase.startsWith("v13-1") || phase === "scale";
const output = resolve(".motionux-v9/evidence", modern ? "v13-1" : "v13");
const origin = process.env.MOTIONUX_BENCH_ORIGIN ?? "http://127.0.0.1:5199";
const response = await fetch(origin);
assert(response.ok && response.headers.get("x-motionux-studio"), "Run the private Studio before benchmarking.");
const catalog = await fetch(origin + "/v9/catalog.json").then(result => result.json());
const ready = catalog.filter(item => item.availability === "ready");
const browser = await chromium.launch();
const viewport = { width: 1536, height: 1024 };
const host = { platform: platform(), release: release(), architecture: arch(), cpu: cpus()[0].model, cores: cpus().length, memory: totalmem() };
const environment = { host, chromium: browser.version(), viewport, throttle: 2, network: "loopback with no network emulation",
  realCount: ready.length, build: response.headers.get("x-motionux-build"),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() };
const system = await browser.newBrowserCDPSession();
const cards = "[data-original-card]";
const live = "[data-original-stage] > [data-preview-lane] iframe";
const grid = ".mx-originals-grid";
const report = { environment, runs: [] };

async function processMemory() {
  const { processInfo } = await system.send("SystemInfo.getProcessInfo");
  const groups = {};
  for (const { id, type } of processInfo) {
    let rss;
    try { rss = Number(execFileSync("ps", ["-o", "rss=", "-p", String(id)], { encoding: "utf8" }).trim()); }
    catch { continue; } // A renderer may terminate between the two process snapshots.
    const group = groups[type] ??= { processes: 0, rssMiB: 0 };
    group.processes++;
    group.rssMiB += rss / 1024;
  }
  return groups;
}

function syntheticCatalog(count) {
  return Array.from({ length: count }, (_, index) => {
    const sample = catalog[index % catalog.length];
    return { ...sample, id: "scale-fixture-" + index, title: "Synthetic fixture " + index, availability: "unavailable",
      installed: false, demoURL: "#", tags: ["synthetic metadata"], preview: { height: sample.preview.height } };
  });
}

async function configure(context, test) {
  if (test.synthetic) await context.route("**/v9/catalog.json", route => route.fulfill({ json: test.items }));
  if (!test.thumbnails || test.synthetic) await context.route("**/v11/thumbnails.json", route => route.fulfill({ json: {} }));
  await context.addInitScript(() => {
    if (top !== self) return;
    window.mxScale = { lcp: 0, cls: 0, peakCards: 0, peakCost: 0, longTasks: [], shifts: [] };
    const sample = () => {
      const frames = [...document.querySelectorAll("[data-original-stage] > [data-preview-lane] iframe")];
      const cost = frames.reduce((sum, frame) => sum + Number(frame.closest("[data-preview-cost]")?.dataset.previewCost || 1), 0);
      window.mxScale.peakCards = Math.max(window.mxScale.peakCards, document.querySelectorAll("[data-original-card]").length);
      window.mxScale.peakCost = Math.max(window.mxScale.peakCost, cost);
    };
    let frame = 0;
    new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; sample(); });
    }).observe(document, { childList: true, subtree: true });
    for (const [type, record] of [
      ["layout-shift", entry => { if (!entry.hadRecentInput) {
        window.mxScale.cls += entry.value;
        window.mxScale.shifts.push({ value: entry.value, at: entry.startTime, nodes: entry.sources.map(source => source.node?.className) });
      } }],
      ["largest-contentful-paint", entry => { window.mxScale.lcp = entry.startTime; window.mxScale.lcpElement = entry.element?.className; }],
      ["longtask", entry => window.mxScale.longTasks.push(entry.duration)],
    ]) if (PerformanceObserver.supportedEntryTypes.includes(type)) {
      new PerformanceObserver(list => list.getEntries().forEach(record)).observe({ type, buffered: true });
    }
  });
}

async function expectTotal(page, count) {
  const result = page.locator(grid);
  await expect(result).toBeVisible();
  if (await result.getAttribute("data-results") !== null) await expect(result).toHaveAttribute("data-results", String(count));
  else await expect(page.locator(cards)).toHaveCount(count);
}

async function sweep(page, cdp, observeFrames, test) {
  const stress = [];
  async function snapshot(pass) {
    await cdp.send("HeapProfiler.collectGarbage");
    const { usedSize } = await cdp.send("Runtime.getHeapUsage");
    const dom = await cdp.send("Memory.getDOMCounters");
    stress.push({ pass, rootHeapMiB: usedSize / 1024 ** 2, dom, processes: await processMemory(),
      live: await page.locator(live).count(), ...observeFrames() });
  }
  await snapshot(0);
  for (let pass = 1; pass <= 3; pass++) {
    const frameTimes = await page.evaluate(async () => {
      const intervals = [];
      let previous = performance.now();
      for (let tick = 1; tick <= 108; tick++) {
        window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * (tick / 108));
        const now = await new Promise(resolve => requestAnimationFrame(resolve));
        intervals.push(now - previous);
        previous = now;
      }
      window.scrollTo(0, 0);
      return intervals;
    });
    if (!test.synthetic) await expect(page.locator(cards).first().locator('[data-preview-state="ready"]')).toBeVisible();
    await page.waitForTimeout(350);
    await snapshot(pass);
    stress.at(-1).frameTimes = frameTimes;
  }
  return stress;
}

async function rapidJumps(page, observeFrames, count, synthetic) {
  await page.evaluate(async () => {
    const positions = [0, .1, .5, .9, .25, .75, 1];
    for (let jump = 0; jump < 105; jump++) {
      window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * positions[jump % positions.length]);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  });
  const last = page.locator(`${cards}[aria-posinset="${count}"]`);
  await expect(last).toBeVisible();
  if (!synthetic) await expect(last.locator('[data-preview-state="ready"]')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const first = page.locator(`${cards}[aria-posinset="1"]`);
  await expect(first).toBeVisible();
  if (!synthetic) await expect(first.locator('[data-preview-state="ready"]')).toBeVisible();
  const frames = observeFrames();
  assert(frames.attached <= 8 && frames.peakDocuments <= 8);
  await expect(last).toHaveCount(0);
  return { jumps: 105, ...frames };
}

async function benchmark(test) {
  const run = { name: test.name, count: test.items.length, synthetic: test.synthetic, samples: [], stress: [] };
  const samples = test.samples ?? (modern ? 5 : 3);
  for (let repeat = 0; repeat < samples; repeat++) {
    const context = await browser.newContext({ viewport, colorScheme: "light", reducedMotion: test.motion ?? "no-preference" });
    await configure(context, test);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    if (test.trace && repeat === 0) await cdp.send("Performance.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: environment.throttle });
    const attached = new Set();
    let detached = 0, peakDocuments = 0, requests, scriptBytes, thumbnailRequests, firstRequest;
    page.on("frameattached", frame => { attached.add(frame); peakDocuments = Math.max(peakDocuments, attached.size); });
    page.on("framedetached", frame => { if (attached.delete(frame)) detached++; });
    page.on("request", request => {
      if (request.resourceType() === "script") requests++;
      if (request.url().includes("/v11/thumbnails/")) thumbnailRequests++;
      if (!firstRequest && request.url().includes("/v10/preview/")) firstRequest = performance.now();
    });
    page.on("response", response => {
      if (response.request().resourceType() === "script") scriptBytes += Number(response.headers()["content-length"] ?? 0);
    });
    const observeFrames = () => ({ peakDocuments, attached: attached.size, detached, thumbnailRequests });
    try {
      for (const warm of test.warm ? [false, true] : [false]) {
        requests = scriptBytes = thumbnailRequests = 0;
        firstRequest = undefined;
        const start = performance.now();
        await page.goto(origin, { waitUntil: "commit" });
        await expectTotal(page, test.items.length);
        if (!test.synthetic) await page.waitForFunction(() => [...document.querySelectorAll('[data-preview-state="ready"]')]
          .some(element => { const rect = element.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight; }));
        const firstPreviewMs = test.synthetic ? null : performance.now() - start;
        await page.waitForTimeout(850);
        const observed = await page.evaluate(() => ({ ...window.mxScale,
          thumbnailReady: Boolean(document.querySelector(".mx-preview-thumbnail img")?.naturalWidth) }));
        if (test.trace && repeat === 0 && !warm) run.traceMetrics = (await cdp.send("Performance.getMetrics")).metrics;
        const initial = { requests, scriptBytes, thumbnailRequests, firstRequestMs: firstRequest ? firstRequest - start : null, ...observed };
        const search = page.getByRole("searchbox");
        const term = test.synthetic ? "scale-fixture-" + (test.items.length - 1) : "kokonut wheel picker";
        const before = performance.now();
        await search.fill(term);
        await expect(page.locator(cards)).toHaveCount(1);
        const searchMs = performance.now() - before;
        if (test.synthetic && repeat === 0) {
          assert.equal(await page.locator("iframe").count(), 0);
          await search.fill("");
          await page.getByLabel("Sort originals").selectOption("name");
          await expectTotal(page, test.items.length);
          await expect(page.locator(cards).first()).toHaveAttribute("data-original-card", test.items[0].id);
          await page.getByLabel("Sort originals").selectOption("");
          await page.reload();
          await expectTotal(page, test.items.length);
        }
        run.samples.push({ warm, firstPreviewMs, searchMs, ...initial });
        if (repeat === 0 && !warm && test.stress) {
          await search.fill("");
          await expectTotal(page, test.items.length);
          run.stress = await sweep(page, cdp, observeFrames, test);
          if (phase === "v13-1-after" || phase === "scale") {
            assert(run.stress.every(sample => sample.peakDocuments <= 8 && sample.attached <= 8));
            assert(await page.evaluate(() => window.mxScale.peakCost <= 8 && window.mxScale.peakCards <= 48));
            run.stressPeak = await page.evaluate(() => ({ cards: window.mxScale.peakCards, cost: window.mxScale.peakCost }));
            run.rapidJumps = await rapidJumps(page, observeFrames, test.items.length, test.synthetic);
            if (!test.synthetic) {
              await page.waitForTimeout(10000);
              await cdp.send("HeapProfiler.collectGarbage");
              run.idle = { seconds: 10, processes: await processMemory(), ...observeFrames() };
            }
          }
          if (test.synthetic) {
            const visited = await collectGalleryOrder(page, test.items.length);
            assert.deepEqual(new Set(visited), new Set(test.items.map(item => item.id)));
            assert.equal(attached.size + detached, 0, "Synthetic fixtures opened browsing contexts");
            run.reachable = visited.length;
          }
        }
      }
    } finally { await context.close(); }
    console.log(test.name, "sample", repeat + 1, "of", samples);
  }
  return run;
}

try {
  const cases = phase === "scale"
    ? [500, 1000].map(count => ({ name: "synthetic-" + count, synthetic: true, items: syntheticCatalog(count), samples: 5, stress: true }))
    : [
      { name: "cached-thumbnails", items: catalog, thumbnails: true, stress: true, warm: modern, trace: modern },
      ...(modern ? [
        { name: "no-thumbnails", items: catalog, thumbnails: false, samples: 5 },
        { name: "reduced-motion", items: catalog, thumbnails: true, motion: "reduce", samples: 5 },
      ] : []),
    ];
  for (const test of cases) report.runs.push(await benchmark(test));
} finally {
  await browser.close();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "performance-" + phase + ".json"), JSON.stringify(report, null, 2) + "\n");
}
