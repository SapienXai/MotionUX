import { chooseProjectExport, revealTemplates } from "./project-editor-ui.mjs";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
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

const repo = resolve(import.meta.dirname, "../..");
const studio = "http://127.0.0.1:5200";
const evidence = resolve(repo, ".motionux-v9/evidence/build-b9");
const tests = resolve(repo, ".motionux-v9/build-tests");
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const local = process.argv.includes("--local");
const applications = [
  { action: "New Knowledge Base", adapter: "knowledge-demo-v1", name: "Fieldnotes Handbook", home: "Handbook", authored: "Fieldnotes orientation" },
  { action: "New Operations Workspace", adapter: "operations-demo-v1", name: "Relay Operations", home: "Operations overview", authored: "Relay orientation", pwa: true },
];
const exec = promisify(execFile);
const services = [];
const evidenceReport = { studio: [], run: [], export: [] };
const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const heading = (scope, name) => scope.getByRole("heading", { name, exact: true });
const projectPage = (page, title) => page.getByRole("navigation", { name: "Project pages" })
  .getByRole("button", { name: new RegExp("^" + title + "(?:\\s|$)") });
const runtimeLink = (scope, title) => scope.locator(".hotel-links").getByRole("link", { name: title, exact: true });
const guide = "Team guide";
const guideRoute = "/team-guide";
const task = "Verify dispatch checklist";
const body = "Read the orientation guide before your first shift.";

