import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { visibleSource } from "./rendering.mjs";

export const comparisonIds = [
  "kokonut-smooth-tab", "kokonut-wheel-picker", "smoothui-siri-orb", "smoothui-scrubber",
  "designbookmark-goo-menu", "designbookmark-morph-island", "designbookmark-swipe-deck", "designbookmark-glass-lens",
  "designbookmark-command-button", "reactbits-electric-border", "motionprimitives-morphing-dialog",
  "magicui-animated-beam", "magicui-ripple-button", "smoothui-new-book", "reactbits-glare-hover", "motionprimitives-infinite-slider",
];
const labels = ["original", "studio", "installed"];
export const timelineIds = [
  "kokonut-smooth-tab", "animateui-components-backgrounds-gravity-stars", "smoothui-new-liquid-metal",
  "designbookmark-morph-island", "motionprimitives-infinite-slider", "designbookmark-swipe-deck", "motionprimitives-morphing-dialog",
];

export async function compareSources(browser, originals, { origin, evidence, ids = comparisonIds }) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, colorScheme: "light" });
  const comparisons = [];
  try {
    for (const id of ids) {
      const item = originals.find(entry => entry.id === id);
      const captured = [];
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on("pageerror", onError);
      try {
        await page.goto(origin + "/?item=" + id + "&compare=1");
        await expect(page.locator("[data-preview-lane]")).toHaveCount(3);
        const endpoints = [];
        const details = await page.request.get(origin + "/v9/catalog.json?id=" + id).then(response => response.json());
        const install = await page.request.get(origin + details.installURL).then(response => response.json());
        await assertSourceBytes(origin, item, details, install);
        for (const type of labels) {
          const frame = page.locator('[data-preview-lane="' + type + '"]');
          const iframe = frame.locator("iframe");
          endpoints.push(await iframe.getAttribute("src"));
          const presence = await visibleSource(frame, item, type === "installed");
          const scope = item.sourceKind === "html" && type !== "original"
            ? frame.frameLocator("iframe").frameLocator("iframe") : frame.frameLocator("iframe");
          if (id === "smoothui-siri-orb") {
            await page.getByLabel("Original scene").selectOption("Listening");
            await expect(iframe).toHaveAttribute("src", /[?&]scene=Listening/);
            await expect(scope.locator(".siri-orb")).toBeVisible();
          }
          const body = scope.locator("body");
          await body.evaluate(node => node.ownerDocument.fonts.ready.then(() => undefined));
          if (details.assets?.some(asset => asset.sourceURL)) {
            await expect.poll(() => body.locator("img").evaluateAll(images =>
              images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
          }
          const action = await exercise(page, scope, body, id);
          const frameCount = await body.evaluate(node => {
            const animations = node.getAnimations({ subtree: true });
            animations.forEach(animation => { animation.pause(); animation.currentTime = 140; });
            return animations.length;
          });
          const screenshot = await iframe.screenshot({ path: resolve(evidence, id + "-" + type + ".png"), timeout: 5000 });
          captured.push({ type, ...presence, action, animationCount: frameCount, screenshot: screenshot.toString("base64") });
        }
        assert.equal(new Set(endpoints).size, 3);
        assert.match(endpoints[1], /^\/v10\/preview\//);
        assert.deepEqual(errors, []);
        const grid = page.locator(".mx-source-comparison");
        await grid.screenshot({ path: resolve(evidence, id + "-comparison.png") });
        const [a, b, c] = captured;
        const pixelDiffs = {
          originalStudio: await pixelDiff(page, a.screenshot, b.screenshot),
          originalInstalled: await pixelDiff(page, a.screenshot, c.screenshot),
        };
        const states = captured.map(row => row.action?.state);
        const interactionSampled = states.every(state => state !== undefined);
        const statesMatch = interactionSampled && new Set(states.map(state => JSON.stringify(state))).size === 1;
        assert(!interactionSampled || statesMatch, "Sampled interaction endpoints differ across contexts");
        comparisons.push({ id, provider: item.provider, sourceKind: item.sourceKind, endpoints, sourceHash: item.upstreamHash, pixelDiffs,
          interactionSampled, statesMatch, lanes: captured.map(row => ({ ...row, screenshot: id + "-" + row.type + ".png" })) });
      } catch (error) {
        comparisons.push({ id, error: error.message.split("\n")[0] });
      } finally { page.off("pageerror", onError); }
    }
  } finally { await page.close(); }
  return comparisons;
}

async function assertSourceBytes(origin, item, details, install) {
  const files = install.files;
  assert.equal(files.some(file => file.path.endsWith(".html")), item.sourceKind === "html");
  const entry = files.find(file => file.path === details.entry);
  assert(entry?.content, "Install recipe is missing the actual entry");
  const builtEntry = await readFile(resolve(".motionux-v9/runtime", item.group, "installed", details.entry), "utf8");
  assert.equal(builtEntry, entry.content);
  const query = new URLSearchParams({ id: item.id, file: details.entry });
  const original = await fetch(origin + "/v9/source?" + query).then(response => response.text());
  assert.equal(createHash("sha256").update(original).digest("hex"), item.upstreamHash);
  if (item.sourceKind === "html") assert.equal(entry.content, original);
}

async function exercise(page, scope, body, id) {
  if (id === "kokonut-smooth-tab") {
    const activity = scope.getByRole("tab", { name: "Activity", exact: true });
    return measure(body, "[role=tablist] [aria-hidden=true], [role=tabpanel]", async () => {
      await activity.click();
      await expect(activity).toHaveAttribute("aria-selected", "true");
      return await activity.getAttribute("aria-selected");
    });
  }
  if (id === "kokonut-wheel-picker" || id === "smoothui-scrubber") {
    const wheel = id === "kokonut-wheel-picker";
    const input = wheel ? scope.getByRole("spinbutton", { name: "Hours" }) : scope.getByRole("slider", { name: "Opacity" });
    const attribute = wheel ? "aria-valuetext" : "aria-valuenow";
    const before = await input.getAttribute(attribute);
    return measure(body, wheel ? "[role=spinbutton] div[style*='transform']" : "[role=slider] div", async () => {
      await input.press(wheel ? "ArrowUp" : "ArrowRight");
      await expect(input).not.toHaveAttribute(attribute, before);
      return await input.getAttribute(attribute);
    });
  }
  if (id === "smoothui-siri-orb") {
    const shape = scope.locator(".siri-orb");
    const gradients = await shape.locator("[class]").count();
    return { state: ["Listening", gradients] };
  }
  if (id === "designbookmark-goo-menu") {
    const button = scope.locator("button.gbtn.main");
    if (await button.getAttribute("aria-expanded") === "true") await button.click({ force: true });
    return measure(body, "button.gbtn.bub", async () => {
      await button.click({ force: true });
      await expect(button).toHaveAttribute("aria-expanded", "true");
      return await button.getAttribute("aria-expanded");
    });
  }
  if (id === "designbookmark-morph-island") {
    const button = scope.getByRole("button", { name: "Call", exact: true });
    return measure(body, ".island", async () => {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      return await button.getAttribute("aria-pressed");
    });
  }
  if (id === "designbookmark-swipe-deck" || id === "designbookmark-glass-lens") {
    const deck = id === "designbookmark-swipe-deck";
    const target = scope.locator(deck ? ".deck" : "#poster");
    const read = () => scope.locator(deck ? ".deck" : "#lens").evaluate(node => node.style.cssText + Array.from(node.children, child => child.style.cssText).join());
    const initial = await read();
    return measure(body, deck ? ".deck > *" : "#lens", async () => {
      await target.scrollIntoViewIfNeeded();
      const bounds = await target.boundingBox();
      const y = bounds.y + bounds.height * .64;
      if (deck) {
        await page.mouse.move(bounds.x + bounds.width * .65, y);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width * .1, y, { steps: 8 });
        await page.mouse.up();
      } else await page.mouse.move(bounds.x + bounds.width * .76, y);
      await expect.poll(read).not.toBe(initial);
      return true;
    });
  }
  if (id === "motionprimitives-morphing-dialog") {
    return measure(body, '[role="dialog"], img', async () => {
      await scope.getByRole("button", { name: "Open dialog", exact: true }).click();
      const dialog = scope.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Are.na block" })).toBeVisible();
      return true;
    });
  }
  if (id === "motionprimitives-infinite-slider") {
    const result = await measure(body, ".w-max", async () => {
      await expect(body.locator(".w-max").first()).toBeVisible();
      return true;
    });
    assert(new Set(result.frames.flatMap(frame => frame.values.map(value => value[2]))).size > 1, "Autoplay did not move");
    return result;
  }
  if (id === "animateui-components-backgrounds-gravity-stars" || id === "smoothui-new-liquid-metal") {
    const mode = id === "smoothui-new-liquid-metal" ? "webgl2" : "2d";
    return measure(body, "canvas", async () => {
      const canvas = body.locator("canvas").first();
      await expect(canvas).toBeVisible();
      assert(await canvas.evaluate((node, context) => {
        // The other context would prevent the original from initializing; query its existing context after paint.
        return node.width > 1 && node.height > 1 && Boolean(node.getContext(context));
      }, mode));
      return mode;
    });
  }
  if (id === "reactbits-glare-hover") {
    const glare = scope.locator(".glare-hover__glare");
    return measure(body, ".glare-hover__glare, .glare-hover__band", async () => {
      await scope.locator(".glare-hover").hover();
      await expect.poll(() => glare.evaluate(node => Number(getComputedStyle(node).opacity))).toBeGreaterThan(0);
      return true;
    });
  }
  if (id === "magicui-ripple-button") {
    const button = scope.getByRole("button", { name: "Click me" });
    return measure(body, "button > span", async () => {
      const before = await button.locator("span").count();
      await button.click();
      await expect.poll(() => button.locator("span").count()).toBeGreaterThan(before);
      return true;
    });
  }
  return undefined;
}

async function measure(body, selector, action) {
  await body.evaluate((node, target) => {
    const frames = [];
    const start = performance.now();
    node.motionUXFrames = new Promise(resolve => {
      function sample(now) {
        frames.push({ time: Math.round(now - start), values: Array.from(node.querySelectorAll(target)).slice(0, 6)
          .map(child => {
            const style = getComputedStyle(child);
            const box = child.getBoundingClientRect();
            return [box.width, box.height, style.transform, style.opacity, style.clipPath];
          }) });
        if (now - start < 700) requestAnimationFrame(sample);
        else resolve(frames);
      }
      requestAnimationFrame(sample);
    });
  }, selector);
  const state = await action();
  const frames = await body.evaluate(node => node.motionUXFrames);
  return { state, frames };
}

async function pixelDiff(page, one, two) {
  return page.evaluate(async images => {
    const bitmaps = await Promise.all(images.map(async base64 => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      return image;
    }));
    const width = Math.min(...bitmaps.map(image => image.width));
    const height = Math.min(...bitmaps.map(image => image.height));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const [first, second] = bitmaps.map(image => {
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, width, height).data;
    });
    let different = 0;
    for (let index = 0; index < first.length; index += 4) {
      if (first[index] !== second[index] || first[index + 1] !== second[index + 1] || first[index + 2] !== second[index + 2]) different++;
    }
    return { different, total: width * height, dimensions: bitmaps.map(image => [image.width, image.height]) };
  }, [one, two]);
}
