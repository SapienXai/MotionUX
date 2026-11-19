import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11r");
const project = JSON.parse(await readFile(resolve(evidence, "A-project.json"), "utf8"));
const browser = await chromium.launch();
const studio = await browser.newPage();
try {
  await studio.goto("http://127.0.0.1:5200/build?project=" + project.id);
  await studio.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(studio.frameLocator('iframe[title="Live source application"]').getByRole("heading", { level: 1 })).toBeVisible({ timeout: 90_000 });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5202/");
  await page.getByRole("button", { name: "Hızlı Ekle", exact: true }).click();
  const start = page.getByLabel("Başlangıç", { exact: true });
  await start.fill("22:30");
  await expect(start).toHaveValue("22:30");
  await page.getByLabel("Bitiş", { exact: true }).fill("23:30");
  await page.getByRole("combobox", { name: "Playlist", exact: true }).selectOption("altin");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  const record = () => page.getByRole("button", { name: "22:30 23:30 Altın Saat Bossa · Akustik düzenle", exact: true });
  await expect(record()).toBeVisible();
  await page.reload();
  await expect(record()).toBeVisible();
  await record().click();
  await start.fill("22:45");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  const edited = () => page.getByRole("button", { name: "22:45 23:30 Altın Saat Bossa · Akustik düzenle", exact: true });
  await expect(edited()).toBeVisible();
  await edited().click();
  await page.getByRole("button", { name: "Sil", exact: true }).click();
  await page.getByRole("button", { name: "Kaydı sil", exact: true }).click();
  await expect(edited()).toHaveCount(0);
  await page.getByRole("button", { name: "Geri al", exact: true }).click();
  await expect(edited()).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "A-mobile-native-form.png"), fullPage: true });
  const result = { engine: browser.version(), width: 390, added: "22:30–23:30 Altın Saat", retainedAfterReload: true, edited: "22:45–23:30", deleted: true, undo: true };
  await writeFile(resolve(evidence, "A-functional.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(result);
} finally {
  const stop = studio.getByRole("button", { name: "Stop Run", exact: true });
  if (await stop.count()) {
    const stopping = studio.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
    await stop.click();
    assert((await stopping).ok());
  }
  await browser.close();
}
