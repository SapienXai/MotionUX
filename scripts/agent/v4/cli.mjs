import { parseArgs } from "node:util";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { canonical } from "../../../src/brain/indexer.ts";
import { hostCompatibility, realProjectWrites } from "../../../src/agent/integration/v4/contract.mjs";
import { directory, exists, readJSON, repo, stop } from "../v2/files.mjs";
import { localBrain } from "../local-brain.mjs";
import { loadReview, reviewRequest, storedTrees } from "../v3/review.mjs";
import { rollback, status } from "../v3/transaction.mjs";
import { cache, fixtures } from "../v3/workspace.mjs";
import { recheck } from "../v3/verify.mjs";
import { evidenceFor, output } from "./bridge.mjs";
import { changeReview, runFixture } from "./runner.mjs";

const [command, ...args] = process.argv.slice(2);
const flag = { type: "boolean" };
const word = { type: "string" };
const commands = {
  doctor: {}, review: { request: word }, "dry-run": { review: word, full: flag }, diff: { review: word, file: word },
  "host-check": { review: word }, "fixture-evaluate": { review: word, scenario: word, "fixture-fault": word },
  status: { run: word }, rollback: { run: word, recheck: flag, "fixture-fault": word }, evaluate: {},
};
const controller = new AbortController();
const cancel = () => controller.abort();
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
const { signal } = controller;
const asJSON = args.includes("--json");

