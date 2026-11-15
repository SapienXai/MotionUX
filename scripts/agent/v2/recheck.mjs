import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { directory, digest, id, json, snapshot, stop, treeHash } from "./files.mjs";
import { managed, runEvidence } from "./review.mjs";
import { verifyBuild } from "./verify.mjs";

export async function recheckRestored(review, journal, signal, {
  root = managed(review.runId), folder = runEvidence(review.runId), verify = verifyBuild,
} = {}) {
  if (journal.status !== "rolled-back" || journal.proof?.finalHash !== review.beforeHash) {
    stop("conflict", "Rollback proof does not match the reviewed baseline.");
  }
  const attemptId = id();
  const attempts = resolve(folder, "restored-rechecks");
  await directory(attempts, true);
  const logs = resolve(attempts, attemptId);
  await mkdir(logs, { mode: 0o700 });
  const recordPath = resolve(logs, "attempt.json");
  const attempt = { schemaVersion: 1, attemptId, runId: review.runId, startedAt: new Date().toISOString(),
    reviewFingerprint: review.fingerprint, expectedHash: review.beforeHash, targetHash: null, finalHash: null, status: "running" };
  await json(recordPath, attempt);
  try {
    const tree = await snapshot(root);
    attempt.targetHash = treeHash(tree);
    if (attempt.targetHash !== attempt.expectedHash) stop("conflict", "The restored fixture changed before recheck.");
    signal?.throwIfAborted();
    const verification = await verify(review.runId, tree, "restored", signal, { logs });
    attempt.finalHash = treeHash(await snapshot(root));
    if (attempt.finalHash !== attempt.expectedHash) stop("conflict", "The restored fixture changed during recheck.");
    if (!verification.browser?.checks?.length || verification.browser.checks.some(check => check.status !== "passed")) {
      stop("verification-failed", "The restored-route browser checks did not pass.");
    }
    attempt.status = "passed";
    attempt.verification = verification;
  } catch (error) {
    attempt.status = signal?.aborted || error?.code === "cancelled" ? "cancelled" : "failed";
    attempt.reason = error?.code === "conflict" ? "baseline-conflict" : "restored-route-verification";
    attempt.finalHash ??= await snapshot(root).then(treeHash, () => null);
  }
  attempt.finishedAt = new Date().toISOString();
  attempt.fingerprint = digest(attempt);
  await json(recordPath, attempt);
  return attempt;
}
