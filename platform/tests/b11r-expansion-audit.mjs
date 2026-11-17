import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { codeProfileFor, inspectCodeCatalog, listLocalBuildSources, sourceRead } from "../packages/app-export/code-catalog.ts";
import { fingerprint } from "../packages/build-core/store.ts";

const run = promisify(execFile);
const repo = resolve(import.meta.dirname, "../..");
const vault = resolve(repo, ".motionux-v9");
const evidence = resolve(vault, "evidence/build-source-expansion");
const baseline = JSON.parse(await readFile(resolve(vault, "evidence/build-b11r/inventory.json"), "utf8"));
const catalog = JSON.parse(await readFile(resolve(vault, "catalog.last-good.json"), "utf8"));
const inventory = await inspectCodeCatalog(repo);
const originalExclusions = new Map(baseline.rows.filter(({ ready }) => !ready).map((row) => [row.id, row]));
const scopes = inventory.rows.filter(({ id }) => originalExclusions.has(id));
assert.equal(scopes.length, originalExclusions.size, "The original exclusion cohort must still be present.");
const local = await listLocalBuildSources(repo);
assert.deepEqual(local.map(({ id }) => id).sort(), scopes.filter(({ ready }) => !ready).map(({ id }) => id).sort());
const rows = [];
for (const row of scopes) {
  const record = catalog.find(({ id }) => id === row.id);
  const recipe = JSON.parse(await sourceRead(vault, "registry/" + basename(record.installRecipe), 4_000_000));
  const entry = recipe.files.find(({ path }) => path === record.entry);
  const declaredPin = record.codeFiles.find(({ path }) => path === record.entry);
  rows.push({
    ...row, previousReason: originalExclusions.get(row.id).reason,
    preparedEntryMatches: Boolean(entry && declaredPin && fingerprint(entry.content) === (declaredPin.installedSHA256 ?? declaredPin.sha256)),
    preparedDependencies: recipe.dependencies ?? [], preparedAssets: record.assets ?? [],
    exportAssets: inventory.sources.get(row.id)?.assets.map(({ path, sha256, rights }) => ({ path, sha256, rights })) ?? [],
  });
}
await mkdir(evidence, { recursive: true, mode: 0o700 });
const root = await mkdtemp(resolve(vault, "build-tests/expanded-typecheck-"));
let diagnostics = "";
try {
  const packages = [...new Set(scopes.filter(({ ready }) => ready).flatMap(({ id }) => inventory.sources.get(id).packages))];
  const profile = await codeProfileFor(repo, packages);
  await symlink(resolve(repo, "platform/templates", profile, "node_modules"), resolve(root, "node_modules"), "dir");
  for (const row of rows.filter(({ ready }) => ready)) {
    const source = inventory.sources.get(row.id);
    for (const [file, code] of Object.entries(source.files)) {
      const target = resolve(root, "sources", row.id, file);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, code, { mode: 0o600 });
    }
  }
  const config = JSON.parse(await readFile(resolve(repo, "platform/templates/hotel-dashboard/tsconfig.json"), "utf8"));
  config.include = ["sources/**/*.ts", "sources/**/*.tsx"];
  config.compilerOptions.incremental = false;
  await writeFile(resolve(root, "tsconfig.json"), JSON.stringify(config), { mode: 0o600 });
  try {
    await run(process.execPath, ["node_modules/typescript/bin/tsc", "--pretty", "false"], { cwd: root, timeout: 60_000 });
  } catch (error) {
    diagnostics = error.stdout + error.stderr;
    throw error;
  } finally {
    await writeFile(resolve(evidence, "audit.json"), JSON.stringify({
      baseline: baseline.counts, current: inventory.counts, local, rows,
      typecheck: { sources: rows.filter(({ ready }) => ready).length, passed: diagnostics === "", diagnostics },
    }, null, 2), { mode: 0o600 });
  }
  console.log(inventory.counts, rows.filter(({ ready }) => ready).length + " newly eligible closures passed TypeScript");
} finally {
  await rm(root, { recursive: true, force: true });
}
