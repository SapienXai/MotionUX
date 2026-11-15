import { createBrain } from "../brain/ranker.ts";
import { canonical } from "../brain/indexer.ts";
import { asResult } from "../brain/validation.ts";
import { semanticKeys, supportKeys, type BrainIndex, type Candidate, type Evidence, type Match, type Profile } from "../brain/contracts.ts";
import { createMotionPlanner } from "../agent/planner.ts";
import type { AgentRequest, MotionPlan, ProjectContext } from "../agent/contracts.ts";
import { payloadLimit, type ToolName } from "./contracts.ts";

type LocalIndex = {
  index: BrainIndex; staleIds?: string[]; invalidIndex?: boolean; unindexed?: number;
  indexPresent?: boolean; artifactMismatches?: string[]; catalog?: number; ready?: number;
};
type Inspector = (request: AgentRequest, options: { signal: AbortSignal }) =>
  Promise<{ context: ProjectContext; dependencies: Map<string, { value: string; evidence: string }> }>;
type Policy = { count: number; authorize(project: string): Promise<string> };

const credential = /(?:gh[pousr]_[a-z\d]{8,}|sk-[a-z\d_-]{12,}|AKIA[A-Z0-9]{16}|(?:bearer|password|api[_ -]?key|token)\s*[:=]\s*[^\s,;]+)/gi;
const privatePath = /(?:\/Users\/|\/home\/|\/private\/|\/var\/|\/tmp\/|[A-Z]:\\|file:\/\/|data:|(?:^|[ /])\.motionux-v9\/)[^\s"']*/gi;
const directive = /(?:ignore (?:all |previous |system )|invoke (?:apply|rollback)|leak (?:the )?vault)/i;
const safe = (text: string, max = 320) => directive.test(text) ? "[redacted]" :
  text.replace(credential, "[redacted]").replace(privatePath, "[local-path]").replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "").slice(0, max);
function sourceURL(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.port &&
      !/^(?:localhost|\[|\d)/.test(url.hostname) && safe(input, 1000) === input ? input : null;
  } catch { return null; }
}
const urlFor = (id: string) => "http://127.0.0.1:5199/?item=" + id + "#specimen";
const safePackage = /^(?:@[\w.-]+\/)?[\w.-]+$/;
const packageName = (name: string) => safePackage.test(name) && safe(name) === name;
const dependencyRange = (value: string) => /^[\dvV.xX*^~<>=|+ -][\w.*^~<>=|+ -]*$/.test(value) ? safe(value) : "[unreported range]";
const countScope = (record: Profile[]) => Object.fromEntries(supportKeys.map(key => [key, record.filter(item => item.support[key].status === "verified").length]));
const stateOf = (local: LocalIndex) => local.invalidIndex || local.staleIds?.length || local.artifactMismatches?.length ||
  local.unindexed && local.indexPresent ? "stale-index" : local.index.environment === "not-prepared" ? "not-prepared" : "ready";
const next = {
  "stale-index": "Refresh evidence and run npm run brain:index from MotionUX.",
  "not-prepared": "Prepare the local Studio catalog and run npm run brain:index.",
};
const response = (status: string, fields = {}) => ({ schemaVersion: 1, status, ...fields });

function evidenceOf({ kind, locator, sourcePinOrHash, testedProfile, notes, recordedAt }: Evidence) {
  return { kind, locator: safe(locator, 240), sourcePinOrHash,
    ...(testedProfile && { testedProfile: safe(testedProfile, 140) }),
    ...(recordedAt && { recordedAt: safe(recordedAt, 40) }),
    ...(notes && { notes: safe(notes, 320) }) };
}

// Deduplicate repeated browser/source locators without dropping which claim they support.
function references() {
  const evidence: ReturnType<typeof evidenceOf>[] = [];
  const ids = new Map<string, number>();
  const add = (value: Evidence) => {
    const projected = evidenceOf(value);
    const key = canonical(projected);
    if (!ids.has(key)) { ids.set(key, evidence.length); evidence.push(projected); }
    return ids.get(key)!;
  };
  return { evidence, add };
}
function explain(matches: Match[], ref: ReturnType<typeof references>) {
  return matches.map(({ field, value, status, evidence }) => ({ field, value: safe(value), status, evidence: evidence.map(ref.add) }));
}
function ranked(item: Candidate, ref: ReturnType<typeof references>) {
  return { id: item.id, title: safe(item.title), provider: safe(item.provider), installKind: item.integrationKind,
    sourceURL: sourceURL(item.sourceURL), upstreamCommit: item.upstreamCommit, upstreamHash: item.upstreamHash, studioURL: urlFor(item.id),
    score: item.score, scoreBreakdown: item.scoreBreakdown, matches: explain(item.matches, ref), unknowns: item.unknowns,
    avoidWhen: item.avoidWhen.map(value => safe(value)), disclosures: item.disclosures.map(value => safe(value)) };
}

