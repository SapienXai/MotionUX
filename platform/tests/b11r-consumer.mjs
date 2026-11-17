import { performSourceStep } from "../apps/preview-host/source-target.mjs";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { compareOriginal } from "./b11r-reference.mjs";
import { inspectZoom } from "./b11r-zoom.mjs";
import { fingerprint } from "../packages/build-core/store.ts";

const repo = resolve(import.meta.dirname, "../..");
const evidence = resolve(repo, ".motionux-v9/evidence/build-b11r");
const root = resolve(repo, ".motionux-v9/build-tests");
const run = promisify(execFile);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
const isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
const labels = isEntry ? process.argv.slice(2).filter((name) => !name.startsWith("--")) : [];
const engines = process.argv.includes("--all-engines") ? [chromium, firefox, webkit] : [chromium];
const widths = [1440, 768, 390, 320];
await mkdir(root, { recursive: true, mode: 0o700 });
const studioStopped = process.argv.includes("--studio-stopped");
async function assertStudioStopped() {
  if (!studioStopped) return;
  const response = await fetch("http://127.0.0.1:5200/build", { signal: AbortSignal.timeout(700) }).catch(() => null);
  assert.equal(response, null, "Stop the test Studio before independent acceptance.");
}
if (isEntry) await assertStudioStopped();

export async function serve(work) {
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((done) => socket.close(done));
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: work, env, stdio: "ignore" });
  const closed = once(child, "close");
  async function stop() {
    child.kill("SIGTERM");
    if (await Promise.race([closed.then(() => true), delay(2000).then(() => false)])) return;
    child.kill("SIGKILL");
    await closed;
  }
  for (let attempt = 0; attempt < 120 && child.exitCode === null; attempt++) {
    if ((await fetch(origin, { signal: AbortSignal.timeout(700) }).catch(() => null))?.ok) return { origin, stop };
    await delay(150);
  }
  await stop();
  throw new Error("The exported application did not start.");
}

export async function journeys(page, origin, program, observe = async () => {}) {
  const results = [];
  page.setDefaultTimeout(6000);
  for (const journey of program.journeys) {
    await page.emulateMedia({ reducedMotion: journey.steps.some(({ action }) => ["hover", "drag", "wheel"].includes(action)) ? "no-preference" : "reduce" });
    // Each declared journey starts from the same disposable browser fixture.
    // Its changes remain available throughout the journey, including route changes.
    await page.evaluate(() => localStorage.clear());
    await page.goto(origin + journey.route, { waitUntil: "networkidle" });
    await observe(journey.route, results.length);
    for (const step of journey.steps) {
      const node = await performSourceStep(page, step);
      if (["fill", "select"].includes(step.action)) await expect(node).toHaveValue(step.value);
      await expect(page.locator("body")).toContainText(step.expected, { useInnerText: true });
      results.push({ journey: journey.title, target: step.name, action: step.action, observed: step.expected });
      await observe(journey.route, results.length);
    }
  }
  return results;
}

