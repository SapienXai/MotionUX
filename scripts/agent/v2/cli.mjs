import { parseArgs } from "node:util";
import { canonical } from "../../../src/brain/indexer.ts";
import { localBrain } from "../local-brain.mjs";
import { defaultRequest } from "./source.mjs";
import { directory, exists, repo, stop, V2Error } from "./files.mjs";
import { npmCache } from "./process.mjs";
import { loadReview, managed, revalidate, review, manifestConfirmation } from "./review.mjs";
import { apply, getJournal, journalPath, rollback, verify } from "./transaction.mjs";
import { verifier } from "./verify.mjs";
import { writeReport } from "./report.mjs";
import { recheckRestored } from "./recheck.mjs";

process.chdir(repo);
const [name, ...args] = process.argv.slice(2);
const jsonMode = args.includes("--json");
const controller = new AbortController();
const cancel = () => controller.abort();
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
const string = { type: "string" };
const bool = { type: "boolean" };
const approval = { review: string, "authorized-fixture": string };
const options = { doctor: {}, review: { plan: string, request: string, source: string }, "dry-run": { review: string },
  apply: approval, verify: { run: string }, status: { run: string }, rollback: { run: string, recheck: bool }, evaluate: approval };
const help = `MotionUX Agent V2 · managed booking fixture only
npm run agent:v2:doctor
npm run agent:v2:review -- --plan .motionux-v9/agent/reports/booking.json --source kokonut-promise-toast
npm run agent:v2:dry-run -- --review RUN_ID
npm run agent:v2:apply -- --review RUN_ID --authorized-fixture MANIFEST_CONFIRMATION
npm run agent:v2:verify -- --run RUN_ID
npm run agent:v2:rollback -- --run RUN_ID --recheck
npm run agent:v2:evaluate -- --review RUN_ID --authorized-fixture MANIFEST_CONFIRMATION
Use --json with npm run --silent for one JSON object.
The confirmation acknowledges a specific fixture manifest and expires after 15 minutes. It is deterministic and provides no authentication.
All builds use private replicas, approved offline npm cache and loopback Playwright. No deploy.
`;
const print = value => process.stdout.write(canonical(value) + "\n");

