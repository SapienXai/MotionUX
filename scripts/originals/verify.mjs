import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { loadCatalog, vault } from "../studio/catalog.mjs";
import { verifySourceBaseline, sourceIdentity } from "../studio/v11/identity.mjs";
import { visibleSource } from "../studio/rendering.mjs";
import { digest } from "./adapters.mjs";
import { readEditions } from "./editions.mjs";

const origin = process.env.MOTIONUX_BENCH_ORIGIN ?? "http://127.0.0.1:5199";
const edition = (await readEditions()).find(entry => entry.ordinal === Number(process.argv[2]?.slice(1) ?? 13));
assert(edition, "Specify a known edition");
const output = resolve(vault, "evidence", "v" + edition.ordinal);
const cardSelector = "[data-original-card]";
const selector = name => '[data-preview-lane="' + name + '"]';
const all = await loadCatalog();
const http = await fetch(origin + "/v9/catalog.json").then(response => response.json());
const args = process.argv.slice(3);
const wanted = args.filter(value => /^\d+$/.test(value));
const resume = args.includes("--resume");
if (!wanted.length) assert.equal(http.length, all.size, "Restart Studio after a source import");
const locals = http.map(({ id }) => all.get(id)).filter(item => item?.availability === "ready");
const candidates = locals.filter(item => item.editionOrdinal === edition.ordinal).sort((a, b) => a.addedSequence - b.addedSequence);
const previous = resume ? JSON.parse(await readFile(resolve(output, "verification-1-2-3-4-5-6.json"), "utf8")) : undefined;
const tested = new Set(previous?.rows.map(row => row.id));
const queue = candidates.filter(item => (!wanted.length || wanted.includes(String(edition.items[item.addedSequence - 1].batch))) && !tested.has(item.id));
const browser = await chromium.launch();
const opts = { viewport: { width: 1536, height: 1024 }, colorScheme: "light" };
const report = { catalog: http.length, edition: edition.ordinal, sourceIdentity: 0, rows: [], gallery: {} };
await mkdir(output, { recursive: true });
const text = error => error.message.split("\n").slice(0, 6).join(" ");

