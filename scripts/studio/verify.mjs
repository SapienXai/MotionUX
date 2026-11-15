import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { editionGroups } from "../v12/sources.mjs";
import { visibleSource } from "./rendering.mjs";
import { compareSources, comparisonIds } from "./compare.mjs";

const origin = "http://127.0.0.1:5199";
const evidence = resolve(".motionux-v9/evidence/v10");
const galleryOnly = process.argv.includes("--gallery-only");
const report = { gallery: [], deepLinks: [], browsers: [], comparisons: [], failures: [] };
const base = { viewport: { width: 1536, height: 1024 } };
const cards = "[data-original-card]";
const ready = '[data-preview-state="ready"]';
const preview = item => '[data-card="' + item.id + '"]';
const lane = name => '[data-preview-lane="' + name + '"]';
const localSources = async () => {
  try {
    const response = await fetch(origin + "/v9/catalog.json");
    if (response.ok) return await response.json();
  } catch { /* Print the launch command below. */ }
  throw new Error("Launch the private app with npm run studio before running npm run studio:verify.");
};
const originals = await localSources();
assert(originals.every(item => typeof item.sourceKind === "string"), "Restart the private server using npm run studio.");
const ids = originals.map(item => item.id);
const total = originals.length;
assert.equal(new Set(ids).size, total);
assert.equal(originals.filter(item => !editionGroups.includes(item.group)).length, 140);
assert.equal(originals.filter(item => item.legacyId).length, 82);
assert.equal(originals.filter(item => item.installed && item.availability === "ready").length, total);
assert.equal(originals.filter(item => item.sourceKind === "html").length, 50);
await mkdir(evidence, { recursive: true });

async function stage(name, task) {
  try { await task(); }
  catch (error) {
    report.failures.push({ stage: name, error: error.message });
    console.error(name + ": " + error.message);
  }
}

