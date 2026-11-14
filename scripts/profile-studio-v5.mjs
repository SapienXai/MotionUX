import { chromium } from "playwright";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";

const origin = process.env.MOTIONUX_V5_URL ?? "http://127.0.0.1:4193";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
const client = await page.context().newCDPSession(page);
await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const requested = new Set();
const errors = [];
page.on("request", request => { if (request.resourceType() === "script" && request.url().startsWith(origin)) requested.add(new URL(request.url()).pathname); });
page.on("pageerror", error => errors.push(error.message));
await page.addInitScript(() => {
  const metrics = { lcp: 0, shifts: [], events: [], long: [] };
  window.profileStudio = metrics;
  const watch = (type, apply, options = {}) => {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
    new PerformanceObserver(list => list.getEntries().forEach(apply)).observe({ type, buffered: true, ...options });
  };
  watch("largest-contentful-paint", entry => { metrics.lcp = entry.startTime; });
  watch("layout-shift", entry => { if (!entry.hadRecentInput) metrics.shifts.push(entry.value); });
  watch("longtask", entry => metrics.long.push(entry.duration));
  watch("event", entry => { if (entry.interactionId) metrics.events.push(entry.duration); }, { durationThreshold: 16 });
});
try {
  await page.goto(origin);
  await page.locator(".mx-feature").nth(5).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const first = [...requested];
  const js = await Promise.all(first.map(async path => gzipSync(await readFile(`dist${path}`)).byteLength));
  const initialMounts = await page.locator('[data-preview-mounted="true"]').count();
  const interaction = {};
  async function record(label, action) {
    const start = Date.now();
    await action();
    interaction[label] = Date.now() - start;
  }
  const card = key => page.locator(`[data-card="${key}"]`);
  await record("tabClick", async () => {
    const tab = card("designbookmark-tab-pill").getByRole("tab", { name: "Analytics" });
    await tab.click();
    await tab.getAttribute("aria-selected");
  });
  await record("dropdownOpenAndDismiss", async () => {
    await card("kokonut-morph-popover").getByRole("button", { name: "New action" }).press("ArrowDown");
    await page.keyboard.press("Escape");
  });
  await record("swipeDeck", async () => {
    const box = await card("designbookmark-swipe-deck").locator("[data-deck-card]").boundingBox();
    if (!box) throw new Error("Swipe card cannot be measured");
    const y = box.y + box.height * .5;
    await page.mouse.move(box.x + box.width * .7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 8, y, { steps: 6 });
    await page.mouse.up();
    await card("designbookmark-swipe-deck").getByRole("heading", { name: "Aegean Sea" }).waitFor();
  });
  await record("theme", async () => {
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await page.locator(".mx-studio[data-scheme=dark]").waitFor();
  });
  await record("filter", async () => {
    const search = page.getByRole("searchbox");
    await search.fill("signature");
    await page.getByRole("heading", { name: "Signature pad", exact: true }).waitFor();
    await search.fill("");
  });
  await record("scrollToLast", async () => {
    await page.locator(".mx-gallery-card").last().scrollIntoViewIfNeeded();
    await page.locator(".mx-gallery-card").last().locator(".mx-demo").waitFor();
  });
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(() => window.profileStudio);
  const result = { firstViewportJS: js.reduce((total, bytes) => total + bytes, 0), scriptRequests: first.length, initialMounts,
    finalMounts: await page.locator('[data-preview-mounted="true"]').count(), interactionsWallMs: interaction,
    lcpMs: Math.round(metrics.lcp), cls: metrics.shifts.reduce((sum, value) => sum + value, 0),
    longestEventMs: Math.max(0, ...metrics.events), longTasksMs: metrics.long.map(Math.round), pageErrors: errors };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