export async function inspect(browser, origin, project, label, format) {
  const program = project.document.codeProject;
  const context = await browser.newContext({ reducedMotion: "reduce", colorScheme: "light" });
  const page = await context.newPage();
  const errors = [];
  const unauthorized = new Set();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && !url.pathname.startsWith("/api/")) return route.continue();
    unauthorized.add(url.origin + url.pathname);
    return route.abort();
  });
  const observed = new Set();
  async function collect(route) {
    for (const usage of program.usages.filter((usage) => usage.route === route)) {
      const node = page.locator('[data-instance="' + usage.instance + '"]');
      if (!await node.count() || !await node.first().isVisible()) continue;
      await expect(node).toHaveCount(1);
      await expect(node).toHaveAttribute("data-source", usage.source);
      observed.add(route + "#" + usage.instance);
    }
  }
  await page.addInitScript(() => {
    window.motionuxLab = { lcp: 0, cls: 0 };
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint"))
      new PerformanceObserver((list) => { for (const item of list.getEntries()) window.motionuxLab.lcp = item.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift"))
      new PerformanceObserver((list) => { for (const item of list.getEntries()) if (!item.hadRecentInput) window.motionuxLab.cls += item.value; }).observe({ type: "layout-shift", buffered: true });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith("/favicon.ico"))
      errors.push(new URL(response.url()).pathname + " returned " + response.status());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const dimensions = [];
  const performanceSamples = [];
  const structures = [];
  for (const route of program.pages) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert((await page.goto(origin + route.route, { waitUntil: "networkidle" }))?.ok());
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    performanceSamples.push(await page.evaluate(() => ({
      ...window.motionuxLab,
      js: performance.getEntriesByType("resource").filter((entry) => new URL(entry.name).pathname.endsWith(".js")).reduce((n, entry) => n + entry.encodedBodySize, 0),
    })));
    await page.setViewportSize({ width: 1440, height: 1000 });
    structures.push(await page.locator(".app").evaluate((root) => {
      function shape(node, level) {
        if (!level || !node.children.length) return node.tagName.toLowerCase();
        return [node.tagName.toLowerCase(), [...node.children].filter((item) => !["SCRIPT", "STYLE", "SVG", "PATH"].includes(item.tagName)).map((child) => shape(child, level - 1))];
      }
      return shape(root, 4);
    }));
    await collect(route.route);
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      await collect(route.route);
      dimensions.push({ route: route.route, width });
      if (browser.browserType().name() === "chromium")
        await page.screenshot({ path: resolve(evidence, label + "-" + format + "-" + route.id + "-" + width + ".png"), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const journeyResults = await journeys(page, origin, program, async (route, step) => {
    await collect(route);
    if (format === "next" && browser.browserType().name() === "chromium")
      await page.screenshot({ path: resolve(evidence, label + "-journey-" + step + ".png"), fullPage: true });
  });
  for (const usage of program.usages) assert(observed.has(usage.route + "#" + usage.instance), "The source never became usable: " + usage.instance);
  await page.goto(origin);
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations
    .map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(({ target }) => target), details: nodes.map(({ html, failureSummary }) => ({ html, failureSummary })) }));
  let offline;
  if (format === "pwa" && browser.browserType().name() === "chromium") {
    await expect(page.locator('.pwa-status [data-ready="true"]')).toBeAttached({ timeout: 25_000 });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    assert((await page.reload())?.fromServiceWorker());
    offline = { reload: true, journeys: await journeys(page, origin, program) };
    await context.setOffline(false);
    await page.reload();
  }
  assert.deepEqual([...unauthorized], [], "Unexpected external or API request");
  assert.deepEqual(errors, []);
  await context.close();
  return { engine: browser.browserType().name(), version: browser.version(), dimensions, performanceSamples, structures, journeys: journeyResults, offline, violations };
}

for (const label of labels) {
  const project = JSON.parse(await readFile(resolve(evidence, label + "-project.json"), "utf8"));
  for (const format of ["next", "pwa"]) {
    const work = await mkdtemp(resolve(root, "b11r-consumer-"));
    let server;
    try {
      await run("unzip", ["-q", resolve(evidence, label + "-" + format + ".zip"), "-d", work]);
      const manifest = JSON.parse(await readFile(resolve(work, "motionux-manifest.json"), "utf8"));
      for (const { path, sha256 } of manifest.files) assert.equal(fingerprint(await readFile(resolve(work, path))), sha256);
      const started = performance.now();
      for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "typecheck"], ["run", "build"]])
        await run("npm", args, { cwd: work, env, timeout: 150_000, maxBuffer: 1_000_000 });
      const buildMs = Math.round(performance.now() - started);
      server = await serve(work);
      const checks = [];
      for (const engine of engines) {
        const browser = await engine.launch();
        try { checks.push(await inspect(browser, server.origin, project, label, format)); } finally { await browser.close(); }
      }
      let sourceParity;
      if (process.argv.includes("--source-parity") && format === "next") {
        const browser = await chromium.launch();
        try { sourceParity = await compareOriginal(browser, server.origin, project, work, repo, label, evidence); }
        finally { await browser.close(); }
      }
      const zoom = process.argv.includes("--zoom") && format === "next" ? await inspectZoom(server.origin, project, label, evidence) : undefined;
      await assertStudioStopped();
      const report = { sourceParity, zoom, studioStopped, label, format, buildMs, digest: manifest.documentDigest, files: manifest.files.length, checks };
      await writeFile(resolve(evidence, label + "-" + format + "-consumer.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
      for (const check of checks) assert.deepEqual(check.violations.filter(({ impact }) => ["serious", "critical"].includes(impact)), [], "Independent export accessibility in " + check.engine);
      console.log(label, format, buildMs + "ms", checks.map(({ engine, journeys, violations }) => [engine, journeys.length + " steps", violations]));
    } catch (error) {
      console.error(label, format, error.stdout ?? "", error.stderr ?? "", error.stack);
      process.exitCode = 1;
    } finally {
      await server?.stop();
      await rm(work, { recursive: true, force: true });
    }
  }
}