const browser = await chromium.launch();
try {
  await stage("Gallery", () => gallery(browser));
  await stage("Playground links", () => deepLinks(browser));
  if (!galleryOnly) {
    await stage("Chromium layouts", () => responsive(browser));
    await stage("Navigation and install", () => navigation(browser));
    await stage("Comparisons", async () => { report.comparisons = await compareSources(browser, originals, { origin, evidence }); });
    for (const engine of [firefox, webkit]) {
      await stage(engine.name() + " layouts", async () => {
        const instance = await engine.launch();
        try { await responsive(instance); }
        finally { await instance.close(); }
      });
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(evidence, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("Public CI: independent of this run. Check GitHub Actions for the pushed commit.");
  console.log(`Private Studio Gallery: ${report.gallery.filter(row => !row.error).length}/${total} mounted, ${report.deepLinks.filter(row => !row.error).length}/${total} deep links loaded.`);
  console.log(`Original source acceptance: ${report.comparisons.filter(row => !row.error).length} sampled visual comparisons, ${report.comparisons.filter(row => row.statesMatch).length} matched interaction endpoints; full source acceptance pending.`);
  console.log("Evidence directory:", evidence);
}
const errors = [...report.gallery, ...report.deepLinks, ...report.comparisons].filter(row => row.error);
for (const row of errors) console.error(row.id + ": " + row.error);
if (errors.length || report.failures.length || (!galleryOnly && report.comparisons.length !== comparisonIds.length)) process.exitCode = 1;

async function gallery(browser) {
  const page = await browser.newPage(base);
  const requests = new Map();
  const browserErrors = [];
  let peakPreviewDocuments = 0;
  page.on("frameattached", () => { peakPreviewDocuments = Math.max(peakPreviewDocuments, page.frames().length - 1); });
  page.on("response", response => {
    if (response.request().resourceType() === "script") requests.set(response.url(), (requests.get(response.url()) ?? 0) + 1);
    if (response.status() >= 400 && response.url().startsWith(origin)) browserErrors.push(response.status() + " " + new URL(response.url()).pathname);
  });
  page.on("pageerror", error => browserErrors.push(error.message));
  await page.addInitScript(() => {
    if (self !== top) return;
    window.studioMetrics = { cls: 0, lcp: 0, maxEvent: 0, peak: 0 };
    function observe(type, update, options = {}) {
      if (PerformanceObserver.supportedEntryTypes.includes(type)) {
        new PerformanceObserver(list => list.getEntries().forEach(update)).observe({ type, buffered: true, ...options });
      }
    }
    observe("layout-shift", entry => { if (!entry.hadRecentInput) window.studioMetrics.cls += entry.value; });
    observe("largest-contentful-paint", entry => { window.studioMetrics.lcp = entry.startTime; });
    observe("event", entry => { window.studioMetrics.maxEvent = Math.max(entry.duration, window.studioMetrics.maxEvent); }, { durationThreshold: 16 });
    new MutationObserver(() => {
      window.studioMetrics.peak = Math.max(window.studioMetrics.peak, document.querySelectorAll("[data-original-card] iframe").length);
    }).observe(document, { childList: true, subtree: true });
  });
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  const heap = async () => {
    await client.send("HeapProfiler.collectGarbage");
    return Math.round((await client.send("Runtime.getHeapUsage")).usedSize / 1024 / 1024 * 100) / 100;
  };
  const start = performance.now();
  await page.goto(origin);
  await expect(page.locator(cards)).toHaveCount(total);
  await expect(page.locator(ready).first()).toBeVisible();
  const firstPreviewMs = Math.round(performance.now() - start);
  const cold = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return { ttfb: Math.round(nav.responseStart), domContentLoaded: Math.round(nav.domContentLoadedEventEnd) };
  });
  const coldRequests = [...requests.values()].reduce((total, count) => total + count, 0);
  const beforeSweep = await heap();
  assert.deepEqual((await page.locator(cards).evaluateAll(nodes => nodes.map(node => node.dataset.card))).sort(), [...ids].sort());
  assert.equal(await page.locator("[data-preview-mounted], input[type=checkbox]").count(), 0);

  const initialOrder = await page.locator(cards).evaluateAll(nodes => nodes.map(node => node.dataset.card));
  const byId = new Map(originals.map(item => [item.id, item]));
  await page.evaluate(() => document.documentElement.style.scrollBehavior = "auto");
  for (const id of initialOrder) {
    const item = byId.get(id);
    try {
      const card = page.locator(preview(item));
      const stage = card.locator("[data-original-stage]");
      await stage.evaluate(node => node.scrollIntoView({ block: "center" }));
      const rendered = await visibleSource(card.locator(lane("studio")), item);
      report.gallery.push({ id, sourceHash: item.upstreamHash, ...rendered });
    } catch (error) {
      report.gallery.push({ id, error: error.message.split("\n").slice(0, 5).join(" ") });
    }
  }
  const atBottom = await heap();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(cards).first().locator(ready)).toBeVisible();
  await expect(page.locator(cards).last().locator("iframe")).toHaveCount(0);
  const backAtTop = await heap();
  // Repeat long jumps to expose retained browsing contexts and unbounded setup work.
  for (let pass = 0; pass < 4; pass++) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(cards).last().locator(ready)).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(cards).first().locator(ready)).toBeVisible();
  }
  const afterRepeatedScroll = await heap();
  const beforeAction = performance.now();
  const morph = page.locator('[data-card="designbookmark-morph-island"]').frameLocator("iframe").frameLocator("iframe");
  await morph.getByRole("button", { name: "Call", exact: true }).click();
  await expect(morph.getByRole("button", { name: "Call", exact: true })).toHaveAttribute("aria-pressed", "true");
  const nestedActionMs = Math.round(performance.now() - beforeAction);
  await page.getByRole("searchbox").fill("electric border");
  await expect(page.locator(cards)).toHaveCount(1);
  await expect(page.locator(ready)).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await expect(page.locator(cards)).toHaveCount(total);
  const metrics = await page.evaluate(() => window.studioMetrics);
  report.performance = { ...cold, firstPreviewMs, coldRequests, ...metrics, nestedActionMs,
    peakPreviewDocuments, jsRequests: [...requests.values()].reduce((a, b) => a + b, 0), distinctJS: requests.size,
    heapMiB: { beforeSweep, atBottom, backAtTop, afterRepeatedScroll }, browserErrors };
  assert(metrics.peak > 0 && metrics.peak <= 8, "The Gallery exceeds the eight-frame mount budget.");
  assert.equal(browserErrors.length, 0, browserErrors.join("\n"));
  console.log(`Gallery sweep finished with ${report.gallery.filter(row => !row.error).length} mounted previews.`);
  await page.close();
}

