import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { json, readJSON, repo, treeHash } from "../v2/files.mjs";
import { loadReview, reviewRequest } from "../v3/review.mjs";
import { applyHostFixture, rollback, status } from "../v3/transaction.mjs";
import { assertRoot, base, fixtures, scan } from "../v3/workspace.mjs";
import { recheck } from "../v3/verify.mjs";
import { evidenceFor, fixtureOperator, output } from "./bridge.mjs";
import { runFixture } from "./runner.mjs";

const recoveryWindow = () => AbortSignal.timeout(120_000);
const sameTree = async (review, expected = review.beforeHash) => assert.equal(treeHash(await scan(await assertRoot(review))), expected);
const request = name => readJSON(resolve(fixtures, "requests", name + ".json"));
const reviewed = async name => reviewRequest(await request(name), recoveryWindow());
const cli = (...args) => promisify(execFile)(process.execPath, ["scripts/agent/v4/cli.mjs", ...args, "--json"], { cwd: repo });

if (process.argv[2] === "crash-child") {
  if (!process.send) process.exit(1);
  const review = await loadReview(process.argv[3]);
  const host = await fixtureOperator(review, "accept");
  try {
    await applyHostFixture(review.runId, host.capability, { signal: host.signal, fault: count => {
      if (count === 1) process.kill(process.pid, "SIGKILL");
    } });
  } finally { host.close(); }
  process.exit(1);
}

const results = [];
async function run(name, test) {
  const result = await test();
  results.push({ name, status: "passed", ...result });
  process.stderr.write(name + " passed\n");
}

async function verifySuite() {
  for (const [scenario, failure] of [["decline", "declined"], ["cancel", "cancelled"], ["timeout", "host-approval-timeout"]]) {
    await run(scenario, async () => {
      const review = await reviewed("vite-picker");
      const value = await runFixture(review, { scenario, signal: recoveryWindow() });
      assert.equal(value.status, "fixture-denied");
      assert.equal(value.failure, failure);
      assert.equal(value.targetEffects, 0);
      assert.equal((await status(review.runId)).status, "authorization-required");
      assert.equal(value.beforeHash, value.finalHash);
      return { runId: review.runId, failure, targetEffects: value.targetEffects, approvalMs: value.timing.approvalMs };
    });
  }

  await run("forged or mixed grants", async () => {
    const vite = await reviewed("vite-picker");
    const next = await reviewed("next-disclosure");
    const host = await fixtureOperator(vite, "accept");
    try {
      await assert.rejects(applyHostFixture(vite.runId, { approved: true }), { code: "host-approval-unverified" });
      await assert.rejects(applyHostFixture(vite.runId, structuredClone(host.capability)), { code: "host-approval-unverified" });
      await assert.rejects(applyHostFixture(next.runId, host.capability), { code: "host-scope-mismatch" });
      await sameTree(vite);
      await sameTree(next);
      await host.revokeFixtureForTest();
      await assert.rejects(applyHostFixture(vite.runId, host.capability), { code: "host-grant-revoked" });
    } finally { host.close(); }
    return { targetEffects: 0 };
  });

  await run("incompatible React pin", async () => {
    await assert.rejects(reviewed("next-incompatible"), { code: "incompatible" });
    return { targetEffects: 0 };
  });

  for (const [fault, failure] of [
    ["revoke-after-write", "host-grant-revoked"], ["revoke-during-build", "host-grant-revoked"], ["browser", "failed"],
  ]) {
    await run(fault, async () => {
      const review = await reviewed("vite-picker");
      const value = await runFixture(review, { scenario: "accept", fault, signal: recoveryWindow() });
      assert.equal(value.status, "fixture-failed-restored");
      assert.equal(value.failure, failure);
      assert.equal(value.beforeHash, value.finalHash);
      assert.equal(value.recheck.status, "passed");
      assert(fault === "revoke-after-write" ? value.targetEffects === 1 : value.targetEffects > 1);
      return { runId: review.runId, failure, targetEffects: value.targetEffects, attemptId: value.recheck.attemptId, timing: value.timing };
    });
  }

  await run("SIGKILL and fresh recovery", async () => {
    const review = await reviewed("vite-picker");
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "crash-child", review.runId], {
      cwd: repo, env: {}, stdio: ["ignore", "ignore", "ignore", "ipc"], timeout: 45_000, killSignal: "SIGTERM",
    });
    assert.deepEqual(await once(child, "exit"), [null, "SIGKILL"]);
    const interrupted = await status(review.runId);
    assert.equal(interrupted.status, "applying");
    assert.notEqual(treeHash(await scan(await assertRoot(review))), review.beforeHash);
    const journal = await rollback(review.runId);
    assert.equal(journal.status, "rolled-back");
    await sameTree(review);
    const logs = evidenceFor(review.runId);
    const attempt = await recheck(review, journal, recoveryWindow(), false, logs);
    let failedAttempt;
    await assert.rejects(cli("rollback", "--run", review.runId, "--recheck", "--fixture-fault", "browser"), error => {
      assert.equal(error.code, 1);
      failedAttempt = JSON.parse(error.stdout).attempt;
      return true;
    });
    assert.equal(attempt.status, "passed");
    assert.equal(failedAttempt.status, "failed");
    assert.notEqual(attempt.attemptId, failedAttempt.attemptId);
    assert.equal(attempt.expectedHash, failedAttempt.finalHash);
    const host = await fixtureOperator(review, "accept");
    try { await assert.rejects(applyHostFixture(review.runId, host.capability), { code: "host-grant-replayed" }); }
    finally { host.close(); }
    await sameTree(review);
    return { runId: review.runId, attemptId: attempt.attemptId, failedAttemptId: failedAttempt.attemptId, finalHash: journal.proof.finalHash };
  });

  await run("disposable build cleanup", async () => {
    assert.deepEqual(await readdir(resolve(base, "scratch")), []);
  });
}

try { await verifySuite(); }
finally {
  const result = { schemaVersion: 1, status: results.length === 10 ? "passed" : "failed", realProjectWrites: "disabled", results };
  await json(resolve(output, "adversarial-fixtures.json"), result);
}
