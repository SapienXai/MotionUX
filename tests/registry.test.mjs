import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = async (relative) => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
const registry = await read("../registry.json");
const metadata = await read("../metadata/components.json");

test("every installable item is built from real files with catalog provenance", async () => {
  const items = registry.items.map(({ name }) => name);
  assert.equal(new Set(items).size, items.length);
  assert.deepEqual(Object.keys(metadata.items).sort(), [...items].sort());
  for (const item of registry.items) {
    const meta = metadata.items[item.name];
    assert.ok(meta.source && meta.license && meta.evidence && Array.isArray(meta.consumers), item.name);
    const built = await read(`../public/r/${item.name}.json`);
    assert.equal(built.name, item.name);
    for (const file of item.files) {
      assert.ok((await stat(new URL(`../${file.path}`, import.meta.url))).isFile(), file.path);
      assert.match(file.target, /^@components\/sapienx-motion\//);
      assert.ok(built.files.find((candidate) => candidate.path === file.path)?.content, file.path);
    }
    for (const dep of item.registryDependencies ?? []) {
      assert.match(dep, /^SapienXai\/MotionUX\/[\w-]+#v\d+\.\d+\.\d+$/);
      assert.ok(items.includes(dep.split("/").at(-1).split("#")[0]), dep);
    }
  }
});

const reference = await read("../metadata/reference-inventory.json");
const recipeSources = await Promise.all(registry.items.filter(item => item.name.startsWith("gallery-recipes-"))
  .map(item => readFile(new URL("../" + item.files[0].path, import.meta.url), "utf8")));
const implementationPaths = new Set(registry.items.map(({ name }) => name));

test("all 82 live references have a distinct registry and Studio entry with source and test evidence", async () => {
  assert.equal(reference.items.length, 82);
  for (const key of ["id", "registryItem", "order"]) {
    assert.equal(new Set(reference.items.map((item) => item[key])).size, 82, key);
  }
  assert.deepEqual(Object.fromEntries(["DesignBookmark", "Kokonut UI", "SmoothUI"].map((provider) =>
    [provider, reference.items.filter((item) => item.provider === provider).length])), { DesignBookmark: 51, "Kokonut UI": 25, SmoothUI: 6 });
  for (const item of reference.items) {
    assert.ok(implementationPaths.has(item.registryItem), item.id);
    assert.equal(recipeSources.filter(source => source.includes(`"${item.id}": () => import(`)).length, 1, item.id);
    assert.equal(item.preview, `/?item=${item.id}`);
    assert.match(item.version, /^[0-9a-f]{40}$/);
    assert.ok(item.sourceUrl && item.sourceLicense && item.decision, item.id);
    const tests = await readFile(new URL(`../${item.test}`, import.meta.url), "utf8");
    assert.ok(tests.includes(item.id), `Missing source-qualified browser case for ${item.id}`);
    if (item.status === "ready") {
      assert.ok(item.evidence, `Ready item ${item.id} requires reviewed visual evidence`);
    }
  }
});

test("the parity ledger covers every reference and binds accepted evidence to an exact registry pin", async () => {
  const parity = await read("../metadata/parity-manifest.json");
  assert.deepEqual(parity.items.map(item => item.id), reference.items.map(item => item.id));
  const recipeRows = parity.items.filter(row => row.recipe);
  assert.equal(recipeRows.length, reference.items.length - parity.featured.length);
  for (const row of recipeRows) {
    assert.ok(implementationPaths.has(row.recipe), row.id);
    const recipe = parity.recipes[row.recipe];
    assert.equal(recipe.publicContract.name, row.recipe);
    assert.match(recipe.pin, /^[0-9a-f]{40}$/);
    assert.ok(recipe.files.every(file => /^[0-9a-f]{64}$/.test(file.sha256)));
  }
  for (const row of parity.items) {
    assert.ok(implementationPaths.has(row.installItem));
    if (row.pin) {
      assert.match(row.pin, /^[a-f0-9]{40}$/);
      for (const file of row.files) assert.match(file.sha256, /^[a-f0-9]{64}$/);
    }
    if (row.parity === "parity-ok") {
      assert.equal(row.pin, row.evidence.pin, row.id);
      const report = JSON.parse(await readFile(row.evidence.report, "utf8"));
      assert.equal(report.pin, row.pin, row.id);
      const cases = report.cases.filter(item => item.item === row.installItem);
      assert.equal(cases.length, 12, row.id);
      assert.ok(cases.every(item => item.differentPixels <= .025), row.id);
      if (report.timeline) {
        const timeline = report.timeline.filter(item => item.id === row.id);
        assert.equal(timeline.length, 6, row.id);
        assert.ok(timeline.every(item => !item.error && item.studio.length === item.consumer.length), row.id);
      }
    }
  }
});
