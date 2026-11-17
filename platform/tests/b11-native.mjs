import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:5200";
const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11");
const cases = [
  ["A", "Bir işletmenin günlere ve saat aralıklarına göre playlist planladığı modern bir web uygulaması oluştur. Masaüstünde haftalık programı rahat göreyim; mobilde bugünün programını ve yaklaşan müziği hızlıca yöneteyim. Kısa bir akışla zaman aralığı ve playlist ekleyeyim. Çakışan saatleri uyar, düzenleme ve silme çalışsın. Temiz, karakterli ve hızlı bir tasarım olsun."],
  ["B", "Fotoğraf ve tipografinin güçlü olduğu, sakin ama sıradan olmayan butik otel sitesi oluştur. Odaları karşılaştırabileyim, oda detayını açabileyim, fotoğraflar arasında dolaşabileyim ve tarih/misafir seçerek talep hazırlayabileyim. Mobil kullanım çok kolay olsun; büyük standart dashboard veya gereksiz metrik kartları istemiyorum."],
  ["C", "Bir ekibin görevleri öncelik, durum ve sorumluya göre yönettiği odaklı çalışma alanı oluştur. Liste ve durum panosu arasında geçiş, hızlı filtre, görev detay çekmecesi ve çalışan durum değişimi istiyorum. Mobilde sürüklemek zorunda kalmadan işleri tamamlayabileyim. Sade, hızlı ve yoğun veriyle okunabilir olsun."],
  ["E1", "Build a marine fieldwork log for volunteer teams. Every crew needs a sortable dive inspection queue, a way to review locations and conditions, and a clear record detail for follow-up assessments. Include local editing, status filters and a compact mobile-first checklist."],
  ["E2", "Create a ceramics exhibition preparation app. Curators should compare a few objects across a collection, filter by material and readiness, and switch to a route grouping the pieces by gallery room. Let curators edit the label text and condition in local records."],
];
const chosen = process.argv.slice(2).filter((value) => !value.startsWith("--"));
const preferred = process.argv.find((value) => value.startsWith("--source="))?.slice(9);
const suffix = process.argv.find((value) => value.startsWith("--suffix="))?.slice(9) ?? "";
assert(!suffix || /^[a-zA-Z0-9-]+$/.test(suffix));
assert(!preferred || /^[a-z0-9-]{1,96}$/.test(preferred));
const browser = await chromium.launch();
await mkdir(evidence, { recursive: true, mode: 0o700 });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", acceptDownloads: true });
const page = await context.newPage();
const button = (label) => page.getByRole("button", { name: label, exact: true });

async function run(label, brief) {
  label += suffix;
  await page.goto(origin + "/build" + (preferred ? "?source=" + encodeURIComponent(preferred) : ""), { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Describe your app" }).fill(brief);
  const starting = page.waitForResponse((response) => response.url().endsWith("/source-jobs/start"));
  await button("Create app").click();
  const response = await starting;
  let job = await response.json();
  assert(response.ok(), JSON.stringify(job));
  let previous;
  do {
    job = await page.evaluate(async (id) => (await fetch("/api/build/source-jobs/" + id)).json(), job.id);
    if (job.status !== previous) console.log(label, job.status, job.message);
    previous = job.status;
    if (["ready", "failed", "cancelled"].includes(job.status)) break;
    await delay(1750);
  } while (job.id);
  await writeFile(resolve(evidence, "native-" + label + ".json"), JSON.stringify({ brief, ...job }, null, 2) + "\n", { mode: 0o600 });
  assert.equal(job.status, "ready", job.message);
  await page.waitForURL(/project=/);
  const graph = await page.evaluate(async (id) => (await fetch("/api/build/" + id)).json(), job.project);
  await writeFile(resolve(evidence, "native-" + label + "-project.json"), JSON.stringify(graph, null, 2) + "\n", { mode: 0o600 });
  const frame = page.frameLocator('iframe[title="Live source application"]');
  await frame.getByRole("heading", { level: 1 }).waitFor({ timeout: 30_000 });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('iframe[title="Live source application"]').screenshot({ path: resolve(evidence, "native-" + label + "-" + width + ".png") });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [target, tag] of [["Export", "next"], ["Export PWA", "pwa"]]) {
    const saving = page.waitForEvent("download");
    await page.getByRole("link", { name: target, exact: true }).click();
    await (await saving).saveAs(resolve(evidence, "native-" + label + "-" + tag + ".zip"));
  }
  const stopping = page.waitForResponse((response) => response.url().endsWith("/api/build/preview") && response.request().method() === "DELETE");
  await button("Stop Run").click();
  assert((await stopping).ok(), "Stop the verified run before starting the next brief.");
}

try {
  for (const [label, brief] of cases.filter(([label]) => !chosen.length || chosen.includes(label))) {
    try { await run(label, brief); }
    catch (error) {
      console.error(label, error.message);
      process.exitCode = 1;
    }
  }
} finally { await browser.close(); }
