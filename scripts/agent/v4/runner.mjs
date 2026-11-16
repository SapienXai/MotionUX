import { statfs } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { canonical } from "../../../src/brain/indexer.ts";
import { realProjectWrites, scopeFor } from "../../../src/agent/integration/v4/contract.mjs";
import { directory, json, stop, treeHash } from "../v2/files.mjs";
import { dryRun, storedTrees } from "../v3/review.mjs";
import { applyHostFixture, rollback, status as transactionStatus, verify } from "../v3/transaction.mjs";
import { assertRoot, scan } from "../v3/workspace.mjs";
import { preflightPackages, recheck, verifyBuild } from "../v3/verify.mjs";
import { evidenceFor, fixtureOperator } from "./bridge.mjs";

const measure = (start) => +(performance.now() - start).toFixed(2);
const observedHash = async review => treeHash(await scan(await assertRoot(review)));
const failureCode = error => typeof error?.code === "string" && /^[a-z-]+$/.test(error.code) ? error.code : "fixture-failed";

export async function changeReview(review, signal) {
  await dryRun(review, signal);
  const scope = scopeFor(review, await assertRoot(review));
  return {
    schemaVersion: 1, title: "MotionUX Change Review", runId: review.runId, status: "host-approval-unverified",
    scope, expiresAt: review.expiresAt, goal: review.request.goal, why: review.hostState,
    alternative: "Keep the existing host control",
    changes: Object.fromEntries(["create", "modify", "delete"].map(op => [op, scope.manifest.mutations.filter(row => row.operation === op).length])),
    checks: ["offline npm ci with scripts disabled", "TypeScript", "production build", "loopback Playwright", "axe", "fresh restored build and browser recheck"],
    assessment: {
      theme: "Host palette compared before and after",
      ssr: scope.fixture === "next" ? "Next App Router server render plus hydrated client control" : "Vite client render",
      locale: "Existing Turkish copy and host state",
      accessibility: "Keyboard, focus, axe and observed reduced motion. Physical devices and manual screen readers remain unverified.",
      budget: "One build replica per run slot, 850 MiB max, grant valid for up to 120 seconds. Restored verification runs separately.",
      rollback: "Reviewed preimage including mode and lockfile, with full-tree check. Independent edits force manual review.",
    },
    choices: ["Approve exactly these changes", "Reject", "Cancel"], defaultChoice: "Reject",
    targetWrites: 0, realProjectWrites,
  };
}

export async function runFixture(review, { scenario = "decline", signal, fault, onMutation } = {}) {
  const total = performance.now();
  const display = await changeReview(review, signal);
  const logs = evidenceFor(review.runId);
  await directory(logs, true);
  const storage = await statfs(display.scope.canonicalRoot, { bigint: true });
  const freeBefore = Number(storage.bavail * storage.bsize);
  const timing = {};
  let preflight, host, verification, journal, attempt, failure;
  let attemptedEffects = 0;
  if (scenario === "accept") {
    if (freeBefore < 1024 ** 3) stop("build-budget", "Less than 1 GiB is available for the disposable build.");
    const started = performance.now();
    const [, planned] = await storedTrees(review);
    preflight = await preflightPackages(review, planned, signal, logs);
    timing.preflightMs = measure(started);
  }
  const approvalStarted = performance.now();
  try {
    try {
      host = await fixtureOperator(review, scenario, { signal, deadline: scenario === "timeout" ? 750 : 30_000 });
    } catch (error) {
      failure = failureCode(error);
    }
    timing.approvalMs = measure(approvalStarted);
    if (host?.receipt.decision === "accepted") {
      const during = signal ? AbortSignal.any([signal, host.signal]) : host.signal;
      let started = performance.now();
      const applied = await applyHostFixture(review.runId, host.capability, { signal: during, fault: async (count, row) => {
        attemptedEffects = count;
        await onMutation?.(count, row);
        if (fault === "revoke-after-write" && count === 1) await host.revokeFixtureForTest();
      } });
      timing.applyMs = measure(started);
      journal = applied.journal;
      failure = applied.failure ? host.signal.reason?.code ?? applied.failure : null;
      if (journal.status === "applied") {
        started = performance.now();
        verification = await verify(review.runId, async (before, after) => {
          if (fault === "revoke-during-build") {
            const [build] = await Promise.allSettled([
              verifyBuild(review, before, "before", during, { logs }),
              delay(1200, undefined, { signal: during }).then(() => host.revokeFixtureForTest()),
            ]);
            during.throwIfAborted();
            if (build.status === "rejected") throw build.reason;
            stop("verification-failed", "The controlled build revocation did not interrupt verification.");
          }
          const first = await verifyBuild(review, before, "before", during, { logs });
          const second = await verifyBuild(review, after, "after", during, { logs, fault: fault === "browser" });
          const palette = ({ browser }) => [browser.measured.background, browser.measured.foreground];
          if (canonical(palette(first)) !== canonical(palette(second))) stop("verification-failed", "Host palette changed.");
          return { before: first, after: second };
        }, { signal: during });
        timing.verifyMs = measure(started);
        journal = verification.journal;
        failure = verification.failure ? host.signal.reason?.code ?? verification.failure : null;
      }
    } else if (host) failure = host.receipt.decision;
  } catch (error) {
    if (!journal) throw error;
    failure = failureCode(error);
    journal = await transactionStatus(review.runId);
  } finally {
    host?.close();
  }

  const integrated = journal?.status === "verified";
  if (["authorized-fixture", "applying", "applied", "verifying", "verified"].includes(journal?.status)) {
    const started = performance.now();
    journal = await rollback(review.runId);
    timing.rollbackMs = measure(started);
  }
  if (journal?.status === "rolled-back") {
    const started = performance.now();
    attempt = await recheck(review, journal, AbortSignal.timeout(120_000), false, logs);
    timing.recheckMs = measure(started);
  }

  const finalHash = await observedHash(review);
  const restored = finalHash === review.beforeHash && attempt?.status === "passed";
  const denied = !journal && finalHash === review.beforeHash;
  const status = integrated && restored ? "fixture-passed" :
    restored ? "fixture-failed-restored" : denied ? "fixture-denied" : "fixture-failed";
  const afterStorage = await statfs(display.scope.canonicalRoot, { bigint: true });
  const value = {
    schemaVersion: 1, runId: review.runId, fixture: review.request.fixture, source: display.scope.source,
    status, realProjectWrites, nativeManifestAuthority: false, scenario, failure: failure ?? attempt?.reason ?? null,
    targetEffects: attemptedEffects, manifestDigest: review.manifestDigest, changes: display.changes,
    beforeHash: review.beforeHash, afterHash: review.afterHash, finalHash, preflight: preflight ?? null,
    decision: host?.receipt ?? null, journal: journal ?? null,
    verification: verification?.evidence ?? null, recheck: attempt ?? null, timing: { ...timing, endToEndMs: measure(total) },
    freeBytes: { before: freeBefore, after: Number(afterStorage.bavail * afterStorage.bsize) },
  };
  await json(resolve(logs, "acceptance.json"), value);
  return value;
}
