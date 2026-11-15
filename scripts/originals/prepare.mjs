import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { atomicWrite } from "../studio/v11/library.mjs";
import { safeFile } from "../studio/v11/paths.mjs";
import { loadCatalog, vault } from "../studio/catalog.mjs";
import { sourceIdentity } from "../studio/v11/identity.mjs";
import { digest, inspectCandidate, openProvider, providerAdapters } from "./adapters.mjs";
import { indexName, readEditionGroups, readEditions } from "./editions.mjs";

const args = process.argv.slice(2);
const name = args[0];
const ordinal = Number(name?.slice(1));
const edition = (await readEditions()).find(entry => entry.ordinal === ordinal);
if (!edition) throw new Error("Unknown edition: " + name);
const retry = args.includes("--retry");
const selectedBatches = new Set(args.slice(1).filter(arg => arg !== "--retry"));
const allItems = edition.items.map((selection, index) => ({ ...selection, sequence: index + 1 }));
if ([...selectedBatches].some(batch => !allItems.some(item => String(item.batch) === batch))) throw new Error("Unknown batch");
const evidence = resolve(vault, "evidence", name);
const runtime = resolve(vault, "runtime");
const recipes = resolve(vault, "registry");
const lockPath = resolve(vault, ".originals-import.lock");
await mkdir(vault, { recursive: true, mode: 0o700 });
function acquireImportLock() {
  try { return openSync(lockPath, "wx", 0o600); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const pid = Number(readFileSync(lockPath, "utf8"));
    if (!Number.isSafeInteger(pid) || pid <= 1) throw new Error("An original-source import already holds the workspace lock.");
    try { process.kill(pid, 0); }
    catch (probe) {
      if (probe.code !== "ESRCH") throw probe;
      unlinkSync(lockPath);
      return openSync(lockPath, "wx", 0o600);
    }
    throw new Error("An original-source import is already running (PID " + pid + ").");
  }
}
const importLock = acquireImportLock();
writeFileSync(importLock, String(process.pid));
closeSync(importLock);
process.once("exit", () => {
  if (readFileSync(lockPath, "utf8") === String(process.pid)) unlinkSync(lockPath);
});
const providers = providerAdapters();
const base = { vite: "8.3.8", tailwindcss: "4.3.0", "@tailwindcss/postcss": "4.3.0", postcss: "8.5.16" };
const output = { edition: name, ready: [], failures: [] };
const indexed = new Set(await readEditionGroups(vault));
const previousIndex = [...indexed];
const existing = [...(await loadCatalog()).values()];
await mkdir(evidence, { recursive: true, mode: 0o700 });
const baseline = resolve(evidence, "baseline.json");
if (ordinal > 13 && !existsSync(baseline)) {
  if (existing.some(item => item.editionOrdinal >= ordinal)) throw new Error("Freeze the previous catalog before importing " + name);
  const prior = new Map(existing.filter(item => item.availability === "ready").map(item => [item.id, item]));
  if (!prior.size) throw new Error("Prepare earlier originals before importing " + name);
  await atomicWrite(baseline, JSON.stringify(await sourceIdentity(prior), null, 2) + "\n");
}
const occupied = new Map(existing.flatMap(item => [[item.id, item], [item.sourceURL, item], [item.upstreamHash, item]]));
const fingerprintFiles = await Promise.all([new URL("./adapters.mjs", import.meta.url), new URL(import.meta.url),
  resolve("package-lock.json")].map(file => readFile(file)));
const fingerprint = digest(Buffer.concat(fingerprintFiles));
const shadcn = resolve("node_modules/.bin/shadcn");

function command(program, parameters, cwd) {
  return new Promise((done, reject) => {
    const child = spawn(program, parameters, { cwd, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, npm_config_ignore_scripts: "true", npm_config_fund: "false", npm_config_audit: "false" } });
    let log = "";
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { log = (log + chunk).slice(-240_000); });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) done(log);
      else reject(new Error(program + " failed\n" + log));
    });
  });
}

const json = data => JSON.stringify(data, null, 2) + "\n";
async function put(file, contents) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, contents);
}
async function within(root, file) {
  return readFile(await safeFile(root, file, vault));
}

