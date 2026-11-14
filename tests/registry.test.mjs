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
