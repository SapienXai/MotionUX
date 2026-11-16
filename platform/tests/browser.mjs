import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import {
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { request as httpRequest } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { setTimeout as wait } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { compatibleBlock, makeBlock, registry } from "../packages/build-core/model.ts";
import { fingerprint } from "../packages/build-core/store.ts";
import { exportTree, writeTree } from "../packages/app-export/export.ts";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const studio = "http://127.0.0.1:5200";
const localSuite = process.argv.includes("--local");
const evidence = resolve(repo, ".motionux-v9/evidence/build-b3/hotel");
const fixtures = resolve(repo, ".motionux-v9/build-tests");
const execute = promisify(execFile);
const feature = {
  test: [],
  screenshots: [],
  profiles: [],
  blocks: [],
  peakConsumerBytes: 0,
};
const check = (name) => {
  feature.test.push(name);
  console.log("Passed:", name);
};
await mkdir(evidence, { recursive: true, mode: 0o700 });
await mkdir(fixtures, { recursive: true, mode: 0o700 });
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const sandbox = resolve(fixtures, fixture);
await mkdir(sandbox, { mode: 0o700 });
const children = [];
let browser;
let exportedBrowser;

function start(executable, args, options) {
  const child = spawn(executable, args, {
    ...options,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      logs.push(data.toString());
      if (logs.length > 40) logs.shift();
    });
  children.push({
    child,
    logs,
    completion: once(child, "close").catch(() => null),
  });
  return child;
}
function kill(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode) return;
  const closing = children.find((row) => row.child === child)?.completion;
  kill(child.pid, "SIGTERM");
  if (!(await Promise.race([closing, wait(1800).then(() => false)]))) {
    kill(child.pid, "SIGKILL");
    await closing;
  }
}
async function ready(url, child) {
  const began = performance.now();
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null || child.signalCode)
      throw new Error(
        children.find((item) => item.child === child).logs.join(""),
      );
    if (
      await fetch(url, { signal: AbortSignal.timeout(500) }).then(
        (res) => res.ok,
        () => false,
      )
    )
      return performance.now() - began;
    await wait(150);
  }
  throw new Error("Runtime never became ready: " + url);
}
async function picture(page, path) {
  if (!localSuite) return;
  const name = "build-v1-" + path + ".png";
  await page.screenshot({
    path: resolve(evidence, name),
    animations: "disabled",
  });
  feature.screenshots.push(name);
}
async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations
      .filter((row) => ["critical", "serious"].includes(row.impact))
      .map((row) => ({
        id: row.id,
        nodes: row.nodes.map((node) => node.target),
      })),
    [],
    name,
  );
  feature.test.push("axe " + name);
}
async function api(page, path, method = "GET", body) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch("/api/build" + path, {
        method,
        headers: {
          "X-MotionUX-Build": "1",
          ...(body && { "Content-Type": "application/json" }),
        },
        ...(body && { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, method, body },
  );
}
function hostStatus(url, host) {
  return new Promise((done, fail) => {
    const request = httpRequest(
      url,
      { headers: { Host: host } },
      (response) => {
        response.resume();
        done(response.statusCode);
      },
    );
    request.on("error", fail);
    request.end();
  });
}
function noRuntimeErrors(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|did not match/i.test(message.text())
    )
      failures.push(message.text());
  });
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      ["script", "stylesheet", "font"].includes(
        response.request().resourceType(),
      )
    )
      failures.push(response.status() + " " + response.url());
  });
  return () => assert.deepEqual(failures, []);
}
async function track(page) {
  await page.addInitScript(() => {
    window.performanceEvidence = { lcp: null, cls: 0, interactions: [] };
    for (const type of ["largest-contentful-paint", "layout-shift", "event"]) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (type === "largest-contentful-paint")
            window.performanceEvidence.lcp = entry.startTime;
          if (type === "layout-shift" && !entry.hadRecentInput)
            window.performanceEvidence.cls += entry.value;
          if (type === "event" && entry.interactionId)
            window.performanceEvidence.interactions.push(entry.duration);
        }
      }).observe({
        type,
        buffered: true,
        ...(type === "event" && { durationThreshold: 16 }),
      });
    }
  });
}
async function metrics(page, label) {
  const browserValues = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    return {
      ...window.performanceEvidence,
      domReadyMs:
        performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd,
      jsEncodedBytes: resources
        .filter(
          (row) =>
            row.initiatorType === "script" || /\.js(?:\?|$)/.test(row.name),
        )
        .reduce((sum, row) => sum + row.encodedBodySize, 0),
      frames: document.querySelectorAll("iframe").length,
      heap: performance.memory?.usedJSHeapSize ?? null,
    };
  });
  const context = page.context();
  const engine = context.browser();
  const processMetrics = {};
  if (engine?.browserType().name() === "chromium") {
    const pageSession = await context.newCDPSession(page);
    try {
      await pageSession.send("Performance.enable");
      const { metrics: counters } = await pageSession.send(
        "Performance.getMetrics",
      );
      const counter = (name) =>
        counters.find((entry) => entry.name === name)?.value ?? null;
      processMetrics.heap = counter("JSHeapUsedSize");
      processMetrics.taskSeconds = counter("TaskDuration");
    } finally {
      await pageSession.detach();
    }
    const browserSession = await engine.newBrowserCDPSession();
    try {
      const { processInfo } = await browserSession.send(
        "SystemInfo.getProcessInfo",
      );
      const lanes = processInfo.filter((item) =>
        ["renderer", "gpu"].includes(item.type.toLowerCase()),
      );
      const { stdout } = await execute("/bin/ps", [
        "-o",
        "pid=,rss=",
        "-p",
        lanes.map((item) => item.id).join(","),
      ]).catch(() => ({ stdout: "" }));
      const memory = new Map(
        stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => line.trim().split(/\s+/).map(Number)),
      );
      for (const type of ["renderer", "gpu"]) {
        const rows = lanes.filter((item) => item.type.toLowerCase() === type);
        processMetrics[type] = rows.length
          ? {
              cpuSeconds: rows.reduce((sum, item) => sum + item.cpuTime, 0),
              rssBytes: rows.every((item) => memory.has(item.id))
                ? rows.reduce(
                    (sum, item) => sum + memory.get(item.id) * 1024,
                    0,
                  )
                : null,
            }
          : null;
      }
    } finally {
      await browserSession.detach();
    }
  }
  if (label === "standalone-chromium-1440-light") {
    assert(browserValues.lcp !== null && browserValues.lcp <= 2500);
    assert(
      browserValues.cls <= 0.1 && browserValues.jsEncodedBytes <= 512 * 1024,
    );
  }
  feature.profiles.push({ label, ...browserValues, ...processMetrics });
}
const heading = (page, name) =>
  page.getByRole("heading", { name, exact: true });