async function deepLinks(browser) {
  const pages = await Promise.all(Array.from({ length: 3 }, () => browser.newPage(base)));
  await Promise.all(pages.map(async (page, index) => {
    try {
      for (const item of originals.filter((_, position) => position % pages.length === index)) {
        const errors = [];
        const onError = error => errors.push(error.message);
        page.on("pageerror", onError);
        try {
          await page.goto(origin + "/?item=" + item.id, { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("heading", { name: item.title, exact: true, level: 1 })).toBeVisible({ timeout: 6000 });
          assert.equal(await page.locator("#specimen").getAttribute("aria-label"), item.title + " source Playground");
          await visibleSource(page.locator(lane("studio")), item);
          assert.deepEqual(errors, []);
          report.deepLinks.push({ id: item.id, sourceHash: item.upstreamHash });
        } catch (error) {
          report.deepLinks.push({ id: item.id, error: error.message.split("\n")[0] });
        } finally { page.off("pageerror", onError); }
      }
    } finally { await page.close(); }
  }));
  console.log(`Deep-link sweep finished with ${report.deepLinks.filter(row => !row.error).length} working routes.`);
}

async function responsive(browser) {
  const name = browser.browserType().name();
  const viewports = [
    ["desktop-light", 1536, 1024, "light", 3], ["desktop-dark", 1536, 1024, "dark", 3],
    ["tablet", 768, 1024, "light", 2], ["mobile", 390, 844, "light", 1],
  ];
  for (const [label, width, height, colorScheme, columns] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme, hasTouch: width <= 768 });
    try {
      await page.goto(origin);
      await expect(page.locator(cards)).toHaveCount(total);
      await expect(page.locator(cards).first().locator(ready)).toBeVisible();
      const fit = await page.locator(".mx-originals-grid").evaluate(node => ({
        columns: getComputedStyle(node).gridTemplateColumns.split(" ").length,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      }));
      assert.deepEqual(fit, { columns, horizontalOverflow: 0 });
      if (width < 1200) {
        await page.getByRole("button", { name: "Open menu" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("button", { name: "Close menu" }).click();
        await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
        if (width === 390 && name !== "firefox") {
          const call = page.locator('[data-card="designbookmark-morph-island"]').frameLocator("iframe").frameLocator("iframe")
            .getByRole("button", { name: "Call", exact: true });
          await call.tap();
          await expect(call).toHaveAttribute("aria-pressed", "true");
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      }
      if (name === "chromium") {
        await expect(page.locator(cards).nth(width > 1024 ? 5 : width > 480 ? 3 : 1).locator(ready)).toBeVisible();
        await page.screenshot({ path: resolve(evidence, label + ".png") });
      }
      report.browsers.push({ engine: name, width, colorScheme, ...fit });
    } finally { await page.close(); }
  }
}

async function navigation(browser) {
  const page = await browser.newPage(base);
  const search = page.getByRole("searchbox");
  try {
    await page.goto(origin);
    await expect(page.locator(cards)).toHaveCount(total);
    for (const provider of [...new Set(originals.map(item => item.provider))]) {
      await page.getByLabel("Provider", { exact: true }).selectOption(provider);
      const expected = originals.filter(item => item.provider === provider);
      await expect(page.locator(cards)).toHaveCount(expected.length);
    }
    await page.getByLabel("Provider", { exact: true }).selectOption("");
    await page.getByLabel("Source kind").selectOption("html");
    await expect(page.locator(cards)).toHaveCount(50);
    await page.getByLabel("Source kind").selectOption("react");
    await expect(page.locator(cards)).toHaveCount(total - 50);
    await page.getByRole("link", { name: "Inputs", exact: true }).click();
    await expect(page.locator(cards)).toHaveCount(originals.filter(item => item.sourceKind === "react" && item.category === "Inputs").length);
    await page.getByRole("link", { name: "All originals", exact: true }).click();
    await page.getByLabel("Source kind").selectOption("");
    await page.getByLabel("Sort originals").selectOption("name");
    await expect(page.locator(cards).first().locator("h2")).toHaveText([...originals].sort((a, b) => a.title.localeCompare(b.title))[0].title);
    await search.fill("no match for this phrase");
    await expect(page.getByRole("heading", { name: "No components found" })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator(cards)).toHaveCount(total);
    await search.fill("electric border");
    await expect(page.locator(cards)).toHaveCount(1);
    const newSource = page.locator('[data-original-card="reactbits-electric-border"]');
    await newSource.getByRole("link", { name: /^Open playground/ }).click();
    await expect(page.locator(lane("studio")).locator("iframe")).toHaveAttribute("src", /\/v10\/preview\/reactbits-electric-border\?/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "ElectricBorder", exact: true })).toBeVisible();
    await page.goBack();
    await expect(search).toHaveValue("electric border");
    await expect(newSource.locator("h2 > a")).toBeFocused();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "ElectricBorder", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Gallery", exact: true }).last().click();
    await search.fill("");
    const target = page.locator(cards).nth(55);
    await target.scrollIntoViewIfNeeded();
    const scrollAt = await page.evaluate(() => window.scrollY);
    await target.locator("h2 a").click();
    await page.goBack();
    await expect(target.locator("h2 a")).toBeFocused();
    assert(Math.abs(scrollAt - await page.evaluate(() => window.scrollY)) < 220, "The gallery scroll position was lost.");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("link", { name: "Legacy V8", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Legacy V8", exact: true })).toBeVisible();
    await expect(page.locator("[data-card]")).toHaveCount(82);
    await expect(page.locator(cards)).toHaveCount(0);
    await page.goto(origin + "/?item=designbookmark-plan-switch&legacy=1");
    await expect(page.locator(lane("studio"))).toHaveCount(0);
    await page.goto(origin + "/?item=unprepared-source");
    await expect(page.getByRole("heading", { name: "Original unavailable" })).toBeVisible();

    await page.route("**/v10/preview/designbookmark-morph-island?*", route => route.fulfill({ status: 404, body: "unavailable" }), { times: 1 });
    await page.goto(origin);
    const broken = page.locator(preview({ id: "designbookmark-morph-island" }));
    await expect(broken.getByText("Preview unavailable")).toBeVisible();
    await broken.getByRole("button", { name: "Retry" }).click();
    await expect(broken.locator(ready)).toBeVisible();

    const samples = [...new Set(originals.map(item => item.provider))]
      .map(provider => originals.find(item => item.provider === provider));
    samples.push(originals.find(item => item.id === "designbookmark-command-button"));
    for (const item of samples) {
      await page.goto(origin);
      await search.fill(item.id.replaceAll("-", " "));
      const card = page.locator(preview(item));
      await card.getByRole("link", { name: "Code for " + item.title }).click();
      await expect(page.getByRole("region", { name: "Upstream code" })).not.toBeEmpty();
      await page.getByLabel("Version").selectOption("installed");
      await expect(page.getByRole("region", { name: "Installed code" })).not.toBeEmpty();
      await page.getByRole("button", { name: "Usage", exact: true }).click();
      const html = item.sourceKind === "html";
      await expect(page.getByRole("region", { name: html ? "HTML iframe host usage" : "React usage" }))
        .toContainText(html ? "import HTMLPreview" : "import");
      await page.getByRole("button", { name: "Install", exact: true }).click();
      const install = await page.getByRole("link", { name: "Download registry item" }).getAttribute("href");
      const recipe = await page.request.get(origin + install).then(response => response.json());
      assert(recipe.files.length && recipe.files.some(file => file.content?.includes("export")));
      assert.equal(recipe.files.some(file => file.path.endsWith(".html")), html);
      if (html) assert(recipe.files.some(file => file.path.endsWith(".tsx") && file.content.includes('sandbox="allow-scripts"')));
      await page.getByRole("button", { name: "Evidence", exact: true }).click();
      await expect(page.getByText(/Source acceptance is pending/)).toBeVisible();
    }
    await page.goto(origin + "/?view=sources");
    await expect(page.getByRole("heading", { name: "Discovery", exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(/^\d+ candidates$/);
    const candidateCount = await page.getByRole("status").innerText();
    await search.fill("electricborder");
    await expect(page.getByRole("link", { name: /ElectricBorder/ })).toHaveCount(0);
    report.navigation = { providers: samples.length - 1, formats: 2, searchAndHistory: true, retry: true, candidateCount };
  } finally { await page.close(); }
}
