import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const studio = "http://127.0.0.1:5200";
const gallery = "http://127.0.0.1:5199";
const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-b11r");
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext();
try {
  const start = await context.newPage();
  await start.goto(studio + "/build");
  await start.getByRole("link", { name: "Browse local sources" }).click();
  await start.getByRole("heading", { name: "Local sources" }).waitFor();
  const sources = await start.evaluate(async () => {
    const response = await fetch("/api/build/source-jobs/local", { headers: { "x-motionux-build": "1" } });
    if (!response.ok) throw new Error("Local source catalog unavailable: " + response.status);
    return response.json();
  });
  assert.equal(sources.length, 131);
  assert.equal(new Set(sources.map(({ id }) => id)).size, 131);
  const first = sources[0];
  await start.getByRole("searchbox", { name: "Filter sources" }).fill(first.title);
  await start.getByRole("combobox", { name: "Source" }).selectOption(first.id);
  const iframe = start.locator("iframe");
  assert.equal(await iframe.getAttribute("sandbox"), "allow-scripts");
  const previewUrl = await iframe.getAttribute("src");
  assert.equal((await fetch(previewUrl)).status, 403);
  await start.getByText("Ready to interact", { exact: true }).waitFor();
  await start.close();

  const report = [];
  await Promise.all(Array.from({ length: 4 }, async (_, worker) => {
    const page = await context.newPage();
    let errors = [];
    let blocked = [];
    let failed = [];
    let external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (/Content Security Policy/.test(msg.text())) blocked.push(msg.text().slice(0, 240));
    });
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== gallery && url.origin !== studio) {
        external.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push([response.status(), new URL(response.url()).pathname]);
    });
    for (let index = worker; index < sources.length; index += 4) {
      const source = sources[index];
      errors = [];
      external = [];
      blocked = [];
      failed = [];
      let mounted = false;
      let elapsedMs;
      try {
        const started = performance.now();
        await page.goto(studio + "/build/local-sources?source=" + source.id, { waitUntil: "domcontentloaded" });
        await page.getByText("Ready to interact", { exact: true }).waitFor({ timeout: 14_000 });
        elapsedMs = Math.round(performance.now() - started);
        const frame = page.frameLocator("iframe");
        const content = frame.locator("#specimen > *, #root .command button, body > :not(script,style,svg,link) button, body > :not(script,style,svg,link)");
        mounted = await content.evaluateAll((nodes) => nodes.some((node) => node.getBoundingClientRect().height > 0));
        if (source.id === "designbookmark-goo-menu") {
          const open = frame.getByRole("button", { name: "Open actions" });
          await open.press("Enter", { timeout: 2500 });
          await frame.getByRole("button", { expanded: true }).waitFor({ timeout: 2500 });
        }
      } catch (error) {
        errors.push(error.message);
      }
      report.push({ id: source.id, provider: source.provider, mounted, elapsedMs, errors, blocked, failed, external });
    }
    await page.close();
  }));
  await mkdir(evidence, { recursive: true, mode: 0o700 });
  await writeFile(resolve(evidence, "local-sources-browser.json"), JSON.stringify(report.sort((a, b) => a.id.localeCompare(b.id)), null, 2), { mode: 0o600 });
  console.log("Mounted local originals", report.filter(({ mounted }) => mounted).length, "/", report.length);
  const problems = report.filter(({ mounted, errors, blocked, failed, external }) => !mounted || errors.length || blocked.length || failed.length || external.length);
  for (const { id, errors, blocked, failed, external } of problems) console.log(id, { errors, blocked, failed, external });
  assert.equal(problems.length, 0);
} finally { await browser.close(); }
