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
import { fingerprint } from "../packages/build-core/store.ts";

const repo = resolve(import.meta.dirname, "../..");
const vault = resolve(repo, ".motionux-v9");
const reportPath = resolve(vault, "evidence/build-b11");
const labels = process.argv.slice(2).filter((value) => !value.startsWith("--"));
const engines = process.argv.includes("--all-engines") ? [chromium, firefox, webkit] : [chromium];
const run = promisify(execFile);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };

async function start(cwd) {
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((done) => socket.close(done));
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], { cwd, env, stdio: "ignore" });
  const done = once(child, "close");
  async function stop() {
    child.kill("SIGTERM");
    if (await Promise.race([done.then(() => true), delay(1800).then(() => false)])) return;
    child.kill("SIGKILL");
    await done;
  }
  for (let attempt = 0; attempt < 80 && child.exitCode === null; attempt++) {
    if ((await fetch(origin, { signal: AbortSignal.timeout(700) }).catch(() => null))?.ok) return { origin, stop };
    await delay(150);
  }
  await stop();
  throw new Error("The independent production server did not start.");
}

async function inspect(page, origin, graph) {
  const observed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const definition of graph.pages) {
    assert((await page.goto(origin + definition.route))?.ok());
    await expect(page.locator("h1")).toHaveText(definition.title);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), definition.route + " at " + width);
    }
    for (const instance of definition.instances.filter(({ kind }) => kind === "source" || kind === "generated")) {
      const locator = page.locator('[data-instance="' + instance.id + '"]');
      await expect(locator).toBeVisible();
      const pin = graph.sources.find(({ id }) => id === instance.source);
      let interaction = "rendered";
      if (pin.adapter === "tabs" && await locator.getByRole("tab").count() > 1) {
        await locator.getByRole("tab").nth(1).click();
        await expect(locator.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
        interaction = "selected second source tab";
      }
      if (pin.adapter === "disclosure") {
        const trigger = locator.locator("button[aria-expanded]").first();
        if (await trigger.count()) {
          await trigger.press("Enter");
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
          interaction = "expanded upstream disclosure by keyboard";
        }
      }
      if (instance.kind === "generated" && await locator.getByRole("combobox").first().count()) {
        const choice = locator.getByRole("combobox").first();
        if (await choice.locator("option").count() > 1) {
          await choice.selectOption({ index: 1 });
          assert(await choice.inputValue());
          interaction += " and changed generated record selection";
        }
      }
      observed.push({ route: definition.route, instance: instance.id, source: pin.id, interaction });
    }
  }
  assert.deepEqual(errors, []);
  return observed;
}

async function createLocalRecord(page, area, entity, locale) {
  await area.getByRole("button", { name: (locale === "tr" ? "Ekle " : "Add ") + entity.label, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const field of entity.fields) {
    const control = dialog.locator('[name="' + field.id + '"]');
    if (field.type === "choice") await control.selectOption(field.options[0]);
    else await control.fill(field.type === "date" ? "2026-11-18" : field.type === "number" ? "1" :
      field.type === "time" ? (field.id === entity.collision[2] ? "11:00" : "10:00") : "Browser offline evidence");
  }
  await dialog.getByRole("button", { name: locale === "tr" ? "Kaydet" : "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function offline(page, context, origin, graph) {
  await page.goto(origin);
  await expect(page.locator('.pwa-status [data-ready="true"]')).toBeAttached({ timeout: 25_000 });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  try {
    assert((await page.reload())?.fromServiceWorker());
    const records = graph.pages.flatMap((page) => page.instances.map((item) => ({ ...item, route: page.route })))
      .find((item) => ["records", "agenda", "board"].includes(item.kind) && item.action === "edit");
    let mutation = false;
    if (records) {
      assert((await page.goto(origin + records.route))?.fromServiceWorker());
      const area = page.locator('[data-instance="' + records.id + '"]');
      const before = await area.locator(".mx-record").count();
      const entity = graph.entities.find(({ id }) => id === records.entity);
      await createLocalRecord(page, area, entity, graph.locale);
      await expect(area.locator(".mx-record")).toHaveCount(before + 1);
      await page.reload();
      await expect(area.locator(".mx-record")).toHaveCount(before + 1);
      await context.setOffline(false);
      await page.reload();
      await expect(area.locator(".mx-record")).toHaveCount(before + 1);
      mutation = true;
    }
    return { worker: true, localMutationRetained: mutation };
  } finally { await context.setOffline(false); }
}

const cases = labels.length ? labels : ["A", "B", "C", "E1", "E2"];
await mkdir(resolve(vault, "build-tests"), { recursive: true, mode: 0o700 });
for (const label of cases) {
  const record = JSON.parse(await readFile(resolve(reportPath, "native-" + label + "-project.json"), "utf8"));
  for (const format of ["next", "pwa"]) {
    const directory = await mkdtemp(resolve(vault, "build-tests/b11-consumer-"));
    let service;
    try {
      const zip = resolve(reportPath, "native-" + label + "-" + format + ".zip");
      await run("unzip", ["-q", zip, "-d", directory]);
      const manifest = JSON.parse(await readFile(resolve(directory, "motionux-manifest.json"), "utf8"));
      for (const { path, sha256 } of manifest.files) assert.equal(fingerprint(await readFile(resolve(directory, path))), sha256);
      assert.equal(Boolean(manifest.pwa), format === "pwa");
      const started = performance.now();
      for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "typecheck"], ["run", "build"]])
        await run("npm", args, { cwd: directory, env, timeout: 180_000, maxBuffer: 1_000_000 });
      const buildMs = Math.round(performance.now() - started);
      service = await start(directory);
      const findings = [];
      for (const engine of engines) {
        const browser = await engine.launch();
        try {
          const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
          const page = await context.newPage();
          const observations = await inspect(page, service.origin, record.document.sourceGraph);
          let local;
          if (format === "pwa" && engine === chromium) {
            const disconnected = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
            try { local = await offline(await disconnected.newPage(), disconnected, service.origin, record.document.sourceGraph); }
            finally { await disconnected.close(); }
          }
          findings.push({ engine: engine.name(), version: browser.version(), observations, local });
        } finally { await browser.close(); }
      }
      const output = { label, format, buildMs, digest: manifest.documentDigest, files: manifest.files.length, findings };
      console.log(JSON.stringify(output));
      await writeFile(resolve(reportPath, label + "-" + format + "-consumer.json"), JSON.stringify(output, null, 2) + "\n", { mode: 0o600 });
    } catch (error) {
      console.error(label, format, error.stdout ?? "", error.stderr ?? "", error.message);
      process.exitCode = 1;
    } finally {
      await service?.stop();
      await rm(directory, { recursive: true, force: true });
    }
  }
}
