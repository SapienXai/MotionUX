import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { emptyLibrary } from "./library.mjs";
import { verifySourceBaseline } from "./identity.mjs";
import { loadCatalog, vault } from "../catalog.mjs";

const output = resolve(vault, "evidence/v11/current");
await mkdir(output, { recursive: true, mode: 0o700 });
const library = await mkdtemp(resolve(output, "library-fixture-"));
const allocator = createServer();
allocator.listen(0, "127.0.0.1");
await once(allocator, "listening");
const port = allocator.address().port;
await new Promise(resolve => allocator.close(resolve));
const origin = "http://127.0.0.1:" + port;
const report = { identity: 0, thumbnailCount: 0, workflows: [], responsive: [], axe: [] };
const catalog = await loadCatalog();
let child;

async function start() {
  child = spawn(process.execPath, ["scripts/v9/serve.mjs"], { stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MOTIONUX_LIBRARY_FIXTURE: library, MOTIONUX_FIXTURE_PORT: String(port), MOTIONUX_STUDIO_SHELL: resolve(vault, "studio-shell") } });
  let diagnostic = "";
  child.stderr.on("data", chunk => { diagnostic += chunk.toString(); });
  child.stdout.resume();
  await expect.poll(async () => {
    if (child.exitCode !== null) throw new Error(diagnostic || "Test Studio exited");
    try { return (await fetch(origin)).headers.get("x-motionux-studio"); } catch { return null; }
  }, { timeout: 10000 }).toBe("v11");
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const ended = once(child, "exit");
  child.kill();
  await ended;
}

try {
  const baseline = JSON.parse(await readFile(resolve(vault, "evidence/v11/baseline/source-identity.json"), "utf8"));
  const current = await verifySourceBaseline(catalog, baseline);
  report.identity = Object.keys(current.hashes).length;
  await start();
  const thumbnails = await fetch(origin + "/v11/thumbnails.json").then(response => response.json());
  report.thumbnailCount = Object.values(thumbnails).flat().length;
  assert.equal(report.thumbnailCount, 4 * catalog.size);
  assert(Object.values(thumbnails).every(options => options.length === 4));

  for (const [path, status] of [
    ["/v11/library", 403], ["/.motionux-v9/user/library.v1.json", 400], ["/v11/thumbnails/does-not-exist.jpeg", 404],
    ["/v9/source?id=kokonut-smooth-tab&file=..%2Fcatalog.json", 404], ["/v9/catalog.json?id=%5cpasswd", 400],
  ]) assert.equal((await fetch(origin + path)).status, status, path);

  const browser = await chromium.launch();
  try { await libraryFlows(browser); await previews(browser); }
  finally { await browser.close(); }
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch();
    try { await viewports(browser, engine.name()); }
    finally { await browser.close(); }
  }
} finally {
  await stop();
  await rm(library, { recursive: true, force: true });
  await writeFile(resolve(output, "studio-v11.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report));

async function audit(page, view) {
  const result = await new AxeBuilder({ page }).exclude("iframe").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  report.axe.push({ view, violations: result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })) });
  assert.equal(result.violations.length, 0, view + " accessibility");
}

