import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { link, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import scenarios from "../../../fixtures/agent/v2/scenarios.v2.json" with { type: "json" };
import approvedSeed from "../../../fixtures/agent/v2/seed.v2.json" with { type: "json" };
import { diffTree, validatePlan, validateRequest, validateTransaction } from "../../../src/agent/integration/validation.ts";
import { base, digest, directory, entry, exists, file, id, inventory, readJSON, safePath, seed, snapshot, stop, treeHash } from "./files.mjs";
import { managed, runEvidence, manifestConfirmation } from "./review.mjs";
import { client, gatePlan, manifests, route, screen, sourceId } from "./source.mjs";
import { apply, getJournal, journalPath, rollback, verify } from "./transaction.mjs";
import { recheckRestored } from "./recheck.mjs";
import { writeReport } from "./report.mjs";

async function sandbox(t) {
  const parent = resolve(base, "scratch");
  await directory(parent, true);
  const root = await mkdtemp(resolve(parent, "test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
function reviewFixture(t) {
  const run = id();
  const root = managed(run);
  t.after(async () => {
    for (const path of [root, runEvidence(run), resolve(base, "locks", run + ".json"), resolve(base, "scratch", "seed-" + run)]) {
      await rm(path, { recursive: true, force: true });
    }
  });
  const trees = {
    before: { files: new Map([["src/a.ts", entry("const value = 'baseline';\n")], ["package-lock.json", entry('{"baseline":true}\n')],
      ["src/remove.ts", entry("export const before = true;\n")], ["preexisting.md", entry("Keep existing data\n", 0o600)]]), dirs: new Map([["src", 0o755]]) },
    after: { files: new Map([["src/a.ts", entry("const value = 'integrated';\n")], ["package-lock.json", entry('{"integrated":true}\n')],
      ["preexisting.md", entry("Keep existing data\n", 0o600)], ["src/nested/motion.ts", entry("export const synthetic = true;\n")]]),
      dirs: new Map([["src", 0o755], ["src/nested", 0o700]]) },
  };
  const before = inventory(trees.before);
  const after = inventory(trees.after);
  const createdAt = Date.now();
  const hash = digest("test pin");
  const request = { schemaVersion: 2, mode: "fixture-only", planPath: ".motionux-v9/agent/reports/test.json",
    requestPath: "fixtures/agent/requests/booking-confirmation.json", choiceId: sourceId };
  const body = { schemaVersion: 2, mode: "fixture-only", status: "preflight-passed", runId: run, fixtureRoot: ".motionux-v9/agent/v2/workspaces/" + run,
    route, sourceKind: "app-router", request, planFingerprint: hash, projectFingerprint: hash, brainIndexFingerprint: hash, brainSourceFingerprint: hash,
    seedHash: hash, createdAt, expiresAt: createdAt + 300_000, before, after, beforeHash: digest(before), afterHash: digest(after),
    mutationManifest: diffTree(before, after), createdDirectories: [{ path: "src/nested", mode: 0o700 }],
    source: { id: sourceId, provider: "Synthetic test", format: "react", url: "https://example.test/fixture", commit: "a".repeat(40),
      upstream: hash, registry: hash, notice: "NOTICE.txt", license: "MIT", evidence: ["fixture test"], selectionRank: 2, v1ReviewStatus: "conditional", code: [] },
    dependencies: [], preflight: { status: "resolved", checks: ["synthetic"], packagePrepMs: 0 },
    scope: { processes: ["synthetic"], writable: ["src"], authority: "synthetic", risk: [] } };
  const review = validatePlan({ ...body, fingerprint: digest(body) });
  return { review, root, trees, check: async () => trees, load: async (_review, side) => trees[side] };
}

function v1(bits = {}) {
  const chosen = { sourceId, installKind: "react", reviewStatus: "conditional", why: [{ field: "intents", value: "confirm-action", evidence: [{}] }] };
  return { status: "planned", decision: "candidates", target: { source: screen, sourceKind: "app-router", route },
    context: { status: "inspected", stateOwnership: [{ phase: "success", owner: "server", evidence: ["ref"] }] },
    recommendations: [{ ...chosen, sourceId: "another-provider-first" }, { ...chosen, ...bits }] };
}

test("recheck executes twice with distinct evidence and fails closed after a restored-route fault", async t => {
  const { review, root, check, load } = reviewFixture(t);
  await apply(review, manifestConfirmation(review), { check });
  const journal = await rollback(review, load);
  const folders = new Set();
  let fault = false;
  const verifier = async (run, tree, phase, _signal, { logs }) => {
    assert.equal(run, review.runId);
    assert.equal(phase, "restored");
    assert.equal(treeHash(tree), review.beforeHash);
    assert(!folders.has(logs));
    folders.add(logs);
    if (fault) stop("verification-failed", "Synthetic restored screen returned 500.");
    return { browser: { checks: [{ name: "restored-screen", status: "passed", detail: "Synthetic runner." }] } };
  };
  const first = await recheckRestored(review, journal, undefined, { verify: verifier });
  const second = await recheckRestored(review, journal, undefined, { verify: verifier });
  assert.equal(first.status, "passed");
  assert.equal(second.status, "passed");
  assert.notEqual(first.attemptId, second.attemptId);
  assert.notEqual(first.fingerprint, second.fingerprint);
  fault = true;
  const failed = await recheckRestored(review, journal, undefined, { verify: verifier });
  assert.equal(failed.status, "failed");
  assert.equal(failed.verification, undefined);
  assert.equal(folders.size, 3);
  const report = await writeReport(review, { journal, restoredAttempt: failed });
  assert(report.outcomes.some(row => row.name === "restored-route" && row.status === "failed"));
  assert(!report.outcomes.some(row => row.name.startsWith("restored/")));
  for (const attempt of [first, second, failed]) {
    const recorded = await readJSON(resolve(runEvidence(review.runId), "restored-rechecks", attempt.attemptId, "attempt.json"));
    assert.deepEqual(recorded, attempt);
    assert.equal(attempt.targetHash, review.beforeHash);
    assert.equal(attempt.finalHash, review.beforeHash);
  }
  assert.equal(treeHash(await snapshot(root)), review.beforeHash);
});

for (const decision of scenarios.readOnlyV1Decisions) {
  test("V1 " + decision + " does not admit source selection", async () => {
    const original = treeHash(await snapshot(seed));
    assert.throws(() => gatePlan({ ...v1(), decision }, sourceId), { code: "blocked" });
    assert.equal(treeHash(await snapshot(seed)), original);
  });
}

test("selection is explicit and may be lower than Brain's first result", () => {
  const plan = v1();
  assert.equal(gatePlan(plan, sourceId), plan.recommendations[1]);
  assert.throws(() => gatePlan(plan, "another-provider-first"), { code: "unsupported-in-v2" });
  assert.throws(() => gatePlan(plan), { code: "blocked" });
});

test("HTML, incompatible packages, partial inspection and missing authority are blocked", () => {
  assert.throws(() => gatePlan(v1({ installKind: "html-iframe" }), sourceId), { code: "unsupported-in-v2" });
  assert.throws(() => gatePlan(v1({ reviewStatus: "incompatible" }), sourceId), { code: "blocked" });
  const partial = v1();
  partial.context.status = "partial-inspection";
  assert.throws(() => gatePlan(partial, sourceId), { code: "blocked" });
  const timer = v1();
  timer.context.stateOwnership = [{ phase: "success", owner: "unknown", evidence: ["timer-only"] }];
  assert.throws(() => gatePlan(timer, sourceId), { code: "unsupported-in-v2" });
});

test("ranges and lifecycle scripts must pass fixture manifest policy", () => {
  const pkg = { name: "motionux-fictional-booking", private: true, dependencies: { react: "^19.0.0" }, devDependencies: {} };
  assert.equal(manifests(pkg, { react: "19.2.7" }).after.dependencies.react, "19.2.7");
  assert.throws(() => manifests(pkg, { react: "18.3.0" }), { code: "blocked" });
  assert.throws(() => manifests(pkg, { "some-library": "file:/tmp/foreign" }), { code: "blocked" });
  assert.throws(() => manifests({ ...pkg, scripts: { preinstall: "touch unsafe" } }, {}), { code: "blocked" });
});

test("apply requires separately scoped approval and rejects guessed or expired grants", async t => {
  const { review, root, check } = reviewFixture(t);
  for (const value of [undefined, "yes", "approve:" + review.runId, manifestConfirmation({ ...review, fingerprint: digest("other") })]) {
    await assert.rejects(apply(review, value, { check }), { code: "authorization-required" });
  }
  await assert.rejects(apply({ ...review, expiresAt: 0 }, manifestConfirmation(review), { check }), { code: "stale" });
  assert.equal(await exists(root), null);
});

test("review schema rejects permission downgrade, escapes and forged postimages", t => {
  const { review } = reviewFixture(t);
  assert.throws(() => validateRequest({ ...review.request, schemaVersion: 1 }));
  assert.throws(() => validateRequest({ ...review.request, project: "/outside" }));
  for (const change of [{ fixtureRoot: "fixtures/agent/booking-demo" }, { afterHash: digest("forged") }, { mode: "unrestricted" }]) {
    assert.throws(() => validatePlan({ ...review, ...change }));
  }
  assert.deepEqual(diffTree(review.before, review.after).map(row => row.path), ["package-lock.json", "src/a.ts", "src/nested/motion.ts", "src/remove.ts"]);
});

test("write paths reject case-unsafe manifest aliases, Unicode, traversal and hidden stores", async t => {
  for (const name of ["../x.ts", "/etc/passwd", "x/%2e%2e/file.ts", ".env.local", "src/node_modules/a.ts", "src/Cafe\u0301.ts", "src/foo\\bar.ts", "src/../x.ts"]) {
    assert.equal(safePath(name), false, name);
  }
  const root = await sandbox(t);
  await writeFile(resolve(root, "case.ts"), "one");
  await writeFile(resolve(root, "CASE.ts"), "two");
  // APFS can be case insensitive; the validator must still reject a collision in a manifest.
  if ((await file(resolve(root, "case.ts"))).content.toString() === "one") {
    await assert.rejects(snapshot(root), { code: "unsafe-tree" });
  }
  const { review } = reviewFixture(t);
  const { fingerprint, ...body } = review;
  assert.ok(fingerprint);
  body.before.files = [{ path: "A.ts", sha256: digest("A"), mode: 420 }, { path: "a.ts", sha256: digest("a"), mode: 420 }];
  body.beforeHash = digest(body.before);
  assert.throws(() => validatePlan({ ...body, fingerprint: digest(body) }), /integrity/);
});

for (const kind of scenarios.blockedFilesystemTraps) {
  test("tree copy blocks " + kind + " without reading its payload", async t => {
    const root = await sandbox(t);
    const other = await sandbox(t);
    const trap = resolve(other, "trap.ts");
    await writeFile(trap, "external-private-marker");
    if (kind === "symlink") await symlink(trap, resolve(root, "borrowed.ts"));
    if (kind === "hardlink") await link(trap, resolve(root, "borrowed.ts"));
    if (kind === "submodule") await writeFile(resolve(root, ".git"), "gitdir: /outside");
    if (kind === "secret-name") await writeFile(resolve(root, "secret.env.ts"), "private");
    await assert.rejects(snapshot(root), error => ["unsafe-file", "unsafe-tree"].includes(error.code));
    assert.equal(await readFile(trap, "utf8"), "external-private-marker");
  });
}

test("transaction covers create, modify, delete, lockfile and exact duplicate rollback", async t => {
  const { review, root, check, load } = reviewFixture(t);
  const applied = await apply(review, manifestConfirmation(review), { check });
  assert.equal(applied.journal.status, "applied");
  assert.equal(treeHash(await snapshot(root)), review.afterHash);
  assert.equal(await exists(resolve(root, "src/remove.ts")), null);
  assert.equal(await readFile(resolve(root, "package-lock.json"), "utf8"), '{"integrated":true}\n');
  await assert.rejects(apply(review, manifestConfirmation(review), { check }), { code: "existing-run" });
  const state = await rollback(review, load);
  assert.equal(state.status, "rolled-back");
  assert.equal(treeHash(await snapshot(root)), review.beforeHash);
  assert.equal(await readFile(resolve(root, "package-lock.json"), "utf8"), '{"baseline":true}\n');
  assert.deepEqual(state.proof.restored, ["package-lock.json", "src/a.ts", "src/remove.ts"]);
  assert.deepEqual(state.proof.removed, ["src/nested/motion.ts"]);
  assert.deepEqual(await rollback(review, load), state);
  assert.equal(await exists(resolve(root, "src/nested")), null);
  assert.equal((await file(resolve(root, "preexisting.md"))).mode, 0o600);
});

test("concurrent apply cannot acquire the same workspace", async t => {
  const { review, check, load } = reviewFixture(t);
  let release;
  let entered;
  const wait = new Promise(resolve => { release = resolve; });
  const signal = new Promise(resolve => { entered = resolve; });
  const first = apply(review, manifestConfirmation(review), { check, afterWrite: async count => { if (count === 1) { entered(); await wait; } } });
  await signal;
  try { await assert.rejects(apply(review, manifestConfirmation(review), { check }), { code: "locked" }); }
  finally { release(); }
  assert.equal((await first).journal.status, "applied");
  await rollback(review, load);
});

for (const reason of scenarios.applyFaults) {
  test("restore the complete baseline after " + reason, async t => {
    const { review, root, check } = reviewFixture(t);
    const controller = new AbortController();
    let validations = 0;
    const outcome = await apply(review, manifestConfirmation(review), { signal: controller.signal,
      check: async () => {
        if (++validations === 2 && reason === "stale") stop("stale", "Injected stale plan or changed source/registry.");
        return check();
      },
      afterWrite: async count => {
        if (count !== 1) return;
        if (reason === "cancelled") controller.abort();
        else if (reason === "failed") stop("failed", "Injected mid-apply failure.");
      },
    });
    assert.equal(outcome.failure, reason);
    assert.equal(outcome.journal.status, "rolled-back");
    assert.equal(treeHash(await snapshot(root)), review.beforeHash);
  });
}

for (const reason of scenarios.verificationFaults) {
  test("verification failure " + reason + " automatically restores the actual working copy", async t => {
    const { review, root, check, load } = reviewFixture(t);
    await apply(review, manifestConfirmation(review), { check });
    const result = await verify(review, async () => stop(reason, "Controlled verifier fault."), { read: load });
    assert.equal(result.failure, reason);
    assert.equal(result.journal.status, "rolled-back");
    assert.equal(treeHash(await snapshot(root)), review.beforeHash);
  });
}

test("recovery after a separate process is SIGKILLed between replace and journal update", async t => {
  const { review, root, trees, load } = reviewFixture(t);
  const childCode = `
    import { apply } from "./scripts/agent/v2/transaction.mjs";
    import { entry } from "./scripts/agent/v2/files.mjs";
    const input=JSON.parse(process.argv[1]);
    function revive(tree) { return { files: new Map(tree.files.map(([p,b,m])=>[p,entry(Buffer.from(b,"base64"),m)])), dirs: new Map(tree.dirs) }; }
    await apply(input.review,input.manifestConfirmation,{check:async()=>({before:revive(input.before),after:revive(input.after)}),
      afterWrite: () => process.kill(process.pid, "SIGKILL")});
  `;
  const serial = tree => ({ files: [...tree.files].map(([p, item]) => [p, item.content.toString("base64"), item.mode]), dirs: [...tree.dirs] });
  const child = spawn(process.execPath, ["--input-type=module", "-e", childCode, JSON.stringify({
    review, manifestConfirmation: manifestConfirmation(review), before: serial(trees.before), after: serial(trees.after),
  })], { stdio: "ignore" });
  const [code, signal] = await once(child, "exit");
  assert.equal(code, null);
  assert.equal(signal, "SIGKILL");
  assert.equal((await getJournal(review)).status, "applying");
  assert.notEqual(treeHash(await snapshot(root)), review.beforeHash);
  assert.equal((await rollback(review, load)).status, "rolled-back");
  assert.equal(treeHash(await snapshot(root)), review.beforeHash);
});

test("symlink swap and post-apply external edits preserve conflicting bytes", async t => {
  const { review, root, check } = reviewFixture(t);
  const other = await sandbox(t);
  await writeFile(resolve(other, "important.ts"), "external");
  const result = await apply(review, manifestConfirmation(review), { check, afterWrite: async count => {
    if (count === 1) {
      await rename(resolve(root, "src"), resolve(root, "moved-src"));
      await symlink(other, resolve(root, "src"));
    }
  } });
  assert.equal(result.journal.status, "needs-manual-review");
  assert.equal(await readFile(resolve(other, "important.ts"), "utf8"), "external");
  const second = reviewFixture(t);
  await apply(second.review, manifestConfirmation(second.review), { check: second.check });
  await writeFile(resolve(second.root, "src/a.ts"), "user changed this");
  const status = await rollback(second.review, second.load);
  assert.equal(status.status, "needs-manual-review");
  assert.equal(await readFile(resolve(second.root, "src/a.ts"), "utf8"), "user changed this");
  assert.equal(await readFile(resolve(second.root, "package-lock.json"), "utf8"), '{"integrated":true}\n');
});

test("malformed journal fails closed and leaves the integrated tree intact", async t => {
  const { review, root, check, load } = reviewFixture(t);
  await apply(review, manifestConfirmation(review), { check });
  const proof = await getJournal(review);
  assert.throws(() => validateTransaction({ ...proof, fingerprint: digest("forged") }));
  await writeFile(journalPath(review.runId), '{"status":"applied"}');
  await assert.rejects(rollback(review, load), { code: "invalid-journal" });
  assert.equal(treeHash(await snapshot(root)), review.afterHash);
});

test("the named integration scope preserves existing server authority", async () => {
  const tree = await snapshot(seed);
  assert.deepEqual(inventory(tree).files.map(({path,sha256})=>({path,sha256})), approvedSeed.files);
  assert.ok(tree.files.get(client).content.includes(Buffer.from('booking.status === "confirmed"')));
  assert.ok(tree.files.get(screen).content.includes(Buffer.from("await readBooking(")));
  assert.ok(tree.files.get("src/lib/booking-ledger.ts").content.includes(Buffer.from('import "server-only"')));
  assert.equal(dirname(managed("a".repeat(32))), resolve(base, "workspaces"));
});

test("bounded reader rejects binary file types and validates untracked metadata", async t => {
  const root = await sandbox(t);
  await writeFile(resolve(root, "fixture.bin"), Buffer.from([0, 1, 2]));
  await assert.rejects(snapshot(root), { code: "unsafe-tree" });
});

test("saved npm lockfile bytes cannot be substituted after review", async t => {
  const { review, trees } = reviewFixture(t);
  const { readBlobs } = await import("./review.mjs");
  const root = resolve(base, "reviews", review.runId);
  t.after(() => rm(root, { recursive: true, force: true }));
  const blobs = resolve(root, "blobs");
  await directory(blobs, true);
  for (const value of trees.before.files.values()) await writeFile(resolve(blobs, value.sha256), value.content);
  assert.equal(treeHash(await readBlobs(review, "before")), review.beforeHash);
  const lock = trees.before.files.get("package-lock.json");
  await writeFile(resolve(blobs, lock.sha256), "substituted dependency lock");
  await assert.rejects(readBlobs(review, "before"), { code: "invalid-artifact" });
});

test("verified target preserves unrelated files when browser verification detects concurrent edit", async t => {
  const { review, root, check, load } = reviewFixture(t);
  await apply(review, manifestConfirmation(review), { check });
  const marker = resolve(root, "new-note.md");
  const result = await verify(review, async () => {
    await writeFile(marker, "Keep my edit");
    return { fixture: "synthetic" };
  }, { read: load });
  assert.equal(result.journal.status, "needs-manual-review");
  assert.equal(result.failure, "conflict");
  assert.equal(await readFile(marker, "utf8"), "Keep my edit");
});
