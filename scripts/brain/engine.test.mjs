import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, realpath, cp, rm, writeFile, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createBrain } from "../../src/brain/ranker.ts";
import { asIndex, asRequest, asResult } from "../../src/brain/validation.ts";
import { canonical, hash, makeIndex, rebuild, verifyIndex } from "../../src/brain/indexer.ts";
import { translate } from "../../src/brain/taxonomy.ts";
import { specimen, syntheticIndex } from "../../fixtures/brain/synthetic.mjs";
import { atomicWrite } from "../studio/v11/library.mjs";
import { readJson } from "./index-store.mjs";

const cfg = hash("fixture config");
const react = specimen("alpha", { tested: ["keyboard"], cost: "low" });
const html = specimen("beta", { kind: "html-iframe", tested: ["touch-emulated"], schedulerUnits: 2 });
const heavy = specimen("gamma", { cost: "high", schedulerUnits: 3, dependencies: { react: "18.2.0", "some-gpu-dependency": "1.0.0" } });
const lexical = specimen("disclosure-lexical", { curated: false });
const index = makeIndex([react, html, heavy, lexical], cfg, "synthetic");
const engine = createBrain(index);
function query(text, extras = {}, mode = "recommend", brain = engine) {
  return asResult(brain.query(mode, { schemaVersion: 1, query: text, ...extras }));
}
const IDs = result => result.candidates.map(candidate => candidate.id);

