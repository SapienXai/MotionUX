import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const vault = resolve(".motionux-v9");
const snapshot = resolve(vault, "designbookmark");
const workspace = resolve(vault, "runtime/designbookmark");
const original = resolve(workspace, "original");
const installed = resolve(workspace, "installed");
const cli = resolve("node_modules/.bin/shadcn");
const digest = value => createHash("sha256").update(value).digest("hex");
const stringify = data => JSON.stringify(data, null, 2) + "\n";
const inventory = JSON.parse(await readFile("metadata/reference-inventory.json", "utf8")).items;
const rows = JSON.parse(await readFile(resolve(snapshot, "inspection.json"), "utf8")).results;
const packageJSON = stringify({ name: "motionux-private-designbookmark-consumer", type: "module", private: true,
  scripts: { build: "vite build", typecheck: "tsc --noEmit" },
  dependencies: { react: "19.3.1", "react-dom": "19.3.1", vite: "8.3.8", typescript: "5.9.3",
    "@types/react": "19.2.14", "@types/react-dom": "19.2.3", motion: "12.38.0", "framer-motion": "12.38.0",
    tailwindcss: "4.3.0", "@tailwindcss/postcss": "4.3.0", postcss: "8.5.16" },
});
const paths = ["public/originals", "components/designbookmark", "demos"];
await Promise.all([resolve(vault, "registry"), resolve(original, "dist"), ...paths.flatMap(path => [resolve(original, path), resolve(installed, path)])]
  .map(directory => mkdir(directory, { recursive: true })));

const catalog = [];
for (const row of rows.filter(item => item.observed === "code-payload" && item.sourceURL)) {
  const { name, provider, category } = inventory.find(item => item.id === row.id);
  const slug = row.id.replace(/^designbookmark-/, "");
  const path = row.snapshot ? `snapshots/${row.sha256}/${row.id}.txt` : row.id + ".txt";
  const raw = await readFile(resolve(snapshot, path), "utf8");
  if (digest(raw) !== row.sha256) throw new Error("Captured source failed verification: " + row.id);
  const document = /<!doctype html>/i.test(raw);
  if (!document && row.id !== "designbookmark-command-button") continue;
  const entry = document ? `public/originals/${slug}.html` : `components/designbookmark/${slug}.tsx`;
  const notice = raw.split("\n")[0];
  const files = [{ path: entry, target: entry, content: raw, type: "registry:file" }];
  if (document) {
    const target = `demos/${slug}.tsx`;
    const host = `export default function HTMLPreview({ basePath = "", height = 400 }: { basePath?: string; height?: number | string }) {
  const path = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return <iframe title=${JSON.stringify(name)} src={path + "/originals/${slug}.html"}
    sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ display: "block", width: "100%", height, border: 0 }} />;
}
`;
    files.push({ path: target, target, content: host, type: "registry:file" });
    await writeFile(resolve(original, "dist", slug + ".html"), raw);
  } else {
    // The published file demonstrates this JSX contract in its header.
    const demo = `import CommandButton from "../${entry.replace(/\.tsx$/, "")}";
import "./command-button.css";

export default function Demo() {
  return <CommandButton shortcut="mod+k" onSearch={() => {}}>Search</CommandButton>;
}
`;
    files.push({ path: "demos/command-button.tsx", target: "demos/command-button.tsx", content: demo, type: "registry:file" },
      { path: "demos/command-button.css", target: "demos/command-button.css", content: '@import "tailwindcss";\n', type: "registry:file" });
  }
  for (const file of files) await writeFile(resolve(original, file.target), file.content);
  const installRecipe = resolve(vault, "registry", row.id + ".json");
  await writeFile(installRecipe, stringify({
    $schema: "https://ui.shadcn.com/schema.json", name: row.id, title: name, type: "registry:item",
    dependencies: document ? [] : ["motion@12.38.0", "tailwindcss@4.3.0"], files,
  }));
  catalog.push({ id: row.id, slug, title: name, provider, category, group: "designbookmark",
    format: document ? "html" : undefined, height: document ? 400 : 360,
    upstreamHash: row.sha256, sourceAvailability: "available-local", sourceMethod: "official-copy-code",
    fidelityStatus: "source-installed", demoURL: row.reference, sourceURL: row.sourceURL, entry, installRecipe,
    licenseNoticePath: entry, notice, scenes: [], css: document ? [entry] : ["demos/command-button.css"], fonts: document ? ["Upstream web fonts"] : [],
    dependencies: document ? {} : { motion: "12.38.0", tailwindcss: "4.3.0" },
    assets: document ? [entry] : [],
    usage: document ? `import HTMLPreview from "./demos/${slug}";

export default function Example() {
  return <HTMLPreview />;
}
` : `import CommandButton from "./components/designbookmark/command-button";
import "./demos/command-button.css";

export default function Example() {
  return <CommandButton shortcut="mod+k" onSearch={query => console.info(query)}>Search</CommandButton>;
}
`,
    codeFiles: files.map(file => ({ path: file.path, sha256: digest(file.content) })),
  });
}
if (!catalog.length) throw new Error("Run the official source inspection first.");