function start(args, cwd = repo) {
  const child = spawn(process.execPath, args, {
    cwd, detached: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  const state = { child, closed: once(child, "close"), output: "" };
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => { state.output = (state.output + chunk).slice(-6000); });
  services.push(state);
  return state;
}

async function stop(service) {
  if (service.child.exitCode !== null || service.child.signalCode) return;
  process.kill(-service.child.pid, "SIGTERM");
  if (await Promise.race([service.closed.then(() => true), delay(3500).then(() => false)])) return;
  process.kill(-service.child.pid, "SIGKILL");
  await service.closed;
}

async function responding(url) {
  return fetch(url, { signal: AbortSignal.timeout(500) }).catch(() => null);
}

async function ready(url, service) {
  for (let i = 0; i < 120; i++) {
    if (service.child.exitCode !== null) break;
    if ((await responding(url))?.ok) return;
    await delay(200);
  }
  throw new Error(service.output || "Application is unavailable at " + url);
}

async function verifyLibrary(scope, authored) {
  await expect(heading(scope, guide)).toBeVisible();
  const library = scope.locator(".workspace-library:visible");
  const search = library.getByRole("searchbox", { name: "Search guides" });
  await search.fill("No matched article");
  await expect(library.getByText("No matching guides.", { exact: true })).toBeVisible();
  await search.fill("orientation");
  await expect(library.getByRole("status").filter({ hasText: /^1 guide$/ })).toBeVisible();
  await expect(library.locator("summary").filter({ hasText: "Update a procedure" })).toHaveCount(0);
  const summary = library.locator("summary").filter({ hasText: authored });
  await summary.press("Enter");
  await expect(library.getByText(body, { exact: true })).toBeVisible();
  await summary.press("Space");
  await expect(library.locator("details[open]")).toHaveCount(0);
}

async function completeTask(scope) {
  await expect(heading(scope, "Work queue")).toBeVisible();
  const filter = scope.getByRole("combobox", { name: "Task status" });
  await filter.selectOption("completed");
  await expect(scope.getByText("No tasks in this view.", { exact: true })).toBeVisible();
  await filter.selectOption("open");
  await button(scope, "Complete " + task).press("Enter");
  await expect(filter).toBeFocused();
  await expect(scope.getByRole("status").filter({ hasText: "Task completed." })).toBeVisible();
  await filter.selectOption("completed");
  await expect(scope.getByRole("table", { name: "Assigned tasks" }).getByRole("row")).toHaveCount(2);
  await expect(button(scope, "Reopen " + task)).toBeVisible();
}

async function checkSummary(scope, completed = 1) {
  const totals = scope.locator('.workspace-totals[aria-label="Queue summary"]:visible');
  await expect(totals.locator("dd")).toHaveText([String(4 - completed), String(completed), "4"]);
}

async function checkResponse(scope) {
  await expect(heading(scope, "Feedback")).toBeVisible();
  const input = scope.getByRole("textbox", { name: "Your response" });
  const submit = button(scope, "Validate response");
  await submit.click();
  assert.equal(await input.evaluate((element) => element.validity.valueMissing), true);
  await input.fill("   ");
  await submit.click();
  assert.equal(await input.evaluate((element) => element.validity.customError), true);
  await input.fill("A useful example for new team members.");
  await submit.click();
  await expect(scope.getByRole("status").filter({ hasText: "Response is valid. It was not sent." })).toBeVisible();
  await expect(input).toHaveValue("");
}

async function createProject(page, app, work) {
  await page.goto(studio + "/build");
  await revealTemplates(page);
  await button(page, app.action).click();
  const canvas = page.getByRole("region", { name: "Application canvas" });
  await expect(heading(canvas, app.home)).toBeVisible();
  const id = new URL(page.url()).searchParams.get("project");
  assert.match(id, /^[a-f0-9]{32}$/);
  await button(page, "Add page").click();
  const dialog = page.getByRole("dialog", { name: "Add page" });
  await dialog.getByLabel("Page name").fill(guide);
  await dialog.getByLabel("Route").fill("/");
  const patterns = dialog.getByLabel("Page pattern");
  await expect(patterns.locator('option[value="queue"]')).toHaveCount(app.pwa ? 1 : 0);
  await patterns.selectOption("reference");
  await expect(patterns).toHaveAccessibleDescription("Add editable, searchable guides and procedures.");
  if (local) await page.screenshot({ path: resolve(evidence, app.adapter + "-pattern.png") });
  await button(dialog, "Create page").click();
  await expect(dialog.getByRole("alert")).toContainText("Use a unique route");
  await dialog.getByLabel("Route").fill(guideRoute);
  await button(dialog, "Create page").click();
  await expect(heading(canvas, guide)).toBeVisible();
  await button(page, "2. Article library").click();
  const properties = page.getByRole("complementary", { name: "Properties" });
  await properties.getByText("Content items", { exact: true }).click();
  const item = properties.getByRole("group", { name: "Start here" });
  await item.getByLabel("Item text").fill(body);
  const started = performance.now();
  await item.getByLabel("Item title").fill(app.authored);
  await expect(canvas.locator("summary:visible").filter({ hasText: app.authored })).toBeVisible();
  const editMs = Math.round(performance.now() - started);
  assert(editMs <= 500, "Canvas edit budget");
  await button(page, "Undo").click();
  await expect(canvas.locator("summary:visible").filter({ hasText: "Start here" })).toBeVisible();
  await button(page, "Redo").click();
  await expect(canvas.locator("summary:visible").filter({ hasText: app.authored })).toBeVisible();
  await button(page, "Interact").click();
  await verifyLibrary(canvas, app.authored);
  if (app.pwa) {
    await runtimeLink(canvas, "Work queue").click();
    await completeTask(canvas);
    await runtimeLink(canvas, app.home).click();
    await checkSummary(canvas);
  } else {
    await runtimeLink(canvas, "Feedback").click();
    await checkResponse(canvas);
  }
  await projectPage(page, guide).click();
  const writing = page.waitForResponse((reply) => reply.url().endsWith("/api/build/" + id) && reply.request().method() === "PUT");
  await button(page, "Save").click();
  const reply = await writing;
  const saved = await reply.json();
  assert.equal(reply.status(), 200, JSON.stringify(saved));
  await expect(button(page, "Save")).toBeDisabled();
  assert.equal(saved.revision, 1);
  const added = saved.document.pages.find(({ route }) => route === guideRoute);
  assert.deepEqual(added.pattern, { id: "reference", version: 1 });
  assert.equal(added.blocks[1].props.articles.records[0].title, app.authored);
  await page.reload();
  await projectPage(page, guide).click();
  await expect(canvas.locator("summary:visible").filter({ hasText: app.authored })).toBeVisible();
  evidenceReport.studio.push({ template: app.name, routes: saved.document.pages.length, editMs });
  if (local) {
    const launch = performance.now();
    await button(page, "Run").click();
    const run = page.frameLocator('iframe[title="Live Next.js application"]');
    await expect(heading(run, guide)).toBeVisible({ timeout: 120_000 });
    const readyMs = Math.round(performance.now() - launch);
    await verifyLibrary(run, app.authored);
    if (app.pwa) {
      await runtimeLink(run, "Work queue").click();
      await completeTask(run);
      await runtimeLink(run, app.home).click();
      await checkSummary(run);
    } else {
      await runtimeLink(run, "Feedback").click();
      await checkResponse(run);
    }
    await runtimeLink(run, guide).click();
    await expect(heading(run, guide)).toBeVisible();
    const state = await page.evaluate(() => fetch("/api/build/preview").then((reply) => reply.json()));
    assert.equal(state.id, id);
    assert.equal(state.revision, saved.revision);
    assert(state.peakBytes > 0 && state.peakBytes <= 850 * 1024 ** 2);
    evidenceReport.run.push({ template: app.name, readyMs, peakBytes: state.peakBytes });
    await page.screenshot({ path: resolve(evidence, app.adapter + "-run.png") });
    await button(page, "Stop").click();
    await expect.poll(() => page.evaluate(() => fetch("/api/build/preview").then((reply) => reply.json()).then(({ status }) => status))).toBe("idle");
    await button(page, "Edit").click();
  }
  const download = page.waitForEvent("download");
  await chooseProjectExport(page, app.pwa);
  const target = resolve(work, app.adapter + ".zip");
  await (await download).saveAs(target);
  return { target, digest: fingerprint(canonical(saved.document)) };
}

async function verifyResponsive(page) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Page overflow at " + width + "px");
  }
}