const queue = new Map();
const adapters = new Map();
for (const selection of allItems) {
  const { provider, slug, batch, sequence } = selection;
  if (selection.exclude || selectedBatches.size && !selectedBatches.has(String(batch))) continue;
  try {
    const official = providers.get(provider);
    if (!official || official.revision !== edition.pins?.[provider]) throw new Error("Edition pin missing or differs from official inventory");
    if (!adapters.has(provider)) adapters.set(provider, openProvider(official));
    const adapter = adapters.get(provider);
    const result = inspectCandidate(adapter, selection, ordinal, sequence);
    const duplicate = [result.id, result.sourceURL, result.upstreamHash].map(key => occupied.get(key)).find(Boolean);
    if (duplicate) {
      if (duplicate.id === result.id && duplicate.editionOrdinal === ordinal && duplicate.upstreamHash === result.upstreamHash &&
        duplicate.addedSequence === sequence && (retry || duplicate.buildFingerprint === fingerprint) && duplicate.availability === "ready") {
        output.ready.push({ id: result.id, group: duplicate.group, cached: true });
        continue;
      }
      if (duplicate.id !== result.id || duplicate.editionOrdinal !== ordinal || duplicate.upstreamHash !== result.upstreamHash) {
        throw new Error("Duplicate canonical source: " + duplicate.id);
      }
    }
    const key = provider + "/" + batch;
    if (!queue.has(key)) queue.set(key, { adapter, items: [] });
    queue.get(key).items.push(result);
    for (const property of ["id", "sourceURL", "upstreamHash"]) occupied.set(result[property], result);
  } catch (error) {
    output.failures.push({ id: provider + "-" + slug, stage: "inspect", reason: error.message });
  }
}
await mkdir(runtime, { recursive: true });
await mkdir(recipes, { recursive: true });
const jobs = [...queue.values()].flatMap(({ adapter, items }) => Array.from({ length: Math.ceil(items.length / 12) },
  (_, index) => ({ adapter, items: items.slice(index * 12, (index + 1) * 12) })));

const config = {
  $schema: "https://ui.shadcn.com/schema.json", style: "new-york", tsx: true, rsc: false,
  tailwind: { config: "", css: "styles.css", baseColor: "neutral", cssVariables: true, prefix: "" },
  aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" },
};
const tsconfig = { compilerOptions: {
  target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler",
  jsx: "react-jsx", strict: true, skipLibCheck: true, allowJs: true, types: ["vite/client", "node"], paths: { "@/*": ["./*"] },
}, include: ["mount.tsx", "originals"] };