const run = (program, args) => execFileSync(program, args, { cwd: installed, stdio: "inherit",
  env: { ...process.env, npm_config_ignore_scripts: "true" } });
const packagePath = resolve(installed, "package.json");
const previous = existsSync(packagePath) ? await readFile(packagePath, "utf8") : "";
await writeFile(packagePath, packageJSON);
if (previous !== packageJSON || !existsSync(resolve(installed, "node_modules/.bin/vite"))) run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
await writeFile(resolve(installed, "tsconfig.json"), stringify({
  compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler",
    jsx: "react-jsx", strict: true, skipLibCheck: true, paths: { "@/*": ["./*"] }, types: ["vite/client"] },
  include: ["mount.tsx", "demos", "components"],
}));
await writeFile(resolve(installed, "components.json"), stringify({
  $schema: "https://ui.shadcn.com/schema.json", style: "new-york", tsx: true, rsc: false,
  tailwind: { config: "", css: "host.css", baseColor: "neutral", cssVariables: true, prefix: "" },
  aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" },
}));
await writeFile(resolve(installed, "index.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Installed DesignBookmark source</title></head><body><main id="root"></main><script type="module" src="/mount.tsx"></script></body></html>\n');
await writeFile(resolve(installed, "postcss.config.mjs"), 'export default { plugins: { "@tailwindcss/postcss": {} } };\n');
await writeFile(resolve(installed, "host.css"), "html,body,#root { margin:0; min-height:100%; } iframe { display:block; inline-size:100%; block-size:100dvh; border:0; } .command { display:grid; place-items:center; min-height:100dvh; }\n");
await writeFile(resolve(installed, "mount.tsx"), `import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./host.css";

const query = new URLSearchParams(location.search);
const slug = query.get("item") ?? "";
const demos = import.meta.glob<{ default: React.ComponentType<{ basePath?: string; height?: string }> }>("./demos/*.tsx");
const load = demos["./demos/" + slug + ".tsx"];
const Command = lazy(() => import("./demos/command-button"));
if (query.get("scheme") === "dark") document.documentElement.classList.add("dark");
const root = createRoot(document.getElementById("root")!);
if (slug === "command-button") root.render(<Suspense fallback={null}><div className="command"><Command /></div></Suspense>);
else if (load) void load().then(({ default: Host }) => root.render(<Host basePath={import.meta.env.BASE_URL} height="100dvh" />),
  () => root.render(<p role="alert">Installed HTML host could not load.</p>));
else root.render(<p role="alert">Unknown installed source.</p>);
`);
run(cli, ["add", "--yes", ...catalog.map(item => item.installRecipe)]);
for (const item of catalog) for (const file of item.codeFiles) {
  if (digest(await readFile(resolve(installed, file.path))) !== file.sha256) throw new Error("Installed source differs: " + file.path);
}
run("npm", ["run", "typecheck"]);
run("npm", ["run", "build", "--", "--base", "/v9/live/designbookmark/installed/"]);
if (catalog.some(item => !item.format)) {
  // Build a second React host directly from the captured upstream source.
  for (const name of ["package.json", "package-lock.json", "index.html", "mount.tsx", "host.css", "postcss.config.mjs", "tsconfig.json"]) {
    await cp(resolve(installed, name), resolve(original, name));
  }
  const originDist = resolve(original, "dist");
  if (!existsSync(resolve(original, "node_modules"))) execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: original, stdio: "inherit" });
  execFileSync("npm", ["run", "build", "--", "--base", "/v9/live/designbookmark/original/", "--emptyOutDir", "false"], { cwd: original, stdio: "inherit" });
  for (const item of catalog.filter(item => item.format === "html")) await cp(resolve(original, item.entry), resolve(originDist, item.slug + ".html"));
}
await writeFile(resolve(workspace, "catalog.json"), stringify(catalog));
console.log(`${catalog.length} captured DesignBookmark sources installed byte-for-byte into a standalone React fixture.`);
