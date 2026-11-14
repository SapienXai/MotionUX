import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build, createServer, preview } from "vite";
import { chromium, webkit, expect } from "@playwright/test";

const root = process.cwd();
const local = process.argv.includes("--local");
const evidence = resolve(process.env.MOTIONUX_PARITY_EVIDENCE ?? "test-results/consumer-parity");
const manifest = JSON.parse(await readFile("metadata/parity-manifest.json", "utf8"));
const registry = JSON.parse(await readFile("registry.json", "utf8"));
const pin = process.env.MOTIONUX_REGISTRY_REF ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error("Use a full published SHA.");
const presets = Object.entries(manifest.presets);
const temp = await mkdtemp(join(tmpdir(), "motionux-v6-react-"));
const src = join(temp, "src");
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
  const addresses = presets.map(([, spec]) => local ? resolve(`public/r/${spec.item}.json`) : `SapienXai/MotionUX/${spec.item}#${pin}`);
  run(cli, ["view", ...addresses], true);
  run("npm", ["install", "--no-audit", "--no-fund"]);
  run(cli, ["add", "--dry-run", ...addresses], true);
  run(cli, ["add", "--yes", ...addresses]);
  for (const [, { item }] of presets) {
    for (const file of registry.items.find(entry => entry.name === item).files) {
      const target = file.target.replace(/^@components\//, "src/components/");
      const installed = await readFile(join(temp, target));
      const expected = await readFile(resolve(file.path));
      if (!installed.equals(expected)) throw new Error(`Installed content differs for ${item}: ${target}`);
    }
  }
  const imports = presets.map(([, { item, export: name }]) =>
    `import { ${name} } from "./components/sapienx-motion/presets/showcase/${item.replace(/-gallery$/, "")}";`).join("\n");
  const rendered = presets.map(([id, { export: name }]) => `case "${id}": return ${name === "LoadingOutcome" ?
    "<LoadingOutcome onStart={() => setState('success')} state={state} simulation reducedMotion />" : `<${name} reducedMotion />`};`).join("\n");
  await write("src/main.tsx", `import "@fontsource-variable/inter";
import { useState } from "react";
import { createRoot } from "react-dom/client";
${imports}
function Fixture() {
 const [state, setState] = useState<"idle" | "success">("idle");
 switch (new URLSearchParams(location.search).get("item")) {
  ${rendered}
  default: return null;
 }
}
createRoot(document.getElementById("root")!).render(<Fixture />);
`);
  await write("index.html", '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/src/main.tsx"></script></html>');
  run(resolve("node_modules/.bin/tsc"), ["-p", join(temp, "tsconfig.json")]);
  // The fixture consumes the installed files from a separate production build.
  await build({ root: temp, configFile: false, logLevel: "error" });
  consumer = await preview({ root: temp, configFile: false, logLevel: "error", preview: { host: "127.0.0.1", port: 0 } });
  studio = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
  await studio.listen();
  [chrome, safari] = await Promise.all([chromium.launch(), webkit.launch()]);
  const summaries = [];
  for (const width of [390, 768, 1536]) {
    for (const scheme of ["light", "dark"]) {
      const browser = width === 390 ? safari : chrome;
      const options = { viewport: { width, height: 1024 }, reducedMotion: "reduce", colorScheme: scheme };
      const gallery = await browser.newPage(options);
      const isolated = await browser.newPage(options);
      await gallery.addInitScript(value => localStorage.setItem("mx-studio-scheme", value), scheme);
      for (const [id, { item }] of presets) {
        await gallery.goto(origin(studio));
        const outer = gallery.locator(`[data-card="${id}"]`);
        await outer.scrollIntoViewIfNeeded();
        const sample = outer.locator(".mx-feature");
        await expect(sample).toBeVisible();
        const context = await sample.evaluate(node => {
          const colors = ["--mx-font", "--mx-preset-background", "--mx-surface", "--mx-ink", "--mx-muted", "--mx-line", "--mx-accent", "--mx-on-accent", "--mx-selected"];
          const style = getComputedStyle(node);
          const { width, x, y } = node.getBoundingClientRect();
          return { width, x: x % 1, y: y % 1, tokens: colors.map(name => [name, style.getPropertyValue(name)]) };
        });
        await isolated.goto(`${origin(consumer)}/?item=${id}`);
        const installed = isolated.locator(".mx-feature");
        await expect(installed).toBeVisible();
        await isolated.locator("#root").evaluate((node, { width, x, y, tokens, scheme }) => {
          node.style.width = width + "px";
          node.style.marginLeft = (8 + x) + "px";
          node.style.marginTop = (8 + y) + "px";
          document.body.style.margin = "0";
          document.documentElement.style.colorScheme = scheme;
          for (const [name, value] of tokens) node.style.setProperty(name, value);
          document.body.style.background = node.style.getPropertyValue("--mx-preset-background");
        }, { ...context, scheme });
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
  await writeFile(join(evidence, "report.json"), JSON.stringify({ pin: local ? null : pin, cases: summaries }, null, 2) + "\n");
  console.log(`${summaries.length} installed React preset comparisons passed (ARIA and ≤2.5% visually differing pixels).`);
} finally {
  if (studio) await studio.close();
  if (consumer) await new Promise(resolveClose => consumer.httpServer.close(resolveClose));
  await Promise.all([chrome?.close(), safari?.close()]);
  await rm(temp, { recursive: true, force: true });
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