async function host(root, group, lane, adapter, items, dependencies) {
  const { font } = adapter;
  await Promise.all([
    put(resolve(root, "package.json"), json({ name: group + "-" + lane, private: true, type: "module",
      dependencies: { ...base, ...dependencies }, devDependencies: {
        typescript: "5.9.3",
        "@types/react": adapter.packages["@types/react"]?.replace(/^[~^]/, "") || "19.2.14",
        "@types/react-dom": adapter.packages["@types/react-dom"]?.replace(/^[~^]/, "") || "19.2.3",
        "@types/node": "24.19.2",
      } })),
    put(resolve(root, "tsconfig.json"), json(tsconfig)),
    put(resolve(root, "components.json"), json(config)),
    put(resolve(root, "postcss.config.mjs"), 'export default { plugins: { "@tailwindcss/postcss": {} } };\n'),
    put(resolve(root, "index.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MotionUX original preview</title></head><body><main id="root"></main><script type="module" src="/mount.tsx"></script></body></html>\n'),
    put(resolve(root, "styles.css"), `@import "./${items[0].css[0]}";
@source "./originals";
html { min-height:100%; color-scheme: light; }
html.dark { color-scheme: dark; }
body { margin:0; background:var(--background,var(--color-background,Canvas)); color:var(--foreground,var(--color-foreground,CanvasText)); ${font ? 'font-family:"' + font + ' Variable",system-ui,sans-serif;' : ""} }
#root { min-height:100dvh; display:grid; align-items:center; justify-items:center; padding:12px; }
#specimen { inline-size:100%; min-inline-size:0; display:grid; grid-template-columns:minmax(0,1fr); justify-items:safe center; }
`),
    put(resolve(root, "mount.tsx"), `import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
${font ? 'import "@fontsource-variable/' + font.toLowerCase() + '";' : ""}
import "./styles.css";
const options = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", options.get("scheme") === "dark");
const loaders: Record<string,() => Promise<{default:ComponentType}>> = {
${items.map(item => `  ${JSON.stringify(item.slug)}: () => import("./${item.demo.replace(/\.tsx$/, "")}"),`).join("\n")}
};
const load = loaders[options.get("item") ?? ""];
const root = createRoot(document.getElementById("root")!);
if (!load) root.render(<p role="alert">Unknown specimen.</p>);
else void load().then(({default:Demo}) => root.render(<div id="specimen"><Demo /></div>),
  () => root.render(<p role="alert">The pinned specimen failed to load.</p>));
`),
  ]);
}

async function buildGroup(adapter, items) {
  const provider = adapter.provider.id;
  const key = JSON.stringify(items.map(item => [item.id, item.addedSequence, item.upstreamHash, item.dependencies, item.files.map(file => digest(file.content))]));
  const group = [name, provider, digest(fingerprint + key).slice(0, 16)].join("-");
  const final = resolve(runtime, group);
  const staging = await mkdtemp(resolve(runtime, ".incoming-"));
  let installed = false;
  try {
    const original = resolve(staging, "original");
    const consumer = resolve(staging, "installed");
    const dependencies = Object.assign({}, ...items.map(item => item.dependencies));
    await Promise.all([
      host(original, group, "original", adapter, items, dependencies),
      host(consumer, group, "installed", adapter, items, { react: dependencies.react, "react-dom": dependencies["react-dom"] }),
    ]);
    const manifests = await Promise.all(items.map(async item => {
      const files = item.files.map(({ path, target, content, type }) => ({ path, target, content, type }));
      const local = resolve(staging, item.id + ".json");
      await put(local, json({ $schema: "https://ui.shadcn.com/schema/registry-item.json", name: item.id,
        title: item.title, type: "registry:item",
        dependencies: Object.entries(item.dependencies).map(([dep, version]) => dep + "@" + version), files }));
      await Promise.all(files.map(file => put(resolve(original, file.target), file.content)));
      return local;
    }));
    await command("npm", ["install", "--no-audit", "--no-fund"], original);
    await command("npm", ["install", "--no-audit", "--no-fund"], consumer);
    await command(shadcn, ["add", "--yes", ...manifests], consumer);
    for (const item of items) for (const file of item.files) {
      if (!(await within(consumer, file.path)).equals(Buffer.from(file.content))) throw new Error("Installed content differs: " + file.path);
    }
    for (const [lane, root] of [["original", original], ["installed", consumer]]) {
      await command("node", [resolve(root, "node_modules/typescript/bin/tsc"), "--noEmit"], root);
      await command("node", [resolve(root, "node_modules/vite/bin/vite.js"), "build", "--logLevel", "error", "--base", `/v9/live/${group}/${lane}/`], root);
    }
    const records = [];
    for (const item of items) {
      const { files, ...record } = item;
      const codeFiles = [];
      for (const file of files) {
        if (file.source !== file.content) await put(resolve(original, file.path), file.source);
        codeFiles.push({ path: file.path, upstreamPath: file.upstreamPath, sha256: digest(file.source), installedSHA256: digest(file.content) });
      }
      records.push({ ...record, group, buildFingerprint: fingerprint, codeFiles,
        installRecipe: resolve(recipes, group + "-" + item.id + ".json"), acceptance: { prepared: true, consumerBuilt: true } });
    }
    await put(resolve(staging, "catalog.json"), json(records));
    // The finished shard becomes visible only once its compiled lanes and recipes are ready.
    if (await stat(final).catch(() => null)) {
      const index = await readEditionGroups(vault);
      if (index.includes(group)) throw new Error("Cannot replace an active edition shard");
      await rm(final, { recursive: true, force: true });
    }
    await rename(staging, final);
    installed = true;
    for (const record of records) await atomicWrite(record.installRecipe, await readFile(resolve(final, record.id + ".json")));
    return { group, records };
  } finally {
    if (!installed) await rm(staging, { recursive: true, force: true });
  }
}

async function build(job) {
  const { adapter, items } = job;
  try {
    const { group, records } = await buildGroup(adapter, items);
    indexed.add(group);
    for (const item of records) {
      output.ready.push({ id: item.id, group, cached: false });
      console.log("Built", item.id);
    }
  } catch (error) {
    const lines = error.message.split("\n");
    const candidates = items.filter(item => error.message.includes("originals/" + item.id + "/"));
    if (candidates.length && candidates.length < items.length) {
      for (const item of candidates) output.failures.push({ id: item.id, stage: "build", reason: lines.filter(line => line.includes("originals/" + item.id + "/")).join("\n").slice(0, 1200) });
      await build({ adapter, items: items.filter(item => !candidates.includes(item)) });
    } else if (items.length > 1) {
      const middle = Math.ceil(items.length / 2);
      for (const chunk of [items.slice(0, middle), items.slice(middle)]) await build({ adapter, items: chunk });
    } else {
      output.failures.push({ id: items[0].id, stage: "build", reason: lines.slice(-20).join("\n").slice(0, 3000) });
      console.error("Failed", items[0].id, error.message.slice(-600));
    }
  }
}

await Promise.all(Array.from({ length: 3 }, async () => {
  for (let job; (job = jobs.shift());) await build(job);
}));
const retained = [];
const latest = new Set(output.ready.map(item => item.group));
const newGroups = new Set(output.ready.filter(item => !item.cached).map(item => item.group));
for (const group of [...newGroups, ...[...indexed].filter(group => !newGroups.has(group))]) {
  if (!latest.has(group) && group.startsWith(name + "-")) {
    const prior = existing.filter(item => item.group === group);
    const replaced = new Set(output.ready.filter(item => !item.cached).map(item => item.id));
    if (prior.length && prior.every(item => replaced.has(item.id))) continue;
  }
  retained.push(group);
}
if (json(previousIndex) !== json(retained)) {
  const checkpoint = new Date().toISOString().replace(/[^0-9]/g, "");
  await atomicWrite(resolve(evidence, "edition-index-before-" + checkpoint + ".json"), json(previousIndex));
  await atomicWrite(resolve(vault, indexName), json(retained));
}
await atomicWrite(resolve(evidence, "prepare-" + (args.slice(1).join("-") || "all") + ".json"), json(output));
console.log(`${name}: ${output.ready.length} prepared (incl. cache); ${output.failures.length} rejected.`);
if (output.failures.length) process.exitCode = 1;
