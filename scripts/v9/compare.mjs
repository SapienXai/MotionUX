import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "http://127.0.0.1:5199";
const output = resolve(".motionux-v9/evidence");
const entries = await fetch(origin + "/v9/catalog.json").then(response => response.json());
const ids = ["kokonut-smooth-tab", "kokonut-wheel-picker", "smoothui-siri-orb", "smoothui-scrubber",
  "designbookmark-goo-menu", "designbookmark-morph-island", "designbookmark-swipe-deck", "designbookmark-glass-lens"];
const browser = await chromium.launch();
await mkdir(output, { recursive: true });
const report = [];
try {
  const canvasPage = await browser.newPage();
  for (const id of ids) {
    const item = entries.find(entry => entry.id === id);
    if (!item) continue;
    const results = [];
    for (const scheme of item.format === "html" ? ["original"] : ["light", "dark"]) {
      const options = { viewport: { width: 440, height: 440 }, deviceScaleFactor: 1,
        colorScheme: scheme === "dark" ? "dark" : "light", reducedMotion: "no-preference" };
      const contexts = await Promise.all([browser.newPage(options), browser.newPage(options)]);
      try {
        const run = async (page, lane) => {
          const errors = [];
          page.on("pageerror", error => errors.push(error.message));
          const directHTML = item.format === "html" && lane === "original";
          const path = directHTML ? item.slug + ".html" : `?item=${item.slug}&scheme=${scheme}`;
          await page.goto(`${origin}/v9/live/${item.group}/${lane}/${path}`);
          const scope = item.format === "html" && !directHTML ? page.frameLocator("iframe") : page;
          const body = scope.locator("body");
          await expect(body.locator("*:visible").first()).toBeVisible();
          await expect.poll(() => body.evaluate(node => node.querySelectorAll("*").length)).toBeGreaterThan(8);
          await body.evaluate(node => node.ownerDocument.fonts.ready.then(() => undefined));
          await page.mouse.move(0, 0);
          await body.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => {
            animation.pause();
            animation.currentTime = 0;
          }));
          const baseline = await page.screenshot({ path: resolve(output, id + "-" + scheme + "-" + lane + ".png") });
          const action = await exercise(page, scope, id);
          return { baseline, action, errors };
        };
        const [upstream, installed] = await Promise.all(contexts.map((page, index) => run(page, index ? "installed" : "original")));
        const diff = await comparePixels(canvasPage, upstream.baseline, installed.baseline);
        const name = id + "-" + scheme + "-diff.png";
        await writeFile(resolve(output, name), Buffer.from(diff.data, "base64"));
        results.push({ scheme, width: 440, height: 440, differentPixels: diff.different, totalPixels: diff.total,
          interactionCompared: Boolean(upstream.action && installed.action),
          behaviorEqual: JSON.stringify(upstream.action?.result) === JSON.stringify(installed.action?.result),
          evidence: name, actions: [upstream.action, installed.action], errors: [...upstream.errors, ...installed.errors] });
      } catch (error) {
        results.push({ scheme, error: error.message });
      } finally { await Promise.all(contexts.map(page => page.close())); }
    }
    report.push({ id, comparisons: results });
  }
  await canvasPage.close();
} finally { await browser.close(); }
await writeFile(resolve(output, "normalized.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.map(item => ({ id: item.id, comparisons: item.comparisons.map(row => ({
  scheme: row.scheme, differentPixels: row.differentPixels, totalPixels: row.totalPixels,
  interactionCompared: row.interactionCompared, behaviorEqual: row.behaviorEqual, error: row.error,
})) }))));
if (report.some(item => item.comparisons.some(lane => lane.error || !lane.behaviorEqual || lane.errors?.length))) process.exitCode = 1;

