import { exportFromSourceEditor } from "./source-editor-ui.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
const origin = "http://127.0.0.1:5200";
const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11r");
const cases = [
  ["A", "Bir mekânın müziğini planladığım premium bir uygulama oluştur. İlk ekran haftalık zaman çizelgesi olsun, hazır playlistler yan rafta dursun. Saat aralığı seçip playlist ekleyebileyim, çakışmaları göreyim, kaydı düzenleyip silebileyim ve geri al çalışsın. Gün ve hafta görünümü aynı veriyi kullansın. Telefonda bugünün yaklaşan müziği ve tek elle hızlı ekleme öncelikli olsun. Gerçek streaming bağlantısı istemiyorum."],
  ["B", "Fotoğrafı ve tipografisi güçlü, sakin ve karakterli bir butik otel sitesi tasarla. Tam genişlikte editoryal açılış, odaları fotoğraflarla keşfetme, oda detayı ve iki odayı karşılaştırma istiyorum. Tarih ve misafir seçerek yalnız tarayıcıda saklanan bir talep hazırlayabileyim. Mobilde menü ve oda seçimi kolay olsun. Dashboard veya üst üste küçük çerçeveli kartlar kullanma."],
  ["C", "Odaklı bir ekip görev uygulaması oluştur. İlk ekran kompakt bir durum panosu olsun, listeye geçince aynı görevler görünsün. Öncelik, durum ve sorumlu filtresi, detay çekmecesi, görev ekleme ve çalışan durum değişimi istiyorum. Tamamlama ve geri al tutarlı olsun. Telefonda sürüklemek zorunda olmadan çalışmalı, veriler bu tarayıcıda kalmalı. Temiz ve yoğun veride okunaklı bir çalışma alanı istiyorum."],
  ["E1", "Create a premium volunteer observatory workspace. The opening view should be tonight's observing run with a chronological instrument schedule. Add observation targets, inspect their preparation notes, filter readiness, edit session times with overlap validation, and retain records locally. On mobile put the next observation and readiness action first. Give it a night-oriented scientific visual identity and no giant KPI dashboard."],
  ["E2", "Create an editorial ceramics exhibition catalog for a small gallery. Visitors should discover objects in an image-led collection, compare two pieces, inspect dimensions and technique, and add a visit-interest note that is stored only on this device. Curator view should edit fictional catalog entries and readiness. Use a warm print-inspired composition with quiet interaction. Mobile discovery and comparisons must stay legible."],
];
const extended = {
  label: "EXT",
  preferred: "cultui-bg-image-texture",
  brief: "Build a local print-studio proofing workstation with a tactile paper swatch and editable proof timer. Use the selected Cult UI BackgroundImageTexture for the swatch. Apply real local texture variants grid-noise and debut-light, with a labeled selector and live preview. Use the original Kokonut Hold Button to approve the selected proof with a real keyboard or pointer hold and show the approval. If those sources are available, use them in the primary workflow. If available, use SmoothUI Duration Picker for changing the proof timer. Keep this as one focused accessible screen, with fictional data, no external web requests, and meaningful keyboard journeys.",
};
const recovered = {
  label: "RECOVERED",
  preferred: "magicui-code-comparison",
  brief: "Build a focused coastal research release desk with two actual upstream sources. Use Magic UI Code Comparison (named CodeComparison) to compare short old/new TypeScript settings for survey intervals, with GitHub light/dark theme props and an accessible button to choose which example appears. Use Magic UI Hero Video Dialog (named HeroVideoDialog) to preview the bundled coast survey video at /media/seed-coast-preview.mp4, using /media/seed-coast-720.webp as poster. Never use a remote link or iframe. Use a light editorial style, fictional data and one responsive screen. Add a real workflow journey for selecting a code example, opening the native video dialog via its Play video button, and closing it via Close video. Verify both sources are directly mounted, preserve native controls and use exact accessible names.",
};
const ids = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const targeted = [extended, recovered];
for (const test of targeted) if (ids.includes(test.label)) cases.push([test.label, test.brief]);
const retries = Object.fromEntries(process.argv.slice(2).filter((argument) => argument.startsWith("--retry=")).map((argument) => argument.slice(8).split(":")));
await mkdir(evidence, { recursive: true, mode: 0o700 });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(12_000);
try {
  for (const [label, brief] of cases.filter(([id]) => !ids.length || ids.includes(id))) {
    try {
      const preferred = targeted.find((test) => test.label === label)?.preferred;
      const search = preferred ? "?source=" + preferred : "";
      await page.goto(origin + "/build" + search, { waitUntil: "networkidle" });
      const retry = retries[label];
      if (retry) {
        await page.evaluate((id) => sessionStorage.setItem("motionux:source-job:home", id), retry);
        await page.reload();
      }
      await page.getByRole("textbox", { name: "Describe your app" }).fill(brief);
      const starting = page.waitForResponse((response) => response.url().endsWith(retry ? "/" + retry + "/retry" : "/source-jobs/start"));
      await page.getByRole("button", { name: retry ? "Retry generated application" : "Create app", exact: true }).click();
      const response = await starting;
      let job = await response.json();
      assert(response.ok(), JSON.stringify(job));
      let previous;
      for (;;) {
        job = await page.evaluate(async (id) => (await fetch("/api/build/source-jobs/" + id)).json(), job.id);
        if (job.status !== previous) console.log(label, job.status, job.message);
        previous = job.status;
        if (["ready", "failed", "cancelled"].includes(job.status)) break;
        await delay(1750);
      }
      await writeFile(resolve(evidence, label + "-job.json"), JSON.stringify({ brief, ...job }, null, 2), { mode: 0o600 });
      assert.equal(job.status, "ready", job.message);
      await page.waitForURL(/project=/);
      const project = await page.evaluate(async (id) => (await fetch("/api/build/" + id)).json(), job.project);
      assert.equal(project.document.codeProject?.version, 2);
      await writeFile(resolve(evidence, label + "-project.json"), JSON.stringify(project, null, 2), { mode: 0o600 });
      const runtime = await browser.newPage({ colorScheme: "light", reducedMotion: "reduce" });
      try {
        for (const width of [1440, 768, 390, 320]) {
          await runtime.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
          await runtime.goto("http://127.0.0.1:5202/", { waitUntil: "networkidle" });
          await runtime.screenshot({ path: resolve(evidence, label + "-" + width + ".png"), fullPage: true });
        }
      } finally { await runtime.close(); }
      for (const [button, format] of [["Export", "next"], ["Export PWA", "pwa"]]) {
        await (await exportFromSourceEditor(page, button)).saveAs(resolve(evidence, label + "-" + format + ".zip"));
      }
      const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
      await page.getByRole("button", { name: "Stop Run", exact: true }).click();
      assert((await stopping).ok());
      console.log(label, project.document.name, project.document.codeProject.files.length + " authored modules",
        project.document.codeProject.sources.map((source) => source.id).join(", "));
    } catch (error) {
      process.exitCode = 1;
      console.error(label, error.message);
    }
  }
} finally { await browser.close(); }