async function libraryFlows(browser) {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  await page.goto(origin);
  await expect(page.locator("[data-original-card]")).toHaveCount(catalog.size);
  const favorite = page.getByRole("button", { name: "Favorite Wheel Picker", exact: true });
  await expect(favorite).toBeEnabled();
  await page.route("**/v11/library", route => route.fulfill({ status: 503, json: { message: "Simulated save failure." } }), { times: 1 });
  await favorite.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("alert")).toHaveText("Simulated save failure.");
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "My Library", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Library", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wheel Picker" })).toBeVisible();
  await audit(page, "My Library");
  await page.getByRole("button", { name: "New collection" }).click();
  let dialog = page.getByRole("dialog", { name: "New collection" });
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await audit(page, "Create collection dialog");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "New collection" })).toBeFocused();
  for (const name of ["Interface study", "Controls"]) {
    await page.getByRole("button", { name: "New collection" }).click();
    dialog = page.getByRole("dialog", { name: "New collection" });
    await dialog.getByRole("textbox").fill(name);
    await dialog.getByRole("button", { name: "Create collection" }).click();
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page.locator("[data-original-card]")).toHaveCount(catalog.size);
  await add(page, "Wheel Picker", ["Interface study", "Controls"]);
  await expect(page.getByRole("button", { name: "Add Wheel Picker to collections", exact: true })).toBeFocused();
  await page.getByRole("link", { name: "My Library", exact: true }).click();
  await page.getByRole("link", { name: /Interface study/ }).click();
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Rename collection" });
  await dialog.getByRole("textbox").fill("Interaction study");
  await dialog.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: "Interaction study", exact: true })).toBeVisible();
  const collectionURL = page.url();
  await page.getByRole("button", { name: "Edit note for Wheel Picker" }).click();
  dialog = page.getByRole("dialog", { name: /Personal settings/ });
  await dialog.getByLabel("Note", { exact: true }).fill("Check the keyboard detents and minute increments.");
  await dialog.getByLabel(/Tags, separated/).fill("controls, keyboard");
  await dialog.getByRole("button", { name: "Save note" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".mx-personal-note")).toHaveText("Check the keyboard detents and minute increments.");
  await page.getByRole("searchbox").fill("minute increments");
  await expect(page.getByRole("link", { name: "Wheel Picker" })).toBeVisible();
  await page.getByRole("link", { name: "Wheel Picker" }).click();
  await expect(page.getByRole("heading", { name: "Wheel Picker" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("minute increments");
  await page.goto(origin + "/?item=designbookmark-plan-switch");
  await add(page, "Plan switch", ["Interaction study"]);
  await page.goto(origin + "/?item=motionprimitives-animated-number");
  await add(page, "Animated Number", ["Interaction study"]);
  await page.goto(collectionURL);
  await page.getByRole("button", { name: "Project Kit" }).click();
  await expect(page.getByRole("heading", { name: "Conflicting dependency pins" })).toBeVisible();
  const zip = resolve(library, "kit.zip");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Project Kit" }).click();
  await (await download).saveAs(zip);
  assert.match(execFileSync("unzip", ["-t", zip], { encoding: "utf8" }), /No errors detected/);
  const plan = JSON.parse(execFileSync("unzip", ["-p", zip, "manifest.json"], { encoding: "utf8" }));
  assert.equal(plan.items.length, 3);
  assert.equal(plan.items.filter(item => item.sourceKind === "html").length, 1);
  const exportEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library" }).click();
  const exported = JSON.parse(await readFile(await (await exportEvent).path(), "utf8"));
  assert.deepEqual(exported.favorites, ["kokonut-wheel-picker"]);
  assert.deepEqual(Object.keys(exported).sort(), Object.keys(emptyLibrary()).sort());
  await page.screenshot({ path: resolve(output, "project-kit.png") });
  await page.getByRole("button", { name: "Project Kit" }).click();
  await page.screenshot({ path: resolve(output, "my-library.png") });

  await page.getByRole("button", { name: "Import library" }).click();
  dialog = page.getByRole("dialog", { name: "Import library" });
  await dialog.locator("input[type=file]").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{") });
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/not valid JSON/);
  await dialog.locator("input[type=file]").setInputFiles({
    name: "valid.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...emptyLibrary(), favorites: ["missing-saved-original"] })),
  });
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: /Favorites/ }).click();
  await expect(page.getByText(/Original unavailable. Saved in your library/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Wheel Picker" })).toBeVisible();
  await stop();
  await start();
  await page.reload();
  await expect(page.getByRole("link", { name: "Wheel Picker" })).toBeVisible();
  await expect(page.getByText(/Original unavailable. Saved in your library/)).toBeVisible();
  await page.goto(collectionURL);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Delete Interaction study?" });
  await expect(dialog.getByRole("button", { name: "Keep collection" })).toBeFocused();
  await dialog.getByRole("button", { name: "Delete collection" }).click();
  await expect(page.getByRole("link", { name: "Wheel Picker" })).toBeVisible();
  assert((await readdir(resolve(library, "history"))).length > 0);

  await page.goto(origin + "/?item=smoothui-siri-orb");
  await page.getByRole("button", { name: "Edit note for Siri Orb" }).click();
  dialog = page.getByRole("dialog", { name: "Personal settings for Siri Orb" });
  await dialog.getByLabel("Saved scene").selectOption("Listening");
  await dialog.getByLabel("Saved preview theme").selectOption("dark");
  await dialog.getByRole("button", { name: "Save note" }).click();
  await expect(page.locator(".mx-detail-viewport iframe")).toHaveAttribute("src", /scheme=dark.*scene=Listening/);
  await page.reload();
  await expect(page.locator(".mx-detail-viewport iframe")).toHaveAttribute("src", /scheme=dark.*scene=Listening/);

  await page.goto(origin + "/?item=kokonut-wheel-picker&panel=install");
  await expect(page.getByText("Source type")).toBeVisible();
  await page.getByRole("button", { name: "Copy private install command" }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /npx shadcn@4\.23\.0 add/);
  await audit(page, "React Install");
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await expect(page.getByRole("region", { name: "Upstream code" })).not.toBeEmpty();
  await page.getByRole("button", { name: "Usage", exact: true }).click();
  await expect(page.getByRole("region", { name: "React usage" })).toContainText("import");
  await page.goto("http://127.0.0.1:5199/?item=designbookmark-plan-switch&panel=install");
  await expect(page.getByText("Standalone HTML (React iframe host)")).toBeVisible();
  await audit(page, "HTML Install");
  await page.locator(".mx-source-inspector").screenshot({ path: resolve(output, "install.png") });
  await page.goto("http://127.0.0.1:5199/?item=kokonut-wheel-picker");
  await expect(page.locator('[data-preview-state="ready"]')).toBeVisible();
  await page.getByLabel("Preview viewport").selectOption("320");
  await expect.poll(() => page.locator(".mx-detail-viewport").evaluate(node => node.clientWidth)).toBe(320);
  await page.screenshot({ path: resolve(output, "playground.png") });
  await context.close();
  report.workflows.push("favorite with keyboard", "collection create/rename/delete", "multi-collection membership", "note search",
    "failed save and retry", "history", "mixed Project Kit and conflicts", "portable archive", "library JSON import/export", "missing item recovery",
    "reload and restart persistence", "React and HTML Code/Usage/Install", "clipboard", "saved scene and theme", "viewport");
  if ([...catalog.values()].some(item => item.editionOrdinal >= 13)) await latestLibrary(browser);
}

async function latestLibrary(browser) {
  const item = [...catalog.values()].filter(item => item.editionOrdinal >= 13)
    .sort((a, b) => b.editionOrdinal - a.editionOrdinal || a.addedSequence - b.addedSequence)[0];
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  try {
    await page.goto(origin + "/?item=" + item.id);
    await page.getByRole("button", { name: "Favorite " + item.title, exact: true }).click();
    await add(page, item.title, ["Controls"]);
    await page.getByRole("button", { name: "Edit note for " + item.title, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Personal settings for " + item.title });
    await dialog.getByLabel("Note", { exact: true }).fill("V13 keyboard motion sample");
    await dialog.getByRole("button", { name: "Save note" }).click();
    await page.goto(origin);
    await page.locator('nav[aria-label="Filter originals"]').getByRole("link", { name: "Favorites", exact: true }).click();
    await expect(page.locator('[data-original-card="' + item.id + '"]')).toBeVisible();
    await page.getByRole("searchbox").fill("keyboard motion sample");
    await expect(page.locator("[data-original-card]")).toHaveCount(1);
    await page.reload();
    await expect(page.locator('[data-original-card="' + item.id + '"]')).toBeVisible();
    report.workflows.push("new edition favorite, note search, membership and reload");
  } finally { await page.close(); }
}

async function add(page, name, collections) {
  await page.getByRole("button", { name: `Add ${name} to collections`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Collections for ${name}` });
  for (const collection of collections) await dialog.getByRole("checkbox", { name: collection, exact: true }).check();
  await dialog.getByRole("button", { name: "Save collections" }).click();
  await expect(dialog).not.toBeVisible();
}

async function previews(browser) {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  const page = await context.newPage();
  await page.goto(origin + "/?sort=featured");
  const island = page.locator('[data-original-card="designbookmark-morph-island"]');
  await expect(island.locator(".mx-preview-thumbnail")).toBeAttached();
  const call = island.frameLocator("iframe").frameLocator("iframe").getByRole("button", { name: "Call", exact: true });
  await call.focus();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(island.locator('[data-preview-state="ready"]')).toBeAttached();
  assert((await page.locator("[data-original-stage] > [data-preview-lane]").count()) <= 8);
  await page.getByRole("searchbox").evaluate(input => input.focus({ preventScroll: true }));
  await expect(island.locator("iframe")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(island.locator('[data-preview-state="ready"]')).toBeVisible();
  await audit(page, "Gallery");
  const picker = page.locator('[data-original-card="kokonut-wheel-picker"]');
  const hours = picker.frameLocator("iframe").getByRole("spinbutton", { name: "Hours" });
  await expect(hours).toBeVisible();
  const bounds = await hours.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 - 15, { steps: 3 });
  await expect(picker.locator("[data-preview-gesture]")).toHaveAttribute("data-preview-gesture", "true");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(picker.locator("iframe")).toHaveCount(1);
  assert((await page.locator("[data-original-stage] > [data-preview-lane]").count()) <= 8);
  await page.mouse.up();
  await page.getByRole("searchbox").evaluate(input => input.focus({ preventScroll: true }));
  await expect(picker.locator("iframe")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.route("**/v10/preview/designbookmark-morph-island?*", route => route.fulfill({ status: 404, body: "unavailable" }), { times: 1 });
  await page.reload();
  await expect(island.getByText("Preview unavailable")).toBeVisible();
  await page.screenshot({ path: resolve(output, "preview-error.png") });
  await audit(page, "Preview error");
  await island.getByRole("button", { name: "Retry" }).click();
  await expect(island.locator('[data-preview-state="ready"]')).toBeVisible();
  await context.close();
  report.workflows.push("thumbnail swap", "focused nested iframe retained offscreen", "drag retained while scrolling", "eight-frame budget", "failure and recovery");
}

async function viewports(browser, name) {
  for (const width of [320, 360, 390, 430, 768, 1280, 1440, 1536]) {
    const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1024 }, hasTouch: width < 800 });
    const page = await context.newPage();
    for (const path of ["/", "/?view=library", "/?item=designbookmark-plan-switch&panel=install"]) {
      await page.goto(origin + path);
      await expect(page.locator("h1")).toBeVisible();
      if (path === "/") await expect(page.locator('[data-preview-state="ready"]').first()).toBeVisible();
      else if (path.includes("library")) await expect(page.getByRole("button", { name: "New collection" })).toBeEnabled();
      else await expect(page.getByRole("heading", { name: "Use in your project" })).toBeVisible();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${name} ${width} ${path}`);
    }
    report.responsive.push({ engine: name, width, surfaces: 3 });
    await context.close();
  }
}
