import { chromium, devices, firefox, webkit } from "playwright";
import { expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const origin = "http://127.0.0.1:5199";
const catalog = await fetch(origin + "/v9/catalog.json").then(response => response.json());
const output = resolve(".motionux-v9/evidence");
const hash = buffer => createHash("sha256").update(buffer).digest("hex");
const pilots = ["kokonut-smooth-tab", "kokonut-wheel-picker", "smoothui-siri-orb", "smoothui-scrubber"];
await mkdir(output, { recursive: true });
const report = { catalogCount: catalog.length, smoke: [], pilots: [] };
const args = new Set(process.argv.slice(2));
const urls = (item, lane) => item.format === "html" && lane === "original"
  ? `${origin}/v9/live/${item.group}/original/${item.slug}.html`
  : `${origin}/v9/live/${item.group}/${lane}/?item=${item.slug}&scheme=dark`;

async function smoke() {
  const browser = await chromium.launch();
  try {
    const options = { viewport: { width: 390, height: 720 }, reducedMotion: "reduce" };
    const pages = await Promise.all([browser.newPage(options), browser.newPage(options)]);
    for (const item of catalog) {
      const records = await Promise.all(["original", "installed"].map(async (lane, index) => {
        const page = pages[index];
        const errors = [];
        const trap = error => errors.push(error.message);
        page.on("pageerror", trap);
        try {
          const response = await page.goto(urls(item, lane));
          if (!response.ok()) throw new Error("Unexpected HTTP " + response.status());
          const nested = item.format === "html" && lane === "installed";
          const selected = nested ? page.frameLocator("iframe") : page;
          const scope = selected.locator(item.format === "html" ? "body" : item.group === "designbookmark" ? "#root" : "#specimen");
          await expect(scope).toBeVisible({ timeout: 4000 });
          await expect.poll(() => scope.evaluate(node => ({
            children: node.querySelectorAll("*").length, interactive: node.querySelectorAll("button, input, [tabindex], [role]").length,
            visibleOutput: [...node.querySelectorAll("*")].some(element =>
              element.getClientRects().length > 0 && !["SCRIPT", "STYLE", "LINK"].includes(element.tagName)),
          })), { timeout: 3000 }).toMatchObject({ visibleOutput: true });
          return { lane, mounted: errors.length === 0, errors };
        } catch (error) {
          return { lane, mounted: false, errors: [...errors, error.message.split("\n")[0]] };
        } finally { page.off("pageerror", trap); }
      }));
      report.smoke.push({ id: item.id, verified: records.every(row => row.mounted), lanes: records });
    }
    await Promise.all(pages.map(page => page.close()));
  } finally { await browser.close(); }
}

const engines = args.has("--quick") ? [chromium] : [chromium, firefox, webkit];
const profiles = args.has("--quick") ? [{ viewport: { width: 1536, height: 1024 }, colorScheme: "light", reducedMotion: "no-preference" }] :
  [{ viewport: { width: 1536, height: 1024 }, colorScheme: "light", reducedMotion: "no-preference" },
    { viewport: { width: 1536, height: 1024 }, colorScheme: "dark", reducedMotion: "reduce" },
    { ...devices["iPhone 13"], colorScheme: "light", reducedMotion: "no-preference" }];
if (!args.has("--pilots-only")) await smoke();

for (const engine of engines) {
  const browser = await engine.launch();
  try {
    for (const options of profiles) for (const id of pilots) {
      const page = await browser.newPage(engine.name() === "firefox" ? { ...options, isMobile: false } : options);
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const label = `${engine.name()}-${options.viewport.width}-${options.colorScheme}-${options.reducedMotion}-${id}`;
      try {
        await page.goto(origin + "/?view=sources&source=" + id);
        const group = page.locator(".mx-source-comparison iframe");
        await expect(group).toHaveCount(3);
        const lanes = [];
        for (let index = 0; index < 3; index++) {
          const iframe = group.nth(index);
          await iframe.scrollIntoViewIfNeeded();
          const contents = iframe.contentFrame();
          const specimen = contents.locator("#specimen");
          await expect(specimen).toBeVisible();
          await specimen.evaluate(node => node.ownerDocument.fonts.ready.then(() => undefined));
          lanes.push({ iframe, contents, specimen });
        }
        const states = [];
        const scan = await Promise.all(lanes.map(async ({ specimen }) => specimen.ariaSnapshot()));
        for (let index = 0; index < lanes.length; index++) {
          const lane = lanes[index];
          await lane.iframe.scrollIntoViewIfNeeded();
          let before, after, final, samples;
          if (id === pilots[0]) {
            const overview = lane.contents.getByRole("tab", { name: "Overview", exact: true });
            const activity = lane.contents.getByRole("tab", { name: "Activity", exact: true });
            before = await overview.getAttribute("aria-selected");
            await activity.click();
            await expect(activity).toHaveAttribute("aria-selected", "true");
            after = await activity.getAttribute("aria-selected");
            samples = await sample(lane.specimen, "[role=tabpanel]");
            await overview.click();
            await expect(overview).toHaveAttribute("aria-selected", "true");
            final = await overview.getAttribute("aria-selected");
          } else if (id === pilots[1]) {
            const hour = lane.contents.getByRole("spinbutton", { name: "Hours" });
            before = await hour.getAttribute("aria-valuetext");
            await hour.press("ArrowUp");
            await expect(hour).not.toHaveAttribute("aria-valuetext", before);
            after = await hour.getAttribute("aria-valuetext");
            samples = await sample(lane.specimen, "[role=spinbutton] div[style*='transform']");
            await hour.press("ArrowDown");
            await expect(hour).toHaveAttribute("aria-valuetext", before);
            final = await hour.getAttribute("aria-valuetext");
          } else if (id === pilots[2]) {
            const orb = lane.contents.locator(".siri-orb");
            before = await orb.evaluate(node => ({ connected: node.isConnected, gradients: node.querySelectorAll("[class]").length }));
            samples = await sample(lane.specimen, ".siri-orb *, .siri-orb");
            after = await orb.evaluate(node => node.isConnected);
            final = await orb.isVisible();
          } else {
            const control = lane.contents.getByRole("slider", { name: "Opacity" });
            before = await control.getAttribute("aria-valuenow");
            await control.press("ArrowRight");
            await expect(control).not.toHaveAttribute("aria-valuenow", before);
            after = await control.getAttribute("aria-valuenow");
            samples = await sample(lane.specimen, "[role=slider] > div");
            await control.press("ArrowLeft");
            await expect(control).toHaveAttribute("aria-valuenow", before);
            final = await control.getAttribute("aria-valuenow");
          }
          await lane.specimen.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 120; }));
          const image = await lane.iframe.screenshot({ path: resolve(output, label + "-" + index + ".png") });
          states.push({ before, after, final, samples, screenshotHash: hash(image) });
        }
        let scenes;
        if (id === pilots[2]) {
          const select = page.getByLabel("Original scene");
          await select.selectOption("Listening");
          scenes = await Promise.all(lanes.map(async ({ contents, iframe }) => {
            await iframe.scrollIntoViewIfNeeded();
            await expect(contents.locator(".siri-orb")).toBeVisible();
            return new URL(await iframe.getAttribute("src"), origin).searchParams.get("scene");
          }));
        }
        const same = field => new Set(states.map(state => JSON.stringify(state[field]))).size === 1;
        report.pilots.push({ id, engine: engine.name(), width: options.viewport.width, scheme: options.colorScheme,
          reducedMotion: options.reducedMotion, screenshotEqual: same("screenshotHash"), ariaEqual: new Set(scan).size === 1,
          behaviorEqual: ["before", "after", "final"].every(same), states, scenes, errors });
      } catch (error) {
        report.pilots.push({ id, engine: engine.name(), width: options.viewport.width, error: error.message });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
await writeFile(resolve(output, "verification.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({
  smoke: report.smoke.filter(item => item.verified).length,
  mountFailures: report.smoke.filter(item => !item.verified),
  behavioral: report.pilots.filter(item => item.behaviorEqual && !item.errors?.length).length,
  visual: report.pilots.filter(item => item.screenshotEqual).length,
  aria: report.pilots.filter(item => item.ariaEqual).length,
  pilotErrors: report.pilots.filter(item => item.error),
}));
if (report.pilots.some(item => item.error || item.errors?.length || !item.behaviorEqual) || report.smoke.some(item => !item.verified)) process.exitCode = 1;

async function sample(specimen, selector) {
  return specimen.evaluate(async (root, target) => {
    const start = performance.now();
    const frames = [];
    for (let frame = 0; frame < 5; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const nodes = [...root.querySelectorAll(target)].slice(0, 6);
      frames.push({ ms: Math.round(performance.now() - start), nodes: nodes.map(node => {
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, transform: style.transform, opacity: style.opacity, clip: style.clipPath };
      }) });
    }
    return frames;
  }, selector);
}