async function exercise(page, scope, id) {
  if (id === "smoothui-siri-orb") return null; // The comparison lab switches the official scene.
  if (id === "kokonut-smooth-tab") {
    const control = scope.getByRole("tab", { name: "Activity", exact: true });
    await control.click();
    await expect(control).toHaveAttribute("aria-selected", "true");
    return { input: "pointer tab activation", result: await control.getAttribute("aria-selected") };
  }
  if (id === "kokonut-wheel-picker") {
    const control = scope.getByRole("spinbutton", { name: "Hours" });
    const before = await control.getAttribute("aria-valuetext");
    await control.hover();
    await page.mouse.wheel(0, 62);
    await expect(control).not.toHaveAttribute("aria-valuetext", before);
    return { input: "native wheel", result: await control.getAttribute("aria-valuetext") };
  }
  if (id === "smoothui-scrubber") {
    const control = scope.getByRole("slider", { name: "Opacity" });
    const before = await control.getAttribute("aria-valuenow");
    await drag(page, control, 0.32, 0.75);
    await expect(control).not.toHaveAttribute("aria-valuenow", before);
    return { input: "pointer drag", result: await control.getAttribute("aria-valuenow") };
  }
  if (id === "designbookmark-goo-menu") {
    const control = scope.locator("button.gbtn.main");
    await expect(control).toBeVisible();
    if (await control.getAttribute("aria-expanded") === "true") await control.click({ force: true });
    await expect(control).toHaveAttribute("aria-expanded", "false");
    await control.click({ force: true });
    await expect(control).toHaveAttribute("aria-expanded", "true");
    const actions = await scope.locator("button.gbtn.bub").evaluateAll(elements => elements.map(node => node.getAttribute("aria-label")));
    return { input: "open radial actions", result: actions };
  }
  if (id === "designbookmark-morph-island") {
    const control = scope.getByRole("button", { name: "Call", exact: true });
    await control.click();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    return { input: "switch to the official call scene", result: await control.getAttribute("aria-pressed") };
  }
  if (id === "designbookmark-swipe-deck") {
    const deck = scope.locator(".deck");
    const changed = await deck.evaluate(node => [...node.children].map(el => el.style.transform));
    await drag(page, deck, 0.68, 0.13);
    await expect.poll(() => deck.evaluate(node => [...node.children].map(el => el.style.transform))).not.toEqual(changed);
    return { input: "pointer swipe", result: "Card transforms changed" };
  }
  if (id === "designbookmark-glass-lens") {
    const poster = scope.locator("#poster");
    const box = await poster.boundingBox();
    const read = () => scope.locator("#lens").evaluate(node => getComputedStyle(node).transform + " " + node.style.left);
    const base = await read();
    await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.67);
    await expect.poll(read).not.toBe(base);
    return { input: "move the pointer over the image", result: "Native lens position changed" };
  }
  return null;
}

async function drag(page, target, from, to) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to, y, { steps: 8 });
  await page.mouse.up();
}

async function comparePixels(page, left, right) {
  return page.evaluate(async ([a, b]) => {
    const load = async base64 => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      return image;
    };
    const [first, second] = await Promise.all([load(a), load(b)]);
    const canvas = document.createElement("canvas");
    canvas.width = first.width;
    canvas.height = first.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (first.width !== second.width || first.height !== second.height) throw new Error("Comparison dimensions differ");
    ctx.drawImage(first, 0, 0);
    const base = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.drawImage(second, 0, 0);
    const overlay = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let different = 0;
    for (let offset = 0; offset < base.data.length; offset += 4) {
      if (base.data[offset] !== overlay.data[offset] || base.data[offset + 1] !== overlay.data[offset + 1] || base.data[offset + 2] !== overlay.data[offset + 2]) {
        different++;
        overlay.data[offset] = 255;
        overlay.data[offset + 1] = Math.round(overlay.data[offset + 1] * 0.3);
        overlay.data[offset + 2] = Math.round(overlay.data[offset + 2] * 0.3);
      }
    }
    ctx.putImageData(overlay, 0, 0);
    return { different, total: canvas.width * canvas.height, data: canvas.toDataURL().split(",")[1] };
  }, [left.toString("base64"), right.toString("base64")]);
}
