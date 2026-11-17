import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11");
const lane = process.argv[2] ?? "A";
const original = JSON.parse(await readFile(resolve(evidence, "native-" + lane + "-project.json"), "utf8"));
const base = "http://127.0.0.1:5200";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const button = (name) => page.getByRole("button", { name, exact: true });
const named = (instanceId) => '[data-instance="' + instanceId + '"]';
const graph = original.document.sourceGraph;
const generatedPage = graph.pages.find(({ instances }) => instances.some(({ kind }) => kind === "generated"));
const generated = generatedPage.instances.find(({ kind }) => kind === "generated");
const source = graph.pages.flatMap(({ instances }) => instances).find(({ kind }) => kind === "source");
const manualTitle = "B11 edited " + generated.id;
const revisedTitle = "B11 revised " + source.id;
const load = () => page.evaluate(async (id) => (await fetch("/api/build/" + id)).json(), original.id);

try {
  await page.goto(base + "/build?project=" + original.id);
  const outline = page.getByRole("complementary", { name: "Project outline" });
  await outline.getByRole("navigation", { name: "Project pages" }).getByRole("button", { name: generatedPage.title, exact: true }).click();
  await outline.getByRole("button", { name: generated.title, exact: true }).click();
  const fields = page.getByRole("complementary", { name: "Source properties" });
  const title = fields.getByLabel("Title", { exact: true });
  await title.fill(manualTitle);
  await button("Undo").click();
  await expect(title).toHaveValue(generated.title);
  await button("Redo").click();
  await expect(title).toHaveValue(manualTitle);

  const saving = page.waitForResponse((response) => response.url().endsWith("/api/build/" + original.id) && response.request().method() === "PUT");
  await button("Save").click();
  const save = await saving;
  assert(save.ok(), await save.text());
  const edited = await save.json();
  assert.equal(edited.revision, original.revision + 1);
  await button("Run").click();
  const frame = page.frameLocator('iframe[title="Live source application"]');
  await expect(frame.locator(named(generated.id)).getByRole("heading", { name: manualTitle })).toBeVisible({ timeout: 40_000 });
  const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
  await button("Stop Run").click();
  assert((await stopping).ok());

  const brief = "Change only the visible title of the instance " + source.id + " to exactly " + revisedTitle +
    ". Keep all other section content, routes, records and sources unchanged.";
  await fields.getByLabel("Revise with Codex").fill(brief);
  const starting = page.waitForResponse((response) => response.url().endsWith("/source-jobs/start"));
  await button("Revise saved application").click();
  const started = await starting;
  assert(started.ok(), await started.text());
  let job = await started.json();
  while (!["ready", "failed", "cancelled"].includes(job.status)) {
    await delay(1500);
    job = await page.evaluate(async (id) => (await fetch("/api/build/source-jobs/" + id)).json(), job.id);
  }
  assert.equal(job.status, "ready", job.message);
  const revised = await load();
  assert.equal(revised.revision, edited.revision + 1);
  const expected = structuredClone(edited.document.sourceGraph);
  expected.pages.flatMap(({ instances }) => instances).find(({ id }) => id === source.id).title = revisedTitle;
  assert.deepEqual(revised.document.sourceGraph, expected);
  await expect(frame.locator(named(generated.id)).getByRole("heading", { name: manualTitle })).toBeVisible({ timeout: 25_000 });
  const savingArchive = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export", exact: true }).click();
  await (await savingArchive).saveAs(resolve(evidence, "native-" + lane + "-revised.zip"));
  await page.screenshot({ path: resolve(evidence, "native-" + lane + "-revised-editor.png") });
  await writeFile(resolve(evidence, "native-" + lane + "-revision.json"), JSON.stringify({
    priorRevision: original.revision, editedRevision: edited.revision, revised: job,
    generated: generated.id, upstream: source.id, preserved: manualTitle, revisedTitle,
  }, null, 2) + "\n", { mode: 0o600 });
  console.log("Saved edit, real Run and targeted native revision", job);

  const closing = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
  await button("Stop Run").click();
  assert((await closing).ok());
  await page.goto(base + "/build", { waitUntil: "networkidle" });
  const before = await page.evaluate(async () => (await fetch("/api/build")).json());
  await page.getByRole("textbox", { name: "Describe your app" }).fill("A fictional local research schedule. This job will be cancelled.");
  await button("Create app").click();
  await button("Cancel generation").click();
  await expect(page.getByRole("status").filter({ hasText: "Cancelled" })).toBeVisible({ timeout: 20_000 });
  const after = await page.evaluate(async () => (await fetch("/api/build")).json());
  assert.deepEqual(after, before);
  console.log("Cancellation published no managed project.");
} finally {
  await browser.close();
}
