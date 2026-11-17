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
import { fingerprint } from "../packages/build-core/store.ts";
import {
  allMarketingVerified,
  marketingRoutes,
  verifyMarketingBlocks,
  widths,
} from "./marketing-checks.mjs";

const repo = resolve(import.meta.dirname, "../..");
const studio = "http://127.0.0.1:5200";
const evidence = resolve(repo, ".motionux-v9/evidence/build-b8-ready");
const tests = resolve(repo, ".motionux-v9/build-tests");
await mkdir(evidence, { recursive: true, mode: 0o700 });
await mkdir(tests, { recursive: true, mode: 0o700 });
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const work = await mkdtemp(resolve(tests, "b8-export-"));
const local = process.argv.includes("--local");
const exec = promisify(execFile);
const services = [];
const report = {
  editMs: [],
  consumer: [],
  run: false,
  offline: false,
  blocks: {},
};
function start(args, cwd = repo) {
  const child = spawn(process.execPath, args, {
    cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const state = { child, closed: once(child, "close"), output: "" };
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      state.output = (state.output + chunk).slice(-5000);
    });
  services.push(state);
  return state;
}
async function stop(service) {
  if (service.child.exitCode !== null || service.child.signalCode) return;
  try {
    process.kill(-service.child.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  if (
    !(await Promise.race([
      service.closed.then(() => true),
      delay(3500).then(() => false),
    ]))
  ) {
    try {
      process.kill(-service.child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await service.closed;
  }
}
async function ready(url, service) {
  for (let i = 0; i < 140; i++) {
    if (service.child.exitCode !== null) break;
    if (
      await fetch(url, { signal: AbortSignal.timeout(500) }).then(
        (response) => response.ok,
        () => false,
      )
    )
      return;
    await delay(150);
  }
  throw new Error(service.output || "Server failed to start.");
}
const button = (scope, name) =>
  scope.getByRole("button", { name, exact: true });
const heading = (scope, name) =>
  scope.getByRole("heading", { name, exact: true });
async function explore(scope) {
  await scope
    .getByRole("link", { name: "Explore the rooms", exact: true })
    .click();
  await expect(heading(scope, "A room to come back to")).toBeVisible();
  await scope.getByRole("link", { name: /View room Terrace Suite/ }).click();
  await expect(heading(scope, "Terrace Suite")).toBeVisible();
  const photo = button(scope, "View The coast");
  await photo.click();
  const dialog = scope.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "The coast" }),
  ).toBeVisible();
  await button(dialog, "Next image").press("Enter");
  await expect(
    dialog.getByRole("heading", { name: "The suite" }),
  ).toBeVisible();
  await button(dialog, "Next image").press("Escape");
  await expect(photo).toBeFocused();
}

let studioBrowser;
try {
  assert(
    !(await fetch(studio, { signal: AbortSignal.timeout(500) }).then(
      () => true,
      () => false,
    )),
    "Port 5200 is already serving Studio. Free it before running the disposable fixture.",
  );
  const app = start(["platform/start.mjs", "--built", "--fixture=" + fixture]);
  await ready(studio, app);
  studioBrowser = await chromium.launch();
  const context = await studioBrowser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(error.stack));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(message.text());
  });
  if (
    local &&
    (await fetch("http://127.0.0.1:5199/", {
      signal: AbortSignal.timeout(500),
    }).then(
      (response) => response.ok,
      () => false,
    ))
  ) {
    await page.goto(studio + "/discover");
    const frame = page.frameLocator(".studio-discover");
    await expect(
      page.getByRole("link", { name: "Build", exact: true }),
    ).toBeVisible();
    await expect(
      frame.getByRole("status").filter({ hasText: "500 live originals" }),
    ).toBeVisible();
    await expect(
      frame.locator('[data-preview-state="ready"]').first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: resolve(evidence, "unified-gallery.png") });
    await frame
      .getByRole("link", { name: /^Open playground for/ })
      .first()
      .click();
    await expect(
      frame.locator('[data-preview-state="ready"]').first(),
    ).toBeVisible({ timeout: 15_000 });
    await page
      .getByRole("link", { name: "My Library", exact: true })
      .first()
      .click();
    await expect(
      frame.getByRole("heading", { name: "My Library", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Build", exact: true }).click();
    await expect(page).toHaveURL(studio + "/build");
    await page.getByLabel("Studio theme").selectOption("dark");
    await page.getByRole("link", { name: "Gallery", exact: true }).click();
    await expect(frame.locator(".mx-studio")).toHaveAttribute(
      "data-scheme",
      "dark",
    );
    await expect(frame.locator(".mx-studio")).toHaveAttribute(
      "data-embedded",
      "true",
    );
    await page
      .getByRole("searchbox", { name: "Search components" })
      .fill("wheel picker");
    await page
      .getByRole("searchbox", { name: "Search components" })
      .press("Enter");
    await expect(
      frame
        .getByRole("link", { name: /Open playground for .*wheel picker/i })
        .first(),
    ).toBeVisible();
    await page.getByLabel("Studio theme").selectOption("light");
    await expect(frame.locator(".mx-studio")).toHaveAttribute(
      "data-scheme",
      "light",
    );
    await page.getByLabel("Studio theme").selectOption("system");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(frame.locator(".mx-studio")).toHaveAttribute(
      "data-scheme",
      "dark",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await expect(frame.locator(".mx-studio")).toHaveAttribute(
      "data-scheme",
      "light",
    );
    report.gallery = true;
  }
  await page.goto(studio + "/build");
  await button(page, "New Hotel Marketing").click();
  const canvas = page.getByRole("region", { name: "Application canvas" });
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A quieter shore.",
  );
  await button(page, "2. Editorial hero").click();
  const properties = page.getByRole("complementary", { name: "Properties" });
  const title = properties.getByLabel("Block title");
  for (const text of [
    "The spirit of the coast",
    "An afternoon by the sea",
    "An unhurried shore",
    "A quieter bay",
  ]) {
    const started = performance.now();
    await title.fill(text);
    await expect(canvas.locator(".site-hero h1:visible")).toHaveText(text);
    report.editMs.push(Math.round(performance.now() - started));
  }
  await button(page, "Undo").click();
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "An unhurried shore",
  );
  await button(page, "Redo").click();
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A quieter bay",
  );
  await button(page, "2. Editorial hero").click();
  const projectUrl = page.url();
  const projectId = new URL(projectUrl).searchParams.get("project");
  await page.reload();
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A quieter bay",
  );
  await expect(properties.getByLabel("Block title")).toHaveValue(
    "A quieter bay",
  );
  const projectPage = (name) =>
    page
      .getByRole("navigation", { name: "Project pages" })
      .getByRole("button", { name: new RegExp("^" + name + "(?:\\s|$)") });
  await projectPage("Rooms").click();
  await button(page, "2. Split hero").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("link", { name: "Gallery", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/discover/);
  if (report.gallery)
    await expect(
      page.frameLocator(".studio-discover").locator(".mx-studio"),
    ).toHaveAttribute("data-embedded", "true");
  await page.getByRole("link", { name: "Build", exact: true }).click();
  await expect(page).toHaveURL(projectUrl);
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A room to come back to",
  );
  await button(
    page.getByRole("navigation", { name: "Editor panes" }),
    "Properties",
  ).click();
  await expect(properties.getByLabel("Block title")).toHaveValue(
    "A room to come back to",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await projectPage("Home").click();
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A quieter bay",
  );
  await button(page, "2. Editorial hero").click();

  report.draft = await page.evaluate(async (id) => {
    const saved = await fetch("/api/build/" + id).then((response) =>
      response.json(),
    );
    return (
      saved.revision === 0 &&
      saved.document.pages[0].blocks[1].props.title === "A quieter shore."
    );
  }, projectId);
  assert(report.draft);
  const draftEndpoint = "/api/build/" + projectId + "/draft";
  await expect
    .poll(() =>
      page.evaluate(
        (url) =>
          fetch(url)
            .then((response) => response.json())
            .then((draft) => draft?.document.pages[0].blocks[1].props.title),
        draftEndpoint,
      ),
    )
    .toBe("A quieter bay");
  await page.evaluate(
    (id) => localStorage.removeItem("motionux-build-draft-v1:" + id),
    projectId,
  );
  await page.reload();
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A quieter bay",
  );
  await expect(properties.getByLabel("Block title")).toHaveValue(
    "A quieter bay",
  );
  report.vaultDraft = true;
  const media = page.locator(".build-media");
  await media
    .getByLabel("Image file")
    .setInputFiles(
      resolve(
        repo,
        "platform/templates/hotel-marketing/media/seed-pool-720.webp",
      ),
    );
  await media.getByRole("checkbox").check();
  const introduced = page.waitForResponse(
    (response) =>
      response.url().endsWith("/media") &&
      response.request().method() === "POST",
  );
  await button(media, "Import image").click();
  const imageResponse = await introduced;
  assert.equal(imageResponse.status(), 201, imageResponse.statusText());
  await expect(media.getByRole("status")).toContainText("Image is ready");
  const asset = await page.evaluate(async () => {
    const project = new URL(location.href).searchParams.get("project");
    const items = await fetch("/api/build/" + project + "/media").then(
      (response) => response.json(),
    );
    return items.find((item) => item.rights === "uploader-attested");
  });
  assert(asset);
  await properties.getByLabel("Block image").selectOption(asset.id);
  await properties
    .getByLabel("Image alt text")
    .fill("Olive trees surrounding a stone pool");
  await properties.getByLabel("Image focal position").selectOption("bottom");
  await expect(
    canvas.getByRole("img", { name: "Olive trees surrounding a stone pool" }),
  ).toBeVisible();
  // A second, unreferenced upload can be backed up, deleted and restored.
  await media
    .getByLabel("Image file")
    .setInputFiles(
      resolve(
        repo,
        "platform/templates/hotel-marketing/media/seed-room-720.webp",
      ),
    );
  await media.getByRole("checkbox").check();
  await button(media, "Import image").click();
  const second = button(media, "Preview seed-room-720.webp");
  await expect(second).toBeVisible();
  await media.getByText("Media backup", { exact: true }).click();
  const archiveDownload = page.waitForEvent("download");
  await button(media, "Download media backup").click();
  const archivePath = resolve(work, "media.json");
  await (await archiveDownload).saveAs(archivePath);
  const archive = JSON.parse(await readFile(archivePath, "utf8"));
  assert.equal(archive.project, projectId);
  assert.equal(archive.assets.length, 2);
  await second.click();
  const imageDialog = page.getByRole("dialog", { name: "Image preview" });
  await button(imageDialog, "Remove from project").click();
  await expect
    .poll(() =>
      page.evaluate(async (id) => {
        const checkpoint = await fetch("/api/build/" + id + "/draft").then(
          (response) => response.json(),
        );
        return checkpoint?.document.assets.length;
      }, projectId),
    )
    .toBe(4);
  await second.click();
  await button(imageDialog, "Delete image permanently").click();
  const confirmation = page.getByRole("dialog", {
    name: "Delete this image permanently?",
  });
  await expect(button(confirmation, "Keep image")).toBeFocused();
  await button(confirmation, "Delete image").click();
  await expect(second).toHaveCount(0);
  await media.getByLabel("Backup file").setInputFiles(archivePath);
  await button(media, "Restore media backup").click();
  await expect(second).toBeVisible();
  await expect(media.getByRole("status")).toContainText(
    "1 image restored, 1 already present",
  );
  const largeBackup = await page.evaluate(async ({ archive, projectId }) => {
    const response = await fetch("/api/build/" + projectId + "/media/backup", {
      method: "POST",
      headers: { "X-MotionUX-Build": "1", "Content-Type": "application/json" },
      body: JSON.stringify(archive) + " ".repeat(11 * 1024 * 1024),
    });
    return { status: response.status, body: await response.json() };
  }, { archive, projectId });
  assert.deepEqual(largeBackup, { status: 200, body: { restored: 0, existing: 2 } });
  report.mediaRecovery = true;
  await button(page, "7. Frequently asked questions").click();
  await properties.getByText("Content items", { exact: true }).click();
  await properties
    .getByRole("group", { name: "What time is check-in?" })
    .getByLabel("Item text")
    .fill("In this fictional example, check-in begins at 14:30.");
  await button(page, "3. Room collection").click();
  await properties.getByText("Content items", { exact: true }).click();
  await properties
    .getByRole("group", { name: "Terrace Suite" })
    .getByLabel("Item text")
    .fill("42 m² for two with an editorial sea view.");
  await expect(
    canvas.getByText("42 m² for two with an editorial sea view.", {
      exact: true,
    }),
  ).toBeVisible();
  await projectPage("About").click();
  await button(page, "Add Name list").click();
  await properties.getByText("Content items", { exact: true }).click();
  await button(properties, "Add item").click();
  await properties
    .getByLabel("Item title")
    .fill("Fictional Coastal Association");
  for (const mode of ["Edit", "Interact"]) {
    await button(page, mode).click();
    const coverage = new Set();
    for (const [route, label] of marketingRoutes) {
      await projectPage(label).click();
      await verifyMarketingBlocks(canvas, route, coverage);
    }
    report.blocks[mode] = allMarketingVerified(coverage);
  }
  await projectPage("Home").click();
  await button(page, "Edit").click();
  await page.screenshot({ path: resolve(evidence, "creator-edit.png") });
  await button(page, "Interact").click();
  await expect(heading(canvas, "A quieter bay")).toBeVisible();
  await button(page, "2. Editorial hero").click();
  report.interactMs = [];
  for (const text of ["A gentler coast", "A calmer bay", "A quieter bay"]) {
    const start = performance.now();
    await properties.getByLabel("Block title").fill(text);
    await expect(heading(canvas, text)).toBeVisible();
    report.interactMs.push(Math.round(performance.now() - start));
  }
  assert(
    Math.max(...report.editMs) <= 250 && Math.max(...report.interactMs) <= 500,
  );
  const draft = canvas.locator("#site-main");
  const question = draft.getByText("What time is check-in?", { exact: true });
  await question.press("Enter");
  await expect(draft.getByText(/check-in begins at 14:30/)).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "creator-interact.png") });
  await explore(canvas);
  await projectPage("Home").click();
  await button(page, "Save").click();
  await expect(button(page, "Save")).toBeDisabled();
  await page.reload();
  await expect(canvas.locator(".site-hero h1:visible")).toHaveText(
    "A quieter bay",
  );
  if (local) {
    const started = performance.now();
    await button(page, "Run").click();
    const run = page.frameLocator('iframe[title="Live Next.js application"]');
    await expect(heading(run, "A quieter bay")).toBeVisible({
      timeout: 120_000,
    });
    report.runReadyMs = Math.round(performance.now() - started);
    await expect(
      run.getByRole("img", { name: "Olive trees surrounding a stone pool" }),
    ).toBeVisible();
    const coverage = new Set();
    for (const [route, label] of marketingRoutes) {
      await projectPage(label).click();
      await verifyMarketingBlocks(run, route, coverage);
    }
    report.blocks.Run = allMarketingVerified(coverage);
    await projectPage("Home").click();
    const stayed = await run
      .getByRole("img", { name: "Olive trees surrounding a stone pool" })
      .evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth > 0,
      );
    assert(stayed);
    await button(page, "Inspector").click();
    const inspector = page.getByRole("dialog", { name: "Inspector" });
    const checked = page.waitForResponse(
      (reply) => reply.url().endsWith("/inspect"),
      { timeout: 48_000 },
    );
    await button(inspector, "Inspect page").click();
    const inspected = await checked;
    report.inspector = await inspected.json();
    assert.equal(inspected.status(), 200, JSON.stringify(report.inspector));
    await button(inspector, "Close").click();
    await button(page, "Stop").click();
    await button(page, "Edit").click();
    report.run = true;
    report.previewCycles = [];
    const previewState = () =>
      page.evaluate(() =>
        fetch("/api/build/preview").then((response) => response.json()),
      );
    for (let attempt = 0; attempt < 3; attempt++) {
      const started = performance.now();
      await button(page, "Run").click();
      await expect(heading(run, "A quieter bay")).toBeVisible({
        timeout: 120_000,
      });
      const state = await previewState();
      assert(
        state.peakBytes > 0 && state.peakBytes <= 850 * 1024 ** 2,
        "Preview scratch budget",
      );
      report.previewCycles.push({
        readyMs: Math.round(performance.now() - started),
        peakBytes: state.peakBytes,
      });
      await button(page, "Stop").click();
      await expect
        .poll(() => previewState().then((state) => state.status))
        .toBe("idle");
      await button(page, "Edit").click();
    }
    const exportDigests = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const download = page.waitForEvent("download");
      await button(page, "Export").click();
      const file = resolve(work, "source-" + attempt + ".zip");
      await (await download).saveAs(file);
      exportDigests.push(fingerprint(await readFile(file)));
    }
    assert.equal(new Set(exportDigests).size, 1);
    report.repeatExportDigest = exportDigests[0];
  }
  const download = page.waitForEvent("download");
  await button(page, "Export PWA").click();
  const target = resolve(work, "source.zip");
  await (await download).saveAs(target);
  await studioBrowser.close();
  studioBrowser = undefined;
  await stop(app);
  const consumer = resolve(work, "consumer");
  await mkdir(consumer);
  await exec("/usr/bin/unzip", ["-q", target, "-d", consumer]);
  const manifest = JSON.parse(
    await readFile(resolve(consumer, "motionux-manifest.json"), "utf8"),
  );
  for (const entry of manifest.files)
    assert.equal(
      fingerprint(await readFile(resolve(consumer, entry.path))),
      entry.sha256,
    );
  assert(
    manifest.files.some(
      ({ path }) => path === "public/media/" + asset.id + "-720.webp",
    ),
  );
  assert.equal(manifest.pwa.routes.length, 6);
  for (const args of [
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"],
    ["run", "typecheck"],
    ["run", "build"],
  ]) {
    const output = await exec("npm", args, {
      cwd: consumer,
      timeout: 155_000,
      maxBuffer: 1_000_000,
    }).catch((error) => {
      throw new Error(error.stdout + "\n" + error.stderr);
    });
    if (args.includes("build")) report.build = output.stdout;
  }
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const origin = "http://127.0.0.1:" + socket.address().port;
  await new Promise((done) => socket.close(done));
  const standalone = start(
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      origin.split(":").at(-1),
    ],
    consumer,
  );
  await ready(origin, standalone);
  for (const engine of local ? [chromium, webkit, firefox] : [chromium]) {
    const browser = await engine.launch();
    try {
      const consumerContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      const site = await consumerContext.newPage();
      await site.addInitScript(() => {
        const report = (globalThis.__motionuxMetrics = { lcp: 0, cls: 0 });
        if (
          PerformanceObserver.supportedEntryTypes.includes(
            "largest-contentful-paint",
          )
        )
          new PerformanceObserver((entries) => {
            for (const entry of entries.getEntries())
              report.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        if (PerformanceObserver.supportedEntryTypes.includes("layout-shift"))
          new PerformanceObserver((entries) => {
            for (const entry of entries.getEntries())
              if (!entry.hadRecentInput) report.cls += entry.value;
          }).observe({ type: "layout-shift", buffered: true });
      });
      await site.goto(origin);
      await expect(heading(site, "A quieter bay")).toBeVisible();
      await expect(
        site.getByText("Available offline", { exact: true }),
      ).toBeVisible({ timeout: 35_000 });
      if (engine.name() === "chromium") {
        report.performance = await site.evaluate(() => ({
          ...globalThis.__motionuxMetrics,
          jsBytes: performance
            .getEntriesByType("resource")
            .filter((entry) => new URL(entry.name).pathname.endsWith(".js"))
            .reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        }));
        assert(
          report.performance.lcp > 0 && report.performance.lcp <= 2500,
          "LCP budget",
        );
        assert(report.performance.cls <= 0.1, "CLS budget");
        assert(report.performance.jsBytes <= 512 * 1024, "Encoded JS budget");
        await site.screenshot({
          path: resolve(evidence, "home-1440-light.png"),
          fullPage: true,
        });
      }
      for (const width of [320, 390, 768, 1024, 1440]) {
        await site.setViewportSize({ width, height: 844 });
        assert(
          await site.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${engine.name()} overflow at ${width}px`,
        );
      }
      await site.setViewportSize({ width: 390, height: 844 });
      await site.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      const menu = button(site, "Menu");
      await menu.click();
      const nav = site.getByRole("navigation", { name: "Primary navigation" });
      await expect(
        nav.getByRole("link", { name: "Rooms", exact: true }),
      ).toBeVisible();
      await menu.press("Escape");
      await expect(menu).toBeFocused();
      if (engine.name() === "chromium")
        await site.screenshot({
          path: resolve(evidence, "home-390-dark.png"),
          fullPage: true,
        });
      await explore(site);
      const coverage = new Set();
      for (const route of manifest.pwa.routes) {
        assert((await site.goto(origin + route))?.ok(), route);
        await expect(site.locator(".site h1")).toBeVisible();
        for (const colorScheme of ["light", "dark"]) {
          await site.emulateMedia({ colorScheme, reducedMotion: "reduce" });
          for (const width of widths) {
            await site.setViewportSize({ width, height: 844 });
            await verifyMarketingBlocks(site, route, coverage);
            assert(
              await site.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${route} overflow in ${colorScheme} at ${width}px`,
            );
          }
        }
        await site.setViewportSize({ width: 390, height: 844 });
        if (engine.name() === "chromium" && route !== "/") {
          await site.screenshot({
            path: resolve(evidence, route.slice(1) + "-390-dark.png"),
            fullPage: true,
          });
          await site.setViewportSize({ width: 1440, height: 900 });
          await site.emulateMedia({
            colorScheme: "light",
            reducedMotion: "reduce",
          });
          await site.screenshot({
            path: resolve(evidence, route.slice(1) + "-1440-light.png"),
            fullPage: true,
          });
          await site.setViewportSize({ width: 390, height: 844 });
          await site.emulateMedia({
            colorScheme: "dark",
            reducedMotion: "reduce",
          });
        }
      }
      report.blocks[engine.name()] = allMarketingVerified(coverage);
      await site.goto(origin + "/contact");
      await site.getByLabel("Your name").fill("Demo reader");
      await site.getByLabel("Email address").fill("demo@example.test");
      await site
        .getByLabel("What would you like to know?")
        .fill("A demo question.");
      await button(site, "Check demo inquiry").click();
      await expect(
        site.getByText("The demo inquiry is valid. It was not sent.", {
          exact: true,
        }),
      ).toBeVisible();
      if (engine.name() === "chromium") {
        const audit = await new AxeBuilder({ page: site })
          .include(".site")
          .analyze();
        assert.deepEqual(
          audit.violations
            .filter(({ impact }) => ["serious", "critical"].includes(impact))
            .map(({ id }) => id),
          [],
        );
        await consumerContext.setOffline(true);
        const offline = await site.goto(origin);
        assert(offline?.fromServiceWorker());
        const photo = site.getByRole("img", {
          name: "Olive trees surrounding a stone pool",
        });
        await expect
          .poll(() =>
            photo.evaluate(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          )
          .toBe(true);
        await site
          .getByText("What time is check-in?", { exact: true })
          .press("Enter");
        await expect(site.getByText(/check-in begins at 14:30/)).toBeVisible();
        report.offline = true;
      }
      report.consumer.push(engine.name());
    } finally {
      await browser.close();
    }
  }
  console.log(
    "B8 Studio, managed media, isolated preview and independent hotel export",
    JSON.stringify({ ...report, build: undefined }),
  );
} finally {
  await studioBrowser?.close();
  for (const service of services.reverse()) await stop(service);
  await rm(work, { recursive: true, force: true });
  await rm(resolve(tests, fixture), { recursive: true, force: true });
  await writeFile(
    resolve(evidence, "browser.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600 },
  );
}
