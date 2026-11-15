import assert from "node:assert/strict";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createBrain } from "../../src/brain/ranker.ts";
import { canonical } from "../../src/brain/indexer.ts";
import { syntheticIndex } from "../../fixtures/brain/synthetic.mjs";
import { atomicWrite } from "../studio/v11/library.mjs";
import { measureLocalBuild } from "./index-store.mjs";

const fixture = JSON.parse(await readFile("fixtures/brain/scenarios.v1.json", "utf8"));
const testRequests = fixture.scenarios.map(row => row.request);
const { index, ...build } = await measureLocalBuild();
assert.equal(build.rebuilt, 1);
assert.equal(build.reused, index.records.length - 1);
function memory() {
  global.gc();
  const { rss, heapUsed } = process.memoryUsage();
  return { rssMiB: rss / 1048576, heapMiB: heapUsed / 1048576 };
}
function measure(data) {
  const engine = createBrain(data);
  for (const request of testRequests) engine.query("search", request);
  const warm = memory();
  const cases = Array.from({ length: testRequests.length * 5 }, (_, index) => {
    const request = testRequests[index % testRequests.length];
    const start = performance.now();
    canonical(engine.query("search", request));
    return performance.now() - start;
  }).sort((a, b) => a - b);
  const quantile = p => cases[Math.ceil(p * cases.length) - 1];
  return { records: data.records.length, environment: data.environment, queries: cases.length, p50Ms: quantile(.5), p95Ms: quantile(.95),
    indexBytes: Buffer.byteLength(canonical(data) + "\n"), before: warm, after: memory() };
}
const real = measure(index);
const scale = [500, 1000].map(size => measure(syntheticIndex(size)));
const report = { schemaVersion: 1, indexFingerprint: index.indexFingerprint, host: {
  arch: arch(), platform: platform(), release: release(), cpu: cpus()[0].model, memoryGiB: totalmem() / 1024 ** 3, node: process.version,
}, build, real, scale };
await atomicWrite(resolve(".motionux-v9/evidence/brain-v1/performance.json"), canonical(report) + "\n");
console.log(JSON.stringify(report, null, 2));
if (real.p95Ms > 100) process.exitCode = 1;
