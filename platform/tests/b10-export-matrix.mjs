import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { exportTree, zipTree } from "../packages/app-export/export.ts";
import { availableSections, designPresets, identityFor, manualDocument, newProject, sectionFromRecipe, templates } from "../packages/build-core/model.ts";
import { canonical, fingerprint } from "../packages/build-core/store.ts";

const repo = resolve(import.meta.dirname, "../..");
const vault = resolve(repo, ".motionux-v9");
const evidence = resolve(vault, "evidence/build-b10");
const run = promisify(execFile);
const selected = process.argv.slice(2);
assert(selected.every((name) => templates.includes(name)), "Supply only known starter IDs.");
const starters = selected.length ? selected : templates;
const evidenceName = starters.length === 1 ? starters[0] : "all-starters";
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
const arabicTitle = "نظرة عامة MX-42";

function compose(template, preset) {
  const document = manualDocument(template);
  document.identity = identityFor(preset);
  document.direction = "rtl";
  document.theme = "system";
  const home = document.pages.find(({ route }) => route === "/");
  home.title = arabicTitle;
  const recipeIds = availableSections(document.data).map(([id]) => id);
  assert(recipeIds.length);
  let sequence = 0;
  const additions = recipeIds.map((id) =>
    sectionFromRecipe(document, id, () => "b-export-matrix-" + ++sequence));
  const footer = home.blocks.findIndex(({ type }) => type === "MarketingFooter");
  home.blocks.splice(footer < 0 ? home.blocks.length : footer, 0, ...additions);
  const id = randomUUID().replaceAll("-", "");
  return { project: newProject(id, document), additions };
}

async function launch(source) {
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((done) => socket.close(done));
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: source, env, stdio: ["ignore", "pipe", "pipe"],
  });
  const closed = once(child, "close");
  const origin = "http://127.0.0.1:" + port;
  let log = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => { log = (log + chunk).slice(-6000); });
  }
  const stop = async () => {
    child.kill("SIGTERM");
    if (await Promise.race([closed.then(() => true), delay(2000).then(() => false)])) return;
    child.kill("SIGKILL");
    await closed;
  };
  for (let count = 0; count < 120 && child.exitCode === null; count++) {
    const response = await fetch(origin, { signal: AbortSignal.timeout(800) }).catch(() => null);
    if (response?.ok) return { origin, stop };
    await delay(200);
  }
  await stop();
  throw new Error("Independent app did not respond. " + log);
}

async function verifyPage(page, origin, preset, additions) {
  const widths = [[1280, "light"], [390, "dark"]];
  for (const [width, colorScheme] of widths) {
    await page.setViewportSize({ width, height: 860 });
    await page.emulateMedia({ colorScheme });
    assert((await page.goto(origin))?.ok());
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const application = page.locator(".site,.hotel").first();
    await expect(application).toHaveAttribute("data-project-identity", preset);
    await expect(application).toHaveAttribute("dir", "rtl");
    assert.equal(await application.evaluate((node) => getComputedStyle(node).direction), "rtl");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    for (const { id, props, children } of additions) {
      const recipe = page.locator('[data-block-id="' + id + '"]');
      await expect(recipe).toHaveAttribute("data-recipe", props.sectionRecipe.id);
      await expect(recipe).toBeVisible();
      const grid = recipe.locator(".creator-section-grid");
      const boxes = await grid.locator(":scope > *").evaluateAll((items) =>
        items.map((item) => {
          const rect = item.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        }));
      assert.equal(boxes.length, children.length);
      assert(boxes.every(({ width, height }) => width > 0 && height > 0), props.sectionRecipe.id);
      const [first, second] = boxes;
      if (second && Math.abs(first.top - second.top) < 1) {
        assert(first.left > second.left, "RTL grid should start on the right for " + props.sectionRecipe.id);
      }
    }
  }
}

async function verifyArchive(browser, work, template, preset, fixture, pwa) {
  const { project, additions } = fixture;
  const label = [template, preset, pwa ? "pwa" : "next"].join("-");
  const source = await mkdtemp(resolve(work, label + "-"));
  const archive = resolve(source, "export.zip");
  const start = performance.now();
  let server, context;
  try {
    await writeFile(archive, zipTree(await exportTree(repo, project, { pwa })));
    const zipDigest = fingerprint(await readFile(archive));
    await run("unzip", ["-q", archive, "-d", source]);
    await rm(archive);
    const manifest = JSON.parse(await readFile(resolve(source, "motionux-manifest.json"), "utf8"));
    assert.equal(manifest.documentDigest, fingerprint(canonical(project.document)));
    assert.equal(Boolean(manifest.pwa), pwa);
    assert(manifest.blocks.some(({ id }) => id === "CreatorSection"));
    for (const { path, sha256 } of manifest.files) {
      assert.equal(fingerprint(await readFile(resolve(source, path))), sha256);
    }
    for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "typecheck"], ["run", "build"]]) {
      await run("npm", args, { cwd: source, env, timeout: 180_000, maxBuffer: 1_000_000 });
    }
    server = await launch(source);
    context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await verifyPage(page, server.origin, preset, additions);
    if (pwa) {
      const manifestResponse = await page.request.get(server.origin + "/manifest.webmanifest");
      assert.equal((await manifestResponse.json()).dir, "rtl");
      await expect(page.locator('.pwa-status [data-ready="true"]')).toBeAttached({ timeout: 25_000 });
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      await context.setOffline(true);
      assert((await page.reload())?.fromServiceWorker());
      for (const { id } of additions) await expect(page.locator('[data-block-id="' + id + '"]')).toBeVisible();
    }
    assert.deepEqual(errors, []);
    return { label, template, preset, pwa, offline: pwa, direction: "rtl", widths: [1280, 390],
      sections: additions.map(({ props }) => props.sectionRecipe.id), documentDigest: manifest.documentDigest,
      verifiedFiles: manifest.files.length, zipDigest, ms: Math.round(performance.now() - start) };
  } finally {
    await context?.close();
    await server?.stop();
    await rm(source, { recursive: true, force: true });
  }
}

await mkdir(evidence, { recursive: true, mode: 0o700 });
const work = await mkdtemp(resolve(vault, "b10-export-matrix-"));
const results = [];
let browser;
try {
  browser = await chromium.launch();
  for (const template of starters) {
    for (const preset of designPresets) {
      const fixture = compose(template, preset);
      for (const pwa of [false, true]) {
        const label = `${template}/${preset}/${pwa ? "pwa" : "next"}`;
        try {
          const record = await verifyArchive(browser, work, template, preset, fixture, pwa);
          results.push(record);
          console.log(label, record.sections.length + " sections", record.ms + "ms");
        } catch (error) {
          throw new Error(label + "\n" + (error.stdout ?? "") + (error.stderr ?? "") + error.stack, { cause: error });
        }
      }
    }
  }
} finally {
  await browser?.close();
  await rm(work, { recursive: true, force: true });
  await writeFile(resolve(evidence, "export-matrix-" + evidenceName + ".json"),
    JSON.stringify({ browser: browser?.version(), expectedArchives: starters.length * designPresets.length * 2, results }, null, 2) + "\n",
    { mode: 0o600 });
}