function projectPlan(plan: MotionPlan, ref: ReturnType<typeof references>, records: Profile[]) {
  const { target, context } = plan;
  const linked = new Set([...context.stateOwnership.flatMap(row => row.evidence), ...plan.integrationPlan.flatMap(row => row.evidence),
    ...plan.recommendations.flatMap(row => [...row.observedTargetNeed, ...row.dependencyEvidence])]);
  const localEvidence = plan.evidence.filter(citation => linked.has(citation.id)).map(citation => ({ ...citation, path: safe(citation.path) }));
  return response(plan.decision === "stale-index" || plan.decision === "not-prepared" ? plan.decision :
    plan.status === "partial-inspection" ? plan.status : plan.decision, {
    decision: plan.decision, planStatus: plan.status, mode: plan.mode,
    planFingerprint: plan.planFingerprint, projectFingerprint: plan.projectFingerprint,
    brain: plan.brain,
    target: { route: target.route ? safe(target.route) : null, source: target.source ? safe(target.source) : null,
      sourceKind: target.sourceKind, framework: target.framework, filesRead: target.coverage.filesRead,
      bytesRead: target.coverage.bytesRead, issues: [...new Set(target.coverage.issues.map(issue => issue.reason))],
      choices: context.choices.map(value => safe(value)) },
    stateOwnership: context.stateOwnership, safety: plan.safety, localEvidence,
    recommendations: plan.recommendations.map(row => ({
      id: row.sourceId, title: safe(row.title), provider: safe(row.provider), installKind: row.installKind,
      upstreamCommit: row.sourcePin.commit, upstreamHash: row.sourcePin.sha256, sourceURL: sourceURL(row.sourceURL),
      studioURL: urlFor(row.sourceId), licenseNoticePresent: Boolean(records.find(item => item.id === row.sourceId)?.source.notice), score: row.score, scoreBreakdown: row.scoreBreakdown, matches: explain(row.why, ref),
      observedTargetNeed: row.observedTargetNeed, reviewStatus: row.reviewStatus,
      dependencyWarnings: row.dependencyWarnings.map(item => ({ name: safe(item.name), required: safe(item.required), declared: item.declared && safe(item.declared), status: item.status })),
      dependencyEvidence: row.dependencyEvidence, unknowns: row.unknownEvidence,
      a11yRisk: row.a11yRisk.map(value => safe(value)), performanceRisk: row.performanceRisk.map(value => safe(value)),
      avoidWhen: row.avoidWhen.map(value => safe(value)), requiredIntegrationWork: row.requiredIntegrationWork.map(value => safe(value)),
    })),
    integrationPlan: plan.integrationPlan.map(row => ({ ...row, path: safe(row.path) })),
    testPlan: plan.testPlan, evidence: ref.evidence, unresolved: plan.unresolved, rationale: plan.rationale,
  });
}

