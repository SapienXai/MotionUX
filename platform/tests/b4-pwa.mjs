import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import {
  assertMotion,
  assertPageTransition,
  configureMotion,
  recordPageTransition,
} from "./b5-motion-browser.mjs";
import { fingerprint } from "../packages/build-core/store.ts";
import { assertInspection, inspectInStudio } from "./b6-inspector-browser.mjs";

const repo = resolve(import.meta.dirname, "../..");
const studio = "http://127.0.0.1:5200";
const local = process.argv.includes("--local");
const inspector = process.argv.includes("--inspector");
const motionDna = inspector || process.argv.includes("--motion-dna");
const evidence = resolve(
  repo,
  inspector
    ? ".motionux-v9/evidence/build-b6"
    : motionDna
      ? ".motionux-v9/evidence/build-b5"
      : ".motionux-v9/evidence/build-b4",
);
const fixture = "build-browser-" + randomBytes(10).toString("hex");
const fixtures = resolve(repo, ".motionux-v9/build-tests");
const studioVault = resolve(fixtures, fixture);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
const execute = promisify(execFile);
const report = [];
const servers = new Set();

await mkdir(fixtures, { recursive: true, mode: 0o700 });
await mkdir(evidence, { recursive: true, mode: 0o700 });

function start(args, cwd = repo) {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const service = {
    child,
    logs: "",
    closed: once(child, "close").catch(() => null),
  };
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      service.logs = (service.logs + chunk).slice(-8000);
    });
  }
  servers.add(service);
  return service;
}
async function stop(service) {
  if (!servers.delete(service) || !service.child.pid) return;
  try {
    process.kill(-service.child.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  if (!(await Promise.race([service.closed, wait(2500).then(() => false)]))) {
    try {
      process.kill(-service.child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await service.closed;
  }
}
async function ready(origin, service) {
  for (
    let attempt = 0;
    attempt < 200 &&
    service.child.exitCode === null &&
    !service.child.signalCode;
    attempt++
  ) {
    if (
      await fetch(origin, { signal: AbortSignal.timeout(400) }).then(
        (response) => response.ok,
        () => false,
      )
    )
      return;
    await wait(150);
  }
  throw new Error(service.logs || "Server unavailable: " + origin);
}
async function freePort() {
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((done) => socket.close(done));
  return port;
}
async function installBuild(cwd) {
  for (const args of [
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"],
    ["run", "typecheck"],
    ["run", "build"],
  ]) {
    const result = await execute("npm", args, {
      cwd,
      env,
      timeout: 150_000,
      maxBuffer: 2_000_000,
    }).catch((error) => {
      throw new Error(error.stdout + "\n" + error.stderr);
    });
    if (args.includes("build"))
      return result.stdout.match(/Offline snapshot: .+/)?.[0];
  }
}
const heading = (page, name) =>
  page.getByRole("heading", { name, exact: true });
const button = (page, name) => page.getByRole("button", { name, exact: true });

async function assertManifest(page, origin, evidenceRow) {
  const link = page.locator('link[rel="manifest"]');
  await expect(link).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  const response = await fetch(origin + "/manifest.webmanifest");
  assert(
    response.ok &&
      /manifest\+json|application\/json/.test(
        response.headers.get("content-type"),
      ),
  );
  const manifest = await response.json();
  assert.equal(manifest.name, evidenceRow.name);
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const iconResponse = await fetch(origin + icon.src);
    assert.match(iconResponse.headers.get("content-type"), /^image\/png/);
    const pixels = Buffer.from(await iconResponse.arrayBuffer());
    assert.equal(
      pixels.readUInt32BE(16) + "x" + pixels.readUInt32BE(20),
      icon.sizes,
    );
  }
  const worker = await fetch(origin + "/sw.js");
  assert(worker.ok);
  assert.match(worker.headers.get("cache-control"), /no-cache|max-age=0/);
}

async function browserWorkflow(engine, origin, spec, evidenceRow, connection) {
  const browser = await engine.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: engine.name() !== "firefox",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  if (evidenceRow.motion) await page.addInitScript(recordPageTransition);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(origin);
    await expect(heading(page, spec.hero)).toBeVisible();
    await expect(
      page.getByText("Available offline", { exact: true }),
    ).toBeVisible({ timeout: 35_000 });
    await assertManifest(page, origin, evidenceRow);
    const cacheKeys = await page.evaluate(async () => {
      const keys = await caches.keys();
      const cache = await caches.open(
        keys.find((key) => key.startsWith("motionux-pwa:")),
      );
      return (await cache.keys()).map((key) => new URL(key.url).pathname);
    });
    assert(evidenceRow.routes.every((route) => cacheKeys.includes(route)));
    assert(cacheKeys.includes("/pwa/offline.html"));
    assert(cacheKeys.some((key) => key.startsWith("/_next/static/")));
    assert(
      !cacheKeys.some((key) => key.startsWith("/api/") || key.includes("_rsc")),
    );

    let installability;
    if (engine.name() === "chromium") {
      const cdp = await context.newCDPSession(page);
      const data = await cdp.send("Page.getAppManifest");
      assert(data.url.endsWith("/manifest.webmanifest"));
      const { installabilityErrors } = await cdp.send(
        "Page.getInstallabilityErrors",
      );
      assert.deepEqual(installabilityErrors, []);
      installability = "Chromium reports no installability errors";
    }
    for (const width of local ? [320, 390, 768, 1440] : [390]) {
      await page.setViewportSize({ width, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await connection.disconnect();
    const reload = await page.reload();
    assert(
      reload?.fromServiceWorker(),
      "Offline launch must come from the worker",
    );
    await expect(heading(page, spec.hero)).toBeVisible();
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();
    if (evidenceRow.motion) {
      await assertMotion(page, evidenceRow.motion, { reduced: true });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await assertMotion(page, evidenceRow.motion);
    }
    const mobileNav = page.getByRole("navigation", {
      name: "Quick navigation",
    });
    const [, unvisited] = await Promise.all([
      mobileNav.getByRole("link", { name: spec.second, exact: true }).tap(),
      page.waitForResponse(
        (res) =>
          res.request().isNavigationRequest() &&
          new URL(res.url()).pathname === spec.secondPath,
      ),
    ]);
    assert(
      unvisited.fromServiceWorker(),
      "First visit to a precached page must work offline",
    );
    await expect(heading(page, spec.second)).toBeVisible();
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();
    if (evidenceRow.motion) {
      await assertPageTransition(page, evidenceRow.motion);
      await page.emulateMedia({ reducedMotion: "reduce" });
    }

    if (spec.template === "crm-dashboard") {
      await page
        .getByRole("searchbox", { name: "Search contacts" })
        .fill("Northstar");
      await expect(page.getByRole("row", { name: /Mira Chen/ })).toBeVisible();
      await expect(
        page.getByRole("row", { name: /Jordan Alvarez/ }),
      ).toHaveCount(0);
      await mobileNav
        .getByRole("link", { name: "Pipeline", exact: true })
        .tap();
      await expect(page.getByText("Offline", { exact: true })).toBeVisible();
      await page
        .getByRole("combobox", { name: /^Stage for Retail workspace/ })
        .selectOption("Won");
      await expect(
        page.getByText("Retail workspace moved to Won."),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("combobox", { name: /^Stage for Retail workspace/ }),
      ).toHaveValue("Won");
      await mobileNav
        .getByRole("link", { name: "Sales overview", exact: true })
        .tap();
      await expect(
        page.getByRole("group", { name: "Sales metrics" }).getByText("$95,350"),
      ).toBeVisible();
    } else {
      const search = page.getByRole("searchbox", {
        name: "Search reservations",
      });
      await expect(search).toBeVisible();
      await search.fill("zznoreservation");
      await expect(page.getByText(/no reservations match/i)).toBeVisible();
      await mobileNav.getByRole("link", { name: "Rooms", exact: true }).tap();
      await expect(heading(page, "Rooms")).toBeVisible();
    }
    await mobileNav.getByRole("link", { name: "Settings", exact: true }).tap();
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();
    await page
      .getByRole("combobox", { name: "Appearance" })
      .selectOption("dark");
    await page.reload();
    await expect(page.locator(".hotel")).toHaveAttribute("data-theme", "dark");
    const violations = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      violations.violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => ({
          id: v.id,
          nodes: v.nodes.map((node) => [node.target, node.failureSummary]),
        })),
      [],
    );
    if (local && engine.name() === "chromium") {
      await page.screenshot({
        path: resolve(evidence, spec.template + "-offline.png"),
        animations: "disabled",
      });
    }
    const fallback = await page.goto(origin + "/offline-test-unknown");
    assert.equal(fallback?.status(), 503);
    assert(fallback?.fromServiceWorker());
    await expect(
      heading(page, "This page is unavailable offline"),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open app home" }).tap();
    await expect(heading(page, spec.hero)).toBeVisible();
    await connection.reconnect();
    await page.reload();
    await expect(
      page.getByText("Available offline", { exact: true }),
    ).toBeVisible();
    assert.equal(
      (await page.goto(origin + "/offline-test-unknown"))?.status(),
      404,
    );
    await page.evaluate(async () => {
      for (const key of await caches.keys())
        if (key.startsWith("motionux-pwa:")) await caches.delete(key);
    });
    await page.goto(origin);
    await expect(
      page.getByText("Available offline", { exact: true }),
    ).toBeVisible({ timeout: 35_000 });
    await connection.disconnect();
    assert(
      (await page.reload())?.fromServiceWorker(),
      "A cleared snapshot must rebuild after reconnecting",
    );
    await connection.reconnect();
    assert.deepEqual(pageErrors, []);
    evidenceRow.engines.push({
      engine: engine.name(),
      cachedEntries: cacheKeys.length,
      installability,
      offline: true,
      ...(evidenceRow.motion ? { motionDnaOffline: true } : {}),
    });
    console.log(
      spec.template,
      engine.name(),
      "offline navigation, state, fallback and reconnect passed",
    );
  } finally {
    await browser.close();
  }
}

const specs = [
  {
    template: "crm-dashboard",
    label: "New Sales CRM",
    name: "Meridian CRM",
    hero: "Sales overview",
    second: "Contacts",
    secondPath: "/contacts",
    filename: "crm-dashboard-pwa-source.zip",
  },
  {
    template: "hotel-dashboard",
    label: "New Hotel Desk",
    name: "Hotel Desk",
    hero: "Property overview",
    second: "Bookings",
    secondPath: "/bookings",
    filename: "hotel-desk-pwa-source.zip",
  },
];
let editor;
try {
  const app = start(["platform/start.mjs", "--built", "--fixture=" + fixture]);
  await ready(studio, app);
  editor = await chromium.launch();
  const editorContext = await editor.newContext({
    acceptDownloads: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await editorContext.newPage();
  if (motionDna) await page.addInitScript(recordPageTransition);
  for (const spec of specs) {
    const temp = await mkdtemp(resolve(fixtures, "b4-export-"));
    let appService;
    try {
      await page.goto(studio + "/build");
      await button(page, spec.label).click();
      await expect(heading(page, spec.hero)).toBeVisible();
      await expect(button(page, "Export")).toBeVisible();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      let studioInspection;
      const motion = motionDna
        ? await configureMotion(
            page,
            spec,
            local,
            inspector
              ? async () => {
                studioInspection = await inspectInStudio(page, spec, evidence);
                }
              : undefined,
          )
        : undefined;
      const download = page.waitForEvent("download");
      await button(page, "Export PWA").click();
      const file = await download;
      assert.equal(file.suggestedFilename(), spec.filename);
      const archive = resolve(temp, spec.filename);
      await file.saveAs(archive);
      const consumer = resolve(temp, "consumer");
      await mkdir(consumer);
      await execute("/usr/bin/unzip", ["-q", archive, "-d", consumer]);
      const manifest = JSON.parse(
        await readFile(resolve(consumer, "motionux-manifest.json"), "utf8"),
      );
      for (const entry of manifest.files) {
        assert.equal(
          fingerprint(await readFile(resolve(consumer, entry.path))),
          entry.sha256,
        );
      }
      if (motion) assert.deepEqual(manifest.motion, motion);
      const row = {
        name: spec.name,
        routes: manifest.pwa.routes,
        engines: [],
        ...(motion ? { motion, studio: true, run: local } : {}),
      };
      report.push(row);
      row.build = await installBuild(consumer);
      assert(row.build);
      const port = await freePort();
      const origin = "http://127.0.0.1:" + port;
      const connection = {
        async reconnect() {
          appService = start(
            [
              "node_modules/next/dist/bin/next",
              "start",
              "-H",
              "127.0.0.1",
              "-p",
              String(port),
            ],
            consumer,
          );
          await ready(origin, appService);
        },
        async disconnect() {
          await stop(appService);
          appService = undefined;
          await assert.rejects(
            fetch(origin, { signal: AbortSignal.timeout(1000) }),
          );
        },
      };
      await connection.reconnect();
      if (inspector) {
        const { inspectRuntime } =
          await import("../apps/preview-host/inspect-browser.mjs");
        const report = await inspectRuntime({
          origin,
          route: spec.secondPath,
          revision: manifest.revision,
          signal: AbortSignal.timeout(42_000),
        });
        assertInspection(report, spec.secondPath);
        assert.equal(
          studioInspection?.revision ?? report.revision,
          report.revision,
        );
        row.inspection = { studio: studioInspection, independent: report };
        console.log(
          spec.template,
          "independent Inspector audit passed",
          report.route,
          "in",
          report.durationMs,
          "ms",
        );
      }
      for (const engine of local ? [chromium, firefox, webkit] : [chromium]) {
        await browserWorkflow(engine, origin, spec, row, connection);
      }
      if (local)
        await writeFile(
          resolve(evidence, spec.filename),
          await readFile(archive),
          { mode: 0o600 },
        );
    } finally {
      if (appService) await stop(appService);
      await rm(temp, { recursive: true, force: true, maxRetries: 3 });
    }
  }
} finally {
  if (editor) await editor.close();
  for (const server of [...servers].reverse()) await stop(server);
  await rm(studioVault, { recursive: true, force: true, maxRetries: 3 });
  await writeFile(
    resolve(evidence, "browser.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
}
