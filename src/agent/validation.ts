import Ajv2020 from "ajv/dist/2020.js";
import requestSchema from "../../schemas/agent/request.v1.json" with { type: "json" };
import contextSchema from "../../schemas/agent/context.v1.json" with { type: "json" };
import planSchema from "../../schemas/agent/plan.v1.json" with { type: "json" };
import brainRequest from "../../schemas/brain/request.v1.json" with { type: "json" };
import brainResult from "../../schemas/brain/result.v1.json" with { type: "json" };
import type { AgentRequest, MotionPlan, ProjectContext } from "./contracts.ts";
import { fingerprint, projectFingerprint } from "./context.ts";

const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allErrors: false });
ajv.addSchema(brainRequest).addSchema(brainResult);
const request = ajv.compile<AgentRequest>(requestSchema);
const context = ajv.compile<ProjectContext>(contextSchema);
const plan = ajv.compile<MotionPlan>(planSchema);

export function asAgentRequest(input: unknown): AgentRequest {
  if (!request(input)) throw new Error("Invalid Agent request at " + (request.errors?.[0]?.instancePath || "root"));
  if (!input.goal.trim() || !input.project.trim() || /[\x00-\x1f\x7f]/.test(input.goal)) throw new Error("Supply a single-line interaction goal and explicit project.");
  return input;
}

export function asContext(input: unknown): ProjectContext {
  if (!context(input)) throw new Error("Invalid Agent context at " + (context.errors?.[0]?.instancePath || "root"));
  const files = new Map(input.files.map(file => [file.path, file]));
  const ids = new Set(input.evidence.map(ref => ref.id));
  const refs = [...input.observations, ...input.stateOwnership];
  if (input.files.length !== files.size || input.evidence.length !== ids.size ||
      new Set(input.stateOwnership.map(row => row.phase)).size !== 4 ||
      input.target.coverage.filesRead !== files.size || input.target.coverage.bytesRead !== input.files.reduce((total, file) => total + file.bytes, 0) ||
      projectFingerprint(input.files) !== input.target.projectFingerprint ||
      (input.status === "inspected" && (!input.target.source || input.target.coverage.issues.length)) ||
      (input.status === "partial-inspection" && !input.target.coverage.issues.length) ||
      [input.target.source, ...input.target.layouts].some(path => path && !files.has(path)) ||
      input.evidence.some(ref => ref.sha256 !== files.get(ref.path)?.hash || ref.endLine < ref.startLine ||
        ref.id !== "ref-" + fingerprint([ref.path, ref.startLine, ref.endLine, ref.sha256]).slice(0, 16)) ||
      refs.some(row => row.evidence.some(id => !ids.has(id)) || row.status === "observed" && !row.evidence.length)) {
    throw new Error("Agent context evidence or fingerprint does not match inspected files.");
  }
  return input;
}

export function asPlan(input: unknown): MotionPlan {
  if (!plan(input)) throw new Error("Invalid Agent plan at " + (plan.errors?.[0]?.instancePath || "root"));
  const inspected = asContext(input.context);
  const ids = new Set(inspected.evidence.map(ref => ref.id));
  const { planFingerprint, ...body } = input;
  if (fingerprint(body) !== planFingerprint || input.projectFingerprint !== inspected.target.projectFingerprint ||
      fingerprint(input.target) !== fingerprint(inspected.target) || fingerprint(input.evidence) !== fingerprint(inspected.evidence) ||
      input.decision !== "candidates" && input.recommendations.length || input.decision === "candidates" && !input.recommendations.length ||
      input.recommendations.some(row => [...row.observedTargetNeed, ...row.dependencyEvidence].some(id => !ids.has(id)) ||
        row.why.some(claim => claim.evidence.some(ref => ref.sourcePinOrHash !== row.sourcePin.sha256))) ||
      input.integrationPlan.some(row => !inspected.files.some(file => file.path === row.path) || row.evidence.some(id => !ids.has(id)))) {
    throw new Error("Agent plan evidence, decision or fingerprint does not match.");
  }
  return input;
}
