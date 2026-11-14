import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build, createServer, preview } from "vite";
import { chromium, webkit, expect } from "@playwright/test";
import { featuredTimeline, prepareTimelinePage } from "./featured-timeline.mjs";

const root = process.cwd();
const local = process.argv.includes("--local");
const evidence = resolve(process.env.MOTIONUX_PARITY_EVIDENCE ?? "test-results/consumer-parity");
const manifest = JSON.parse(await readFile("metadata/parity-manifest.json", "utf8"));
const registry = JSON.parse(await readFile("registry.json", "utf8"));
const pin = process.env.MOTIONUX_REGISTRY_REF ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error("Use a full published SHA.");
const presets = Object.entries(manifest.presets);
const recipes = registry.items.filter(entry => entry.name.startsWith("gallery-recipes-"));
const quick = process.argv.includes("--quick");
const recipesOnly = process.argv.includes("--recipes-only");
const temp = await mkdtemp(join(tmpdir(), "motionux-v6-react-"));
const src = join(temp, "src");
const manager = process.env.MOTIONUX_PACKAGE_MANAGER === "pnpm" ? "pnpm" : "npm";
const cli = resolve("node_modules/.bin/shadcn");
const run = (bin, args, capture = false) => execFileSync(bin, args, { cwd: temp, stdio: capture ? "pipe" : "inherit", maxBuffer: 16 * 1024 * 1024 });
const write = (name, contents) => writeFile(join(temp, name), typeof contents === "string" ? contents : JSON.stringify(contents));
const origin = server => `http://127.0.0.1:${server.httpServer.address().port}`;
let studio, consumer, chrome, safari;
const interactions = {
  "designbookmark-tab-pill": { role: "tab", name: "Analytics", key: "Enter", check: '[aria-selected="true"]:has-text("Analytics")' },
  "designbookmark-loading-to-success": { role: "button", name: /start simulation/, status: "Completed" },
  "designbookmark-expand-card": { role: "button", name: /Expand room/, key: "Enter", check: '[aria-expanded="true"]:has-text("Collapse room")' },
  "kokonut-morph-popover": { role: "menuitem", name: "Share", status: "Share selected" },
  "designbookmark-profile-card": { role: "button", name: /Emma Carter/, key: "Enter", check: 'p:has-text("Designs welcoming")' },
  "designbookmark-swipe-deck": { role: "button", name: "Next destination", key: "Enter", check: 'h3:has-text("Aegean Sea")' },
};


