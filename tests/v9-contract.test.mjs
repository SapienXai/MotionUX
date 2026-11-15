import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import config from "../vite.config.mjs";

const json = async path => JSON.parse(await readFile(new URL("../" + path, import.meta.url), "utf8"));

test("V9 records each original reference with a truthful source state", async () => {
  const [v8, v9] = await Promise.all([json("metadata/reference-inventory.json"), json("metadata/v9-reference.json")]);
  assert.deepEqual(v9.items.map(item => item.id), v8.items.map(item => item.id));
  for (const item of v9.items) {
    assert.equal(item.legacy, true);
    assert.equal(new URL(item.reference).hostname, "designbookmark.com");
    if (item.sourceStatus === "source-acquired") {
      assert.match(item.sourceSHA256, /^[a-f0-9]{64}$/);
      assert.equal(item.method, "official-copy-code");
      assert.ok(item.bytes > 0);
    } else if (item.sourceStatus === "upstream-linked") {
      assert.ok(["kokonutui.com", "smoothui.dev"].includes(new URL(item.upstream).hostname));
    } else assert.equal(item.sourceStatus, "original-unavailable");
  }
});

test("provider discovery IDs are unique and distinct from import evidence", async () => {
  const data = await json("metadata/v9-provider-candidates.json");
  assert.equal(data.providers.length, 9);
  for (const provider of data.providers) {
    assert.equal(data.totals[provider.id], provider.candidates.length);
    assert.equal(new Set(provider.candidates.map(item => item.id)).size, provider.candidates.length, provider.id);
    assert.ok(provider.candidates.every(item => !item.accepted && !item.installed));
  }
});

test("the private vault is excluded from Vite file access and Git", async () => {
  assert.ok(config.server.fs.deny.includes("**/.motionux-v9/**"));
  const ignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  assert.ok(ignore.split("\n").includes(".motionux-v9/"));
  const registry = await readFile(new URL("../registry.json", import.meta.url), "utf8");
  assert.doesNotMatch(registry, /\.motionux-v9|\/v9\/registry\//);
});
