import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { inspectCodeCatalog } from "../packages/app-export/code-catalog.ts";
import { compileCodeProject } from "../packages/app-export/code-program.ts";
import { fingerprint } from "../packages/build-core/store.ts";

const repo = resolve(import.meta.dirname, "../..");
const evidence = resolve(repo, ".motionux-v9/evidence/build-b11r");
const project = JSON.parse(await readFile(resolve(evidence, "A-project.json"), "utf8"));
const selected = new Set(project.document.codeProject.sources.map(({ id }) => id));
const catalog = JSON.parse(await readFile(resolve(repo, ".motionux-v9/catalog.last-good.json"), "utf8"))
  .filter(({ id }) => selected.has(id));
assert.equal(catalog.length, selected.size);
const scratch = await mkdtemp(resolve(repo, ".motionux-v9/build-tests/b11r-source-faults-"));
const vault = resolve(scratch, ".motionux-v9");
const report = { project: project.id, revision: project.revision, sources: [...selected], checks: [] };
try {
  await mkdir(resolve(vault, "registry"), { recursive: true, mode: 0o700 });
  for (const folder of ["hotel-dashboard", "hotel-marketing/media", "source-driven"])
    await cp(resolve(repo, "platform/templates", folder), resolve(scratch, "platform/templates", folder), {
      recursive: true, filter: (path) => !path.split("/").some((part) => ["node_modules", ".next"].includes(part)),
    });
  await cp(resolve(repo, "LICENSE"), resolve(scratch, "LICENSE"));
  const catalogPath = resolve(vault, "catalog.last-good.json");
  await writeFile(catalogPath, JSON.stringify(catalog));
  for (const entry of catalog) await cp(resolve(repo, ".motionux-v9/registry", basename(entry.installRecipe)),
    resolve(vault, "registry", basename(entry.installRecipe)));
  const baseline = await compileCodeProject(scratch, project);
  assert(baseline.files["components/app.tsx"]);
  report.checks.push({ name: "exact disposable source closure compiles", passed: true });
  const entry = catalog.find((item) => item.licenseNoticePath);
  assert(entry, "A source with its own license notice is required.");
  const recipePath = resolve(vault, "registry", basename(entry.installRecipe));
  const original = await readFile(recipePath, "utf8");
  async function failure(name, change) {
    const recipe = JSON.parse(original);
    const changedCatalog = structuredClone(catalog);
    await change(recipe, changedCatalog);
    await writeFile(recipePath, JSON.stringify(recipe));
    await writeFile(catalogPath, JSON.stringify(changedCatalog));
    await assert.rejects(compileCodeProject(scratch, project), { status: 409 });
    const row = (await inspectCodeCatalog(scratch)).rows.find(({ id }) => id === entry.id);
    assert.equal(row.ready, false);
    report.checks.push({ name, passed: true, reason: row.reason });
    await writeFile(recipePath, original);
    await writeFile(catalogPath, JSON.stringify(catalog));
  }
  await failure("missing selected entry rejects export", async (recipe) => {
    recipe.files = recipe.files.filter(({ path }) => path !== entry.entry);
  });
  await failure("selected source byte drift rejects export", async (recipe) => {
    recipe.files.find(({ path }) => path === entry.entry).content += "\n// deliberate private-copy fault\n";
  });
  await failure("missing selected license rejects export", async (recipe) => {
    recipe.files = recipe.files.filter(({ path }) => path !== entry.licenseNoticePath);
  });
  await failure("restricted rights reject even a matching updated license hash", async (recipe, entries) => {
    const file = recipe.files.find(({ path }) => path === entry.licenseNoticePath);
    file.content = "All rights reserved. No redistribution permission.";
    const pin = entries.find(({ id }) => id === entry.id).codeFiles.find(({ path }) => path === entry.licenseNoticePath);
    pin.sha256 = fingerprint(file.content);
    delete pin.installedSHA256;
  });
  assert.deepEqual(await compileCodeProject(scratch, project), baseline);
  report.checks.push({ name: "restored source closure exactly matches baseline", passed: true });
  await writeFile(resolve(evidence, "selected-source-faults.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
