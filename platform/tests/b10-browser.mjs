import { chooseProjectExport, revealTemplates } from "./project-editor-ui.mjs";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { canonical, fingerprint } from "../packages/build-core/store.ts";
import { sectionRecipes } from "../packages/build-core/sections.ts";

const repo = resolve(import.meta.dirname, "../..");
const base = "http://127.0.0.1:5200";
const evidence = resolve(repo, ".motionux-v9/evidence/build-b10");
const tests = resolve(repo, ".motionux-v9/build-tests");
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const local = process.argv.includes("--local");
const studioOnly = process.argv.includes("--studio-only");
const trace = process.argv.includes("--trace");
const run = promisify(execFile);
const processes = [];
const report = { version: "", studio: {}, run: {}, exports: [], recipes: {} };
const deviceColumns = (app) => [["Desktop", app.id === "crm" ? 2 : 3], ["Tablet", app.id === "crm" ? 1 : 2], ["Mobile", 1]];
const columnsFor = (app, width) => deviceColumns(app)[width < 640 ? 2 : width < 900 ? 1 : 0][1];
const targetTask = "Prepare the launch checklist";
const cases = [
  { id: "marketing", starter: "Hotel Marketing", adapter: "marketing-demo-v1", preset: "editorial", heading: "A quieter shore.",
    layout: "social-proof", sections: [["Home", "social-proof"], ["About", "editorial-hero"], ["Rooms", "media-story"], ["Rooms", "stay-options"], ["Contact", "questions"]], formats: [false, true] },
  { id: "crm", starter: "Sales CRM", adapter: "crm-demo-v1", preset: "precision", heading: "Sales overview",
    layout: "metrics", sections: [["Sales overview", "welcome"], ["Sales overview", "metrics"], ["Pipeline", "sales-workbench"], ["Contacts", "contact-directory"]], formats: [false] },
  { id: "knowledge", starter: "Knowledge Base", adapter: "knowledge-demo-v1", preset: "warm", heading: "Handbook",
    sections: [["Handbook", "reference"]], formats: [false] },
  { id: "operations", starter: "Operations Workspace", adapter: "operations-demo-v1", preset: "warm", heading: "Operations overview",
    sections: [["Runbooks", "work-queue"], ["Runbooks", "team-response"]], formats: [true] },
];
const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const heading = (scope, name) => scope.getByRole("heading", { name, exact: true });
const props = (page) => page.getByRole("complementary", { name: "Properties" });
const article = (scope, value) => scope.locator("summary:visible").filter({ hasText: value });
const section = (scope, key) => scope.locator('[data-recipe="' + key + '"]:visible');
const pageButton = (page, title) => page.getByRole("navigation", { name: "Project pages" })
  .getByRole("button", { name: new RegExp("^" + title + "(?:\\s|$)") });
const canvasOf = (page) => page.getByRole("region", { name: "Application canvas" });