async function verifyConsumer(app, site, context, origin, engine) {
  const results = { engine, routes: 0, accessibility: [], offline: false };
  const routes = app.pwa ? [["/", app.home], ["/queue", "Work queue"], ["/runbooks", "Runbooks"], [guideRoute, guide]]
    : [["/", app.home], ["/guides", "Guides"], ["/feedback", "Feedback"], [guideRoute, guide]];
  for (const [route, title] of routes) {
    assert((await site.goto(origin + route))?.ok(), route);
    await expect(heading(site, title)).toBeVisible();
    if (engine === "chromium" && route === "/") {
      results.jsBytes = await site.evaluate(() => performance.getEntriesByType("resource")
        .filter(({ name }) => new URL(name).pathname.endsWith(".js"))
        .reduce((total, entry) => total + entry.encodedBodySize, 0));
      assert(results.jsBytes > 0 && results.jsBytes <= 512 * 1024, "Cold encoded JS budget");
    }
    await verifyResponsive(site);
    results.routes++;
    if (engine === "chromium") {
      for (const colorScheme of ["light", "dark"]) {
        await site.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await expect(site.locator(".hotel")).toHaveAttribute("data-theme", colorScheme);
        const audit = await new AxeBuilder({ page: site }).analyze();
        const failures = audit.violations.filter(({ impact }) => ["critical", "serious"].includes(impact));
        assert.deepEqual(failures.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), [], route + " " + colorScheme);
        results.accessibility.push({ route, colorScheme });
      }
    }
  }
  await verifyLibrary(site, app.authored);
  if (app.pwa) {
    await runtimeLink(site, "Work queue").click();
    await expect(heading(site, "Work queue")).toBeVisible();
    await site.setViewportSize({ width: 390, height: 844 });
    const action = button(site, "Complete " + task);
    const bounds = await action.boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.height >= 44, "Queue action remains reachable without horizontal scroll on mobile");
    await completeTask(site);
    await site.reload();
    await expect(button(site, "Reopen " + task)).toBeVisible();
    await site.setViewportSize({ width: 1440, height: 900 });
    await runtimeLink(site, app.home).click();
    await checkSummary(site);
    if (engine === "chromium") {
      await expect(site.getByText("Available offline", { exact: true })).toBeVisible({ timeout: 35_000 });
      await context.setOffline(true);
      const response = await site.goto(origin + "/queue");
      assert(response?.fromServiceWorker());
      await expect(button(site, "Reopen " + task)).toBeVisible();
      await button(site, "Reopen " + task).press("Enter");
      await expect(button(site, "Complete " + task)).toBeVisible();
      assert((await site.goto(origin))?.fromServiceWorker());
      await checkSummary(site, 0);
      await context.setOffline(false);
      results.offline = true;
    }
  } else {
    await runtimeLink(site, "Feedback").click();
    await checkResponse(site);
  }
  if (engine === "chromium") {
    await site.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await site.goto(origin);
    await expect(heading(site, app.home)).toBeVisible();
    await site.screenshot({ path: resolve(evidence, app.adapter + "-1440.png") });
    await site.setViewportSize({ width: 390, height: 844 });
    await site.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await site.goto(origin + (app.pwa ? "/queue" : guideRoute));
    await expect(heading(site, app.pwa ? "Work queue" : guide)).toBeVisible();
    await site.screenshot({ path: resolve(evidence, app.adapter + "-390.png"), fullPage: true });
  }
  return results;
}

