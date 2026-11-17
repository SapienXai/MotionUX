import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

export async function inspectZoom(origin, project, label, evidence) {
  const scratch = await mkdtemp(resolve(evidence, "zoom-profile-"));
  const extension = resolve(scratch, "extension");
  await mkdir(extension);
  await writeFile(resolve(extension, "manifest.json"), JSON.stringify({
    manifest_version: 3, name: "Disposable local zoom acceptance", version: "1.0",
    host_permissions: ["http://127.0.0.1/*"], background: { service_worker: "worker.js" },
  }));
  await writeFile(resolve(extension, "worker.js"), "chrome.runtime.onInstalled.addListener(() => {});\n");
  let context;
  try {
    context = await chromium.launchPersistentContext(resolve(scratch, "profile"), {
      channel: "chromium", viewport: null, headless: true,
      args: ["--window-size=1440,1000", "--disable-extensions-except=" + extension, "--load-extension=" + extension],
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: "networkidle" });
    const initial = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
    const tabId = await worker.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ url: url + "/*" });
      if (tabs.length !== 1) throw new Error("Expected one disposable application tab.");
      await chrome.tabs.setZoomSettings(tabs[0].id, { mode: "automatic", scope: "per-tab" });
      await chrome.tabs.setZoom(tabs[0].id, 2);
      return tabs[0].id;
    }, origin);
    const zoom = await worker.evaluate((id) => chrome.tabs.getZoom(id), tabId);
    assert.equal(zoom, 2);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(Math.round(initial.width / 2));
    const zoomed = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
    assert.equal(zoomed.dpr, initial.dpr * 2);
    const pages = [];
    for (const definition of project.document.codeProject.pages) {
      assert((await page.goto(origin + definition.route, { waitUntil: "networkidle" }))?.ok());
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Overflow at browser zoom on " + definition.route);
      await page.keyboard.press("Tab");
      assert(await page.evaluate(() => document.activeElement !== document.body), "Keyboard access failed at browser zoom.");
      await page.screenshot({ path: resolve(evidence, label + "-zoom-200-" + definition.id + ".png"), fullPage: true });
      pages.push(definition.route);
    }
    return { engine: "Chromium", method: "chrome.tabs.setZoom", zoom, initial, zoomed, pages };
  } finally {
    await context?.close();
    await rm(scratch, { recursive: true, force: true });
  }
}
