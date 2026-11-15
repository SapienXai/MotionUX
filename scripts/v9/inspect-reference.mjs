import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const directory = ".motionux-v9/designbookmark";
const inventory = JSON.parse(await readFile("metadata/reference-inventory.json", "utf8")).items;
const normalized = title => title.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
const browser = await chromium.launch();
await mkdir(directory, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, permissions: ["clipboard-read", "clipboard-write"] });
  await page.goto("https://designbookmark.com/motion", { waitUntil: "networkidle" });
  const all = page.locator('button[aria-label^="Copy the code for "]');
  const cards = await all.evaluateAll(buttons => buttons.map((button, index) => {
    const card = button.closest("li");
    return { index, domId: card.id, title: button.getAttribute("aria-label").slice(18), text: card.innerText,
      links: [...card.querySelectorAll("a[href]")].map(link => link.href) };
  }));
  const results = [];
  for (const entry of inventory) {
    const card = cards.find(row => normalized(row.title) === normalized(entry.name) && row.text.includes(entry.provider));
    if (!card) {
      results.push({ id: entry.id, observed: "card-not-found" });
      continue;
    }
    const before = await page.evaluate(() => navigator.clipboard.readText());
    const button = all.nth(card.index);
    const request = entry.provider === "DesignBookmark" ? page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.origin === "https://designbookmark.com" && url.pathname === `/motion-src/code/${card.domId}.txt` && response.ok();
    }, { timeout: 3500 }).catch(() => null) : Promise.resolve(null);
    await button.click();
    const copy = await request;
    if (entry.provider !== "DesignBookmark") {
      const install = button.locator("xpath=ancestor::li[1]").getByRole("button", { name: "Copy the install command", exact: true });
      if (await install.isVisible()) await install.click();
    }
    const captured = copy ? await copy.text() : entry.provider !== "DesignBookmark"
      ? await page.waitForFunction(previous => navigator.clipboard.readText().then(text =>
        text !== previous && /^(?:npx|bunx|pnpm|yarn|npm)\s/.test(text.trim())), before, { timeout: 1700 })
        .then(() => page.evaluate(() => navigator.clipboard.readText()), () => null)
      : null;
    const linked = card.links.find(link => /kokonutui\.com|smoothui\.dev/.test(link));
    const hasImplementation = Boolean(captured && (/^\s*(?:import\s|export\s|["']use client["']|<!doctype|<html|<div|<style)/im.test(captured)
      || /\bfunction\b[^{]*\([^\n]*\)\s*\{/.test(captured)));
    const observed = captured === null ? "clipboard-unavailable" : hasImplementation ? "code-payload" :
      /^(?:npx|bunx|pnpm|yarn|npm)\s/m.test(captured.trim()) ? "install-command" : "text-or-instructions";
    const sha256 = captured === null ? undefined : createHash("sha256").update(captured).digest("hex");
    const snapshot = sha256 ? `snapshots/${sha256}/${entry.id}.txt` : undefined;
    if (snapshot) {
      await mkdir(`${directory}/snapshots/${sha256}`, { recursive: true, mode: 0o700 });
      try { await writeFile(directory + "/" + snapshot, captured, { mode: 0o600, flag: "wx" }); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    results.push({ id: entry.id, observed, reference: page.url() + "#" + card.domId, upstream: linked, sourceURL: copy?.url(),
      bytes: captured === null ? undefined : Buffer.byteLength(captured), sha256, snapshot });
  }
  const prior = await readFile(`${directory}/inspection.json`, "utf8").then(JSON.parse, error => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  const priorSources = new Map(prior?.results.filter(row => row.sourceURL).map(row => [row.id, row.sha256]));
  const changed = results.filter(row => priorSources.has(row.id) && priorSources.get(row.id) !== row.sha256).map(row => row.id);
  const file = changed.length && !process.argv.includes("--adopt-refresh") ? "inspection.pending.json" : "inspection.json";
  await writeFile(`${directory}/${file}`, JSON.stringify({ url: page.url(), results, changed }, null, 2) + "\n");
  if (file === "inspection.pending.json") console.log("Updated source snapshots need review:", changed.join(", "));
  console.log(results.reduce((counts, result) => ({ ...counts, [result.observed]: (counts[result.observed] ?? 0) + 1 }), {}));
} finally {
  await browser.close();
}