const button = (page, name) => page.getByRole("button", { name, exact: true });

async function hotelFlow(page, origin, { mobile = false } = {}) {
  await page.goto(origin, { waitUntil: "networkidle" });
  await expect(heading(page, "Linden operations")).toBeVisible();
  if (mobile) {
    await expect(
      page.getByRole("navigation", { name: "Quick navigation" }),
    ).toBeVisible();
    await button(page, "Menu").tap();
    await expect(
      page.getByRole("dialog", { name: "Hotel navigation" }),
    ).toBeVisible();
    await button(page, "Close dialog").tap();
    await page
      .getByRole("navigation", { name: "Quick navigation" })
      .getByRole("link", { name: "Bookings" })
      .tap();
  } else {
    await expect(button(page, "Expand sidebar")).toBeVisible();
    await page.evaluate(() => {
      window.sidebarFrames = new Promise((done) => {
        const frames = [];
        const sample = (time) => {
          const label = document.querySelector(".hotel-brand>span:last-child");
          frames.push({
            time,
            opacity: label ? Number(getComputedStyle(label).opacity) : null,
          });
          if (frames.length < 23) requestAnimationFrame(sample);
          else done(frames);
        };
        requestAnimationFrame(sample);
      });
    });
    await button(page, "Expand sidebar").click();
    const frames = await page.evaluate(() => window.sidebarFrames);
    if (
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      )
    ) {
      assert.equal(new Set(frames.map((frame) => frame.opacity)).size, 1);
    } else {
      assert(
        new Set(frames.map((frame) => frame.opacity)).size >= 3,
        "Sidebar should expose intermediate opacity frames.",
      );
    }
    feature.sidebarFrames = feature.sidebarFrames ?? frames;
    await expect(button(page, "Collapse sidebar")).toBeFocused();
    await page
      .getByRole("complementary", { name: "Hotel sidebar" })
      .getByLabel("Hotel workspace")
      .selectOption("Maison Verne");
    await expect(page.locator(".hotel-header-location")).toContainText(
      "Maison Verne",
    );
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+k" : "Control+k",
    );
    await expect(
      page.getByRole("dialog", { name: "Go to a page" }),
    ).toBeVisible();
    const field = page.getByRole("searchbox", { name: "Search pages" });
    await expect(field).toBeFocused();
    await field.fill("nothing");
    await expect(page.getByText(/No pages match/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Go to a page" }),
    ).not.toBeVisible();
    await button(page, "Find a page ⌘ K").click();
    await field.fill("Book");
    await page
      .getByRole("dialog")
      .getByRole("link", { name: /Bookings/ })
      .click();
  }
  await expect(page).toHaveURL(origin + "/bookings");
  const search = page.getByRole("searchbox", { name: "Search reservations" });
  await search.fill("unlisted");
  await expect(page.getByText("No reservations match")).toBeVisible();
  await button(page, "Clear filters").click();
  await page.getByLabel("Status", { exact: true }).selectOption("Arriving");
  await expect(page.getByRole("row", { name: /Amelia Rhodes/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Noah Bennett/ })).toHaveCount(0);
  await page.getByLabel("Status", { exact: true }).selectOption("");
  await button(page, "Guest").click();
  await expect(
    page.getByRole("columnheader", { name: "Guest" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await button(page, "Next").click();
  await expect(page.getByText("6–8 of 8")).toBeVisible();
  await page.reload();
  await expect(heading(page, "Bookings")).toBeVisible();
  await page.goto(origin + "/rooms");
  await button(page, "View room 204").click();
  await expect(
    page.getByRole("dialog", { name: "Courtyard King" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button(page, "View room 204")).toBeFocused();
  await page.goto(origin + "/settings");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Display name").fill("Avery");
  await button(page, "Save preferences").click();
  await expect(
    page.getByText("Preferences saved on this browser."),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".hotel")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Display name")).toHaveValue("Avery");
  await page.goto(origin + "/reports");
  await expect(heading(page, "Daily reports")).toBeVisible();
  await page.goBack();
  await expect(heading(page, "Settings")).toBeVisible();
}

try {
  const launcher = start(
    process.execPath,
    ["platform/start.mjs", "--built", "--fixture=" + fixture],
    { cwd: repo },
  );
  feature.shellStartupMs = await ready(studio, launcher);
  browser = await chromium.launch();
  const editorContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  if (localSuite)
    await editorContext.tracing.start({
      snapshots: true,
      screenshots: false,
      sources: false,
    });
  const page = await editorContext.newPage();
  const assertEditorClean = noRuntimeErrors(page);
  await track(page);
  await page.goto(studio, { waitUntil: "networkidle" });
  await expect(
    heading(page, "From proven components to working apps."),
  ).toBeVisible();
  const homeJs = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .filter((row) => /\.js(?:\?|$)/.test(row.name)).length,
  );
  assert.equal(await page.locator("iframe").count(), 0);
  await metrics(page, "next-studio-landing");
  feature.shellJsRequests = homeJs;
  await page.getByRole("link", { name: "Open Build" }).click();
  await button(page, "New Hotel Desk").click();
  await expect(heading(page, "Property overview")).toBeVisible();
  const id = new URL(page.url()).searchParams.get("project");
  assert(id && /^[a-f0-9]{32}$/.test(id));
  const initial = await api(page, "/" + id);
  assert.equal(initial.status, 200);
  await page.getByLabel("Search blocks").fill("Inline feedback");
  if (localSuite) {
    const drag = page.locator('[class*="_DrawerItem-draggable"]').first();
    const target = page.locator('[class*="_DropZone--isRootZone"]').first();
    const a = await drag.boundingBox(),
      b = await target.boundingBox();
    assert(a && b);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + 30, { steps: 24 });
    await page.waitForTimeout(180);
    await page.mouse.up();
    await expect(page.locator('[data-block="Toast"]')).toHaveCount(1);
    check("Puck pointer insertion");
  } else {
    await button(page, "Add Inline feedback").press("Enter");
  }
  await expect(page.locator('[data-block="Toast"]')).toHaveCount(1);
  await page.getByRole("button", { name: /\d+\. Inline feedback/ }).click();
  await button(page, "Remove block").click();
  await page.getByLabel("Search blocks").fill("Metric card");
  await button(page, "Add Metric card").press("Enter");
  await expect(page.locator('[data-block="KpiCard"]')).toHaveCount(1);
  await button(page, "Move block up").press("Enter");
  await button(page, "Duplicate block").click();
  await expect(page.locator('[data-block="KpiCard"]')).toHaveCount(2);
  await button(page, "Remove block").click();
  await button(page, "Undo").click();
  await expect(page.locator('[data-block="KpiCard"]')).toHaveCount(2);
  await button(page, "Redo").click();
  await expect(page.locator('[data-block="KpiCard"]')).toHaveCount(1);
  await page.getByRole("button", { name: /\d+\. Metric card/ }).click();
  await button(page, "Move block down").click();
  await page.getByLabel("Search blocks").fill("Sidebar inset");
  await button(page, "Add Sidebar inset").click();
  await page
    .getByLabel("Block insertion target")
    .selectOption({ label: "Sidebar inset" });
  await page.getByLabel("Search blocks").fill("Metric card");
  await button(page, "Add Metric card").press("Enter");
  const nested = page.locator(
    '[data-block="SidebarInset"] [data-block="KpiCard"]',
  );
  await expect(nested).toHaveCount(1);
  await page.getByLabel("Metric source").selectOption("revenue");
  await page.getByLabel("Accessible label").fill("Revenue detail");
  await expect(nested).toHaveAttribute("aria-label", "Revenue detail");
  await expect(nested).toContainText("$4,390");
  await page.getByLabel("Block location").selectOption("");
  await expect(nested).toHaveCount(0);
  await button(page, "Undo").click();
  await expect(nested).toHaveCount(1);
  await page.getByRole("button", { name: /\d+\. Page heading/ }).click();
  const edit = page.getByLabel("Block title");
  const changed = performance.now();
  await edit.fill("Linden operations");
  await expect(heading(page, "Linden operations")).toBeVisible();
  feature.editorEditMs = performance.now() - changed;
  await page.getByLabel("Sidebar variant").selectOption("rail");
  await expect(page.locator(".hotel")).toHaveAttribute("data-rail", "true");
  await button(page, "Mobile").click();
  await expect(
    page.getByLabel("Application canvas").locator(".build-canvas-paper"),
  ).toHaveAttribute("data-device", "mobile");
  await picture(page, "editor-mobile-canvas");
  await button(page, "Tablet").click();
  await button(page, "Desktop").click();
  await expect(edit).toHaveValue("Linden operations");
  await button(page, "Add page").click();
  await page.getByLabel("Page name").fill("Reports");
  await page.getByLabel("Route", { exact: true }).fill("/bookings");
  await button(page, "Create page").click();
  await expect(page.getByText(/unique route/)).toBeVisible();
  await page.getByLabel("Route", { exact: true }).fill("/reports");
  await button(page, "Create page").click();
  await page.getByRole("button", { name: "Edit page name and route" }).click();
  await page.getByLabel("Page name").fill("Daily reports");
  await button(page, "Save page").click();
  await page
    .getByRole("navigation", { name: "Project pages" })
    .getByRole("button", { name: /Overview/ })
    .click();
  await button(page, "Save").click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const saved = await api(page, "/" + id);
  assert.ok(saved.data.revision > initial.data.revision);
  const edited = saved.data.document.pages[0].blocks;
  assert.equal(
    edited.find((block) => block.type === "PageHeader").props.title,
    "Linden operations",
  );
  assert.equal(
    edited.find((block) => block.type === "SidebarInset").children[0].props
      .dataBinding,
    "revenue",
  );
  await page.reload();
  await expect(heading(page, "Linden operations")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Project pages" })
    .getByRole("button", { name: /Daily reports/ })
    .click();
  await expect(page.locator(".build-route")).toContainText("/reports");
  await page
    .getByRole("navigation", { name: "Project pages" })
    .getByRole("button", { name: /Overview/ })
    .click();
  await picture(page, "editor-desktop");
  await metrics(page, "studio-editor");
  await audit(page, "editor");
  check(
    "keyboard editing, reorder, duplicate, remove, history, pages and save/reload",
  );
  assert.equal((await api(page, "/" + id, "PUT", initial.data)).status, 409);
  const corrupt = structuredClone(saved.data);
  corrupt.document.pages[0].blocks[0].props.url = "https://untrusted.example/";
  assert.equal((await api(page, "/" + id, "PUT", corrupt)).status, 422);
  assert.equal(
    (
      await fetch(studio + "/api/build", {
        method: "POST",
        headers: {
          Origin: "https://untrusted.example",
          "Sec-Fetch-Site": "cross-site",
        },
      })
    ).status,
    403,
  );
  check("HTTP origin, schema and revision rejection");

  if (localSuite) {
    await button(page, "Run").click();
    await expect(
      page.locator('iframe[title="Live Next.js application"]'),
    ).toBeVisible({ timeout: 120000 });
    const frame = page.frameLocator('iframe[title="Live Next.js application"]');
    await expect(heading(frame, "Linden operations")).toBeVisible();
    await button(frame, "Find a page ⌘ K").click();
    await expect(
      frame.getByRole("searchbox", { name: "Search pages" }),
    ).toBeFocused();
    const status = (await api(page, "/preview")).data;
    feature.livePreview = status;
    const processHeaders = await fetch(status.url);
    assert.match(
      processHeaders.headers.get("content-security-policy"),
      /frame-ancestors http:\/\/127\.0\.0\.1:5200/,
    );
    assert.equal(await hostStatus(status.url, "unrelated.example"), 403);
    await picture(page, "editor-live-preview");
    await button(page, "Stop").click();
    await expect(
      page.locator('iframe[title="Live Next.js application"]'),
    ).toHaveCount(0);
    assert.equal((await api(page, "/preview")).data.status, "idle");
    check("sandboxed Next preview, distinct origin, command focus and stop");
    const collision = createServer().listen(5202, "127.0.0.1");
    await once(collision, "listening");
    try {
      assert.equal(
        (await api(page, "/" + id + "/preview", "POST")).status,
        202,
      );
      await expect
        .poll(async () => (await api(page, "/preview")).data.status)
        .toBe("failed");
      assert.match((await api(page, "/preview")).data.message, /occupied/);
    } finally {
      await new Promise((done) => collision.close(done));
    }
    await api(page, "/preview", "DELETE");
    assert.equal((await api(page, "/" + id + "/preview", "POST")).status, 202);
    await api(page, "/preview", "DELETE");
    assert.equal((await api(page, "/preview")).data.status, "idle");
    check("preview port collision and in-flight cancel cleanup");
    await button(page, "Edit").click();
  }
  assertEditorClean();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    button(page, "Export").click(),
  ]);
  const zip = resolve(sandbox, "app-source.zip");
  await download.saveAs(zip);
  const bytes = await readFile(zip);
  feature.exportHash = fingerprint(bytes);
  const [again] = await Promise.all([
    page.waitForEvent("download"),
    button(page, "Export").click(),
  ]);
  assert.equal(
    fingerprint(await readFile(await again.path())),
    feature.exportHash,
  );
  if (localSuite)
    await download.saveAs(resolve(evidence, "hotel-desk-source.zip"));
  const consumer = resolve(sandbox, "consumer");
  await mkdir(consumer);
  const buildTimer = performance.now();
  await execute("/usr/bin/unzip", ["-q", zip, "-d", consumer]);
  const app = await readFile(resolve(consumer, "runtime/project.ts"), "utf8");
  assert.match(app, /Linden operations/);
  assert(!app.includes("@motionux/"));
  const manifest = JSON.parse(
    await readFile(resolve(consumer, "motionux-manifest.json"), "utf8"),
  );
  for (const row of manifest.files)
    assert.equal(
      fingerprint(await readFile(resolve(consumer, row.path))),
      row.sha256,
    );
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  for (const args of [
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"],
    ["run", "typecheck"],
    ["run", "build"],
  ]) {
    const { stdout } = await execute("npm", args, {
      cwd: consumer,
      env,
      timeout: 180_000,
      maxBuffer: 2_000_000,
    });
    process.stdout.write(stdout);
  }
  feature.freshInstallTypecheckBuildMs = performance.now() - buildTimer;
  const usage = await execute("/usr/bin/du", ["-sk", consumer]);
  feature.peakConsumerBytes =
    Number(usage.stdout.trim().split(/\s+/)[0]) * 1024;
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((done) => server.close(done));
  const origin = "http://127.0.0.1:" + port;
  const appServer = start(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    { cwd: consumer, env },
  );
  feature.exportedProcessStartupMs = await ready(origin, appServer);
  assert.match(
    await fetch(origin).then((response) => response.text()),
    /Linden operations/,
  );
  assert.equal((await fetch(origin + "/no-such-route")).status, 404);
  exportedBrowser = await chromium.launch();
  const consumerContext = await exportedBrowser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  if (localSuite)
    await consumerContext.tracing.start({
      snapshots: true,
      screenshots: false,
      sources: false,
    });
  const external = await consumerContext.newPage();
  const assertAppClean = noRuntimeErrors(external);
  await track(external);
  await external.goto(origin, { waitUntil: "networkidle" });
  await picture(external, "hotel-desktop-light");
  await metrics(external, "standalone-chromium-1440-light");
  await audit(external, "exported desk light");
  await hotelFlow(external, origin);
  await picture(external, "hotel-settings-dark");
  await audit(external, "exported settings dark");
  assertAppClean();
  check(
    "clean npm install, typecheck, production SSR, routes and dashboard workflows",
  );

  if (localSuite) {
    for (const [engine, width, mobile] of [
      [chromium, 320, true],
      [webkit, 390, true],
      [firefox, 1440, false],
    ]) {
      const instance = await engine.launch();
      try {
        const context = await instance.newContext({
          viewport: { width, height: 844 },
          hasTouch: mobile,
          ...(mobile && { isMobile: true }),
          reducedMotion: "reduce",
        });
        const device = await context.newPage();
        const verifyConsole = noRuntimeErrors(device);
        await track(device);
        await hotelFlow(device, origin, { mobile });
        await device.goto(origin, { waitUntil: "networkidle" });
        assert(
          await device.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        assert.equal(
          await device
            .locator(".hotel-brand>span")
            .first()
            .evaluate((node) => getComputedStyle(node).animationName),
          "none",
        );
        await picture(device, "hotel-" + engine.name() + "-" + width + "-dark");
        await metrics(
          device,
          "standalone-" + engine.name() + "-" + width + "-dark-reduced",
        );
        await audit(device, engine.name() + " " + width);
        verifyConsole();
      } finally {
        await instance.close();
      }
    }
    for (const width of [375, 768, 1024, 1920]) {
      await external.setViewportSize({ width, height: 900 });
      await external.goto(origin + "/rooms");
      assert(
        await external.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await picture(external, "hotel-rooms-" + width);
    }
    check(
      "Chromium, Firefox and WebKit, reduced motion, and 320–1920px reflow",
    );
  }

  const project = (await api(page, "/" + id)).data;
  const libraryIds = Object.keys(registry).filter((id) => compatibleBlock(id, "hotel-demo-v1"));
  const qaBlocks = libraryIds.map((type, index) =>
    makeBlock(type, "b-review-" + index),
  );
  project.document.pages.push({
    id: "p-block-review",
    route: "/block-qa",
    title: "QA blocks",
    blocks: qaBlocks,
  });
  assert.equal((await api(page, "/" + id, "PUT", project)).status, 200);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Project pages" })
    .getByRole("button", { name: /QA blocks/ })
    .click();
  for (const type of libraryIds) {
    await expect(page.locator('[data-block="' + type + '"]')).toHaveCount(1);
    feature.blocks.push(type);
  }
  check("31 separately registered blocks render through the Puck adapter");
  await stop(appServer);
  const blockApp = resolve(sandbox, "block-consumer");
  await mkdir(blockApp);
  await writeTree(
    blockApp,
    await exportTree(repo, (await api(page, "/" + id)).data),
  );
  await symlink(
    resolve(consumer, "node_modules"),
    resolve(blockApp, "node_modules"),
    "dir",
  );
  await execute("npm", ["run", "build"], {
    cwd: blockApp,
    env,
    timeout: 180_000,
    maxBuffer: 2_000_000,
  });
  const blockServer = start(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    { cwd: blockApp, env },
  );
  await ready(origin + "/block-qa", blockServer);
  const qa = await consumerContext.newPage();
  await qa.goto(origin + "/block-qa");
  for (const type of libraryIds)
    await expect(qa.locator('[data-block="' + type + '"]')).toHaveCount(1);
  await button(qa, "Collapse navigation").click();
  await expect(button(qa, "Expand navigation")).toBeVisible();
  await button(qa, "Show feedback").click();
  await expect(qa.getByText("Local action complete.")).toBeVisible();
  await button(qa, "Preview pending state").click();
  await expect(
    qa.locator('[data-block="Skeleton"] [aria-busy="true"]'),
  ).toBeVisible();
  await button(qa, "Review reset").click();
  await qa
    .getByRole("dialog")
    .getByRole("button", { name: "Reset note" })
    .click();
  await expect(qa.getByText("Demo note reset.")).toBeVisible();
  await qa
    .locator('[data-block="Sheet"]')
    .getByRole("button", { name: "Open side panel" })
    .click();
  await expect(qa.getByRole("dialog", { name: "Side sheet" })).toBeVisible();
  await qa.keyboard.press("Escape");
  await qa.close();
  await stop(blockServer);
  check(
    "31 blocks in independent production export; overlay and feedback samples work",
  );
  if (localSuite) {
    await editorContext.tracing.stop({
      path: resolve(evidence, "editor-trace.zip"),
    });
    await consumerContext.tracing.stop({
      path: resolve(evidence, "hotel-trace.zip"),
    });
    await execute("/usr/bin/stat", [
      "-f",
      "%z",
      resolve(evidence, "hotel-desk-source.zip"),
    ]).then((result) => {
      feature.exportBytes = Number(result.stdout.trim());
    });
  }
} finally {
  if (localSuite)
    await fetch(studio + "/api/build/preview", {
      method: "DELETE",
      signal: AbortSignal.timeout(3500),
      headers: {
        Origin: studio,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Dest": "empty",
        "X-MotionUX-Build": "1",
      },
    }).catch(() => {});
  await exportedBrowser?.close();
  await browser?.close();
  for (const { child } of [...children].reverse()) await stop(child);
  if (!(await stat(sandbox)).isDirectory())
    throw new Error("Unexpected browser fixture root.");
  await rm(sandbox, { recursive: true, force: true, maxRetries: 3 });
  await writeFile(
    resolve(
      evidence,
      localSuite ? "browser-local.json" : "browser-portable.json",
    ),
    JSON.stringify(feature, null, 2) + "\n",
  );
}
