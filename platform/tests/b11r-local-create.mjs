import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect } from "@playwright/test";
import { chromium, firefox, webkit } from "playwright";

const studio = "http://127.0.0.1:5200";
const run = "http://127.0.0.1:5202";
const html = process.argv.includes("--html");
const sourceID = html ? "designbookmark-goo-menu" : "animateui-components-base-switch";
const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-local-create", html ? "html" : "react");
const brief = (html
  ? "Create a compact review log for a fictional design lab. Use the explicitly chosen DesignBookmark Goo menu as an independent interactive specimen in a named Practice panel. "
  : "Create a small fictional flight-simulation practice log. Use the explicitly chosen Animate UI Airplane Mode switch as an independent interactive training specimen in a named Practice panel. ") +
  "Use only this one source. Place its actual iframe via the supported default source import in a separate composed module. It owns its own demo state. Provide a separate Mark review complete button that toggles the log's local review status. Add a deterministic journey: activate Mark review complete and see Review complete. Keep one page, no networking, a restrained teal and cream palette, keyboard focus, accessible contrast and a responsive layout. Set 3 valid editable controls for the main heading, accent color and section spacing.";
await mkdir(evidence, { recursive: true, mode: 0o700 });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  let job;
  if (process.argv.includes("--reuse")) {
    job = JSON.parse(await readFile(resolve(evidence, "job.json"), "utf8"));
    await page.goto(studio + "/build?project=" + job.project, { waitUntil: "networkidle" });
  } else {
    await page.goto(studio + "/build/local-sources?source=" + sourceID);
    await expect(page.getByRole("combobox", { name: "Source" }).locator("option")).toHaveCount(132);
    await page.getByRole("link", { name: "Use in Create app" }).click();
    await expect(page.getByRole("checkbox", { name: /Include local sources/ })).toBeChecked();
    await page.getByRole("textbox", { name: "Describe your app" }).fill(brief);
    const start = page.waitForResponse((response) => response.url().endsWith("/source-jobs/start") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create app", exact: true }).click();
    const response = await start;
    job = await response.json();
    assert(response.ok(), JSON.stringify(job));
    let last;
    for (;;) {
      job = await page.evaluate(async (id) => (await fetch("/api/build/source-jobs/" + id)).json(), job.id);
      if (job.status !== last) console.log(job.status, job.message);
      last = job.status;
      if (["ready", "failed", "cancelled"].includes(last)) break;
      await delay(1750);
    }
    await writeFile(resolve(evidence, "job.json"), JSON.stringify(job, null, 2), { mode: 0o600 });
    assert.equal(job.status, "ready", job.message);
    await page.waitForURL(/project=/);
  }
  const project = await page.evaluate(async (id) => (await fetch("/api/build/" + id)).json(), job.project);
  assert(project.document.codeProject.sources.some(({ id, license }) => id === sourceID && license === "local-only"));
  for (const label of ["Export", "Export PWA"]) await expect(page.getByRole("button", { name: label, exact: true })).toBeDisabled();
  await expect(page.getByText("This project uses local-only sources. Export is unavailable.", { exact: true })).toBeVisible();
  const exports = await page.evaluate(async ({ id, revision }) => Promise.all(["export", "export-pwa"].map(async (action) => {
    const response = await fetch("/api/build/" + id + "/" + action, { headers: { "X-MotionUX-Revision": String(revision) } });
    return { action, status: response.status, type: response.headers.get("Content-Type"), disposition: response.headers.get("Content-Disposition"), error: (await response.json()).message };
  })), project);
  for (const { status, type, disposition, error } of exports) {
    assert.equal(status, 409);
    assert.match(type, /application\/json/);
    assert.equal(disposition, null);
    assert.match(error, /local-only/);
  }
  async function interact(root) {
    if (html) {
      const frame = root.frameLocator('iframe[title="Goo menu"]');
      await frame.getByRole("button", { name: "Open actions" }).press("Enter");
      await expect(frame.getByRole("button", { expanded: true })).toBeVisible();
      return;
    }
    const sw = root.frameLocator('iframe[title="Switch"]').getByRole("switch", { name: "Airplane Mode" });
    await expect(sw).toBeVisible();
    const initial = await sw.getAttribute("aria-checked");
    assert(["true", "false"].includes(initial));
    await sw.press("Space");
    await expect(sw).toHaveAttribute("aria-checked", initial === "true" ? "false" : "true");
  }
  const stopped = page.getByRole("button", { name: "Stop Run", exact: true });
  if (await stopped.count()) {
    const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
    await stopped.click();
    assert((await stopping).ok());
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator('iframe[title="Live source application"]')).toBeVisible({ timeout: 45_000 });
  await interact(page.frameLocator('iframe[title="Live source application"]'));
  await page.screenshot({ path: resolve(evidence, "canvas.png") });
  const checks = [];
  for (const engine of [chromium, firefox, webkit]) {
    const consumer = await engine.launch();
    try {
      const window = await consumer.newPage({ viewport: { width: 390, height: 844 } });
      const response = await window.goto(run, { waitUntil: "networkidle" });
      assert.equal(response.headers()["x-motionux-document"], job.digest);
      await interact(window);
      assert(await window.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (engine === chromium) await window.screenshot({ path: resolve(evidence, "run-mobile.png"), fullPage: true });
      checks.push({ engine: engine.name(), version: consumer.version(), keyboardInteraction: true, viewport: 390 });
    } finally { await consumer.close(); }
  }
  const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
  await page.getByRole("button", { name: "Stop Run", exact: true }).click();
  assert((await stopping).ok());
  await writeFile(resolve(evidence, "browser.json"), JSON.stringify({ sourceID, project: project.id, revision: project.revision, digest: job.digest, exports, canvas: true, checks }, null, 2), { mode: 0o600 });
  console.log("Create app, saved Run, Canvas and both export denials verified.");
} finally { await browser.close(); }