test("TR diacritics, contextual inflections and EN plurals resolve to intent synonyms", () => {
  assert(translate("REZERVASYONUN BAŞARILI sonucu").intents.includes("confirm-action"));
  assert.deepEqual(translate("TAB NAVIGATION").patterns, translate("SEKME GEZİNME").patterns);
  assert(translate("AYRINTIYI AÇ").intents.includes("reveal-detail"));
  assert(translate("disclosure dialogs").patterns.includes("dialog"));
});
test("search may discover by title while recommendations require semantic evidence", () => {
  assert(IDs(query("disclosure lexical", {}, "search")).includes("disclosure-lexical"));
  assert(!IDs(query("disclosure lexical")).includes("disclosure-lexical"));
});
test("hard capabilities and integrations fail closed and do not become soft preferences", () => {
  assert.deepEqual(IDs(query("disclosure", { require: { support: ["keyboard"], integrationKind: ["react"] } })), ["alpha"]);
  assert.deepEqual(IDs(query("disclosure", { require: { support: ["touch-emulated"], integrationKind: ["html-iframe"] } })), ["beta"]);
  assert.equal(query("disclosure", { require: { support: ["keyboard", "touch-emulated"] } }).decision, "no-suitable-component");
  assert(IDs(query("disclosure", { prefer: { support: ["physical-mobile"] } })).length > 0);
  assert(IDs(query("Disclosure, prefer physical mobile")).length > 0);
  assert.equal(query("disclosure physical mobile required").filteredReasons["unverified:physical-mobile"], 4);
  assert.equal(query("disclosure screen reader required").filteredReasons["unverified:screen-reader"], 4);
});
test("measured device limits and scheduler units use different gates", () => {
  assert.deepEqual(IDs(query("disclosure", { require: { maxPerformanceCost: "low" } })), ["alpha"]);
  assert.equal(query("disclosure", { require: { maxPerformanceCost: "low" } }).filteredReasons["unverified-performance"], 2);
  assert.deepEqual(IDs(query("disclosure", { require: { maxPreviewUnits: 2 } })), ["alpha","beta"]);
});
test("format contradictions and exact dependency mismatches are explained", () => {
  const conflict = query("Sadece HTML, native props şart, açıklama");
  assert.equal(conflict.decision, "no-suitable-component");
  assert.equal(conflict.filteredReasons["conflicting-requirements"], 1);
  assert.deepEqual(IDs(query("disclosure", { require: { allowedDependencies: ["react"], dependencyPins: { react: "19.3.1" } } })), ["alpha", "beta"]);
});
test("stillness, missing context and unavailable candidates remain distinct", () => {
  assert.equal(query("Show booking details without animation").decision, "no-motion");
  assert.equal(query("Ödeme tamamlanmadan sahte başarı göster").decision, "no-motion");
  assert.equal(query("Do not show success before payment. Show pending progress.").decision, "no-suitable-component");
  assert.equal(query("Make it premium and calm").decision, "need-more-context");
  assert.equal(query("Écran de disclosure", { require: { support: ["rtl"] } }).decision, "no-suitable-component");
  assert.equal(query("disclosure", {}, "search", createBrain(makeIndex([], cfg, "not-prepared"))).decision, "not-prepared");
});
test("stale rows cannot be inspected or ranked", () => {
  const brain = createBrain(index, { staleIds: ["alpha"] });
  assert.equal(brain.inspect("alpha").status, "recheck-required");
  assert(!IDs(query("disclosure", {}, "recommend", brain)).includes("alpha"));
  assert.equal(query("disclosure", {}, "recommend", createBrain(index, { invalidIndex: true })).decision, "stale-index");
});
test("result ordering and explanations are deterministic, source-linked and additive", () => {
  const one = query("disclosure", { require: { integrationKind: ["react"] } });
  const two = query("disclosure", { require: { integrationKind: ["react"] } }, "recommend", createBrain(verifyIndex(JSON.parse(canonical(index)))));
  assert.equal(canonical(one), canonical(two));
  for (const item of one.candidates) {
    assert.equal(item.score, Object.values(item.scoreBreakdown).reduce((a, b) => a + b, 0));
    assert(item.matches.every(match => match.evidence.every(row => row.sourcePinOrHash === item.upstreamHash)));
    assert.equal(item.studioURL, "http://127.0.0.1:5199/?item=" + item.id + "#specimen");
    assert.equal(item.installURL, "http://127.0.0.1:5199/v9/registry/" + item.id + ".json");
  }
  assert.deepEqual(IDs(one), ["alpha","gamma"]);
});
test("schema validation rejects invalid claims and requests, duplicate sources and tampered fingerprints", () => {
  assert.throws(() => asRequest({ schemaVersion: 1, query: "disclosure", require: { support: ["physical"] } }));
  assert.throws(() => asRequest({ schemaVersion: 1, query: "disclosure", maxResults: 100 }));
  assert.throws(() => asRequest({ schemaVersion: 1, query: " " }));
  assert.throws(() => asIndex({ ...index, records: [{ ...react, support: { ...react.support,
    keyboard: { status: "unknown", value: true, confidence: "none", evidence: [] } } }] }));
  assert.throws(() => makeIndex([react, { ...html, source: { ...html.source, upstreamHash: react.source.upstreamHash } }], cfg, "synthetic"), /Duplicate/);
  assert.throws(() => verifyIndex({ ...index, sourceFingerprint: hash("altered") }), /fingerprint/);
});
test("one revision rebuilds once, and rule changes invalidate every profile", async () => {
  const old = makeIndex([react, html], cfg, "prepared");
  const replacement = { ...react, fingerprint: hash("only-one-changed") };
  const input = [replacement, html].map(record => ({ id: record.id, fingerprint: record.fingerprint, ...record.source, record }));
  const changed = await rebuild(input, old, cfg, false, async row => row.record);
  assert.equal(changed.rebuilt, 1);
  assert.equal(changed.reused, 1);
  const next = await rebuild(input, changed.index, cfg, false, async () => assert.fail("stale rebuild"));
  assert.equal(canonical(next.index), canonical(changed.index));
  assert.equal((await rebuild(input, old, hash("new rules"), false, async row => row.record)).rebuilt, 2);
});
test("validated last-good file survives an interrupted temp write and read-only recovery", async () => {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "motionux-brain-store-"));
  try {
    const path = join(dir, "index.v1.json");
    await atomicWrite(path, canonical(index));
    await writeFile(path + ".crash.tmp", "{\"incomplete\":", { mode: 0o600 });
    assert.equal(verifyIndex(await readJson(path)).indexFingerprint, index.indexFingerprint);
    await assert.rejects(readJson(path + ".crash.tmp"), /Cannot read valid JSON/);
    assert.equal(canonical(verifyIndex(await readJson(path))), canonical(index));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("offline CLI on an empty vault and workspace-only request rules", async () => {
  const root = await mkdtemp(join(await realpath(tmpdir()), "motionux-brain-empty-"));
  const cli = resolve("scripts/brain/cli.mjs");
  const run = (...flags) => {
    try { return JSON.parse(execFileSync(process.execPath, [cli, ...flags, "--json"], { encoding: "utf8", cwd: root })); }
    catch (error) { return JSON.parse(error.stdout); }
  };
  try {
    for (const folder of ["metadata", "schemas", "src/brain", "scripts/brain"]) {
      await cp(resolve(folder), join(root, folder), { recursive: true });
    }
    const status = run("index");
    assert.equal(status.status, "not-prepared");
    assert.equal(status.records, 0);
    assert.equal(run("search","--query","disclosure").decision, "not-prepared");
    await mkdir(join(root, "requests"));
    await writeFile(join(root, "requests/a.json"), JSON.stringify({schemaVersion:1,query:"disclosure"}));
    await symlink(join(root, "requests/a.json"), join(root, "requests/link.json"));
    assert.equal(run("recommend","--request","./requests/a.json").decision, "not-prepared");
    for (const path of ["../escape.json","requests/link.json","https://example.test/request.json",join(root,"requests/a.json")]) {
      assert.equal(run("recommend","--request",path).status, "error");
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("synthetic 500 and 1000 metadata rows retain valid deterministic results", () => {
  for (const n of [500, 1000]) {
    const data = syntheticIndex(n);
    assert.equal(data.environment, "synthetic");
    assert.equal(data.records.length,n);
    const simulated = createBrain(data);
    const a = query("AI tool progress", {}, "recommend", simulated);
    const b = query("AI tool progress", {}, "recommend", simulated);
    assert.equal(a.candidates.length,5);
    assert.equal(canonical(a),canonical(b));
  }
});