function sampleOnMount() {
  if (self === top) return;
  const samples = [];
  window.motionuxSamples = samples;
  function frame() {
    const specimen = document.querySelector("#specimen");
    if (specimen?.firstElementChild) {
      const sample = [...specimen.querySelectorAll("*")].slice(0, 80).map(node => {
        const style = getComputedStyle(node);
        return [style.opacity, style.transform, style.filter, style.clipPath, style.backgroundPosition,
          style.strokeDashoffset, style.height, node.childElementCount ? "" : node.textContent].join(" ");
      }).join("|");
      samples.push(sample);
    }
    if (samples.length < 24) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

async function sourceBytes(page, item) {
  const path = "/v9/catalog.json?id=" + item.id;
  const metadata = await page.request.get(origin + path).then(response => response.json());
  assert.equal(metadata.sourceURL, item.sourceURL);
  assert.equal(metadata.upstreamHash, item.upstreamHash);
  const response = await page.request.get(origin + metadata.installURL);
  assert(response.ok());
  const recipe = await response.json();
  assert.equal(recipe.name, item.id);
  assert.equal(recipe.files.length, item.codeFiles.length);
  const installed = new Map(recipe.files.map(file => [file.target, file.content]));
  for (const file of item.codeFiles) {
    assert.equal(digest(installed.get(file.path)), file.installedSHA256, file.path);
  }
  assert(installed.get(item.licenseNoticePath), "Missing license");
  const entry = new URL(origin + "/v9/source");
  entry.search = new URLSearchParams({ id: item.id, file: item.entry });
  const upstream = await page.request.get(entry.href);
  assert(upstream.ok());
  assert.equal(digest(await upstream.body()), item.upstreamHash);
}

async function signature(root) {
  return root.evaluate(node => [...node.querySelectorAll("*")].slice(0, 120).map(element => {
    const computed = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return [element.tagName, element.childElementCount === 0 ? element.textContent : "",
      element.getAttribute("aria-expanded"), element.getAttribute("aria-checked"), element.getAttribute("aria-selected"),
      element.getAttribute("aria-pressed"), "value" in element ? element.value : null, element.getAttribute("class"),
      Math.round(box.width), Math.round(box.height), computed.opacity, computed.transform, computed.backgroundColor,
      computed.backgroundPosition, computed.strokeDashoffset, computed.clipPath, computed.filter];
  }));
}

const controls = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [role=slider], [role=switch], [role=tab], [contenteditable]';
async function motion(page, frame, item, explicit) {
  const root = frame.locator("#specimen");
  const start = await signature(root);
  const initialImage = await frame.locator("body").screenshot({ timeout: 6500, scale: "css" });
  let mode = null;
  let trajectory = [];
  if (item.id === "magicui-kinetic-text") {
    const letter = root.locator('h1 span[aria-hidden="true"]').nth(2);
    await letter.hover();
    await expect.poll(() => letter.evaluate(node => getComputedStyle(node).fontWeight)).toBe("900");
    mode = "hover font weight";
  } else if (!explicit) {
    let actions = await root.locator(controls).count();
    actions = Math.min(actions, 4);
    for (let index = 0; index < actions; index++) {
      const control = root.locator(controls).nth(index);
      const label = await control.evaluate(node => [node.tagName, node.type, node.getAttribute("aria-label") ?? node.innerText, node.getAttribute("role")]).catch(() => null);
      if (!label || /github|donate|purchase|authenticate|log.?in/i.test(String(label[2] ?? ""))) continue;
      try {
        await interact(control, label);
        const after = await signature(root);
        if (JSON.stringify(start) !== JSON.stringify(after)) {
          mode = "control " + index;
          explicit = { index, label };
          break;
        }
      } catch { /* Try another present control or observe its motion. */ }
    }
  } else if (explicit.label) {
    try {
      await interact(root.locator(controls).nth(explicit.index), explicit.label);
      const after = await signature(root);
      if (JSON.stringify(start) !== JSON.stringify(after)) mode = "control " + explicit.index;
    } catch { /* The other lanes still record the actual state. */ }
  }

  trajectory.push(await signature(root));
  if (!mode) {
    const point = await root.boundingBox();
    if (point && point.width > 30 && point.height > 10) {
      await page.mouse.move(point.x + point.width * 0.5, point.y + point.height * 0.5);
      await page.mouse.move(point.x + point.width * 0.62, point.y + point.height * 0.55, { steps: 4 });
    }
    await page.waitForTimeout(item.renderCost === "heavy" ? 240 : 155);
    trajectory.push(await signature(root));
    if (trajectory.some(snapshot => JSON.stringify(snapshot) !== JSON.stringify(start))) mode = "hover or timed state";
    else {
      const after = await frame.locator("body").screenshot({ timeout: 6500, scale: "css" });
      if (!after.equals(initialImage)) mode = "rendered frames changed";
    }
  } else {
    await page.waitForTimeout(130);
    trajectory.push(await signature(root));
  }
  const finalImage = await frame.locator("body").screenshot({ timeout: 6500, scale: "css" });
  const mounted = await root.evaluate(() => [...new Set(window.motionuxSamples ?? [])].length);
  if (!mode && mounted > 1) mode = "mount animation";
  return { explicit, mode, initial: digest(initialImage), final: digest(finalImage), mounted,
    samples: trajectory.map(sample => digest(JSON.stringify(sample))) };
}

async function interact(control, [tag, type, , role]) {
  if (tag === "INPUT" && ["text", "search", "email", "tel", "password", "number"].includes(type)) await control.fill("42", { timeout: 800 });
  else if (tag === "SELECT") await control.press("ArrowDown", { timeout: 800 });
  else if (type === "range" || role === "slider") await control.press("ArrowRight", { timeout: 800 });
  else await control.click({ timeout: 800 });
}

async function verify(page, mobile, item) {
  const row = { id: item.id, checks: [], lanes: [], errors: [] };
  const errors = [];
  const onError = error => errors.push(error.message);
  const onResponse = response => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) errors.push(response.status() + " " + response.url());
  };
  page.on("pageerror", onError);
  page.on("response", onResponse);
  try {
    const filter = item.id.replaceAll("-", " ");
    await page.goto(origin + "/?q=" + encodeURIComponent(filter), { waitUntil: "domcontentloaded" });
    const card = page.locator('[data-original-card="' + item.id + '"]');
    const mounted = card.locator(selector("studio"));
    await visibleSource(mounted, item);
    row.checks.push("gallery");
    await card.getByRole("link", { name: /^Open playground/ }).click();
    await expect(page.getByRole("heading", { name: item.title, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Original code" })).toHaveAttribute("href", item.sourceURL);
    await page.getByRole("button", { name: "Code", exact: true }).click();
    await expect(page.getByRole("region", { name: "Upstream code" })).not.toBeEmpty();
    await page.getByRole("button", { name: "Usage", exact: true }).click();
    await expect(page.getByRole("region", { name: "React usage" })).toContainText("Demo");
    await page.getByRole("button", { name: "Install", exact: true }).click();
    await expect(page.getByRole("link", { name: "Download registry item" })).toBeVisible();
    await sourceBytes(page, item);
    row.checks.push("Playground/Code/Usage/Install", "pinned source and recipe");
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    let action;
    for (const name of ["original", "studio", "installed"]) {
      const lane = page.locator(selector(name));
      await visibleSource(lane, item, name === "installed");
      const frame = lane.frameLocator("iframe");
      const sample = await motion(page, frame, item, action);
      if (name === "original") action = sample.explicit ?? {};
      row.lanes.push({ name, ...sample });
    }
    row.checks.push("three rendered lanes");
    await mobile.goto(origin + "/?item=" + item.id);
    const mobileLane = mobile.locator(selector("studio"));
    const mobileGeometry = await visibleSource(mobileLane, item);
    await expect(mobileLane.frameLocator("iframe").locator("html")).toHaveClass(/dark/);
    assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile Studio overflows");
    row.mobileInnerOverflow = mobileGeometry.overflow.horizontal;
    row.checks.push("390px dark/reduced");
    if (!row.lanes.every(lane => lane.mode)) row.errors.push("Motion was not observed in all three lanes");
  } catch (error) {
    row.errors.push(text(error));
  } finally {
    page.off("pageerror", onError);
    page.off("response", onResponse);
  }
  row.errors.push(...new Set(errors));
  return row;
}

try {
  const baseline = JSON.parse(await readFile(resolve(output, "baseline.json"), "utf8"));
  const preserved = new Map(baseline.originals.map(({ id }) => [id, all.get(id)]));
  assert.deepEqual(await sourceIdentity(preserved), { originals: baseline.originals, hashes: baseline.hashes });
  await verifySourceBaseline(all, JSON.parse(await readFile(resolve(vault, "evidence/v11/baseline/source-identity.json"), "utf8")));
  report.sourceIdentity = Object.keys(baseline.hashes).length;
  const page = await browser.newPage(opts);
  await page.goto(origin);
  await expect(page.locator(cardSelector)).toHaveCount(http.length);
  const first = await page.locator(cardSelector).evaluateAll(cards => cards.map(card => card.dataset.originalCard));
  assert.deepEqual(first.slice(0, candidates.length), candidates.map(item => item.id));
  await expect(page.getByRole("heading", { name: new RegExp("V" + edition.ordinal + " New arrivals") })).toBeVisible();
  report.gallery.newest = first.slice(0, 12);
  await expect(page.locator(cardSelector).first().locator('[data-preview-state="ready"]')).toBeVisible();
  await page.screenshot({ path: resolve(output, "newest-desktop.png") });
  for (const [width, colorScheme] of [[320,"light"], [390,"dark"], [768,"light"], [1024,"dark"], [1536,"dark"]]) {
    const layout = await browser.newPage({ viewport: { width, height: 900 }, colorScheme, hasTouch: width < 1024 });
    await layout.goto(origin);
    await expect(layout.locator(cardSelector).first()).toHaveAttribute("data-edition", String(edition.ordinal));
    await expect(layout.locator(cardSelector).first().locator('[data-preview-state="ready"]')).toBeVisible();
    assert(await layout.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + "px overflows");
    await layout.screenshot({ path: resolve(output, "newest-" + width + "-" + colorScheme + ".png") });
    await layout.close();
  }
  await page.getByRole("link", { name: "New in V" + edition.ordinal, exact: true }).click();
  await expect(page.locator(cardSelector)).toHaveCount(candidates.length);
  await page.getByRole("link", { name: "All originals", exact: true }).click();
  await page.getByLabel("Sort originals").selectOption("oldest");
  await expect(page.locator(cardSelector).first()).toHaveAttribute("data-edition", "10");
  await page.goBack();
  await expect(page.locator(cardSelector).first()).toHaveAttribute("data-edition", String(edition.ordinal));
  await page.close();

  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let item; (item = queue.shift()); ) {
      const page = await browser.newPage(opts);
      await page.addInitScript(sampleOnMount);
      const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      page.setDefaultTimeout(7000);
      try {
        const result = await verify(page, mobile, item);
        report.rows.push(result);
        console.log(item.id, result.errors.length ? result.errors.join(" | ") : "verified");
      } finally {
        await mobile.close();
        await page.close();
      }
    }
  }));
} finally {
  await browser.close();
  const reportName = resume ? "verification-late.json" : wanted.length ? "verification-" + wanted.join("-") + ".json" : "verification.json";
  report.rows.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(resolve(output, reportName), JSON.stringify(report, null, 2) + "\n");
}
console.log(report.rows.filter(row => !row.errors.length).length + "/" + report.rows.length + " verified");
if (report.rows.some(row => row.errors.length)) process.exitCode = 1;
