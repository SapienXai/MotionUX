import { exportFromSourceEditor, openSourceProperties } from "./source-editor-ui.mjs";
import { sameCodePin } from "../packages/app-export/code-catalog.ts";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const label = process.argv[2] ?? "A";
const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11r");
const baseline = JSON.parse(await readFile(resolve(evidence, label + "-project.json"), "utf8"));
const origin = "http://127.0.0.1:5200";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const control = baseline.document.codeProject.controls.find((field) => field.kind === "text");
const onlyCode = process.argv.includes("--only-code");
const briefFile = process.argv.find((argument) => argument.startsWith("--brief-file="))?.slice(13);
const customBrief = briefFile ? await readFile(resolve(briefFile), "utf8") : undefined;
const value = onlyCode ? control.value : "Kıyı Listening House";
try {
  await page.goto(origin + "/build?project=" + baseline.id);
  let saved = baseline;
  if (!onlyCode) {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const frame = page.frameLocator('iframe[title="Live source application"]');
    await expect(frame.getByRole("heading", { level: 1 })).toContainText(control.value, { timeout: 90_000 });
    const properties = await openSourceProperties(page);
    await properties.getByLabel(control.label, { exact: true }).fill(value);
    await page.keyboard.press("Escape");
    await expect(frame.getByRole("heading", { level: 1 })).toContainText(value);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(frame.getByRole("heading", { level: 1 })).toContainText(control.value);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(frame.getByRole("heading", { level: 1 })).toContainText(value);
    const saving = page.waitForResponse((response) => response.url().endsWith("/api/build/" + baseline.id) && response.request().method() === "PUT");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    saved = await (await saving).json();
    assert.equal(saved.revision, baseline.revision + 1);
    assert.deepEqual(saved.document.codeProject.files, baseline.document.codeProject.files);
    assert.deepEqual(saved.document.codeProject.sources, baseline.document.codeProject.sources);
    await writeFile(resolve(evidence, label + "-props-project.json"), JSON.stringify(saved, null, 2), { mode: 0o600 });
    for (const [button, format] of [["Export", "next"], ["Export PWA", "pwa"]]) {
      await (await exportFromSourceEditor(page, button)).saveAs(resolve(evidence, label + "-props-" + format + ".zip"));
    }
    console.log(label, "live draft, Undo, Redo, exact Save and edited Next/PWA archives passed");
  }
  await page.getByLabel("Revise with Codex", { exact: true }).fill(customBrief ??
    "Polish this exact music scheduler. Preserve every record, storage key, source pin, page, edited venue name and working interaction. Replace the hotel bedroom, pool and coastline playlist photos with project-authored graphic record-sleeve artwork using CSS, playlist color and typography. Keep the actual upstream CardStack. Its counter is too dark on the dark application: use its supported dark appearance via an appropriate scoped ancestor and keep its native physics. Fix label-content-name-mismatch on the day buttons, timeline bookings, playlist rows and deck artwork. Accessible names must contain the exact visible button text in its displayed order, with any extra action instructions after that. Artwork alongside an existing playlist title can be decorative with an empty alt. Keep the information-dense week timeline and mobile quick-add experience. Check existing source API before editing. Also make all manifest journeys work with the revised accessible names. Do not introduce any fixed renderer or change upstream files."
  );
  const starting = page.waitForResponse((response) => response.url().endsWith("/source-jobs/start"));
  await page.getByRole("button", { name: "Revise saved application", exact: true }).click();
  let job = await (await starting).json();
  let previous;
  for (;;) {
    job = await page.evaluate(async (id) => (await fetch("/api/build/source-jobs/" + id)).json(), job.id);
    if (previous !== job.status) console.log(label, "revision", job.status, job.message);
    previous = job.status;
    if (["ready", "failed", "cancelled"].includes(job.status)) break;
    await delay(1750);
  }
  await writeFile(resolve(evidence, label + "-revision-job.json"), JSON.stringify(job, null, 2), { mode: 0o600 });
  assert.equal(job.status, "ready", job.message);
  const project = await page.evaluate(async (id) => (await fetch("/api/build/" + id)).json(), baseline.id);
  assert.equal(project.revision, saved.revision + 1);
  assert.equal(project.document.codeProject.sources.length, baseline.document.codeProject.sources.length);
  for (const pin of baseline.document.codeProject.sources)
    assert(sameCodePin(pin, project.document.codeProject.sources.find((source) => source.id === pin.id)));
  assert.equal(project.document.codeProject.controls.find((field) => field.key === control.key).value, value);
  const before = resolve(evidence, "before-" + label + "-r" + baseline.revision);
  await mkdir(before, { recursive: true, mode: 0o700 });
  for (const name of ["project.json", "next.zip", "pwa.zip", "1440.png", "390.png"])
    await cp(resolve(evidence, label + "-" + name), resolve(before, name));
  await writeFile(resolve(evidence, label + "-project.json"), JSON.stringify(project, null, 2), { mode: 0o600 });
  await expect(page.getByRole("status").filter({ hasText: "Saved revision " + project.revision })).toBeVisible();
  const runtime = await browser.newPage({ reducedMotion: "reduce" });
  for (const width of [1440, 768, 390, 320]) {
    await runtime.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await runtime.goto("http://127.0.0.1:5202", { waitUntil: "networkidle" });
    await runtime.screenshot({ path: resolve(evidence, label + "-" + width + ".png"), fullPage: true });
  }
  await runtime.close();
  for (const [button, format] of [["Export", "next"], ["Export PWA", "pwa"]]) {
    await (await exportFromSourceEditor(page, button)).saveAs(resolve(evidence, label + "-" + format + ".zip"));
  }
  const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
  await page.getByRole("button", { name: "Stop preview", exact: true }).click();
  assert((await stopping).ok());
  console.log(label, "native revision preserved source pins and control edits", project.revision);
} finally { await browser.close(); }
