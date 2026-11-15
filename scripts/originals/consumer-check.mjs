import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { loadCatalog, vault } from "../studio/catalog.mjs";
import { emptyLibrary } from "../studio/v11/library.mjs";
import { readEditions } from "./editions.mjs";

const run = promisify(execFile);
const edition = (await readEditions()).find(entry => "v" + entry.ordinal === (process.argv[2] ?? "v13"));
assert(edition, "Specify a known edition");
const root = resolve(vault, "evidence", "v" + edition.ordinal);
await mkdir(root, { recursive: true, mode: 0o700 });
const catalog = await loadCatalog();
const items = [...catalog.values()].filter(item => item.editionOrdinal === edition.ordinal && item.availability === "ready");
const groups = Map.groupBy(items, item => item.group);
const report = { compiledUsage: [], failures: [], kit: {}, next: {} };

async function compileUsages(group, entries) {
  const project = resolve(vault, "runtime", group, "installed");
  const verifyDir = await mkdtemp(resolve(project, "usage-check-"));
  try {
    const paths = entries.map(item => resolve(verifyDir, item.id + ".tsx"));
    await Promise.all(entries.map((item, i) => writeFile(paths[i], item.usage.replaceAll('"./originals/', '"../originals/'))));
    const config = resolve(verifyDir, "tsconfig.json");
    await writeFile(config, JSON.stringify({ extends: "../tsconfig.json", include: ["./*.tsx"] }));
    await run(process.execPath, [resolve(project, "node_modules/typescript/bin/tsc"), "-p", config, "--noEmit"], { cwd: project });
    report.compiledUsage.push(...entries.map(item => item.id));
  } catch (error) {
    report.failures.push({ group, message: (error.stdout ?? error.message).slice(-3000) });
  } finally { await rm(verifyDir, { recursive: true, force: true }); }
}

const queue = [...groups];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let entry; (entry = queue.shift()); ) await compileUsages(...entry);
}));

const kitItems = ["Kokonut UI", "SmoothUI", "Magic UI"].flatMap(provider =>
  items.filter(item => item.provider === provider && report.compiledUsage.includes(item.id)).sort((a, b) => a.addedSequence - b.addedSequence).slice(0, 5));
assert.equal(kitItems.length, 15);
const fixture = await mkdtemp(resolve(root, "kit-fixture-"));
const basket = randomUUID();
await writeFile(resolve(fixture, "library.v1.json"), JSON.stringify({
  ...emptyLibrary(), collections: [{ id: basket, name: `V${edition.ordinal} mixed consumer verification`, items: kitItems.map(item => item.id) }],
}));
const listener = createServer().listen(0, "127.0.0.1");
await once(listener, "listening");
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const origin = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, ["scripts/v9/serve.mjs"], { stdio: ["ignore", "ignore", "pipe"],
  env: { ...process.env, MOTIONUX_LIBRARY_FIXTURE: fixture, MOTIONUX_FIXTURE_PORT: String(port), MOTIONUX_STUDIO_SHELL: resolve(vault, "studio-shell") } });
try {
  let plan;
  for (let attempt = 0; attempt < 75 && !plan; attempt++) {
    try { plan = await fetch(origin + "/v11/kits/" + basket).then(response => response.json()); }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.equal(plan?.items.length, 15);
  assert(plan.conflicts.some(({ name }) => name === "react" || name === "motion"));
  const blob = await fetch(origin + "/v11/kits/" + basket + ".zip");
  assert(blob.ok);
  const archive = resolve(root, "mixed-15-kit.zip");
  await writeFile(archive, Buffer.from(await blob.arrayBuffer()));
  await run("unzip", ["-t", archive]);
  const extracted = resolve(fixture, "kit");
  await mkdir(extracted);
  await run("unzip", ["-q", archive, "-d", extracted]);
  for (const item of kitItems) {
    assert.deepEqual(await readFile(resolve(extracted, "registry", item.id + ".json")), await readFile(item.installRecipe));
  }
  report.kit = { items: kitItems.map(item => item.id), conflicts: plan.conflicts, archive };

  // Keep mixed incompatible provider packages separate. Compile a complete Next.js route using
  // the five compatible Kokonut packages from the same exported kit.
  const nextItems = kitItems.filter(item => item.provider === "Kokonut UI");
  const project = resolve(fixture, "next");
  await mkdir(resolve(project, "app"), { recursive: true });
  const deps = nextItems[0].dependencies;
  const json = (file, body) => writeFile(resolve(project, file), JSON.stringify(body, null, 2) + "\n");
  await Promise.all([
    json("package.json", { name: "motionux-next-kit-fixture", private: true,
      dependencies: { next: "16.4.6", react: deps.react, "react-dom": deps["react-dom"], tailwindcss: "4.3.0",
        "@tailwindcss/postcss": "4.3.0", postcss: "8.5.16" },
      devDependencies: { typescript: "5.9.3", "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/node": "24.19.2" } }),
    json("components.json", { $schema: "https://ui.shadcn.com/schema.json", style: "new-york", tsx: true, rsc: true,
      tailwind: { config: "", css: "app/globals.css", baseColor: "neutral", cssVariables: true, prefix: "" },
      aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" } }),
    json("tsconfig.json", { compilerOptions: { paths: { "@/*": ["./*"] } } }),
    writeFile(resolve(project, "postcss.config.mjs"), 'export default { plugins: { "@tailwindcss/postcss": {} } };\n'),
    writeFile(resolve(project, "app", "globals.css"), `@import "../${nextItems[0].css[0]}";\n@source "../originals";\n`),
    writeFile(resolve(project, "app", "layout.tsx"), 'import "./globals.css";\nexport default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }\n'),
    writeFile(resolve(project, "app", "page.tsx"), '"use client";\n' + nextItems.map((item, index) =>
      `import Example${index} from "../originals/${item.id}/demos/example";`).join("\n") +
      "\nexport default function Page() { return <main>" + nextItems.map((_, index) => `<Example${index} />`).join("") + "</main>; }\n"),
  ]);
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", npm_config_ignore_scripts: "true" };
  await run("npm", ["install", "--no-audit", "--no-fund"], { cwd: project, env });
  await run(resolve("node_modules/.bin/shadcn"), ["add", "--yes", ...nextItems.map(item => resolve(extracted, "registry", item.id + ".json"))], { cwd: project, env });
  await run(process.execPath, [resolve(project, "node_modules/next/dist/bin/next"), "build", "--webpack"], { cwd: project, env, maxBuffer: 4 * 1024 * 1024 });
  report.next = { installed: nextItems.map(item => item.id), productionBuild: true };
} catch (error) {
  report.failures.push({ group: "kit/next", message: (error.stderr || error.stdout || error.message).slice(-4000) });
} finally {
  const ended = once(server, "exit");
  server.kill();
  await ended;
  await writeFile(resolve(root, "consumer-kit.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(`Usage compiled for ${report.compiledUsage.length}; kit contains ${report.kit.items?.length ?? 0}; Next compiled ${report.next.installed?.length ?? 0}.`);
if (report.failures.length) process.exitCode = 1;
