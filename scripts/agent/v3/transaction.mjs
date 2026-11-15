import { resolve } from "node:path";
import { validate, validFingerprint } from "../../../src/agent/integration/v3/validation.ts";
import { createFolder, digest, exists, fixturePath, image, json, matches, readJSON, removeFolder, replace, stop, treeHash } from "../v2/files.mjs";
import { locked, cancelled } from "../v2/transaction.mjs";
import { assertRoot, locks, runFolder, scan } from "./workspace.mjs";
import { fresh, loadReview, storedTrees } from "./review.mjs";
import { claimFixtureGrant } from "./authority.mjs";

const transitions = {
  "authorized-fixture": ["applying", "failed", "needs-manual-review", "rolled-back"],
  applying: ["applying", "applied", "failed", "needs-manual-review", "rolled-back"],
  applied: ["verifying", "failed", "needs-manual-review", "rolled-back"],
  verifying: ["verified", "failed", "needs-manual-review", "rolled-back"],
  verified: ["rolled-back", "needs-manual-review"],
  failed: ["rolled-back", "needs-manual-review"],
  "needs-manual-review": ["rolled-back", "needs-manual-review"],
  "rolled-back": ["needs-manual-review"],
};
export const journalPath = run => resolve(runFolder(run), "journal.json");
async function record(review, prior, status, detail, proof = null) {
  if (prior ? !transitions[prior.status]?.includes(status) : status !== "authorized-fixture") stop("invalid-state", "Invalid fixture transaction transition.");
  const data = { schemaVersion: 3, runId: review.runId, reviewFingerprint: review.fingerprint, status,
    events: [...prior?.events ?? [], { status, detail, time: Date.now() }], proof };
  const state = { ...data, fingerprint: digest(data) };
  validate("journal", state);
  await json(journalPath(review.runId), state);
  return state;
}
export async function journalOf(review) {
  const data = validate("journal", await readJSON(journalPath(review.runId)));
  if (!validFingerprint(data) || data.reviewFingerprint !== review.fingerprint || data.runId !== review.runId ||
      data.events[0].status !== "authorized-fixture" || data.events.at(-1).status !== data.status ||
      data.events.some((event, index) => index && !transitions[data.events[index - 1].status]?.includes(event.status)) ||
      data.status === "rolled-back" && (data.proof?.beforeHash !== review.beforeHash || data.proof?.finalHash !== review.beforeHash)) {
    stop("invalid-journal", "Preserve this fixture and its evidence for manual recovery.");
  }
  return data;
}
function sameTree(actual, expected) {
  if (treeHash(actual) !== treeHash(expected)) stop("conflict", "The complete fixture differs from its expected transaction state.");
}
const copy = tree => ({ dirs: new Map(tree.dirs), files: new Map(tree.files) });
const failCode = (error, fallback) => typeof error?.code === "string" && /^[a-z-]+$/.test(error.code) ? error.code : fallback;
function set(tree, path, image) {
  if (image) tree.files.set(path, image);
  else tree.files.delete(path);
}
function compatible(actual, before, after, review) {
  const managedPaths = new Set(review.manifest.mutations.map(row => row.path));
  for (const path of new Set([...before.files.keys(), ...actual.files.keys()])) {
    const pre = before.files.get(path), post = after.files.get(path), here = actual.files.get(path);
    if (!matches(here, image(pre)) && !(managedPaths.has(path) && matches(here, image(post)))) return false;
  }
  return [...before.dirs].every(([path, mode]) => actual.dirs.get(path) === mode) &&
    [...actual.dirs].every(([path, mode]) => after.dirs.get(path) === mode);
}
async function restore(review, state, before, after, checkLock) {
  try {
    const root = await assertRoot(review);
    const original = await scan(root);
    if (state.status === "rolled-back" && treeHash(original) === review.beforeHash) return state;
    if (state.status === "rolled-back" || !compatible(original, before, after, review)) stop("conflict", "The target contains independent edits.");
    for (const row of [...review.manifest.mutations].reverse()) {
      await checkLock();
      await assertRoot(review);
      const actual = original.files.get(row.path), pre = before.files.get(row.path), post = after.files.get(row.path);
      if (!matches(actual, image(pre))) await replace(fixturePath(root, row.path), pre ?? null, image(post));
    }
    for (const { path, mode } of [...review.manifest.directories].reverse()) {
      await checkLock();
      await assertRoot(review);
      if (original.dirs.has(path)) await removeFolder(fixturePath(root, path), mode);
    }
    await checkLock();
    const finalHash = treeHash(await scan(root));
    if (finalHash !== review.beforeHash) stop("conflict", "Restored tree failed byte and mode identity.");
    return await record(review, state, "rolled-back", "Complete preimage including package-lock.json restored.", { beforeHash: review.beforeHash, finalHash });
  } catch {
    await checkLock();
    return record(review, state, "needs-manual-review", "Target or preimage changed. Independent edits were preserved.");
  }
}

