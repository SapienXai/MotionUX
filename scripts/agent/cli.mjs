import { parseArgs } from "node:util";
import { canonical } from "../../src/brain/indexer.ts";
import { createMotionPlanner } from "../../src/agent/planner.ts";
import { asAgentRequest } from "../../src/agent/validation.ts";
import { inspectProject } from "./inspect.mjs";
import { localBrain } from "./local-brain.mjs";
import { checkReport, human, loadRequest, saveReport } from "./report.mjs";
import { AgentError, limits, motionRoot } from "./workspace.mjs";

const [command, ...args] = process.argv.slice(2);
const json = args.includes("--json");
const controller = new AbortController();
const cancel = () => controller.abort();
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
process.chdir(motionRoot);

const option = { type: "string" };
const toggle = { type: "boolean" };
const inspect = { project: option, route: option, file: option };
const plan = { ...inspect, goal: option, request: option, output: option, check: option };
const commands = { inspect, plan, doctor: {}, evaluate: {}, benchmark: {} };
const print = data => process.stdout.write(canonical(data) + "\n");
const usage = [
  "MotionUX Agent V1 · read-only route inspection and motion planning",
  "npm run agent:inspect -- --project ./fixtures/agent/booking-demo --route /bookings/confirmation --json",
  'npm run agent:plan -- --project ./fixtures/agent/booking-demo --route /bookings/confirmation --goal "Calm confirmed-booking feedback" --json',
  "npm run agent:plan -- --request ./fixtures/agent/requests/booking-confirmation.json",
  "npm run agent:doctor   npm run agent:evaluate   npm run agent:benchmark   npm run test:agent",
  "Choose --route or --file. Output defaults to text. Use --markdown or --json for alternate formats.",
  "For plan only, --output accepts a private reports path and --check accepts a prior JSON report there.",
].join("\n") + "\n";

function abortIfNeeded() {
  if (controller.signal.aborted) throw new AgentError("cancelled", "Agent was cancelled.");
}

async function main() {
  if (!command || command === "--help") { process.stdout.write(usage); return; }
  if (!Object.hasOwn(commands, command)) throw new AgentError("invalid-command", "Use inspect, plan, doctor, evaluate or benchmark.");
  let flags;
  try {
    flags = parseArgs({ args, strict: true, allowPositionals: false,
      options: { ...commands[command], json: toggle, markdown: toggle, help: toggle } }).values;
  } catch {
    throw new AgentError("invalid-flags", "Unsupported or incomplete options. Run the command with --help.");
  }
  if (flags.help) { process.stdout.write(usage); return; }
  if (flags.json && flags.markdown || flags.output && flags.check) throw new AgentError("invalid-flags", "Choose one output mode and one report action.");
  if (command === "doctor") {
    const opened = await localBrain();
    const status = opened.invalidIndex || opened.staleIds?.length || opened.indexPresent && opened.unindexed ? "stale-index"
      : opened.index.environment === "prepared" ? "prepared" : "not-prepared";
    print({ schemaVersion: 1, mode: "read-only", limits, status,
      indexFingerprint: opened.index.environment === "prepared" ? opened.index.indexFingerprint : null,
      indexed: opened.index.records.length, staleRecords: opened.staleIds?.length ?? 0, node: process.version });
    return;
  }
  if (command === "evaluate") {
    const { evaluate } = await import("./evaluate.mjs");
    const result = await evaluate();
    print(result);
    if (result.failed) process.exitCode = 1;
    return;
  }
  if (command === "benchmark") {
    const { benchmark } = await import("./benchmark.mjs");
    print(await benchmark());
    return;
  }
  if (flags.request && [flags.project, flags.route, flags.file, flags.goal].some(Boolean)) {
    throw new AgentError("invalid-flags", "Choose a request file or explicit project, route/file and goal.");
  }
  if (!flags.request && (!flags.project || command === "plan" && !flags.goal)) {
    throw new AgentError("missing-input", "Supply --project and a route/file, with --goal for planning.");
  }
  const request = flags.request ? await loadRequest(flags.request) : asAgentRequest({
    schemaVersion: 1, project: flags.project,
    ...(flags.route !== undefined && { route: flags.route }),
    ...(flags.file !== undefined && { file: flags.file.replace(/^\.\//, "") }),
    goal: flags.goal ?? "Inspect the selected route",
  });
  const { context, dependencies, root } = await inspectProject(request, { signal: controller.signal });
  abortIfNeeded();
  let result = context;
  if (command === "plan") {
    const opened = await localBrain();
    abortIfNeeded();
    result = createMotionPlanner(opened.index, opened)(request, context, dependencies);
    if (flags.check) {
      const freshness = await checkReport(flags.check, result, root);
      print(freshness);
      if (freshness.status !== "current") process.exitCode = 1;
      return;
    }
    if (flags.output) await saveReport(flags.output, result, root, controller.signal);
  }
  if (flags.json) print(result);
  else process.stdout.write(human(result, flags.markdown ? "markdown" : "text"));
}

try { await main(); }
catch (error) {
  const known = error instanceof AgentError;
  const status = known ? error.code : "invalid-input";
  const message = known ? error.message : "Agent could not validate this input or inspect the selected data. Run with --help.";
  if (json) print({ schemaVersion: 1, status, message });
  else process.stderr.write(message + "\n");
  process.exitCode = status === "cancelled" ? 130 : 1;
} finally {
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