try {
  await mkdir(src);
  await mkdir(evidence, { recursive: true });
  await write("package.json", { name: "motionux-parity-consumer", private: true, type: "module", dependencies: { react: "19.3.1", "react-dom": "19.3.1", "@fontsource-variable/inter": "5.3.0" }, devDependencies: { "@types/react": "19.3.0", "@types/react-dom": "19.3.0" } });
  await write("tsconfig.json", { compilerOptions: { jsx: "react-jsx", strict: true, module: "ESNext", target: "ES2022", moduleResolution: "Bundler", skipLibCheck: true, noEmit: true, paths: { "@/*": ["./src/*"] } }, include: ["src"] });
  await write("components.json", { $schema: "https://ui.shadcn.com/schema.json", style: "new-york", rsc: true, tsx: true,
    tailwind: { config: "", css: "src/index.css", baseColor: "neutral", cssVariables: true, prefix: "" },
    aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" } });
  await write("src/index.css", "");
  const address = item => local ? resolve(`public/r/${item}.json`) : `SapienXai/MotionUX/${item}#${pin}`;
  const addresses = [...presets.map(([, spec]) => spec.item), ...recipes.map(entry => entry.name)].map(address);
  run(cli, ["view", ...addresses], true);
  run(manager, manager === "pnpm" ? ["install", "--ignore-scripts"] : ["install", "--no-audit", "--no-fund"]);
  run(cli, ["add", "--dry-run", ...addresses], true);
  run(cli, ["add", "--yes", ...addresses]);
  for (const item of [...presets.map(([, spec]) => spec.item), ...recipes.map(entry => entry.name)]) {
    for (const file of registry.items.find(entry => entry.name === item).files) {
      const target = file.target.replace(/^@components\//, "src/components/");
      const installed = await readFile(join(temp, target));
      const expected = await readFile(resolve(file.path));
      if (!installed.equals(expected)) throw new Error(`Installed content differs for ${item}: ${target}`);
    }
  }
  const host = await createServer({ root, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", optimizeDeps: { noDiscovery: true } });
  let base;
  try {
    const { previews, references } = await host.ssrLoadModule("/studio/catalog.ts");
    const { recipeUsage } = await host.ssrLoadModule("/studio/playground/recipe-usage.ts");
    const { baseFields } = await host.ssrLoadModule("/studio/playground/base.ts");
    const { featuredUsage, featuredDefinition } = await host.ssrLoadModule("/studio/playground/featured.ts");
    base = await Promise.all(references.map(async row => {
      const { default: specimen } = await previews[row.id]();
      const source = specimen.usage.startsWith('"use client"') ? specimen.usage : '"use client";\n' + specimen.usage;
      const entry = source.match(/export function (\w+)/)?.[1];
      if (!entry) throw new Error(`No exported consumer example for ${row.id}`);
      const params = {
        "designbookmark-command-palette": "onOpen={() => {}}",
        "kokonut-toolbar": "bold={false} toggleBold={() => {}}",
        "designbookmark-spring-dropdown": 'onSelect={() => {}}',
        "designbookmark-rubber-dock": 'activeHref="/workspace"',
        "designbookmark-glass-lens": 'imageUrl="/quiet-hills.webp"',
        "designbookmark-bottom-bar": 'pathname="/account"',
        "designbookmark-dynamic-menu": 'onSelect={() => {}}',
        "kokonut-thinking-text": 'visiblePhase="Ready" announcedState="Ready" working={false}',
        "kokonut-glass-player": 'audioUrl="/field-tones.wav"',
        "kokonut-morph-popover": 'onSelect={() => {}}',
        "smoothui-music-toggle": 'audioUrl="/field-tones.wav"',
        "designbookmark-streaming-reply": 'stateLabel="Ready" text="" pending={false} abort={() => {}}',
        "kokonut-voice-input": 'state="idle" message="Ready" start={() => {}} stop={() => {}}',
      }[row.id] ?? "";
      const definition = featuredDefinition(row.id);
      if (definition) {
        const custom = Object.fromEntries(definition.fields.filter(field => field.section === "Props").map(field => [
          field.key, field.type === "text" ? "Verified example" : field.default,
        ]));
        await write(`src/${row.id}-configured.tsx`, featuredUsage(row.id, custom, false, true));
        await write(`src/${row.id}-gallery.tsx`, featuredUsage(row.id, {}, false, false));
      } else {
        const options = { language: "en", reducedMotion: false, theme: "neutral", scheme: "light" };
        await write(`src/${row.id}-gallery.tsx`, recipeUsage(row.id, {}, options));
        const field = baseFields(row.registryItem).find(field => field.type === "text" && field.section === "Props");
        const custom = field ? { [field.key]: "Verified consumer " + row.order } : { index: 1 };
        await write(`src/${row.id}-configured.tsx`, recipeUsage(row.id, custom, options));
      }
      await write(`src/${row.id}.tsx`, source + `\nexport default function Fixture() { return <${entry} ${params} />; }\n`);
      return row;
    }));
  } finally { await host.close(); }
  for (let i = 0; i < base.length; i += 16) run(cli, ["add", "--yes", ...base.slice(i, i + 16).map(row => address(row.registryItem))], true);
  for (const asset of ["quiet-hills.webp", "field-tones.wav"]) {
    await mkdir(join(temp, "public"), { recursive: true });
    await writeFile(join(temp, "public", asset), await readFile(join(root, "studio/assets", asset)));
  }
  await write("vite.config.mjs", `export default { resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } } };`);
  await write("src/main.tsx", `import "@fontsource-variable/inter";
import { lazy, Suspense, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
const examples = {
${base.flatMap(({ id }) => [id, id + "-configured", id + "-gallery"]).map(id => `"${id}": () => import("./${id}")`).join(",\n")}
} as unknown as Record<string, () => Promise<{ default: ComponentType; Example?: ComponentType }>>;
const id = new URLSearchParams(location.search).get("item");
const mode = new URLSearchParams(location.search).get("mode");
const suffix = mode === "base" ? "" : mode === "configured" ? "-configured" : "-gallery";
const Example = lazy(() => examples[id + suffix]().then(value => ({ default: value.Example && mode !== "base" ? value.Example : value.default })));
function Fixture() {
  return <section data-consumer-example><Example /></section>;
}
createRoot(document.getElementById("root")!).render(<Suspense fallback={null}><Fixture /></Suspense>);
`);
  await write("index.html", '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/src/main.tsx"></script></html>');
  run(resolve("node_modules/.bin/tsc"), ["-p", join(temp, "tsconfig.json")]);
  // The fixture consumes the installed files from a separate production build.
  await build({ root: temp, logLevel: "error" });
  consumer = await preview({ root: temp, configFile: false, logLevel: "error", preview: { host: "127.0.0.1", port: 0 } });
  const studioBuild = { outDir: join(temp, "studio-dist") };
  await build({ root, logLevel: "error", build: studioBuild });
  studio = await preview({ root, logLevel: "error", build: studioBuild, preview: { host: "127.0.0.1", port: 0 } });
  [chrome, safari] = await Promise.all([chromium.launch(), webkit.launch()]);
  const smoke = await chrome.newPage({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  smoke.on("pageerror", error => errors.push(error.message));
  for (const { id } of quick ? [] : base) {
    await smoke.goto(`${origin(consumer)}/?mode=base&item=${id}`);
    await expect(smoke.locator("[data-consumer-example]")).toBeVisible();
    if (!await smoke.locator("[data-consumer-example]").evaluate(node => node.childElementCount)) throw new Error(`Empty consumer example ${id}`);
  }
  for (const row of quick ? [] : base) {
    const { id, order } = row;
    const featured = Object.hasOwn(manifest.presets, id);
    await smoke.goto(`${origin(consumer)}/?mode=configured&item=${id}`);
    const sample = smoke.locator(featured ? ".mx-feature" : ".mx-demo");
    await expect(sample).toBeVisible();
    if (!featured && id !== "designbookmark-read-along") {
      await expect.poll(() => sample.innerHTML(), { message: id }).toContain("Verified consumer " + order);
    } else if (id === "designbookmark-read-along") {
      await expect(sample.locator("[aria-current]")).toHaveText("Follow the river below the hill.");
    }
  }
  await smoke.close();
  if (errors.length) throw new Error(errors.join("\n"));
  const summaries = [];
  for (const width of recipesOnly ? [] : quick ? [1536] : [390, 768, 1536]) {
    for (const scheme of quick ? ["light"] : ["light", "dark"]) {
      const browser = width === 390 ? safari : chrome;
      const options = { viewport: { width, height: 1024 }, reducedMotion: "reduce", colorScheme: scheme };
      const gallery = await browser.newPage(options);
      const isolated = await browser.newPage(options);
      await gallery.addInitScript(value => localStorage.setItem("mx-studio-scheme", value), scheme);
      for (const [id, { item }] of quick ? [] : presets) {
        await gallery.goto(origin(studio));
        const outer = gallery.locator(`[data-card="${id}"]`);
        await outer.scrollIntoViewIfNeeded();
        const sample = outer.locator(".mx-feature");
        await expect(sample).toBeVisible();
        await isolated.goto(`${origin(consumer)}/?item=${id}`);
        const installed = isolated.locator(".mx-feature");
        await expect(installed).toBeVisible();
        await matchContext(sample, isolated, scheme);
        if (interactions[id].role === "menuitem") {
          await expect(sample.getByRole("menu")).toBeVisible();
          await expect(installed.getByRole("menu")).toBeVisible();
        }
        for (const [stage, target] of [["idle", null], ["active", interactions[id]]]) {
          if (target) {
            await apply(gallery, sample, target);
            await apply(isolated, installed, target);
          }
          await Promise.all([gallery.evaluate(() => document.fonts.ready), isolated.evaluate(() => document.fonts.ready)]);
          const stem = `${item}-${width}-${scheme}-${stage}`;
          const [a, b, domA, domB] = await Promise.all([
            sample.screenshot({ path: join(evidence, stem + "-studio.png"), animations: "disabled" }),
            installed.screenshot({ path: join(evidence, stem + "-react.png"), animations: "disabled" }),
            sample.ariaSnapshot(), installed.ariaSnapshot(),
          ]);
          const difference = await imageDifference(isolated, a, b);
          if (domA !== domB || difference > .025) throw new Error(`${stem}: ARIA match ${domA === domB}, pixel difference ${difference.toFixed(5)}\n${domA}\n${domB}`);
          summaries.push({ item, width, scheme, stage, differentPixels: difference });
        }
      }
      await Promise.all([gallery.close(), isolated.close()]);
    }
  }
  const timeline = [];
  const recipeCases = [];
  for (const width of recipesOnly ? [] : quick ? [1536] : [390, 768, 1536]) {
    for (const scheme of quick ? ["light"] : ["light", "dark"]) {
      const browser = width === 390 ? safari : chrome;
      for (const [id] of presets) {
        const options = { viewport: { width, height: 1024 }, reducedMotion: "no-preference", colorScheme: scheme };
        const gallery = await browser.newPage(options);
        const isolated = await browser.newPage(options);
        try {
          await gallery.addInitScript(value => localStorage.setItem("mx-studio-scheme", value), scheme);
          await Promise.all([prepareTimelinePage(gallery), prepareTimelinePage(isolated)]);
          await Promise.all([gallery.goto(origin(studio)), isolated.goto(`${origin(consumer)}/?item=${id}`)]);
          const outer = gallery.locator(`[data-card="${id}"]`);
          await outer.scrollIntoViewIfNeeded();
          const sample = outer.locator(".mx-feature");
          const installed = isolated.locator(".mx-feature");
          await Promise.all([expect(sample).toBeVisible(), expect(installed).toBeVisible()]);
          await matchContext(sample, isolated, scheme);
          await Promise.all([gallery.evaluate(() => document.fonts.ready), isolated.evaluate(() => document.fonts.ready)]);
          // Keep a stable interaction target as the featured row grows or shrinks.
          await gallery.mouse.move(0, 0);
          timeline.push({ width, scheme, browser: browser.browserType().name(), ...await featuredTimeline([[gallery, sample], [isolated, installed]], id) });
          console.log(`Timeline ${id} ${width} ${scheme}`);
        } finally { await Promise.all([gallery.close(), isolated.close()]); }
      }
    }
  }
  if (!quick) for (const { id } of base.filter(row => !Object.hasOwn(manifest.presets, row.id))) {
    const scheme = "light";
    const options = { viewport: { width: 1536, height: 1024 }, reducedMotion: "reduce", colorScheme: scheme };
    const [gallery, isolated] = await Promise.all([chrome.newPage(options), chrome.newPage(options)]);
    try {
      await Promise.all([gallery.goto(origin(studio)), isolated.goto(`${origin(consumer)}/?item=${id}`)]);
      const outer = gallery.locator(`[data-card="${id}"]`);
      await outer.evaluate(node => node.scrollIntoView({ block: "center" }));
      const sample = outer.locator(".mx-demo");
      const installed = isolated.locator(".mx-demo");
      await Promise.all([expect(sample).toBeVisible(), expect(installed).toBeVisible()]);
      await matchContext(sample, isolated, scheme);
      await Promise.all([gallery.evaluate(() => document.fonts.ready), isolated.evaluate(() => document.fonts.ready)]);
      const [a, b, ariaA, ariaB] = await Promise.all([
        sample.screenshot({ path: join(evidence, id + "-gallery.png"), animations: "disabled" }),
        installed.screenshot({ path: join(evidence, id + "-react.png"), animations: "disabled" }),
        sample.ariaSnapshot(), installed.ariaSnapshot(),
      ]);
      const differentPixels = await imageDifference(isolated, a, b);
      const ariaMatch = ariaA === ariaB;
      recipeCases.push({ id, width: 1536, scheme, stage: "idle", ariaMatch, differentPixels, result: ariaMatch && differentPixels <= .025 ? "parity-ok" : "parity-broken" });
      if (!ariaMatch || differentPixels > .025) console.error(`${id}: idle mismatch ${differentPixels.toFixed(5)} (ARIA ${ariaMatch})`);
      else console.log(`Recipe ${id}`);
    } finally { await Promise.all([gallery.close(), isolated.close()]); }
  }
  await writeFile(join(evidence, "report.json"), JSON.stringify({ pin: local ? null : pin, manager, baseUsageMounts: quick ? 0 : base.length, customizedPresetMounts: quick ? 0 : presets.length, customizedRecipeMounts: quick ? 0 : base.length - presets.length, cases: summaries, timeline, recipeCases }, null, 2) + "\n");
  if (recipeCases.some(row => row.result === "parity-broken")) throw new Error("Gallery recipe mismatches. See report.json.");
  console.log(`${quick ? 0 : base.length} base and ${quick ? 0 : base.length} customized Gallery examples mounted in an isolated production build.\n${summaries.length} installed React preset comparisons passed (ARIA and ≤2.5% visually differing pixels).`);
} finally {
  if (studio) await new Promise(resolveClose => studio.httpServer.close(resolveClose));
  if (consumer) await new Promise(resolveClose => consumer.httpServer.close(resolveClose));
  await Promise.all([chrome?.close(), safari?.close()]);
  await rm(temp, { recursive: true, force: true });
}

async function matchContext(sample, isolated, scheme) {
  const context = await sample.evaluate(node => {
    const colors = ["--mx-font", "--mx-bg", "--mx-preset-background", "--mx-surface", "--mx-ink", "--mx-muted", "--mx-line", "--mx-accent", "--mx-on-accent", "--mx-selected"];
    const style = getComputedStyle(node);
    const { width, x, y } = node.getBoundingClientRect();
    return { width, x: x % 1, y: y % 1, tokens: colors.map(name => [name, style.getPropertyValue(name)]) };
  });
  await isolated.locator("#root").evaluate((node, { width, x, y, tokens, scheme }) => {
    node.style.width = width + "px";
    node.style.marginLeft = (8 + x) + "px";
    node.style.marginTop = (8 + y) + "px";
    document.body.style.margin = "0";
    document.documentElement.style.colorScheme = scheme;
    const preview = node.querySelector(".mx-recipe-frame") ?? node;
    if (preview !== node) preview.dataset.scheme = scheme;
    for (const [name, value] of tokens) preview.style.setProperty(name, value);
    document.body.style.background = preview.style.getPropertyValue("--mx-preset-background");
  }, { ...context, scheme });
}

function apply(page, sample, { role, name, key, status, check }) {
  return (async () => {
    const control = sample.getByRole(role, { name });
    await (key ? control.press(key) : control.click());
    if (status) await expect(sample.getByRole("status").filter({ hasText: status })).toBeVisible();
    if (check) await expect(sample.locator(check)).toBeVisible();
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.mouse.move(0, 0);
  })();
}

async function imageDifference(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const decode = async value => {
      const image = new Image();
      image.src = "data:image/png;base64," + value;
      await image.decode();
      return image;
    };
    const [left, right] = await Promise.all([decode(a), decode(b)]);
    if (Math.abs(left.width - right.width) > 1 || Math.abs(left.height - right.height) > 1) return 1;
    const w = Math.min(left.width, right.width), h = Math.min(left.height, right.height);
    const pixels = image => {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const x = pixels(left), y = pixels(right);
    let different = 0;
    const match = (source, index, target, offset) =>
      Math.max(...[0, 1, 2].map(channel => Math.abs(source[index + channel] - target[offset + channel]))) <= 22;
    function near(source, target, row, col) {
      const index = (row * w + col) * 4;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (row + dy >= 0 && row + dy < h && col + dx >= 0 && col + dx < w &&
          match(source, index, target, ((row + dy) * w + col + dx) * 4)) return true;
      }
      return false;
    }
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      if (!near(x, y, row, col) || !near(y, x, row, col)) different++;
    }
    return different / (w * h);
  }, [a.toString("base64"), b.toString("base64")]);
}
