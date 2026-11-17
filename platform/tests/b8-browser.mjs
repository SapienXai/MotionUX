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

const repo = resolve(import.meta.dirname, "../..");
const studio = "http://127.0.0.1:5200";
const evidence = resolve(repo, ".motionux-v9/evidence/build-b8");
const tests = resolve(repo, ".motionux-v9/build-tests");
await mkdir(evidence, { recursive: true, mode: 0o700 });
await mkdir(tests, { recursive: true, mode: 0o700 });
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const work = await mkdtemp(resolve(tests, "b8-export-"));
const local = process.argv.includes("--local");
const exec = promisify(execFile);
const services = [];
const report = { editMs: [], consumer: [], run: false, offline: false };
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
      frame.getByRole("link", { name: "Build", exact: true }),
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
    await frame
      .getByRole("link", { name: "My Library", exact: true })
      .first()
      .click();
    await expect(
      frame.getByRole("heading", { name: "My Library", exact: true }),
    ).toBeVisible();
    await frame.getByRole("link", { name: "Build", exact: true }).click();
    await expect(page).toHaveURL(studio + "/build");
    report.gallery = true;
  }
  await page.goto(studio + "/build");
  await button(page, "New Hotel Marketing").click();
  const canvas = page.getByRole("region", { name: "Application canvas" });
  await expect(canvas.locator(".site-hero h1")).toHaveText("A quieter shore.");
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
    await expect(canvas.locator(".site-hero h1")).toHaveText(text);
    report.editMs.push(Math.round(performance.now() - started));
  }
  await button(page, "Undo").click();
  await expect(canvas.locator(".site-hero h1")).toHaveText(
    "An unhurried shore",
  );
  await button(page, "Redo").click();
  await expect(canvas.locator(".site-hero h1")).toHaveText("A quieter bay");
  await button(page, "2. Editorial hero").click();
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
  await page.screenshot({ path: resolve(evidence, "creator-edit.png") });
  await button(page, "Interact").click();
  await expect(heading(canvas, "A quieter bay")).toBeVisible();
  const draft = canvas.locator("#site-main");
  const question = draft.getByText("What time is check-in?", { exact: true });
  await question.press("Enter");
  await expect(draft.getByText(/check-in begins at 14:30/)).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "creator-interact.png") });
  await explore(canvas);
  await button(page, "Save").click();
  await expect(button(page, "Save")).toBeDisabled();
  await page.reload();
  await expect(canvas.locator(".site-hero h1")).toHaveText("A quieter bay");
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
      for (const route of manifest.pwa.routes) {
        assert((await site.goto(origin + route))?.ok(), route);
        await expect(site.locator(".site h1")).toBeVisible();
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
