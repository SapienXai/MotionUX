import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { realpath } from "node:fs/promises";
import { canonical } from "../../../src/brain/indexer.ts";
import { validate } from "../../../src/agent/integration/v3/validation.ts";
import { directory, json, readJSON, repo, stop } from "../v2/files.mjs";
import { localBrain } from "../local-brain.mjs";
import { fixtureAuthority, realProjectWrites } from "./authority.mjs";
import { dryRun, loadReview, reviewRequest, storedTrees } from "./review.mjs";
import { apply, rollback, status, verify } from "./transaction.mjs";
import { cache, fixtures, runFolder } from "./workspace.mjs";
import { preflightPackages, recheck, verifyBuild } from "./verify.mjs";

const [name, ...args] = process.argv.slice(2);
const controller = new AbortController();
const cancel = () => controller.abort();
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
const { signal } = controller;
const options = {
  doctor: {}, review: { request: { type: "string" } }, "dry-run": { review: { type: "string" } },
  "fixture-evaluate": { review: { type: "string" }, "fixture-fault": { type: "boolean" } },
  status: { run: { type: "string" } }, rollback: { run: { type: "string" }, recheck: { type: "boolean" }, "fixture-fault": { type: "boolean" } },
  evaluate: {},
};
const cases = ["next-disclosure", "vite-picker", "next-static"];
const help = "Agent V3 · disposable MotionUX fixtures only\n" +
  "doctor | review --request fixtures/agent/v3/requests/next-disclosure.json | dry-run --review RUN\n" +
  "fixture-evaluate --review RUN | status --run RUN | rollback --run RUN --recheck | evaluate\n" +
  "Use --json for one object. Real project writes are disabled.\n";
const asJSON = args.includes("--json");
function print(value) {
  if (asJSON) process.stdout.write(canonical(value) + "\n");
  else process.stdout.write(value.status + (value.runId ? " " + value.runId : "") +
    (value.source ? " · " + value.source.id + " " + value.source.commit : "") +
    (value.manifest ? " · " + value.manifest.mutations.length + " reviewed files" : "") +
    (value.attemptId ? " · fresh recheck " + value.attemptId : "") + (value.message ? " · " + value.message : "") + "\n");
}
async function selected(path) {
  if (!/^(?:\.\/)?fixtures\/agent\/v3\/requests\/[a-z0-9-]{1,50}\.json$/.test(path ?? "")) {
    stop("project-not-authorized", "Choose a checked-in V3 request from the listed fixtures.");
  }
  const target = resolve(repo, path);
  if (await realpath(target) !== target) stop("project-not-authorized", "The fixture request is redirected.");
  return readJSON(target);
}
async function evaluateFixture(review, fault) {
  await dryRun(review, signal);
  const [, afterTree] = await storedTrees(review);
  const preflight = await preflightPackages(review, afterTree, signal);
  const authority = fixtureAuthority();
  const capability = authority.mint(review);
  const applied = await apply(review.runId, authority, capability, { signal });
  let verification = null;
  let journal = applied.journal;
  if (journal.status === "applied") {
    verification = await verify(review.runId, async (before, after) => {
      const first = await verifyBuild(review, before, "before", signal);
      const second = await verifyBuild(review, after, "after", signal, { fault });
      const palette = item => [item.browser.measured.background, item.browser.measured.foreground];
      if (canonical(palette(first)) !== canonical(palette(second))) stop("verification-failed", "Host palette changed.");
      return { before: first, after: second };
    }, { signal });
    journal = verification.journal;
  }
  const verified = journal.status === "verified";
  if (verified) journal = await rollback(review.runId);
  const attempt = journal.status === "rolled-back" ? await recheck(review, journal, signal) : null;
  const value = validate("report", { schemaVersion: 3, runId: review.runId,
    status: verified && attempt?.status === "passed" ? "fixture-passed" : "fixture-failed",
    reviewFingerprint: review.fingerprint, finalHash: journal.proof?.finalHash ?? null, attemptId: attempt?.attemptId ?? null,
    physicalMobile: "unknown", screenReader: "unknown", rtl: "unknown", liveBackend: "unknown" });
  await json(resolve(runFolder(review.runId), "acceptance.json"), { ...value, preflight, journal, verification, recheck: attempt });
  return { ...value, fixture: review.request.fixture, source: review.source, manifestDigest: review.manifestDigest, beforeHash: review.beforeHash,
    afterHash: review.afterHash, failure: applied.failure ?? verification?.failure ?? attempt?.reason ?? null, realProjectWrites };
}

async function main() {
  if (!name || name === "help" || args.includes("--help")) { process.stdout.write(help); return; }
  if (!Object.hasOwn(options, name)) stop("invalid-command", "Use the v3 help command.");
  const { values } = parseArgs({ args, strict: true, options: { ...options[name], json: { type: "boolean" } } });
  if (name === "doctor") {
    const opened = await localBrain();
    const online = await directory(cache).then(() => true, () => false);
    const prepared = opened.index.environment === "prepared" && !opened.invalidIndex && !opened.staleIds?.length && !opened.unindexed;
    print({ status: prepared && online && process.platform === "darwin" ? "prepared" : "blocked", fixtureWrites: ["next", "vite"],
      realProjectWrites, catalog: prepared ? opened.index.records.length : 0, offlineCacheDirectory: online, platform: process.platform });
    return;
  }
  if (name === "review") { print(await reviewRequest(await selected(values.request), signal)); return; }
  if (name === "evaluate") {
    const results = [];
    for (const item of cases) {
      const request = await readJSON(resolve(fixtures, "requests", item + ".json"));
      const review = await reviewRequest(request, signal);
      results.push(review.status === "reviewed" ? await evaluateFixture(review, false) : review);
    }
    const passed = results.filter(row => row.status === "fixture-passed").length === 2 &&
      results.some(row => row.status === "no-motion" && row.targetWrites === 0);
    print({ status: passed ? "fixture-suite-passed" : "fixture-suite-failed", realProjectWrites, results });
    if (!passed) process.exitCode = 1;
    return;
  }
  const run = values.run ?? values.review;
  if (!run) stop("invalid-id", "Supply the generated run ID.");
  if (name === "status") { print(await status(run)); return; }
  const review = await loadReview(run);
  if (name === "dry-run") { print(await dryRun(review, signal)); return; }
  if (name === "fixture-evaluate") {
    const result = await evaluateFixture(review, values["fixture-fault"]);
    print(result);
    if (result.status !== "fixture-passed") process.exitCode = signal.aborted ? 130 : 1;
    return;
  }
  if (values["fixture-fault"] && !values.recheck) stop("invalid-command", "The controlled fault requires --recheck.");
  const journal = await rollback(run);
  const attempt = values.recheck && journal.status === "rolled-back" ? await recheck(review, journal, signal, values["fixture-fault"]) : null;
  print({ schemaVersion: 3, runId: run, status: attempt && attempt.status !== "passed" ? "recheck-" + attempt.status : journal.status,
    proof: journal.proof, attemptId: attempt?.attemptId, attempt });
  if (journal.status !== "rolled-back" || attempt && attempt.status !== "passed") process.exitCode = signal.aborted ? 130 : 1;
}

try { await main(); }
catch (error) {
  const code = signal.aborted ? "cancelled" : typeof error.code === "string" && /^[a-z-]+$/.test(error.code) ? error.code : "blocked";
  print({ schemaVersion: 3, status: code, message: error.code === code ? error.message : "The request or private evidence did not pass V3 validation.", realProjectWrites });
  process.exitCode = signal.aborted ? 130 : 1;
} finally {
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
