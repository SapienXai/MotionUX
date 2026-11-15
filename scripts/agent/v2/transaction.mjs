import { open, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { canonical } from "../../../src/brain/indexer.ts";
import { validateTransaction } from "../../../src/agent/integration/validation.ts";
import { base, createFolder, digest, directory, exists, fixturePath, id, inventory, json, matches,
  materialize, readJSON, removeFolder, replace, safeId, snapshot, stop, treeHash } from "./files.mjs";
import { managed, readBlobs, revalidate, runEvidence, ticket } from "./review.mjs";

const transitions = {
  authorized: ["applying", "failed", "rolled-back", "needs-manual-review"],
  applying: ["applying", "applied", "failed", "rolled-back", "needs-manual-review"],
  applied: ["verifying", "failed", "rolled-back", "needs-manual-review"],
  verifying: ["verified", "failed", "rolled-back", "needs-manual-review"],
  verified: ["rolled-back", "needs-manual-review"],
  failed: ["rolled-back", "needs-manual-review"],
  "needs-manual-review": ["rolled-back", "needs-manual-review"],
  "rolled-back": ["needs-manual-review"],
};
export const journalPath = run => resolve(runEvidence(run), "journal.json");
export function cancelled(signal) {
  if (signal?.aborted) stop("cancelled", "Fixture transaction cancelled.");
}
async function journal(review, prior, status, detail, proof = null) {
  if (prior && !transitions[prior.status]?.includes(status) || !prior && status !== "authorized") stop("invalid-state", "Invalid fixture transaction transition.");
  const events = [...prior?.events ?? [], { sequence: (prior?.events.length ?? 0) + 1, state: status, detail }];
  const body = { schemaVersion: 2, runId: review.runId, reviewFingerprint: review.fingerprint, status, events, proof };
  const result = validateTransaction({ ...body, fingerprint: digest(body) });
  await json(journalPath(review.runId), result);
  return result;
}
export async function getJournal(review) {
  let value;
  try { value = validateTransaction(await readJSON(journalPath(review.runId))); }
  catch { stop("invalid-journal", "Journal is missing or malformed. Preserve the fixture and recover from the private preimages."); }
  if (value.runId !== review.runId || value.reviewFingerprint !== review.fingerprint ||
      value.events.some((item, i) => i > 0 && !transitions[value.events[i - 1].state]?.includes(item.state))) {
    stop("invalid-journal", "Journal does not belong to this reviewed fixture.");
  }
  return value;
}

async function acquire(path) {
  try {
    const handle = await open(path, "wx", 0o600);
    try { await handle.writeFile(canonical({ pid: process.pid, nonce: id() }) + "\n"); await handle.sync(); }
    finally { await handle.close(); }
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}
function alive(pid) {
  if (!Number.isInteger(pid) || pid < 2) stop("locked", "A malformed lock needs manual review.");
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; return true; }
}
export async function locked(run, recovery, task) {
  const root = resolve(base, "locks");
  await directory(root, true);
  const path = resolve(root, safeId(run) + ".json");
  if (!(await acquire(path))) {
    const previous = await readJSON(path);
    if (!recovery || alive(previous.pid)) stop("locked", "A transaction is running or needs explicit rollback.");
    const claim = path + ".recover";
    if (!(await acquire(claim))) stop("locked", "Recovery is already claimed. Inspect the private lock if the recovery process exited.");
    try {
      if (canonical(await readJSON(path)) !== canonical(previous) || alive(previous.pid)) stop("locked", "The lock owner changed.");
      await unlink(path);
      if (!(await acquire(path))) stop("locked", "Another command acquired this run.");
    } finally { await unlink(claim); }
  }
  try { return await task(); }
  finally { await unlink(path); }
}

function compatibleTree(current, review) {
  const baseline = new Map(review.before.files.map(row => [row.path, { sha256: row.sha256, mode: row.mode }]));
  const masks = new Map(review.mutationManifest.map(row => [row.path, row]));
  const dirs = new Map(review.before.directories.map(row => [row.path, row.mode]));
  const newDirs = new Map(review.createdDirectories.map(row => [row.path, row.mode]));
  return [...new Set([...baseline.keys(), ...current.files.keys()])].every(path => {
    const operation = masks.get(path);
    const actual = current.files.get(path);
    return operation ? matches(actual, operation.before) || matches(actual, operation.after) : matches(actual, baseline.get(path) ?? null);
  }) && [...dirs].every(([name, mode]) => current.dirs.get(name) === mode) &&
    [...current.dirs].every(([name, mode]) => (dirs.get(name) ?? newDirs.get(name)) === mode);
}

async function rollbackLocked(review, current, before) {
  const root = managed(review.runId);
  try {
    if (!(await exists(root))) {
      if (!["authorized", "failed"].includes(current.status)) stop("conflict", "The transaction workspace is missing.");
      await materialize(root, before);
    }
    const actual = await snapshot(root);
    if (current.status === "rolled-back" && treeHash(actual) === review.beforeHash) return current;
    if (!compatibleTree(actual, review) || current.status === "rolled-back") stop("conflict", "An unrelated or concurrently edited file must be preserved.");
    const restored = [];
    const removed = [];
    for (const op of [...review.mutationManifest].reverse()) {
      const now = actual.files.get(op.path);
      if (matches(now, op.before)) continue;
      await replace(fixturePath(root, op.path), before.files.get(op.path) ?? null, op.after);
      (op.before ? restored : removed).push(op.path);
    }
    for (const { path, mode } of [...review.createdDirectories].reverse()) {
      if (actual.dirs.has(path)) await removeFolder(fixturePath(root, path), mode);
    }
    const final = await snapshot(root);
    if (treeHash(final) !== review.beforeHash) stop("conflict", "Restored fixture tree differs from the full baseline.");
    return journal(review, current, "rolled-back", "Preimage file and directory inventory checked byte-for-byte.",
      { beforeHash: review.beforeHash, finalHash: treeHash(final), restored: restored.sort(), removed: removed.sort(),
        directoryCount: inventory(final).directories.length });
  } catch {
    return journal(review, current, "needs-manual-review", "A filesystem conflict prevented safe rollback. The conflicting files were preserved.");
  }
}
function failureCode(error) {
  return ["cancelled", "conflict", "timeout", "failed", "output-budget", "subprocess-error", "stale", "verification-failed"].includes(error?.code)
    ? error.code : "transaction-error";
}
async function fail(review, state, before, error) {
  const reason = failureCode(error);
  const failed = await journal(review, state, "failed", reason);
  return { journal: await rollbackLocked(review, failed, before), failure: reason };
}

export async function apply(review, authorization, { signal, check = revalidate, afterWrite } = {}) {
  if (authorization !== ticket(review)) stop("authorization-required", "Supply the exact approval shown by dry-run for this fixture and manifest.");
  if (Date.now() >= review.expiresAt) stop("stale", "This scoped approval expired.");
  return locked(review.runId, false, async () => {
    const root = managed(review.runId);
    if (await exists(journalPath(review.runId)) || await exists(root)) stop("existing-run", "A run already exists. Inspect or roll it back.");
    cancelled(signal);
    const trees = await check(review, signal);
    await directory(dirname(root), true);
    const staged = resolve(base, "scratch", "seed-" + review.runId);
    await directory(dirname(staged), true);
    let state = await journal(review, null, "authorized", "Exact reviewed manifest and managed fixture approval accepted.");
    let writes = 0;
    try {
      await materialize(staged, trees.before);
      await directory(dirname(root));
      await directory(staged);
      if (await exists(root)) stop("conflict", "Managed fixture path is already occupied.");
      await rename(staged, root);
      await check(review, signal);
      if (treeHash(await snapshot(root)) !== review.beforeHash) stop("conflict", "The managed baseline changed before the first mutation.");
      cancelled(signal);
      state = await journal(review, state, "applying", "Preimages and source pins revalidated.");
      for (const { path, mode } of review.createdDirectories) {
        cancelled(signal);
        await createFolder(fixturePath(root, path), mode);
      }
      for (const op of review.mutationManifest) {
        cancelled(signal);
        await replace(fixturePath(root, op.path), trees.after.files.get(op.path) ?? null, op.before);
        writes++;
        await afterWrite?.(writes, op);
        state = await journal(review, state, "applying", op.operation + " " + op.path);
      }
      cancelled(signal);
      if (treeHash(await snapshot(root)) !== review.afterHash) stop("conflict", "Postimage changed after application.");
      return { journal: await journal(review, state, "applied", "All postimages matched; browser verification is pending."), failure: null };
    } catch (error) { return fail(review, state, trees.before, error); }
  });
}

export async function verify(review, runner, { signal, read = readBlobs } = {}) {
  return locked(review.runId, false, async () => {
    let state = await getJournal(review);
    if (state.status !== "applied") stop("invalid-state", "Verification requires a completed apply.");
    const before = await read(review, "before");
    try {
      cancelled(signal);
      const actual = await snapshot(managed(review.runId));
      if (treeHash(actual) !== review.afterHash) stop("conflict", "Working bytes differ from the reviewed postimage.");
      state = await journal(review, state, "verifying", "Checking isolated before and after local builds.");
      const evidence = await runner(before, actual, signal);
      cancelled(signal);
      if (treeHash(await snapshot(managed(review.runId))) !== review.afterHash) stop("conflict", "The fixture changed during verification.");
      return { journal: await journal(review, state, "verified", "TypeScript, production builds and actual Playwright checks passed."),
        evidence, failure: null };
    } catch (error) { return fail(review, state, before, error); }
  });
}

export async function rollback(review, read = readBlobs) {
  return locked(review.runId, true, async () => {
    const state = await getJournal(review);
    const before = await read(review, "before");
    if (treeHash(before) !== review.beforeHash) stop("invalid-journal", "Saved preimage does not match the review.");
    return rollbackLocked(review, state, before);
  });
}
