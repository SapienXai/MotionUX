import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { destination, extendSources, originalEntry, sources } from "./pilots.mjs";

const vault = resolve(".motionux-v9");
const cli = resolve("node_modules/.bin/shadcn");
const npm = (cwd, args) => run("npm", args, cwd);
const digest = content => createHash("sha256").update(content).digest("hex");
const json = data => JSON.stringify(data, null, 2) + "\n";
const baseDependencies = { vite: "8.3.8", tailwindcss: "4.3.0", "@tailwindcss/postcss": "4.3.0", postcss: "8.5.16" };
const args = process.argv.slice(2);
const selected = args.filter(arg => arg !== "--pilot");
if (selected.some(id => !(id in sources))) throw new Error("Unknown provider. Use kokonut or smoothui.");

function run(command, args, cwd, capture = false) {
  return execFileSync(command, args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, npm_config_ignore_scripts: "true" } });
}

async function put(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function pinnedCheckout(id, spec) {
  const upstream = resolve(vault, "upstream", id);
  if (!existsSync(resolve(upstream, ".git"))) run("git", ["clone", "--depth=1", spec.repo + ".git", upstream]);
  const git = (...args) => run("git", args, upstream, true).trim();
  if (git("rev-parse", "HEAD") !== spec.commit) {
    git("fetch", "--depth=1", "origin", spec.commit);
    git("checkout", "--detach", spec.commit);
  }
  if (git("status", "--porcelain")) throw new Error("Unexpected working changes in pinned source: " + id);
  return (...args) => run("git", ["show", spec.commit + ":" + args[0]], upstream, true);
}

if (!args.includes("--pilot")) extendSources(JSON.parse(await readFile("metadata/v9-provider-candidates.json", "utf8")));
const projects = Object.entries(sources).filter(([id]) => !selected.length || selected.includes(id));
await mkdir(resolve(vault, "upstream"), { recursive: true });
await Promise.all(projects.map(([id, provider]) => prepareProvider(id, provider)));

async function prepareProvider(id, provider) {
  const source = await pinnedCheckout(id, provider);
  const css = source(provider.css);
  const license = source("LICENSE");
  const base = resolve(vault, "runtime", id);
  const original = resolve(base, "original");
  const consumer = resolve(base, "installed");
  const shared = Object.entries(provider.support).map(([from, path]) => ({
    path, content: source(from), type: "registry:file", target: path,
  }));
  const output = [];
  for (const item of provider.items) {
    const origin = originalEntry(id, item.slug);
    const target = destination(id, item.slug);
    const code = source(origin);
    const styleTarget = "upstream.css";
    const demoPath = id === "smoothui" ? "apps/docs/examples/" + item.slug + ".tsx" : origin;
    const demo = id === "smoothui" ? source(demoPath) : `export { default } from "@/${target.replace(/\.tsx$/, "")}";\n`;
    const demoTarget = `demos/${item.slug}.tsx`;
    const licenseTarget = `notices/${id}.txt`;
    const component = { path: target, target, content: code, type: "registry:file" };
    const relevantSupport = shared.filter(file => !file.path.includes("/ai-core/") || item.slug === "siri-orb");
    const originalFiles = [component, ...relevantSupport, { path: styleTarget, target: styleTarget, content: css, type: "registry:file" },
      { path: demoTarget, target: demoTarget, content: demo, type: "registry:file" },
      { path: licenseTarget, target: licenseTarget, content: license, type: "registry:file" }];
    const installFiles = originalFiles.map(file => {
      if (id !== "smoothui" || !file.target.endsWith(".tsx")) return file;
      const content = file.content.replaceAll('"@repo/smoothui-utils"', '"@/lib/utils"')
        .replaceAll('"@repo/ai-core"', '"@/components/smoothui/ai-core"')
        .replaceAll('"@repo/smoothui/components/', '"@/components/smoothui/');
      return { ...file, content };
    });
    const payload = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json", name: `${id}-${item.slug}`,
      type: "registry:item", title: item.title,
      dependencies: Object.entries(provider.dependencies).map(([name, version]) => `${name}@${version}`),
      files: installFiles,
    };
    const payloadPath = resolve(vault, "registry", payload.name + ".json");
    await put(payloadPath, json(payload));
    for (const file of originalFiles) await put(resolve(original, file.target), file.content);
    const demoURL = id === "kokonut" ? `https://kokonutui.com/docs/${item.docs}` : `https://smoothui.dev/docs/components/${item.slug}`;
    const modulePath = "./" + demoTarget.replace(/\.tsx$/, "");
    const usageImports = (provider.font ? 'import "@fontsource-variable/geist";\n' : "") + `import "./${styleTarget}";\n`;
    const usage = item.scenes ? `import Demo, { demoScenes } from "${modulePath}";\n${usageImports}
const scene = "";
export default function Example() {
  const Scene = demoScenes[scene as keyof typeof demoScenes] ?? Demo;
  return <Scene />;
}
` : `import Demo from "${modulePath}";\n${usageImports}\nexport default function Example() {\n  return <Demo />;\n}\n`;
    output.push({ id: item.galleryId, slug: item.slug, group: id, provider: provider.provider, title: item.title,
      category: item.category, sourceMethod: "pinned-git-source", sourceAvailability: "available-local",
      fidelityStatus: id === "smoothui" ? "source-adapted" : "original-source-running", repo: provider.repo, upstreamCommit: provider.commit, demoURL,
      sourceURL: `${provider.repo}/blob/${provider.commit}/${origin}`, licenseNoticePath: licenseTarget,
      upstreamHash: digest(code), entry: target, css: [styleTarget], fonts: provider.font ? [provider.font] : [], assets: [],
      dependencies: provider.dependencies, scenes: item.scenes ?? [], installRecipe: payloadPath,
      usage,
      codeFiles: originalFiles.map((file, i) => ({ path: file.target, sha256: digest(file.content), installedSHA256: digest(installFiles[i].content) })),
    });
  }
  await Promise.all([original, consumer].map(lane => initProject(lane, id, provider)));
  await put(resolve(consumer, "components.json"), json({
    $schema: "https://ui.shadcn.com/schema.json", style: "new-york", tsx: true, rsc: false,
    tailwind: { config: "", css: "styles.css", baseColor: "neutral", cssVariables: true, prefix: "" },
    aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" },
  }));
  const artifacts = output.map(item => item.installRecipe);
  // This directory is a generated fixture, independent of the untouched upstream lane.
  await Promise.all([...new Set(output.flatMap(item => item.codeFiles.map(file => file.path)))].map(path =>
    rm(resolve(consumer, path), { force: true })));
  run(cli, ["add", "--dry-run", ...artifacts], consumer, true);
  run(cli, ["add", "--yes", ...artifacts], consumer);
  for (const item of output) for (const file of item.codeFiles) {
    if (digest(await readFile(resolve(consumer, file.path))) !== file.installedSHA256) throw new Error("Installed content differs: " + file.path);
  }
  for (const [name, directory] of [["original", original], ["installed", consumer]]) {
    npm(directory, ["run", "typecheck"]);
    npm(directory, ["run", "build", "--", "--base", `/v9/live/${id}/${name}/`]);
  }
  await cp(resolve(original, "package-lock.json"), resolve(base, "verified-package-lock.json"));
  await put(resolve(base, "catalog.json"), json(output));
  console.log(`${provider.provider}: ${output.length} original and installed demos built`);
}

