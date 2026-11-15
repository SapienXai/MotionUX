import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { booking, bookingGoal, confirm, detailsGoal, index, react } from "../../fixtures/agent/models.mjs";
import { createMotionPlanner } from "../../src/agent/planner.ts";
import { inspectProject } from "./inspect.mjs";
import { localBrain } from "./local-brain.mjs";
import { limits, motionRoot } from "./workspace.mjs";

const run = promisify(execFile);
const milliseconds = list => {
  const values = [...list].sort((a, b) => a - b);
  const pick = rank => Number(values[Math.ceil(values.length * rank) - 1].toFixed(2));
  return { samples: values.length, p50ms: pick(0.5), p95ms: pick(0.95) };
};
const memory = () => {
  const { heapUsed, rss } = process.memoryUsage();
  return { heapMiB: +((heapUsed / 1024 ** 2).toFixed(2)), rssMiB: +((rss / 1024 ** 2).toFixed(2)) };
};
const cli = join(motionRoot, "scripts/agent/cli.mjs");

export async function benchmark() {
  const parent = await mkdtemp(join(await realpath(tmpdir()), "agent-benchmark-"));
  try {
    const project = join(parent, "adversarial");
    await mkdir(project);
    const fanout = Array.from({ length: 80 }, (_, i) => 'import "./section-' + i + '";');
    await Promise.all(fanout.map((_, i) => writeFile(join(project, "section-" + i + ".tsx"),
      i === 4 ? " ".repeat(limits.fileBytes + 1) : 'export default function Section() { return <p />; }')));
    await writeFile(join(project, "screen.tsx"), fanout.join("\n") + "\nexport default function Screen() { return <main />; }");
    const opened = await localBrain();
    const prepared = opened.index.environment === "prepared" && !opened.invalidIndex && !opened.staleIds?.length && !opened.unindexed;
    const planner = prepared ? createMotionPlanner(opened.index, opened) : createMotionPlanner(index);
    const scenarios = [
      ["simple-react", { project: react, route: "/", goal: detailsGoal }],
      ["multi-module-next", { project: booking, route: confirm, goal: bookingGoal }],
      ["adversarial-fanout", { project, file: "screen.tsx", goal: detailsGoal }],
    ];
    const rows = [];
    for (const [size, input] of scenarios) {
      const inspectTimes = [];
      const planTimes = [];
      let result;
      for (let i = -5; i < 30; i++) {
        const start = performance.now();
        const { context, dependencies } = await inspectProject(input);
        const inspected = performance.now();
        result = planner({ schemaVersion: 1, ...input }, context, dependencies);
        if (i < 0) continue;
        inspectTimes.push(inspected - start);
        planTimes.push(performance.now() - start);
      }
      const { coverage } = result.target;
      rows.push({ size, inspect: milliseconds(inspectTimes), inspectAndPlan: milliseconds(planTimes),
        status: result.status, decision: result.decision, coverage: { ...coverage, issues: [...new Set(coverage.issues.map(item => item.reason))] },
        candidates: result.recommendations.length, unknowns: result.unresolved.length, hardFilters: result.brain.filteredReasons, memory: memory() });
    }
    const processes = {};
    for (const command of ["inspect", "plan"]) {
      const samples = [];
      for (let i = -2; i < 12; i++) {
        const start = performance.now();
        const { stdout } = await run(process.execPath, [cli, command, "--project", booking, "--route", confirm,
          ...(command === "plan" ? ["--goal", bookingGoal] : []), "--json"], { cwd: motionRoot });
        const elapsed = performance.now() - start;
        const output = JSON.parse(stdout);
        if (output.status !== (command === "inspect" ? "inspected" : "planned")) throw new Error("Invalid benchmark CLI result");
        if (i >= 0) samples.push(elapsed);
      }
      processes[command] = milliseconds(samples);
    }
    return { schemaVersion: 1, host: { cpu: cpus()[0]?.model, platform: process.platform, arch: process.arch, node: process.version },
      catalog: prepared ? opened.index.records.length + " prepared originals" : "synthetic in-process planning only",
      protocol: "Five warmups and 30 disk-backed iterations per row. End-to-end CLI includes startup, inspection, and local index freshness for plan, with two warmups and 12 processes per command.",
      rows, processes, memory: memory() };
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}
