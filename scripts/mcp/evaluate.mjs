import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import scenarios from "../../fixtures/brain/scenarios.v1.json" with { type: "json" };
import { motionRoot } from "../agent/workspace.mjs";
import { payloadLimit } from "../../src/mcp/contracts.ts";
import { connect } from "./client.mjs";

const exec = promisify(execFile);
const root = ".motionux-v9/evidence/mcp-v1";
const valid = ["tr-booking-confirm", "en-booking-confirm", "tr-retry", "en-retry", "tr-disclosure", "en-disclosure",
  "tr-tabs", "en-tabs", "en-wheel-key", "tr-picker-touch", "en-ai-tool", "tr-ai-tool"];
const closed = ["tr-static-form", "en-static-details", "en-illicit-success", "en-physical", "tr-reader",
  "en-reduced", "tr-contradiction", "en-ambiguous"];
const project = "fixtures/agent/booking-demo";
const metrics = values => {
  const sorted = values.toSorted((a, b) => a - b);
  const percentile = p => Number(sorted[Math.ceil(sorted.length * p) - 1].toFixed(2));
  return { samples: values.length, medianMs: percentile(.5), p95Ms: percentile(.95) };
};
function safe(result) {
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /\/(?:Users|home|private|tmp)\/|\.motionux-v9\/|(?:file|data):\/\/|gh[pousr]_[a-z\d]{8,}|sk-[a-z\d_-]{12,}/i);
  assert(Buffer.byteLength(text) <= payloadLimit);
}
async function cli(path, args) {
  const { stdout } = await exec(process.execPath, [path, ...args, "--json"],
    { cwd: motionRoot, timeout: 15_000, maxBuffer: 3 * 1024 * 1024 });
  return JSON.parse(stdout);
}
const requestPath = join(root, "protocol-inputs-");
await mkdir(root, { recursive: true, mode: 0o700 });
const scratch = await mkdtemp(requestPath);
const startup = [];
const durations = [];
const queries = [];
const plans = [];
let connection;
async function call(name, args) {
  const began = performance.now();
  const result = await connection.call(name, args);
  durations.push(performance.now() - began);
  safe(result);
  return result;
}

try {
  for (let i = 0; i < 8; i++) {
    const began = performance.now();
    connection = await connect({ jail: true });
    const { tools } = await connection.client.listTools();
    assert.equal(tools.length, 5);
    startup.push(performance.now() - began);
    if (i < 7) await connection.close();
  }
  const status = await call("motionux_status", {});
  const brain = await cli("scripts/brain/cli.mjs", ["doctor"]);
  assert.equal(status.status, "ready");
  assert.equal(status.brainIndexFingerprint, brain.indexFingerprint);
  assert.equal(status.catalogReady, brain.preparedReady);
  assert.equal(status.coverage.currentRecords, brain.indexedReady);
  assert.equal(status.coverage.curated, brain.curated);
  assert.equal(status.coverage.sampledMotion, brain.verifiedSampledMotion);
  for (const id of [...valid, ...closed]) {
    const item = scenarios.scenarios.find(row => row.id === id);
    assert(item, id);
    const { schemaVersion, ...input } = item.request;
    const mode = valid.includes(id) && /tabs|wheel|picker|ai-tool/.test(id) ? "search" : "recommend";
    const request = { ...input, maxResults: 3 };
    const path = join(scratch, "case.json");
    await writeFile(path, JSON.stringify({ schemaVersion, ...request }), { mode: 0o600 });
    const expected = await cli("scripts/brain/cli.mjs", [mode, "--request", path]);
    const observed = await call(mode + "_motion", request);
    assert.equal(observed.status, expected.decision, id);
    if (mode === "recommend") assert.equal(expected.decision, item.expected, id);
    assert.equal(observed.rankedCount, expected.candidates.length);
    assert.equal(observed.indexFingerprint, expected.indexFingerprint);
    assert.deepEqual(observed.filteredReasons, expected.filteredReasons);
    assert(observed.candidates.length || !expected.candidates.length, id);
    for (const [i, candidate] of observed.candidates.entries()) {
      const other = expected.candidates[i];
      assert.equal(candidate.id, other.id, id);
      assert.equal(candidate.upstreamHash, other.upstreamHash);
      assert.equal(candidate.upstreamCommit, other.upstreamCommit);
      assert.deepEqual(candidate.scoreBreakdown, other.scoreBreakdown);
      assert.deepEqual(candidate.unknowns, other.unknowns);
      assert.deepEqual(candidate.matches.map(({ evidence, ...match }) =>
        ({ ...match, evidence: evidence.map(position => observed.evidence[position]) })), other.matches);
    }
    queries.push({ id, language: item.language, mode, status: observed.status, first: observed.candidates[0]?.id, returned: observed.returned });
  }
  for (const id of ["kokonut-promise-toast", "kokonut-smooth-tab", "kokonut-wheel-picker"]) {
    const expected = await cli("scripts/brain/cli.mjs", ["inspect", "--id", id]);
    const actual = await call("inspect_component", { id });
    assert.equal(actual.status, "indexed");
    assert.equal(actual.upstreamHash, expected.profile.source.upstreamHash);
    assert.equal(actual.upstreamCommit, expected.profile.source.upstreamCommit);
    assert.deepEqual(actual.unknowns, expected.unknowns);
  }
  for (const [route, goal, status] of [
    ["/bookings/confirmation", "Show calm confirmed booking feedback.", "candidates"],
    ["/details", "Expandable card disclosure for room details.", "candidates"],
    ["/checkout", "Show the error without animation and preserve focus", "no-motion"],
  ]) {
    const args = { project, route, goal };
    const expected = await cli("scripts/agent/cli.mjs", ["plan", "--project", project, "--route", route, "--goal", goal]);
    const actual = await call("plan_motion", args);
    assert.equal(actual.status, status, route);
    assert.equal(actual.planFingerprint, expected.planFingerprint);
    assert.equal(actual.projectFingerprint, expected.projectFingerprint);
    assert.deepEqual(actual.recommendations.map(row => [row.id, row.upstreamHash, row.reviewStatus]),
      expected.recommendations.map(row => [row.sourceId, row.sourcePin.sha256, row.reviewStatus]));
    assert.equal(actual.safety.targetFilesWritten, 0);
    plans.push({ route, status, recommended: actual.recommendations.map(row => row.id) });
  }
  for (const name of ["BookPlace", "DineWallet"]) {
    const denied = await call("plan_motion", { project: "/Users/motionux-test/" + name, route: "/details", goal: "Analyze disclosure." });
    assert.equal(denied.status, "project-not-authorized");
  }
  const report = { status: "passed", scope: "prepared vault", host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
    startup: metrics(startup), warmTools: metrics(durations), parity: { queries, plans, inspected: 3, unauthorized: 2 },
    coverage: status.coverage, brainIndexFingerprint: status.brainIndexFingerprint, unknownPercent: brain.unknownPercent };
  await writeFile(join(root, "prepared-protocol.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  process.stdout.write(JSON.stringify(report) + "\n");
} catch (error) {
  process.stderr.write("Prepared MCP verification failed at " + (queries.length < valid.length + closed.length ?
    [...valid, ...closed][queries.length] : "source/plan stage") + ".\n");
  // Assertions work with trusted fixed test data. Keep the failure evidence local.
  await writeFile(join(root, "prepared-error.log"), String(error.stack) + "\n", { mode: 0o600 });
  process.exitCode = 1;
} finally {
  await connection?.close();
  await rm(scratch, { recursive: true, force: true });
}