async function initProject(root, id, provider) {
  await mkdir(root, { recursive: true });
  const packagePath = resolve(root, "package.json");
  const manifest = json({
    name: "motionux-private-" + id, private: true, type: "module",
    scripts: { build: "vite build", typecheck: "tsc --noEmit" },
    dependencies: { ...baseDependencies, ...provider.dependencies },
    devDependencies: { typescript: "5.9.3", "@types/react": "19.2.14", "@types/react-dom": "19.2.3" },
  });
  const previous = existsSync(packagePath) ? await readFile(packagePath, "utf8") : null;
  await put(packagePath, manifest);
  if (manifest !== previous || !existsSync(resolve(root, "package-lock.json"))) npm(root, ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  else if (!existsSync(resolve(root, "node_modules/.bin/vite"))) npm(root, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);

  const paths = { "@/*": ["./*"] };
  if (id === "smoothui") Object.assign(paths, {
    "@repo/smoothui-utils": ["./lib/utils.ts"],
    "@repo/ai-core": ["./components/smoothui/ai-core/index.tsx"],
    "@repo/smoothui/components/*": ["./components/smoothui/*/index.tsx"],
  });
  await put(resolve(root, "tsconfig.json"), json({ compilerOptions: {
    target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler",
    jsx: "react-jsx", types: ["vite/client"], strict: true, skipLibCheck: true, paths,
  }, include: ["mount.tsx", "components", "demos", "lib"] }));
  await put(resolve(root, "postcss.config.mjs"), 'export default { plugins: { "@tailwindcss/postcss": {} } };\n');
  await put(resolve(root, "vite.config.mjs"), 'import { defineConfig } from "vite";\nexport default defineConfig({ resolve: { tsconfigPaths: true }, oxc: { jsx: { runtime: "automatic" } }, publicDir: false });\n');
  await put(resolve(root, "index.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MotionUX original preview</title></head><body><main id="root"></main><script type="module" src="/mount.tsx"></script></body></html>\n');
  await put(resolve(root, "styles.css"), `@import "./upstream.css";
html { min-height: 100%; color-scheme: light; }
html.dark { color-scheme: dark; }
body { margin: 0; background: var(--background, var(--color-background, Canvas)); color: var(--foreground, var(--color-foreground, CanvasText)); ${provider.font ? `font-family: "${provider.font} Variable", system-ui, sans-serif;` : ""} }
#root { min-height: 100dvh; display: grid; align-items: center; justify-items: center; padding: 12px; }
#specimen { inline-size: 100%; display: grid; justify-items: center; }
`);
  const loaders = provider.items.map(item => `  "${item.slug}": () => import("./demos/${item.slug}"),`).join("\n");
  await put(resolve(root, "mount.tsx"), `import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
${provider.font ? 'import "@fontsource-variable/geist";' : ""}
import "./styles.css";

const options = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", options.get("scheme") === "dark");
const modules: Record<string, () => Promise<{ default: ComponentType; demoScenes?: Record<string, ComponentType> }>> = {
${loaders}
};
const root = createRoot(document.getElementById("root")!);
const load = modules[options.get("item") ?? ""];
if (load) void load().then(module => {
  const Scene = module.demoScenes?.[options.get("scene") ?? ""] ?? module.default;
  root.render(<div id="specimen"><Scene /></div>);
}, () => root.render(<p role="alert">The pinned specimen failed to load.</p>));
else root.render(<p role="alert">Unknown specimen.</p>);
`);
}
