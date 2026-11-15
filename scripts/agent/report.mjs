import { randomUUID } from "node:crypto";
import { lstat, mkdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { canonical } from "../../src/brain/indexer.ts";
import { asAgentRequest, asPlan } from "../../src/agent/validation.ts";
import { AgentError, motionRoot, readChecked, within } from "./workspace.mjs";

const privateName = /^(?:(?:\.\/)?\.motionux-v9\/agent\/reports\/)([a-z0-9][a-z0-9._-]{0,95}\.(?:json|md))$/;
const requestName = /^(?:\.\/)?(?:fixtures\/agent\/requests|\.motionux-v9\/agent\/requests)\/[a-z0-9][a-z0-9._-]{0,95}\.json$/;
const problem = message => new AgentError("invalid-report", message);
const plain = text => String(text).replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "");

function markdown(text) {
  return plain(text).replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
}
function inline(text) {
  return markdown(text).replace(/[\\`*_{}[\]()!#]/g, char => "\\" + char);
}
export function human(output, style = "text") {
  const escaped = style === "markdown" ? inline : plain;
  const title = output.decision ? "Decision " + output.decision : "Inspection " + output.status;
  const heading = style === "markdown" ? "# " + title : title;
  const context = output.context ?? output;
  const { target } = context;
  const coverage = target.coverage;
  const descriptions = [heading, "", escaped(target.route ?? "Selected file") + (target.source ? " · " + escaped(target.source) : ""),
    target.framework.name + " · " + coverage.filesRead + " files · " + coverage.bytesRead + " bytes · " + coverage.importsTraversed + " local imports"];
  const refs = new Map(context.evidence.map(ref => [ref.id, ref]));
  const cite = id => {
    const ref = refs.get(id);
    return ref ? escaped(ref.path + ":" + ref.startLine + (ref.endLine !== ref.startLine ? "–" + ref.endLine : "")) : "";
  };
  if (target.source) descriptions.push(...context.stateOwnership.map(row => row.phase + " · " + row.owner +
    (row.evidence.length ? " · " + cite(row.evidence.at(-1)) : "")));
  if (context.choices.length) descriptions.push("", "Matching files", ...context.choices.map(path => "- " + escaped(path)));
  if (coverage.issues.length) descriptions.push("", "Coverage limits", ...coverage.issues.map(item => "- " + item.reason + (item.path ? " · " + escaped(item.path) : "")));
  if (output.rationale?.length) descriptions.push("", ...output.rationale.map(line => escaped(line)));
  const filters = Object.entries(output.brain?.filteredReasons ?? {});
  if (output.decision === "no-suitable-component" && filters.length) {
    descriptions.push("Blocking gates " + filters.map(([gate, count]) => escaped(gate) + " (" + count + ")").join(", "));
  }
  const visible = output.recommendations ?? [];
  for (const item of visible) {
    descriptions.push("", "- " + escaped(item.title) + " · " + escaped(item.provider) + " · " + item.reviewStatus + " · " + item.installKind,
      "  " + escaped(item.sourceURL), "  Source SHA-256 " + item.sourcePin.sha256,
      "  Fit " + escaped(item.why.map(match => match.value + " (" + match.status + ")").join(", ")));
    if (item.observedTargetNeed.length) descriptions.push("  Target " + item.observedTargetNeed.slice(0, 3).map(cite).join(", "));
    if (item.dependencyWarnings.length) descriptions.push("  Dependencies " + escaped(item.dependencyWarnings.map(w => w.name + " (" + w.status + ")").join(", ")));
  }
  if (output.integrationPlan?.length) descriptions.push("", "Proposed integration",
    ...output.integrationPlan.map(item => "- " + escaped(item.path) + " · " + escaped(item.proposal)));
  if (output.testPlan?.length) descriptions.push("", "Proposed checks", ...output.testPlan.map(check => "- " + escaped(check.steps[0])));
  if (!output.decision && target.source) {
    const sample = context.observations.filter(row => ["boundary", "interaction", "theme"].includes(row.kind)).slice(0, 10);
    descriptions.push("", "Observed structure", ...sample.map(row => "- " + escaped(row.code) + " · " + cite(row.evidence[0])));
  }
  return descriptions.join("\n") + "\n";
}

export async function loadRequest(path) {
  if (!requestName.test(path)) throw new AgentError("invalid-request", "Use a MotionUX-relative JSON file in fixtures/agent/requests or .motionux-v9/agent/requests.");
  const item = await readChecked(motionRoot, path.replace(/^\.\//, ""), 64 * 1024);
  if (!item.content) throw new AgentError("invalid-request", "The request must be a readable, bounded, non-symlink JSON file.");
  try { return asAgentRequest(JSON.parse(item.content)); }
  catch { throw new AgentError("invalid-request", "Request JSON failed Agent V1 validation."); }
}

function reportPath(path, target) {
  const match = privateName.exec(path);
  if (!match || match[1].includes("..")) throw problem("Use .motionux-v9/agent/reports/<name>.json or <name>.md.");
  const absolute = resolve(motionRoot, ".motionux-v9/agent/reports", match[1]);
  if (within(target, absolute)) throw problem("A report cannot be written within the selected target.");
  return absolute;
}

async function checkFolder(absolute, create) {
  for (const part of [".motionux-v9", ".motionux-v9/agent", ".motionux-v9/agent/reports"]) {
    const path = resolve(motionRoot, part);
    if (create) await mkdir(path, { mode: 0o700 }).catch(error => { if (error.code !== "EEXIST") throw error; });
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(path) !== path) throw problem("Report directory is unsafe.");
  }
  const prior = await lstat(absolute).catch(error => { if (error.code !== "ENOENT") throw error; });
  if (prior && (!prior.isFile() || prior.nlink !== 1 || await realpath(absolute) !== absolute)) throw problem("Report destination is unsafe.");
}

export async function saveReport(path, plan, target, signal) {
  const absolute = reportPath(path, target);
  await checkFolder(absolute, true);
  const temp = resolve(dirname(absolute), ".agent-" + randomUUID());
  try {
    await writeFile(temp, absolute.endsWith(".md") ? human(plan, "markdown") : canonical(plan) + "\n", { flag: "wx", mode: 0o600 });
    await checkFolder(absolute, false);
    if (signal?.aborted) throw new AgentError("cancelled", "Planning was cancelled.");
    await rename(temp, absolute);
  } finally {
    await unlink(temp).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function checkReport(path, current, target) {
  const absolute = reportPath(path, target);
  if (!absolute.endsWith(".json")) throw problem("Freshness checks require a JSON report.");
  try { await checkFolder(absolute, false); }
  catch { throw problem("The previous report directory or destination is unsafe or missing."); }
  const file = await readChecked(motionRoot, absolute.slice(motionRoot.length + 1), 8 * 1024 ** 2);
  let previous;
  try { previous = asPlan(JSON.parse(file.content)); }
  catch { throw problem("The previous report is missing, unsafe or invalid."); }
  return { schemaVersion: 1, status: previous.planFingerprint === current.planFingerprint ? "current" : "stale-report",
    projectChanged: previous.projectFingerprint !== current.projectFingerprint,
    brainChanged: previous.brain.indexFingerprint !== current.brain.indexFingerprint ||
      previous.brain.sourceFingerprint !== current.brain.sourceFingerprint || previous.brain.decision !== current.brain.decision,
    previousFingerprint: previous.planFingerprint, planFingerprint: current.planFingerprint };
}