function output(value) {
  if (jsonMode) print(value);
  else {
    const status = value.status ?? value.journal?.status;
    process.stdout.write("Agent V2 " + status + "\n");
    if (value.runId) process.stdout.write("Run " + value.runId + "\n");
    if (value.source?.id) process.stdout.write("Source " + value.source.id + " · " + value.source.commit + "\n");
    if (value.mutationManifest) {
      for (const item of value.mutationManifest) process.stdout.write(item.operation + " " + item.path + " · " +
        (item.before?.sha256 ?? "absent") + " → " + (item.after?.sha256 ?? "absent") + "\n");
      for (const row of value.dependencies) process.stdout.write(row.name + " · " + (row.before ?? "absent") + " → " + row.after + "\n");
    }
    if (value.authorization) process.stdout.write("Manifest confirmation " + value.authorization + "\n");
    if (value.restoredRoute) process.stdout.write("Restored route " + value.restoredRoute.status + " · " + value.restoredRoute.attemptId + "\n");
    if (value.failure) process.stdout.write("Failure " + value.failure + "\n");
    if (value.proof) process.stdout.write("Restored tree " + value.proof.finalHash + "\n");
    if (value.reportPath) process.stdout.write(value.reportPath + "\n");
  }
}
function packaged(review, result, report) {
  return { runId: review.runId, status: result.journal.status, failure: result.failure, proof: result.journal.proof, report,
    reportPath: ".motionux-v9/evidence/agent-v2/runs/" + review.runId + "/report.json" };
}
async function recheck(plan, journal, signal) {
  const attempt = await recheckRestored(plan, journal, signal);
  if (attempt.status !== "passed") process.exitCode = attempt.status === "cancelled" ? 130 : 1;
  return attempt;
}
async function main() {
  if (!name || ["--help", "help"].includes(name)) { process.stdout.write(help); return; }
  if (!Object.hasOwn(options, name)) stop("invalid-command", "Use --help for the fixture-only workflow.");
  let flags;
  try {
    flags = parseArgs({ args, strict: true, allowPositionals: false, options: { ...options[name], json: bool, help: bool } }).values;
  } catch { stop("invalid-flags", "Unsupported or incomplete options. See --help."); }
  if (flags.help) { process.stdout.write(help); return; }
  const { signal } = controller;
  if (name === "doctor") {
    const local = await localBrain();
    const cache = await directory(npmCache).then(() => true, () => false);
    const ready = local.index.environment === "prepared" && !local.invalidIndex && !local.staleIds?.length && !local.unindexed;
    print({ schemaVersion: 2, status: ready && cache && process.platform === "darwin" ? "prepared" : "blocked",
      catalog: local.index.records.length, brainIndexFingerprint: ready ? local.index.indexFingerprint : null,
      offlineNpmCache: cache, macOSProcessSandbox: process.platform === "darwin" });
    return;
  }
  if (name === "review") {
    if (!flags.plan || !flags.source) stop("invalid-flags", "Review requires --plan and an explicit --source.");
    output(await review({ schemaVersion: 2, mode: "fixture-only", planPath: flags.plan,
      requestPath: flags.request ?? defaultRequest, choiceId: flags.source }, signal));
    return;
  }
  const plan = await loadReview(flags.review ?? flags.run);
  if (name === "dry-run") {
    if (await exists(journalPath(plan.runId)) || await exists(managed(plan.runId))) stop("existing-run", "This reviewed workspace already exists.");
    await revalidate(plan, signal);
    output({ ...plan, authorization: manifestConfirmation(plan), targetFilesWritten: 0 });
    return;
  }
  if (name === "status") { output(await getJournal(plan)); return; }
  if (name === "rollback") {
    const state = await rollback(plan);
    const attempt = flags.recheck && state.status === "rolled-back" ? await recheck(plan, state, signal) : null;
    const report = await writeReport(plan, { journal: state, restoredAttempt: attempt });
    const result = packaged(plan, { journal: state, failure: null }, report);
    if (attempt) Object.assign(result, { status: attempt.status === "passed" ? state.status : "recheck-" + attempt.status, restoredRoute: attempt });
    output(result);
    if (state.status !== "rolled-back") process.exitCode = 1;
    return;
  }
  if (name === "apply" || name === "evaluate") {
    const result = await apply(plan, flags["authorized-fixture"], { signal });
    const report = await writeReport(plan, result);
    if (name === "apply" || result.failure) {
      output(packaged(plan, result, report));
      if (result.failure) process.exitCode = 1;
      return;
    }
  }
  const result = await verify(plan, verifier(plan), { signal });
  const report = await writeReport(plan, result);
  const summary = packaged(plan, result, report);
  if (name === "evaluate" && result.journal.status === "verified") {
    const restored = await rollback(plan);
    summary.rollback = restored.proof;
    summary.restoredStatus = restored.status;
    if (restored.status === "rolled-back") {
      summary.restoredRoute = await recheck(plan, restored, signal);
      if (summary.restoredRoute.status !== "passed") summary.status = "recheck-" + summary.restoredRoute.status;
    } else process.exitCode = 1;
    summary.report = await writeReport(plan, { journal: restored, restoredAttempt: summary.restoredRoute });
  }
  output(summary);
  if (result.failure) process.exitCode = 1;
}

try { await main(); }
catch (error) {
  const known = error instanceof V2Error;
  const response = { schemaVersion: 2, status: known ? error.code : "blocked",
    message: known ? error.message : "Agent V2 could not complete validation. Inspect the private logs for the selected run." };
  if (jsonMode) print(response);
  else process.stderr.write(response.message + "\n");
  process.exitCode = response.status === "cancelled" ? 130 : 1;
} finally {
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
