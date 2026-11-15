import { mkdir, stat } from "node:fs/promises";
import { chromium } from "playwright";
import { loadCatalog, vault } from "../catalog.mjs";
import { thumbnailPath, thumbnailSchemes, thumbnailWidths } from "./thumbnail-cache.mjs";
import { atomicWrite } from "./library.mjs";

const origin = "http://127.0.0.1:5199";
const health = await fetch(origin).catch(() => null);
if (health?.headers.get("X-MotionUX-Studio") !== "v11") throw new Error("Run npm run studio, then generate thumbnails in another terminal.");
const catalog = await loadCatalog();
await mkdir(vault + "/thumbnails", { recursive: true, mode: 0o700 });
const tasks = [...catalog.values()].filter(item => item.availability === "ready")
  .flatMap(item => thumbnailSchemes.flatMap(scheme => thumbnailWidths.map(width => ({ item, scheme, width }))));
const browser = await chromium.launch();
let completed = 0;
const errors = [];
const force = process.argv.includes("--force");
try {
  await Promise.all(Array.from({ length: 4 }, async () => {
    const context = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const page = await context.newPage();
    while (tasks.length) {
      const { item, scheme, width } = tasks.shift();
      const file = thumbnailPath(vault, item, width, scheme);
      try {
        if (!force && (await stat(file).catch(() => null))?.size > 256) continue;
        await page.setViewportSize({ width, height: item.preview.height });
        const query = new URLSearchParams({ item: item.slug, scheme });
        const response = await page.goto(origin + "/v10/preview/" + item.id + "?" + query, { waitUntil: "domcontentloaded", timeout: 8000 });
        if (!response.ok()) throw new Error("Preview returned " + response.status());
        await page.waitForFunction(() => document.documentElement.dataset.previewLoaded === "true" ||
          document.querySelector("#specimen > *, .command > *"), { timeout: 6000 });
        const raw = item.sourceKind === "html" ? page.frames()[1] : page;
        await raw.evaluate(async () => {
          await document.fonts.ready;
          const animations = document.getAnimations();
          for (const animation of animations) {
            if (!(animation.timeline instanceof DocumentTimeline)) continue;
            const end = animation.effect?.getComputedTiming().endTime;
            animation.pause();
            animation.currentTime = Number.isFinite(end) ? end : 900;
          }
        });
        await page.waitForTimeout(110);
        // Reuse the actual provider canvas and do not add host overlays or substitute missing content.
        const bytes = await page.screenshot({ type: "jpeg", quality: 76, timeout: 5000 });
        await atomicWrite(file, bytes);
      } catch (error) {
        errors.push({ id: item.id, width, scheme, message: error.message.split("\n")[0] });
      } finally {
        completed++;
        if (completed % 40 === 0) console.log(`Thumbnails checked: ${completed} (${errors.length} errors).`);
      }
    }
    await context.close();
  }));
} finally { await browser.close(); }
console.log(JSON.stringify({ completed, errors }));
if (errors.length) process.exitCode = 1;
