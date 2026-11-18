import { exportFromSourceEditor, openSourceProperties } from "./source-editor-ui.mjs";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11r");
const initial = JSON.parse(await readFile(resolve(evidence, "A-project.json"), "utf8"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const report = { project: initial.id, beforeRevision: initial.revision, checks: [] };
try {
  await page.goto("http://127.0.0.1:5200/build?project=" + initial.id, { waitUntil: "networkidle" });
  const active = page.getByRole("button", { name: "Stop Run", exact: true });
  if (await active.count()) {
    const stopped = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
    await active.click();
    assert((await stopped).ok());
  }
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const frame = page.frameLocator('iframe[title="Live source application"]');
  const deck = frame.locator(".venue-deck");
  await expect(deck).toBeVisible({ timeout: 90_000 });
  await frame.getByRole("button", { name: "Next card", exact: true }).click();
  await expect(deck.locator('[aria-live="polite"]')).toContainText("02 / 04");
  for (const [preset, width] of [["mobile", 390], ["tablet", 768], ["desktop", 1440]]) {
    await page.getByRole("radio", { name: preset, exact: false }).press("Space");
    await expect.poll(() => frame.locator("html").evaluate(() => innerWidth)).toBe(width);
    await expect(deck.locator('[aria-live="polite"]')).toContainText("02 / 04");
    report.checks.push({ preset, width, sourceStateRetained: true });
  }
  await page.getByRole("combobox", { name: "Preview scale" }).selectOption("actual");
  await expect(page.getByText("1440 × 1000 · 100%", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Preview scale" }).selectOption("fit");
  const properties = await openSourceProperties(page);
  const accent = "#d9c898";
  await properties.getByLabel("Vurgu rengi", { exact: true }).fill(accent);
  await expect.poll(() => deck.evaluate((node) => getComputedStyle(node).getPropertyValue("--deck-accent").trim())).toBe(accent);
  await properties.getByLabel("Yerleşim aralığı", { exact: true }).fill("30px");
  await expect.poll(() => frame.locator(".work-area").evaluate((node) => getComputedStyle(node).columnGap)).toBe("30px");
  await expect(deck.locator('[aria-live="polite"]')).toContainText("02 / 04");
  report.checks.push({ sourceProp: "CardStack.accent", value: accent, generatedLayoutGap: "30px", sourceStateRetained: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Inspector", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => frame.locator(".work-area").evaluate((node) => getComputedStyle(node).columnGap)).toBe("24px");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(() => frame.locator(".work-area").evaluate((node) => getComputedStyle(node).columnGap)).toBe("30px");
  const saving = page.waitForResponse((response) => response.url().endsWith("/api/build/" + initial.id) && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await (await saving).json();
  assert.equal(saved.revision, initial.revision + 1);
  assert.deepEqual(saved.document.codeProject.files, initial.document.codeProject.files);
  assert.deepEqual(saved.document.codeProject.sources, initial.document.codeProject.sources);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(deck).toBeVisible({ timeout: 90_000 });
  await expect.poll(() => deck.evaluate((node) => getComputedStyle(node).getPropertyValue("--deck-accent").trim())).toBe(accent);
  await expect.poll(() => frame.locator(".work-area").evaluate((node) => getComputedStyle(node).columnGap)).toBe("30px");
  const backup = resolve(evidence, "before-A-r" + initial.revision);
  await mkdir(backup, { recursive: true, mode: 0o700 });
  for (const name of ["project.json", "next.zip", "pwa.zip", "1440.png", "390.png"])
    await cp(resolve(evidence, "A-" + name), resolve(backup, name));
  await writeFile(resolve(evidence, "A-project.json"), JSON.stringify(saved, null, 2), { mode: 0o600 });
  const runtime = await browser.newPage({ reducedMotion: "reduce" });
  for (const width of [1440, 768, 390, 320]) {
    await runtime.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await runtime.goto("http://127.0.0.1:5202", { waitUntil: "networkidle" });
    await runtime.screenshot({ path: resolve(evidence, "A-" + width + ".png"), fullPage: true });
  }
  await runtime.close();
  for (const [button, format] of [["Export", "next"], ["Export PWA", "pwa"]]) {
    await (await exportFromSourceEditor(page, button)).saveAs(resolve(evidence, "A-" + format + ".zip"));
  }
  const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
  await page.getByRole("button", { name: "Stop Run", exact: true }).click();
  assert((await stopping).ok());
  await writeFile(resolve(evidence, "A-editor.json"), JSON.stringify({ ...report, savedRevision: saved.revision }, null, 2), { mode: 0o600 });
  console.log("Real source props, generated layout, responsive canvas state, Undo/Redo, Save, Run and downloaded artifacts passed", saved.revision);
} finally {
  await browser.close();
}