function start(args, cwd = repo) {
  const child = spawn(process.execPath, args, { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  const item = { child, result: once(child, "close"), log: "" };
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (line) => { item.log = (item.log + line).slice(-6000); });
  processes.push(item);
  return item;
}
async function stop(item) {
  if (item.child.exitCode !== null || item.child.signalCode) return;
  try { process.kill(-item.child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  if (await Promise.race([item.result.then(() => true), delay(3500).then(() => false)])) return;
  try { process.kill(-item.child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  await item.result;
}
const response = (url) => fetch(url, { signal: AbortSignal.timeout(500) }).catch(() => null);
async function ready(url, item) {
  for (let count = 0; count < 120; count++) {
    if (item.child.exitCode !== null) break;
    if ((await response(url))?.ok) return;
    await delay(200);
  }
  throw new Error(item.log || "Server did not respond.");
}
async function checkColumns(scope, key, expected) {
  const grid = section(scope, key).locator(".creator-section-grid");
  await expect.poll(() => grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(expected);
}
function flag(key, surface) {
  report.recipes[key] ??= {};
  report.recipes[key][surface] = true;
}
async function setPreset(page, app) {
  const canvas = canvasOf(page);
  const started = props(page).getByText("Design identity", { exact: true });
  await started.click();
  const application = canvas.locator(".site:visible,.hotel:visible");
  const palettes = new Set();
  for (const candidate of ["editorial", "precision", "warm"]) {
    await props(page).getByLabel("Design preset").selectOption(candidate);
    await button(props(page), "Preview preset").click();
    await expect(application).toHaveAttribute("data-project-identity", candidate);
    palettes.add(await application.evaluate((root) => getComputedStyle(root).backgroundColor));
  }
  assert.equal(palettes.size, 3, "Each preset changes the computed project palette");
  await props(page).getByLabel("Design preset").selectOption(app.preset);
  await button(props(page), "Preview preset").click();
  await expect(application).toHaveAttribute("data-project-identity", app.preset);
  await expect(button(page, "Save")).toBeDisabled();
  await button(canvas, "Close style preview").click();
  await expect(application).not.toHaveAttribute("data-project-identity", app.preset);
  await button(props(page), "Apply preset").click();
  await expect(application).toHaveAttribute("data-project-identity", app.preset);
  await button(page, "Undo").click();
  await expect(application).not.toHaveAttribute("data-project-identity", app.preset);
  await button(page, "Redo").click();
  await expect(application).toHaveAttribute("data-project-identity", app.preset);
}
async function insertSections(page, app) {
  let current;
  for (const [title, key] of app.sections) {
    if (title !== current) {
      await pageButton(page, title).click();
      await button(page, "Sections").click();
      current = title;
    }
    const name = sectionRecipes[key].name[0];
    const choices = page.locator(".creator-section-card");
    const record = choices.filter({ has: page.getByText(name, { exact: true }) });
    await record.getByRole("button", { name: new RegExp("^" + name) }).first().click();
    await expect(record.locator(".creator-section-sample [data-recipe]")).toHaveAttribute("data-recipe", key);
    await button(page, "Insert " + name).click();
    const editSection = section(canvasOf(page), key);
    await expect(editSection).toBeVisible();
    const firstTitle = editSection.locator(".creator-section-grid h2").first();
    await expect(firstTitle).toBeVisible();
    assert(await firstTitle.evaluate((node) => {
      for (let el = node; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (style.opacity === "0" || style.visibility === "hidden") return false;
      }
      return true;
    }), key + ": section descendants must paint in Edit");
    flag(key, "Edit");
    await button(page, "Interact").click();
    await expect(section(canvasOf(page), key)).toBeVisible();
    flag(key, "Interact");
    await button(page, "Edit").click();
  }
}
async function tuneLayout(page, app) {
  const canvas = canvasOf(page);
  const key = app.layout;
  const name = sectionRecipes[key].name[0];
  await pageButton(page, app.sections[0][0]).click();
  await props(page).getByRole("button", { name: new RegExp("\\. " + name + "$") }).click();
  await props(page).getByLabel("Section layout").selectOption("grid");
  await props(page).getByLabel("Surface").selectOption("tinted");
  for (const [device, columns] of deviceColumns(app)) {
    await button(canvas, device).click();
    const resize = props(page).getByRole("combobox", { name: "Columns", exact: true });
    await resize.selectOption(String(columns));
    await checkColumns(canvas, key, columns);
  }
  await props(page).getByRole("combobox", { name: "Columns", exact: true }).selectOption("2");
  await checkColumns(canvas, key, 2);
  await button(props(page), "Reset this override").click();
  await checkColumns(canvas, key, 1);
  await button(page, "Undo").click();
  await checkColumns(canvas, key, 2);
  await button(page, "Redo").click();
  await checkColumns(canvas, key, 1);
  await props(page).getByRole("combobox", { name: "Columns", exact: true }).selectOption("1");
  // Duplicating a section assigns new IDs to its slot and all children.
  await button(props(page), "Duplicate block").click();
  await expect(section(canvas, key)).toHaveCount(2);
  const ids = await section(canvas, key).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-block-id")));
  assert.equal(new Set(ids).size, 2);
  await button(props(page), "Move block up").press("Enter");
  await expect(section(canvas, key).first()).toHaveAttribute("data-block-id", ids[1]);
  await button(props(page), "Remove block").click();
  await expect(section(canvas, key)).toHaveCount(1);
  await button(page, "Interact").click();
  for (const [device, columns] of deviceColumns(app)) {
    await button(canvas, device).click();
    await checkColumns(canvas, key, columns);
  }
  await button(page, "Edit").click();
  await button(canvas, "Desktop").click();
  const selectedSection = section(canvas, key);
  const firstTitle = selectedSection.locator(".creator-section-grid h2").first();
  await expect(firstTitle).toBeVisible();
  await firstTitle.evaluate((node) => node.scrollIntoView({ block: "center", inline: "nearest" }));
  await expect(firstTitle).toBeInViewport();
  await page.screenshot({ path: resolve(evidence, app.id + "-section-editor.png") });
  if (app.id === "crm") {
    const amount = selectedSection.locator(".hotel-metric strong").first();
    assert(await amount.evaluate((node) => {
      const text = document.createRange();
      text.selectNodeContents(node);
      const row = text.getBoundingClientRect();
      return text.getClientRects().length === 1 && row.width <= node.closest(".hotel-metric").clientWidth;
    }), "The CRM total must fit on one line inside a narrow section");
  }
  await selectedSection.screenshot({ path: resolve(evidence, app.id + "-section-detail.png") });
  if (app.id === "marketing") {
    await page.setViewportSize({ width: 320, height: 844 });
    await button(page.getByRole("navigation", { name: "Editor panes" }), "Properties").click();
    await props(page).getByLabel("Editing size").selectOption("mobile");
    await props(page).getByRole("combobox", { name: "Columns", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(evidence, "marketing-section-320.png") });
    await page.setViewportSize({ width: 1440, height: 900 });
    await props(page).getByLabel("Editing size").selectOption("base");
    await button(page, "Interact").click();
    await button(page, "Edit").click();
  }
}
async function authorHelp(page) {
  const canvas = canvasOf(page);
  for (const [title, route] of [["Dispatch notes", "/dispatch-notes"], ["Shift notes", "/shift-notes"]]) {
    await button(page, "Add page").click();
    const dialog = page.getByRole("dialog", { name: "Add page" });
    await dialog.getByLabel("Page name").fill(title);
    await dialog.getByLabel("Route").fill(route);
    await dialog.getByLabel("Page pattern").selectOption("reference");
    await button(dialog, "Create page").click();
    await expect(heading(canvas, title)).toBeVisible();
  }
  await props(page).getByRole("button", { name: "2. Article library" }).click();
  await props(page).getByText("Content items", { exact: true }).click();
  await button(props(page), "Add guide").click();
  const row = props(page).getByRole("group", { name: "New guide" });
  await row.getByLabel("Item text").fill("Record the handover checklist and confirm the room.");
  await row.getByLabel("Tag").fill("Handover");
  await row.getByLabel("Item title").fill("End of shift");
  await button(page, "Interact").click();
  await verifyHelp(canvas);
  await pageButton(page, "Dispatch notes").click();
  await expect(article(canvas, "End of shift")).toHaveCount(0);
  await button(page, "Edit").click();
}
async function verifyHelp(scope) {
  const library = scope.locator(".workspace-library:visible");
  await library.getByRole("searchbox", { name: "Search guides" }).fill("handover");
  await expect(article(library, "End of shift")).toBeVisible();
  await article(library, "End of shift").press("Enter");
  await expect(library.getByText("Record the handover checklist and confirm the room.")).toBeVisible();
}
async function authorTasks(page) {
  await props(page).getByText("Task collection", { exact: true }).click();
  await button(props(page), "Add task").click();
  const row = props(page).getByRole("group", { name: "New task" });
  await row.getByLabel("Owner label").fill("Jordan Ellis");
  await row.getByRole("combobox", { name: "Priority", exact: true }).selectOption("high");
  await row.getByLabel("Task title").fill(targetTask);
  await pageButton(page, "Work queue").click();
  await button(page, "Interact").click();
  const canvas = canvasOf(page);
  await button(canvas, "Complete " + targetTask).press("Enter");
  await pageButton(page, "Operations overview").click();
  await checkTasks(canvas, 1);
  await button(page, "Edit").click();
}
async function checkTasks(scope, completed) {
  const totals = scope.locator('.workspace-totals[aria-label="Queue summary"]:visible');
  await expect(totals.locator("dd")).toHaveText([String(5 - completed), String(completed), "5"]);
}
async function editMedia(page) {
  await props(page).getByRole("button", { name: "2. Editorial hero" }).click();
  const image = props(page).getByLabel("Block image");
  await image.selectOption("seed-pool");
  await props(page).getByLabel("Image alt text").fill("Olive trees beside a stone pool");
  await props(page).getByLabel("Image focal position").selectOption("bottom");
  await props(page).getByLabel("Image fit").selectOption("contain");
  const photo = canvasOf(page).locator('[data-marketing-block="HeroEditorial"] img').first();
  await expect(photo).toHaveAttribute("alt", "Olive trees beside a stone pool");
  assert.equal(await photo.evaluate((node) => getComputedStyle(node).objectFit), "contain");
}
async function stage(page, app, work) {
  const time = performance.now();
  await page.goto(base + "/build");
  await revealTemplates(page);
  await button(page, "New " + app.starter).click();
  const canvas = canvasOf(page);
  await expect(heading(canvas, app.heading)).toBeVisible();
  await setPreset(page, app);
  await insertSections(page, app);
  if (app.layout) await tuneLayout(page, app);
  if (app.id === "marketing") await editMedia(page);
  if (app.id === "knowledge") await authorHelp(page);
  if (app.id === "operations") await authorTasks(page);
  const id = new URL(page.url()).searchParams.get("project");
  const saving = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith("/api/build/" + id));
  await button(page, "Save").click();
  const savedResponse = await saving;
  const saved = await savedResponse.json();
  assert.equal(savedResponse.status(), 200, JSON.stringify(saved));
  const digest = fingerprint(canonical(saved.document));
  await page.reload();
  await expect(canvas.locator(".site:visible,.hotel:visible")).toHaveAttribute("data-project-identity", app.preset);
  assert.equal(saved.revision, 1);
  report.studio[app.id] = { revision: saved.revision, digest, journeyMs: Math.round(performance.now() - time) };
  await page.screenshot({ path: resolve(evidence, app.id + "-editor.png") });
  if (local && !studioOnly) await verifyRun(page, app, saved, digest);
  if (studioOnly) return [];
  const archives = [];
  for (const pwa of app.formats) {
    const download = page.waitForEvent("download");
    await chooseProjectExport(page, pwa);
    const path = resolve(work, app.id + (pwa ? "-pwa" : "") + ".zip");
    await (await download).saveAs(path);
    archives.push({ app, saved, digest, path, pwa });
  }
  return archives;
}
async function verifyRun(page, app, saved, digest) {
  const start = performance.now();
  await button(page, "Run").click();
  const frame = page.frameLocator('iframe[title="Live Next.js application"]');
  await expect(frame.locator(".site,.hotel")).toHaveAttribute("data-project-identity", app.preset, { timeout: 120_000 });
  const state = await page.evaluate(() => fetch("/api/build/preview").then((r) => r.json()));
  assert.equal(state.documentDigest, digest);
  assert.equal(state.revision, saved.revision);
  assert(state.peakBytes > 0 && state.peakBytes <= 850 * 1024 ** 2);
  report.run[app.id] = { ms: Math.round(performance.now() - start), bytes: state.peakBytes, digest };
  for (const [title, key] of app.sections) {
    await pageButton(page, title).click();
    await expect(section(frame, key)).toBeVisible();
    flag(key, "Run");
  }
  if (app.layout) {
    await pageButton(page, app.sections[0][0]).click();
    for (const [device, columns] of deviceColumns(app)) {
      await button(canvasOf(page), device).click();
      await checkColumns(frame, app.layout, columns);
    }
    await button(canvasOf(page), "Desktop").click();
  }
  if (app.id === "knowledge") {
    await pageButton(page, "Shift notes").click();
    await verifyHelp(frame);
  }
  if (app.id === "operations") {
    await pageButton(page, "Work queue").click();
    await button(frame, "Complete " + targetTask).click();
    await pageButton(page, "Operations overview").click();
    await checkTasks(frame, 1);
  }
  await button(page, "Stop").click();
  await expect.poll(() => page.evaluate(() => fetch("/api/build/preview").then((r) => r.json()).then(({ status }) => status))).toBe("idle");
  await button(page, "Edit").click();
}
function routeFor(document, key) {
  return document.pages.find((page) => page.blocks.some((block) => block.props.sectionRecipe?.id === key)).route;
}
async function audit(page, route, theme) {
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations;
  assert.deepEqual(violations.filter(({ impact }) => impact === "serious" || impact === "critical")
    .map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), [], route + " " + theme);
}
async function desktopVitals(page, url) {
  await page.addInitScript(() => {
    globalThis.motionuxVitals = { lcp: 0, cls: 0 };
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint"))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) globalThis.motionuxVitals.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift"))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) globalThis.motionuxVitals.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
  });
  assert((await page.goto(url))?.ok());
  await expect.poll(() => page.evaluate(() => globalThis.motionuxVitals.lcp)).toBeGreaterThan(0);
  const vitals = await page.evaluate(() => ({
    ...globalThis.motionuxVitals,
    js: performance.getEntriesByType("resource").filter((r) => new URL(r.name).pathname.endsWith(".js")).reduce((n, r) => n + r.encodedBodySize, 0),
  }));
  assert(vitals.lcp <= 2500 && vitals.cls <= 0.1 && vitals.js <= 512 * 1024, JSON.stringify(vitals));
  return vitals;
}
async function mobileProfile(browser, origin, app) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
    reducedMotion: "reduce", colorScheme: "dark",
  });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 60, downloadThroughput: 200000, uploadThroughput: 75000,
    });
    const vitals = await desktopVitals(page, origin);
    if (app.id === "marketing") {
      const image = page.getByRole("img", { name: "Olive trees beside a stone pool" });
      await expect.poll(() => image.evaluate((node) => node.currentSrc)).toMatch(/-360\.webp$/);
    }
    const menu = button(page, "Menu");
    await menu.evaluate((element) => {
      window.motionuxTap = null;
      element.addEventListener("click", (event) => {
        const start = event.timeStamp;
        requestAnimationFrame(() => requestAnimationFrame(() => { window.motionuxTap = performance.now() - start; }));
      }, { once: true });
    });
    await menu.tap();
    if (app.id === "marketing") await expect(menu).toHaveAttribute("aria-expanded", "true");
    else await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.motionuxTap)).toBeGreaterThan(0);
    return { ...vitals, clickToSecondFrameMs: Math.round(await page.evaluate(() => window.motionuxTap)), cpu: 4, networkMs: 60, width: 390 };
  } finally {
    await context.close();
  }
}
async function verifyExport(archive, work) {
  const { app, pwa, path, digest, saved } = archive;
  const label = app.id + (pwa ? "-pwa" : "-next");
  const source = resolve(work, label);
  await mkdir(source);
  await run("unzip", ["-q", path, "-d", source]);
  const manifestBytes = await readFile(resolve(source, "motionux-manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.documentDigest, digest);
  assert.equal(manifest.revision, 1);
  assert.equal(manifest.dataAdapter, app.adapter);
  assert.equal(Boolean(manifest.pwa), pwa);
  for (const { path, sha256 } of manifest.files)
    assert.equal(fingerprint(await readFile(resolve(source, path))), sha256);
  const started = performance.now();
  for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "typecheck"], ["run", "build"]])
    await run("npm", args, { cwd: source, timeout: 165_000, maxBuffer: 1_000_000, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } })
      .catch((error) => { throw new Error(error.stdout + "\n" + error.stderr); });
  const detail = { label, documentDigest: digest, zipSha: fingerprint(await readFile(path)),
    manifestSha: fingerprint(manifestBytes), sourceDigest: manifest.digest, files: manifest.files.length, buildMs: Math.round(performance.now() - started), engines: [] };
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = String(socket.address().port);
  await new Promise((done) => socket.close(done));
  const origin = "http://127.0.0.1:" + port;
  const server = start(["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port], source);
  await ready(origin, server);
  for (const engine of local ? [chromium, firefox, webkit] : [chromium]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", colorScheme: "light" });
      const page = await context.newPage();
      if (engine === chromium) detail.vitals = await desktopVitals(page, origin);
      else assert((await page.goto(origin))?.ok());
      await expect(heading(page, app.heading)).toBeVisible();
      await expect(page.locator(".site,.hotel")).toHaveAttribute("data-project-identity", app.preset);
      for (const [, key] of app.sections) {
        const route = routeFor(saved.document, key);
        await page.goto(origin + route);
        await expect(section(page, key)).toBeVisible();
        flag(key, pwa ? "PWA" : "ZIP");
        if (engine === chromium && key === (app.layout ?? app.sections[0][1])) {
          for (const theme of ["light", "dark"]) {
            await page.emulateMedia({ colorScheme: theme });
            await audit(page, route, theme);
          }
        }
      }
      if (app.layout) {
        await page.goto(origin);
        for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 });
          await checkColumns(page, app.layout, columnsFor(app, width));
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ": " + width);
        }
      }
      if (app.id === "marketing") {
        const photo = page.getByRole("img", { name: "Olive trees beside a stone pool" });
        await expect(photo).toBeVisible();
        await expect.poll(() => photo.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
        assert.equal(await photo.evaluate((node) => getComputedStyle(node).objectFit), "contain");
        if (pwa && engine === chromium) {
          await expect(page.getByText("Available offline", { exact: true })).toBeVisible({ timeout: 35_000 });
          await context.setOffline(true);
          assert((await page.goto(origin))?.fromServiceWorker());
          await expect.poll(() => photo.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
          await checkColumns(page, app.layout, 3);
          await context.setOffline(false);
          detail.offline = true;
        }
      }
      if (app.id === "crm") {
        await page.goto(origin + "/contacts");
        await expect(heading(page, "Contacts")).toBeVisible();
        await expect(page.getByRole("table").first()).toBeVisible();
      }
      if (app.id === "knowledge") {
        await page.goto(origin + "/shift-notes");
        await verifyHelp(page);
        await page.goto(origin + "/dispatch-notes");
        await expect(article(page, "End of shift")).toHaveCount(0);
      }
      if (app.id === "operations" && engine === chromium) {
        await page.goto(origin + "/queue");
        await expect(page.getByText("Available offline", { exact: true })).toBeVisible({ timeout: 35_000 });
        await context.setOffline(true);
        assert((await page.goto(origin + "/queue"))?.fromServiceWorker());
        await button(page, "Complete " + targetTask).click();
        await page.reload();
        await expect(button(page, "Reopen " + targetTask)).toBeVisible();
        assert((await page.goto(origin))?.fromServiceWorker());
        await checkTasks(page, 1);
        await context.setOffline(false);
        detail.offline = true;
      }
      if (engine === chromium) {
        const path = app.layout ? "/" : routeFor(saved.document, app.sections[0][1]);
        for (const [width, color] of [[1440, "light"], [390, "dark"]]) {
          await page.emulateMedia({ colorScheme: color });
          await page.setViewportSize({ width, height: 900 });
          await page.goto(origin + path);
          await page.screenshot({ path: resolve(evidence, label + "-" + width + ".png"), fullPage: true });
        }
      }
      if (engine === chromium) detail.mobileProfile = await mobileProfile(browser, origin, app);
      detail.engines.push(engine.name());
    } finally { await browser.close(); }
  }
  report.exports.push(detail);
  await stop(server);
  await rm(source, { recursive: true, force: true });
}