async function buildConsumer(app, artifact, work) {
  const consumer = resolve(work, app.adapter);
  await mkdir(consumer);
  await exec("unzip", ["-q", artifact.target, "-d", consumer]);
  const manifest = JSON.parse(await readFile(resolve(consumer, "motionux-manifest.json"), "utf8"));
  assert.equal(manifest.dataAdapter, app.adapter);
  assert.equal(manifest.documentDigest, artifact.digest);
  assert.equal(manifest.revision, 1);
  assert.equal(Boolean(manifest.pwa), Boolean(app.pwa));
  for (const entry of manifest.files)
    assert.equal(fingerprint(await readFile(resolve(consumer, entry.path))), entry.sha256);
  const build = performance.now();
  for (const args of [
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"],
    ["run", "typecheck"],
    ["run", "build"],
  ]) {
    await exec("npm", args, {
      cwd: consumer, timeout: 155_000, maxBuffer: 1_000_000,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    }).catch((error) => { throw new Error(error.stdout + "\n" + error.stderr); });
  }
  const result = { application: app.name, verifiedFiles: manifest.files.length, buildMs: Math.round(performance.now() - build), browsers: [] };
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = String(socket.address().port);
  const origin = "http://127.0.0.1:" + port;
  await new Promise((done) => socket.close(done));
  const service = start(["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port], consumer);
  await ready(origin, service);
  for (const engine of local ? [chromium, webkit, firefox] : [chromium]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
      const site = await context.newPage();
      result.browsers.push(await verifyConsumer(app, site, context, origin, engine.name()));
    } finally {
      await browser.close();
    }
  }
  evidenceReport.export.push(result);
  await stop(service);
  await rm(consumer, { recursive: true, force: true });
}

await mkdir(evidence, { recursive: true, mode: 0o700 });
await mkdir(tests, { recursive: true, mode: 0o700 });
const work = await mkdtemp(resolve(tests, "b9-export-"));
let browser;
try {
  assert(!(await responding(studio)), "Free Studio port 5200 before launching this fixture.");
  const service = start(["platform/start.mjs", "--built", "--fixture=" + fixture]);
  await ready(studio, service);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const exports = [];
  for (const app of applications) exports.push(await createProject(page, app, work));
  assert.deepEqual(errors, []);
  await browser.close();
  browser = undefined;
  await stop(service);
  for (const [index, app] of applications.entries()) await buildConsumer(app, exports[index], work);
  console.log("B9 page patterns and independent app verification", JSON.stringify(evidenceReport));
} finally {
  await browser?.close();
  for (const service of services.reverse()) await stop(service);
  await rm(work, { recursive: true, force: true });
  await rm(resolve(tests, fixture), { recursive: true, force: true });
  await writeFile(resolve(evidence, "browser.json"), JSON.stringify(evidenceReport, null, 2) + "\n", { mode: 0o600 });
}
