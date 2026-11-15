import { resolve } from "node:path";
import { validateReport } from "../../../src/agent/integration/validation.ts";
import { file, json, readJSON, replace, entry, image } from "./files.mjs";
import { runEvidence } from "./review.mjs";

const prefix = review => ".motionux-v9/evidence/agent-v2/runs/" + review.runId + "/";
async function optional(path) {
  return await file(path) ? readJSON(path) : null;
}
export async function writeReport(review, result) {
  const { journal, evidence, failure, restoredAttempt } = result;
  const folder = runEvidence(review.runId);
  if (evidence) await json(resolve(folder, "verification.json"), evidence);
  const observed = evidence ?? await optional(resolve(folder, "verification.json"));
  const status = journal.status;
  const restored = restoredAttempt?.verification?.browser;
  const recheckPath = restoredAttempt ? "restored-rechecks/" + restoredAttempt.attemptId + "/" : null;
  const outcomes = [
    ...(observed?.before.browser.checks ?? []).map(row => ({ ...row, name: "baseline/" + row.name })),
    ...(observed?.after.browser.checks ?? []),
    ...(restored?.checks ?? []).map(row => ({ ...row, name: "restored/" + row.name })),
    ...(restoredAttempt && restoredAttempt.status !== "passed" ? [{ name: "restored-route", status: "failed", detail: "Current recheck " + restoredAttempt.status + "." }] : []),
    ...(failure ? [{ name: "transaction", status: "failed", detail: failure }] : []),
    ...(journal.proof ? [{ name: "rollback-tree", status: "passed", detail: "Full baseline tree and npm lockfile matched." }] : []),
    ...["physical-mobile", "screen-reader-manual", "rtl", "live-backend", "renderer-rss"].map(name =>
      ({ name, status: "unknown", detail: "Outside the tested fixture scope." })),
  ];
  const artifacts = ["journal.json", ...(recheckPath ? [recheckPath + "attempt.json"] : []),
    ...(restored ? ["restored-browser.json", "restored-desktop.png", "restored-trace.zip"].map(name => recheckPath + name) : []), ...(observed ? ["verification.json", "before-desktop.png", "after-desktop.png", "after-confirmed-animation.png",
    "before-touch-320.png", "after-touch-320.png", "before-touch-390.png", "after-touch-390.png", "before-trace.zip", "after-trace.zip"] : [])]
    .map(name => prefix(review) + name);
  const report = validateReport({ schemaVersion: 2, runId: review.runId, status, sourceId: review.source.id,
    reviewFingerprint: review.fingerprint, beforeHash: review.beforeHash,
    appliedHash: journal.events.some(item => item.state === "applied") ? review.afterHash : null,
    rollbackHash: journal.proof?.finalHash ?? null, outcomes, artifacts });
  await json(resolve(folder, "report.json"), report);
  const path = resolve(folder, "report.md");
  const previous = await file(path);
  const md = ["# Agent V2 fixture acceptance", "", "**Status** " + status, "**Source** " + review.source.id,
    "**Upstream** " + review.source.commit, "**Registry SHA-256** " + review.source.registry, "**Baseline tree** " + report.beforeHash,
    "**Applied tree** " + (report.appliedHash ?? "pending"), "**Rollback tree** " + (report.rollbackHash ?? "pending"), "",
    "## Manifest", "", ...review.mutationManifest.map(row => "- " + row.operation + " `" + row.path + "`"), "",
    "## Checks", "", ...outcomes.map(row => "- **" + row.status + "** " + row.name + " · " + row.detail), "",
    "## Private artifacts", "", ...artifacts.map(path => "- " + path), ""].join("\n");
  await replace(path, entry(md, 0o600), image(previous));
  return report;
}