await mkdir(evidence, { recursive: true, mode: 0o700 });
await mkdir(tests, { recursive: true, mode: 0o700 });
const work = await mkdtemp(resolve(tests, "b10-"));
let browser;
try {
  assert(!(await response(base)), "Free Studio port 5200 before launching a disposable fixture.");
  const service = start(["platform/start.mjs", "--built", "--fixture=" + fixture]);
  await ready(base, service);
  browser = await chromium.launch();
  report.version = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: "reduce", colorScheme: "light" });
  if (trace) await page.context().tracing.start({ screenshots: true, snapshots: true, sources: false });
  const errors = [];
  page.setDefaultTimeout(9000);
  page.on("pageerror", (error) => errors.push(error.message));
  const archives = [];
  for (const app of cases) {
    console.log("B10 Studio", app.id);
    try { archives.push(...await stage(page, app, work)); }
    catch (error) {
      await page.screenshot({ path: resolve(evidence, app.id + "-failure.png") }).catch(() => {});
      throw error;
    }
  }
  assert.deepEqual(errors, []);
  if (trace) await page.context().tracing.stop({ path: resolve(evidence, "creator-trace.zip") });
  await browser.close();
  browser = undefined;
  await stop(service);
  for (const archive of archives) await verifyExport(archive, work);
  console.log("B10 Creator acceptance", JSON.stringify(report));
} finally {
  await browser?.close();
  for (const service of processes.reverse()) await stop(service);
  await rm(work, { recursive: true, force: true });
  await rm(resolve(tests, fixture), { recursive: true, force: true });
  await writeFile(resolve(evidence, "browser.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
}
