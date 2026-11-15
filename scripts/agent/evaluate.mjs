import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import scenarios from "../../fixtures/agent/scenarios.v1.json" with { type: "json" };
import { booking, bookingGoal, empty, index, react } from "../../fixtures/agent/models.mjs";
import { createMotionPlanner } from "../../src/agent/planner.ts";
import { inspectProject } from "./inspect.mjs";
import { motionRoot } from "./workspace.mjs";

const planners = { ready: createMotionPlanner(index), empty: createMotionPlanner(empty),
  stale: createMotionPlanner(index, { staleIds: [index.records[0].id] }) };

export async function evaluate() {
  assert.equal(scenarios.schemaVersion, 1);
  assert.ok(scenarios.cases.length >= 20);
  assert.equal(new Set(scenarios.cases.map(row => row.id)).size, scenarios.cases.length);
  const rows = [];
  const inspections = new Map();
  for (const scenario of scenarios.cases) {
    const { route, file, goal = bookingGoal, requirements, expect } = scenario;
    const project = scenario.project === "react" ? react : booking;
    const input = { schemaVersion: 1, project, ...(route !== null && { route }), ...(file && { file }), goal, ...(requirements && { requirements }) };
    const key = JSON.stringify([project, route, file]);
    if (!inspections.has(key)) inspections.set(key, await inspectProject(input));
    const { context, dependencies } = inspections.get(key);
    const plan = scenario.operation === "plan" ? planners[scenario.catalog ?? "ready"](input, context, dependencies) : null;
    const result = plan ?? context;
    const actual = plan?.decision ?? result.status;
    const failures = [];
    function check(name, condition) {
      if (!condition) failures.push(name);
    }
    check("expected status", actual === scenario.status);
    const { target, observations, files, stateOwnership } = context;
    const first = plan?.recommendations[0];
    if (Object.hasOwn(expect, "source")) check("specific source", target.source === expect.source);
    if (expect.sourceKind) check("source kind", target.sourceKind === expect.sourceKind);
    if (expect.routeTemplate) check("route template", target.route === expect.routeTemplate);
    if (expect.dynamicSegments) check("dynamic segments", JSON.stringify(target.dynamicSegments) === JSON.stringify(expect.dynamicSegments));
    if (expect.layouts) check("layout chain", target.layouts.length === expect.layouts);
    if (expect.includes) check("inspected import", expect.includes.every(path => files.some(row => row.path === path)));
    if (expect.framework) check("framework dependencies", JSON.stringify(Object.values(target.framework)) === JSON.stringify(expect.framework));
    if (Object.hasOwn(expect, "files")) check("read scope", files.length === expect.files);
    if (expect.fact) check("observed fact", observations.some(row => [row.kind, row.code, row.value].every((v, i) => v === expect.fact[i]) && row.evidence.length));
    if (expect.owner) check("state owner", stateOwnership.some(row => row.phase === "success" && row.owner === expect.owner));
    if (expect.ownership) check("state ownership", Object.entries(expect.ownership).every(([phase, owner]) =>
      stateOwnership.some(row => row.phase === phase && row.owner === owner)));
    if (expect.cite) {
      const [phase, path, needle] = expect.cite;
      const refs = stateOwnership.find(row => row.phase === phase).evidence;
      const citation = context.evidence.find(row => row.path === path && refs.includes(row.id));
      const lines = (await readFile(resolve(motionRoot, project, path), "utf8")).split(/\r?\n/);
      check("true source span", citation && lines.slice(citation.startLine - 1, citation.endLine).join("\n").includes(needle));
    }
    if (expect.first) check("first candidate", first?.sourceId === expect.first);
    if (expect.kind) check("source format", first?.installKind === expect.kind);
    if (expect.filter) check("explained hard filter", plan?.brain.filteredReasons[expect.filter] > 0);
    if (expect.support) check("preserved hard requirement", plan?.brain.requirements.support?.includes(expect.support));
    if (expect.absentSupport) check("platform is context", !plan?.brain.requirements.support?.includes(expect.absentSupport));
    if (expect.max) check("bounded shortlist", plan?.recommendations.length <= expect.max);
    if (expect.planFile) check("actionable target", plan?.integrationPlan.some(row => row.path === expect.planFile && row.evidence.length));
    if (expect.proposed) check("proposed tests", plan?.testPlan.some(row => row.check === expect.proposed && row.status === "proposed"));
    if (expect.warning) check("dependency status", plan?.recommendations.find(row => row.sourceId === expect.warning[0])?.dependencyWarnings
      .some(row => row.name === expect.warning[1] && row.status === expect.warning[2]));
    if (expect.redacts) check("redacted data", expect.redacts.every(item => !JSON.stringify(result).includes(item)));
    if (plan) {
      check("read-only proposal", plan.safety.targetFilesWritten === 0 && plan.testPlan.every(row => row.status === "proposed"));
      check("no fallback", plan.decision === "candidates" || !plan.recommendations.length);
      check("exact source pin", plan.recommendations.every(item => {
        const profile = index.records.find(row => row.id === item.sourceId);
        return profile && profile.source.upstreamHash === item.sourcePin.sha256 && item.why.some(claim =>
          claim.evidence.length && claim.evidence.every(ref => ref.sourcePinOrHash === item.sourcePin.sha256));
      }));
    }
    rows.push({ id: scenario.id, actual, expected: scenario.status, passed: !failures.length, failures });
  }
  return { schemaVersion: 1, catalog: "synthetic fixture evidence", cases: rows.length, passed: rows.filter(row => row.passed).length,
    failed: rows.filter(row => !row.passed).length, rows };
}