function print(value) {
  if (asJSON) process.stdout.write(canonical(value) + "\n");
  else process.stdout.write(JSON.stringify(value, null, 2).replace(/[\x7f-\x9f\u202a-\u202e\u2066-\u2069]/gu,
    char => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0")) + "\n");
}

async function selected(path) {
  if (!/^(?:\.\/)?fixtures\/agent\/v3\/requests\/[a-z0-9-]{1,50}\.json$/.test(path ?? "")) {
    stop("project-not-authorized", "Choose a checked-in MotionUX fixture request.");
  }
  const target = resolve(repo, path);
  if (await realpath(target) !== target) stop("project-not-authorized", "The fixture request is redirected.");
  return readJSON(target);
}

function content(item) {
  if (!item) return null;
  const text = item.content.toString("utf8");
  return Buffer.from(text).equals(item.content) && !text.includes("\0") ? { encoding: "utf8", content: text } :
    { encoding: "base64", content: item.content.toString("base64") };
}

async function diff(review, path) {
  const row = review.manifest.mutations.find(item => item.path === path);
  if (!row) stop("out-of-scope", "The file must exactly match one manifest entry.");
  const [before, after] = await storedTrees(review);
  return { status: "file-diff", path, operation: row.operation, role: row.role,
    manifestDigest: review.manifestDigest, before: { image: row.before, file: content(before.files.get(path)) },
    after: { image: row.after, file: content(after.files.get(path)) }, targetWrites: 0 };
}

async function observation() {
  const path = resolve(output, "native-approval.json");
  return readJSON(path).then(value => ({
    probe: value.probe, observed: Array.isArray(value.observed) ? value.observed.filter(item =>
      ["item/fileChange/requestApproval", "item/commandExecution/requestApproval"].includes(item.method)).map(item => item.method) : [],
    declined: value.itemStatus === "declined",
  }), () => null);
}

async function main() {
  if (!command || command === "help" || args.includes("--help")) {
    process.stdout.write("Agent V4 · fixture-only\ndoctor | review | dry-run | diff | host-check | fixture-evaluate | status | rollback | evaluate\nUse --json to emit one object. The default decision is Reject.\n");
    return;
  }
  if (!Object.hasOwn(commands, command)) stop("invalid-command", "Unknown V4 command.");
  const { values } = parseArgs({ args, strict: true, options: { ...commands[command], json: flag } });
  if (command === "doctor") {
    const [brain, cacheAvailable, nativeObservation] = await Promise.all([
      localBrain(), directory(cache).then(() => true, () => false), observation(),
    ]);
    const prepared = brain.index.environment === "prepared" && !brain.invalidIndex && !brain.staleIds?.length && !brain.unindexed;
    print({ schemaVersion: 1, ...hostCompatibility(), platform: process.platform, fixtureTargets: ["next", "vite"],
      fixtureEnvironment: prepared && cacheAvailable && process.platform === "darwin" ? "prepared" : "blocked",
      originals: prepared ? brain.index.records.length : 0, offlineCacheDirectory: cacheAvailable, observation: nativeObservation });
    return;
  }
  if (command === "review") {
    const review = await reviewRequest(await selected(values.request), signal);
    print(review.status === "reviewed" ? await changeReview(review, signal) : review);
    return;
  }
  if (command === "evaluate") {
    const results = [];
    for (const name of ["next-disclosure", "vite-picker", "next-static"]) {
      const request = await readJSON(resolve(fixtures, "requests", name + ".json"));
      const review = await reviewRequest(request, signal);
      results.push(review.status === "reviewed" ? await runFixture(review, { scenario: "accept", signal }) : review);
    }
    const passed = results.filter(row => row.status === "fixture-passed").length === 2 &&
      results.some(row => row.status === "no-motion" && row.targetWrites === 0);
    print({ ...hostCompatibility(), results, fixtureStatus: passed ? "fixture-verified" : "fixture-failed",
      status: passed ? "fixture-suite-passed" : "fixture-suite-failed" });
    if (!passed) process.exitCode = 1;
    return;
  }

  const run = values.run ?? values.review;
  if (!run) stop("invalid-id", "Supply the generated run ID.");
  if (command === "status") {
    const journal = await status(run);
    const resultPath = resolve(evidenceFor(run), "acceptance.json");
    const acceptance = await exists(resultPath) ? await readJSON(resultPath) : null;
    print({ ...journal, realProjectWrites, fixtureAcceptance: acceptance?.status ?? null });
    return;
  }
  const review = await loadReview(run);
  if (command === "dry-run") {
    const result = await changeReview(review, signal);
    if (asJSON || values.full) print(result);
    else {
      const { manifest, ...scope } = result.scope;
      print({ ...result, scope: { ...scope, dependencies: manifest.dependencies } });
      process.stdout.write("Use --full for the exact manifest and the diff command with --file for each full preimage and postimage.\n");
    }
  } else if (command === "diff") {
    await changeReview(review, signal);
    print(await diff(review, values.file));
  } else if (command === "host-check") {
    const result = await changeReview(review, signal);
    print({ ...hostCompatibility(), runId: run, manifestDigest: result.scope.manifestDigest, observation: await observation(), targetWrites: 0 });
  } else if (command === "fixture-evaluate") {
    const scenario = values.scenario ?? "decline";
    const fault = values["fixture-fault"];
    if (!["accept", "decline", "cancel", "timeout"].includes(scenario) ||
        fault && (scenario !== "accept" || !["revoke-after-write", "revoke-during-build", "browser"].includes(fault))) {
      stop("invalid-command", "Choose a named fixture-only decision and a supported fault.");
    }
    const result = await runFixture(review, { scenario, signal, fault });
    print(result);
    if (result.status !== "fixture-passed") process.exitCode = signal.aborted ? 130 : 1;
  } else {
    if (values["fixture-fault"] && (!values.recheck || values["fixture-fault"] !== "browser")) stop("invalid-command", "Use the browser fault with --recheck.");
    const journal = await rollback(run);
    const attempt = values.recheck && journal.status === "rolled-back" ?
      await recheck(review, journal, signal, values["fixture-fault"] === "browser", evidenceFor(run)) : null;
    print({ status: attempt && attempt.status !== "passed" ? "recheck-" + attempt.status : journal.status,
      runId: run, proof: journal.proof, attemptId: attempt?.attemptId, attempt, realProjectWrites });
    if (journal.status !== "rolled-back" || attempt && attempt.status !== "passed") process.exitCode = signal.aborted ? 130 : 1;
  }
}

try { await main(); }
catch (error) {
  const code = signal.aborted ? "cancelled" : /^[a-z-]+$/.test(error.code ?? "") ? error.code : "blocked";
  print({ schemaVersion: 1, status: code, message: error.code === code ? error.message : "The V4 command or private evidence failed validation.", realProjectWrites });
  process.exitCode = signal.aborted ? 130 : 1;
} finally {
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