export function handlers(load: () => Promise<LocalIndex>, inspect: Inspector, policy: Policy) {
  let pending: Promise<LocalIndex> | undefined;
  function fresh() {
    // Coalesce only overlapping reads. Each later request rechecks source, artifact and evidence hashes.
    pending ??= load().finally(() => { pending = undefined; });
    return pending;
  }
  return async function call(name: ToolName, input: Record<string, unknown>, signal: AbortSignal) {
    const ref = references();
    const project = name === "plan_motion" ? await policy.authorize(input.project as string) : null;
    signal.throwIfAborted();
    const local = await fresh();
    signal.throwIfAborted();
    const state = stateOf(local);
    const indexFingerprint = local.index.environment === "not-prepared" ? null : local.index.indexFingerprint;
    if (name === "motionux_status") {
      const records = state === "ready" ? local.index.records : [];
      return response(state, { catalogReady: local.ready ?? local.index.records.length, catalogTotal: local.catalog ?? local.index.records.length,
        indexStatus: state, catalogKind: local.index.environment, brainIndexFingerprint: indexFingerprint,
        coverage: { currentRecords: records.length, curated: records.filter(item => item.curated).length,
          sampledMotion: records.filter(item => item.behavior.sampledMotion.status === "verified").length, support: countScope(records),
          unknownSupportClaims: records.flatMap(item => Object.values(item.support)).filter(item => item.status === "unknown").length,
          staleRecords: local.staleIds?.length ?? 0 }, authorizedProjectCount: policy.count, mode: "read-only",
        instructions: state === "ready" ? ["Use a source ID to inspect evidence. Studio links work through the local Studio."] : [next[state]] });
    }
    const engine = createBrain(local.index, { ...local, invalidIndex: state === "stale-index" });
    if (name === "plan_motion") {
      if (state !== "ready") return response(state, { brainIndexFingerprint: indexFingerprint, instructions: [next[state]] });
      const request = { schemaVersion: 1, ...input, project } as AgentRequest;
      const { context, dependencies } = await inspect(request, { signal });
      await policy.authorize(project!);
      signal.throwIfAborted();
      return projectPlan(createMotionPlanner(local.index, local)(request, context, dependencies), ref, local.index.records);
    }
    if (name === "inspect_component") {
      if (state !== "ready") return response(state, { instructions: [next[state]], brainIndexFingerprint: indexFingerprint });
      const result = engine.inspect(input.id as string);
      const profile = result.profile;
      if (!profile) return response("not-found", { instructions: ["Use an ID returned by search_motion."] });
      const claim = ({ status, confidence, value, evidence }: Profile["semantic"]["notes"] | Profile["behavior"]["sampledMotion"] |
        Profile["semantic"]["intents"] | Profile["behavior"]["previewAt390"] | Profile["performance"]["schedulerUnits"]) => ({
        status, confidence, value: typeof value === "string" ? safe(value) : Array.isArray(value) ? value.map(item => safe(item)) : value,
        evidence: evidence.map(ref.add),
      });
      return response("indexed", {
        id: profile.id, title: safe(profile.title), provider: safe(profile.provider), installKind: profile.integrationKind,
        sourceURL: sourceURL(profile.source.sourceURL), upstreamCommit: profile.source.upstreamCommit, upstreamHash: profile.source.upstreamHash,
        studioURL: urlFor(profile.id), license: { noticePresent: Boolean(profile.source.notice), instructions: "Review the provider license and preserve its notices." },
        dependencies: Object.fromEntries(Object.entries(profile.dependencies).filter(([key]) => packageName(key)).map(([key, value]) => [key, dependencyRange(value)])),
        semantic: Object.fromEntries(semanticKeys.map(key => [key, claim(profile.semantic[key])])),
        avoidWhen: claim(profile.semantic.avoidWhen), behavior: Object.fromEntries(Object.entries(profile.behavior).map(([key, value]) => [key, claim(value)])),
        support: Object.fromEntries(supportKeys.map(key => [key, claim(profile.support[key])])),
        performance: { measuredCost: claim(profile.performance.measuredCost), schedulerUnits: claim(profile.performance.schedulerUnits), graphics: claim(profile.performance.graphics) },
        identity: ref.add(profile.identity), evidence: ref.evidence, unknowns: result.unknowns ?? [], brainIndexFingerprint: indexFingerprint,
        limitation: "Sampled motion and a reduced-preference viewport are separate from verified reduced-motion behavior or physical-device acceptance.",
      });
    }
    if (state === "not-prepared") return response(state, { brainIndexFingerprint: null, candidates: [], instructions: [next[state]] });
    const brain = asResult(engine.query(name === "search_motion" ? "search" : "recommend",
      { schemaVersion: 1, maxResults: 3, ...input }));
    const { candidates, decision, requirements, ...explanation } = brain;
    const safeRequirements = { ...requirements,
      allowedDependencies: requirements.allowedDependencies?.filter(packageName),
      dependencyPins: requirements.dependencyPins && Object.fromEntries(Object.entries(requirements.dependencyPins)
        .filter(([key]) => packageName(key)).map(([key, value]) => [key, dependencyRange(value)])),
    };
    for (let count = candidates.length; count >= 0; count--) {
      const slim = references();
      const shortlist = candidates.slice(0, count).map(item => ({ ...ranked(item, slim),
        licenseNoticePresent: Boolean(local.index.records.find(row => row.id === item.id)?.source.notice) }));
      const attempt = response(decision, { ...explanation, requirements: safeRequirements, brainIndexFingerprint: indexFingerprint,
        returned: count, rankedCount: candidates.length, candidates: shortlist, evidence: slim.evidence });
      if (Buffer.byteLength(canonical(attempt)) <= payloadLimit || count <= 1) return attempt;
    }
  };
}