export async function apply(run, authority, capability, { signal, check = fresh, fault } = {}) {
  const review = await loadReview(run);
  const grant = claimFixtureGrant(authority, capability, review);
  return locked(run, false, async checkLock => {
    if (await exists(journalPath(run))) stop("existing-run", "This reviewed run has already been used.");
    const root = await assertRoot(review);
    const [before, after] = await storedTrees(review);
    const expected = copy(before);
    const guard = async () => {
      cancelled(signal);
      await checkLock();
      const active = await loadReview(run);
      grant(active);
      await check(active, signal);
      if (await assertRoot(review) !== root) stop("identity-mismatch", "Target changed.");
      sameTree(await scan(root), expected);
      await checkLock();
      grant(await loadReview(run));
    };
    await guard();
    let state = await record(review, null, "authorized-fixture", "Single-use grant bound to this run, target identity, source and manifest.");
    try {
      state = await record(review, state, "applying", "Full preimages persisted.");
      let writes = 0;
      for (const row of review.manifest.directories) {
        await guard();
        await createFolder(fixturePath(root, row.path), row.mode);
        expected.dirs.set(row.path, row.mode);
        await fault?.(++writes, row);
        state = await record(review, state, "applying", "mkdir " + row.path);
      }
      for (const row of review.manifest.mutations) {
        await guard();
        const pre = before.files.get(row.path) ?? null, post = after.files.get(row.path) ?? null;
        await replace(fixturePath(root, row.path), post, image(pre));
        set(expected, row.path, post);
        await fault?.(++writes, row);
        state = await record(review, state, "applying", row.operation + " " + row.path);
      }
      await guard();
      sameTree(await scan(root), after);
      return { journal: await record(review, state, "applied", "All reviewed postimages matched."), failure: null };
    } catch (error) {
      await checkLock();
      const failure = failCode(error, "transaction-error");
      state = await record(review, state, "failed", failure);
      return { journal: await restore(review, state, before, after, checkLock), failure };
    }
  }, locks);
}

export async function verify(run, testBuilds, { signal, check = fresh } = {}) {
  const review = await loadReview(run);
  return locked(run, false, async checkLock => {
    let state = await journalOf(review);
    if (state.status !== "applied") stop("invalid-state", "Verification requires a completed apply.");
    const [before, after] = await storedTrees(review);
    try {
      cancelled(signal);
      await check(review, signal);
      sameTree(await scan(await assertRoot(review)), after);
      state = await record(review, state, "verifying", "Building independent baseline and integrated consumers.");
      const evidence = await testBuilds(before, after);
      if (!evidence?.before?.browser?.checks?.length || !evidence?.after?.browser?.checks?.length) {
        stop("verification-failed", "The two real build and browser reports are required.");
      }
      await checkLock();
      cancelled(signal);
      sameTree(await scan(await assertRoot(review)), after);
      return { journal: await record(review, state, "verified", "Explicit browser and production build gates passed."), evidence, failure: null };
    } catch (error) {
      await checkLock();
      const failure = failCode(error, "verification-failed");
      state = await record(review, state, "failed", failure);
      return { journal: await restore(review, state, before, after, checkLock), failure };
    }
  }, locks);
}
export async function rollback(run) {
  const review = await loadReview(run);
  return locked(run, true, async checkLock => {
    const state = await journalOf(review);
    const [before, after] = await storedTrees(review);
    return restore(review, state, before, after, checkLock);
  }, locks);
}
export async function status(run) {
  const review = await loadReview(run);
  return await exists(journalPath(run)) ? journalOf(review) : { schemaVersion: 3, runId: run, status: "authorization-required" };
}
