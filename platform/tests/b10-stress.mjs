import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const repo = resolve(import.meta.dirname, "../..");
const evidence = resolve(repo, ".motionux-v9/evidence/build-b10/stress");
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const base = "http://127.0.0.1:5200";
const respond = () => fetch(base, { signal: AbortSignal.timeout(500) }).catch(() => null);
const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const exec = promisify(execFile);
const result = { profile: "Chromium, 1440×900, reduced motion, production localhost", widths: [], edits: [], comparisons: [] };
function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { n: sorted.length, p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
}
async function metrics(page, browser) {
  const target = await page.context().newCDPSession(page);
  await target.send("Performance.enable");
  await target.send("HeapProfiler.collectGarbage");
  const { metrics } = await target.send("Performance.getMetrics");
  await target.detach();
  const host = await browser.newBrowserCDPSession();
  const { processInfo } = await host.send("SystemInfo.getProcessInfo");
  await host.detach();
  const pids = processInfo.filter(({ type }) => type === "renderer").map(({ id }) => id);
  const rss = pids.length ? await exec("ps", ["-o", "rss=", "-p", pids.join(",")]).then(({ stdout }) =>
    stdout.trim().split(/\s+/).map(Number).reduce((sum, value) => sum + value * 1024, 0), () => null) : null;
  const dom = await page.evaluate(() => ({
    frames: document.querySelectorAll("iframe").length,
    objectUrlResources: performance.getEntriesByType("resource").filter(({ name }) => name.startsWith("blob:")).length,
  }));
  return {
    ...dom, rendererRss: rss, rendererProcesses: pids.length,
    ...Object.fromEntries(metrics.filter(({ name }) => ["JSHeapUsedSize", "Nodes", "JSEventListeners"].includes(name))
      .map(({ name, value }) => [name, value])),
  };
}
async function measureContrast(locator) {
  return locator.evaluate((el) => {
    const toRgb = (value) => value.match(/[\d.]+/g)?.map(Number) ?? [];
    const linear = (number) => {
      const value = number / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    };
    const light = (rgb) => [0.2126, 0.7152, 0.0722].reduce((sum, k, i) => sum + k * linear(rgb[i]), 0);
    const text = getComputedStyle(el).color;
    let surface = el;
    let background = getComputedStyle(surface).backgroundColor;
    while (surface.parentElement && toRgb(background).at(3) === 0) {
      surface = surface.parentElement;
      background = getComputedStyle(surface).backgroundColor;
    }
    const levels = [light(toRgb(text)), light(toRgb(background))].sort((a, b) => b - a);
    return { ratio: (levels[0] + .05) / (levels[1] + .05), text, background };
  });
}
await mkdir(evidence, { recursive: true, mode: 0o700 });
assert(!(await respond()), "Stop the regular Studio before starting a fixture.");
const server = spawn(process.execPath, ["platform/start.mjs", "--built", "--fixture=" + fixture], { cwd: repo, stdio: "ignore", detached: true });
const closed = once(server, "close");
let browser;
try {
  for (let n = 0; n < 100; n++) {
    if ((await respond())?.ok) break;
    await delay(150);
  }
  browser = await chromium.launch();
  result.version = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", acceptDownloads: true });
  page.setDefaultTimeout(10_000);
  const encodedScripts = () => page.evaluate(() => performance.getEntriesByType("resource")
    .filter(({ name }) => new URL(name).pathname.endsWith(".js")).reduce((sum, entry) => sum + entry.encodedBodySize, 0));
  await page.goto(base + "/discover");
  await page.waitForLoadState("networkidle");
  result.discoverJs = await encodedScripts();
  await page.goto(base + "/build");
  await page.waitForLoadState("networkidle");
  result.startJs = await encodedScripts();
  await button(page, "New Knowledge Base").click();
  const canvas = page.getByRole("region", { name: "Application canvas" });
  const properties = page.getByRole("complementary", { name: "Properties" });
  const heading = (name) => canvas.getByRole("heading", { name, exact: true });
  await heading("Handbook").waitFor();
  result.editorJs = await encodedScripts();
  await button(properties, "1. Page heading").click();
  const title = properties.getByLabel("Block title");
  // Match the 20-edit B9 baseline first, then keep editing in the same session.
  for (let i = 0; i < 60; i++) {
    const start = performance.now();
    const value = "Fieldnotes baseline " + i;
    await title.fill(value);
    await heading(value).waitFor();
    result.edits.push(Math.round(performance.now() - start));
  }
  result.edit20 = distribution(result.edits.slice(0, 20));
  result.edit60 = distribution(result.edits);
  assert(result.edit60.p95 <= 100, "Local edit feedback budget");
  result.before = await metrics(page, browser);
  for (let i = 0; i < 30; i++) {
    await button(canvas, i % 2 ? "Desktop" : "Mobile").click();
    await expect(canvas.locator(".build-canvas-paper")).toHaveAttribute("data-device", i % 2 ? "desktop" : "mobile");
  }
  for (let i = 0; i < 20; i++) {
    const trigger = button(page, "Add page");
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Add page" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  result.afterInteractions = await metrics(page, browser);
  assert.equal(result.afterInteractions.frames, result.before.frames);
  const id = new URL(page.url()).searchParams.get("project");
  const endpoint = "/api/build/" + id;
  const prior = await page.evaluate((url) => fetch(url).then((reply) => reply.json()), endpoint);
  assert.equal(prior.revision, 0);
  await expect.poll(() => page.evaluate((url) => fetch(url + "/draft").then((reply) => reply.json()).then((draft) => draft?.document.pages[0].blocks[0].props.title), endpoint))
    .toBe("Fieldnotes baseline 59");
  await page.evaluate((key) => localStorage.removeItem("motionux-build-draft-v1:" + key), id);
  await page.reload();
  await expect(heading("Fieldnotes baseline 59")).toBeVisible();
  await expect(title).toHaveValue("Fieldnotes baseline 59");
  result.recoveredVaultDraft = true;
  result.after = await metrics(page, browser);
  assert(result.after.frames === result.before.frames);

  await button(page, "Patterns").click();
  const search = page.getByRole("searchbox", { name: "Search patterns" });
  await search.fill("Reference");
  const pattern = page.getByRole("button", { name: /^Reference library/ });
  await pattern.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add page" });
  await expect(dialog.getByRole("combobox", { name: "Page pattern" })).toHaveValue("reference");
  await page.keyboard.press("Escape");
  await expect(pattern).toBeFocused();

  const current = page.getByRole("navigation", { name: "Project pages" }).locator('[aria-current="page"]');
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme });
    const baseline = await measureContrast(current);
    await current.hover();
    const hover = await measureContrast(current);
    assert(baseline.ratio >= 4.5 && hover.ratio >= 4.5, theme + " selected contrast");
    result.comparisons.push({ theme, selected: baseline, hover });
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), theme + " " + width + " overflow");
      await expect(button(page, "Save")).toBeInViewport();
      await expect(button(page, "Run")).toBeInViewport();
      result.widths.push({ theme, width });
    }
    await page.setViewportSize({ width: 320, height: 844 });
    const panes = page.getByRole("navigation", { name: "Editor panes" });
    await button(panes, "Properties").click();
    await expect(title).toBeVisible();
    await page.screenshot({ path: resolve(evidence, "320-properties-" + theme + ".png") });
    await button(panes, "Canvas").click();
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  console.log("B10 creator stress", JSON.stringify(result));
} finally {
  await browser?.close();
  try { process.kill(-server.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  await closed;
  await rm(resolve(repo, ".motionux-v9/build-tests", fixture), { recursive: true, force: true });
  await writeFile(resolve(evidence, "metrics.json"), JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });
}
