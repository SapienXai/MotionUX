import { compareIds } from "./indexer.ts";
import { normalize, policySignals, tokens, translate } from "./taxonomy.ts";
import { asRequest } from "./validation.ts";
import { semanticKeys, supportKeys, type BrainIndex, type BrainRequest, type BrainResult, type Candidate, type Claim,
  type Decision, type Match, type Profile, type Requirements, type Score, type Signals, type Support } from "./contracts.ts";

import { interpretMotion } from "./polarity.ts";

const scoreKey = { intents: "intent", patterns: "pattern", motions: "motion", triggers: "trigger", useCases: "useCase" } as const;
const weights = { intents: 32, patterns: 24, motions: 14, triggers: 7, useCases: 20 } as const;
const costOrder = { low: 1, moderate: 2, high: 3 } as const;
const proposalOrigin = "http://127.0.0.1:5199";
const fallback = "Open the links with the local Studio running. Each claim is scoped to its evidence.";
const policySupport: [string, Support][] = [
  ["physical", "physical-mobile"], ["keyboard", "keyboard"], ["touch", "touch-emulated"],
  ["screenReader", "screen-reader"], ["reduced", "reduced-motion"], ["rtl", "rtl"],
];

function resolveRequirements(request: BrainRequest, policy: ReadonlySet<string>) {
  const required: Requirements = { ...request.require };
  const naturalFormat = {
    react: /\b(?:react only|react required|only react|sadece react|yalnizca react|react sart)\b/,
    "html-iframe": /\b(?:html iframe only|standalone html required|html only|sadece html|yalnizca html)\b/,
  } as const;
  const text = normalize(request.query);
  const formats = Object.entries(naturalFormat).filter(([, expression]) => expression.test(text)).map(([value]) => value as "react" | "html-iframe");
  let conflict = formats.length > 1;
  if (formats.length === 1) {
    conflict ||= Boolean(required.integrationKind && !required.integrationKind.includes(formats[0]));
    required.integrationKind = formats;
  }
  const support = new Set(required.support);
  for (const [flag, capability] of policySupport) if (policy.has(flag)) support.add(capability);
  if (support.size) required.support = [...support].sort(compareIds);
  if (policy.has("lowCost")) required.maxPerformanceCost = "low";
  if (policy.has("native")) {
    conflict ||= required.nativeProps === false;
    required.nativeProps = true;
  }
  conflict ||= Boolean(required.nativeProps && required.integrationKind?.every(kind => kind === "html-iframe"));
  return { required, conflict };
}

function verified<T>(claim: Claim<T>) { return claim.status === "verified" && claim.value !== null; }

export function exclusions(item: Profile, required: Requirements) {
  const reasons: string[] = [];
  if (required.integrationKind && !required.integrationKind.includes(item.integrationKind)) reasons.push("integration-kind");
  for (const field of required.support ?? []) {
    const claim = item.support[field];
    if (claim.status === "unsupported") reasons.push("unsupported:" + field);
    else if (!verified(claim) || claim.value !== true) reasons.push("unverified:" + field);
  }
  if (required.nativeProps !== undefined && (item.behavior.nativeProps.value !== required.nativeProps ||
    !["verified", "observed", "unsupported"].includes(item.behavior.nativeProps.status))) reasons.push("native-props");
  if (required.evidenceStatus === "verified" && !verified(item.behavior.sampledMotion)) reasons.push("no-verified-behavior");
  if (required.evidenceStatus === "curated" && !item.curated) reasons.push("no-curated-profile");
  if (required.evidenceStatus === "observed" && !item.curated && item.semantic.motions.status !== "observed" &&
    !verified(item.behavior.sampledMotion)) reasons.push("no-observed-semantics");
  if (required.allowedDependencies && Object.keys(item.dependencies).some(name => !required.allowedDependencies!.includes(name))) reasons.push("dependency-not-allowed");
  if (required.dependencyPins && Object.entries(required.dependencyPins).some(([name, version]) =>
    Object.hasOwn(item.dependencies, name) && item.dependencies[name] !== version)) reasons.push("dependency-pin-conflict");
  if (required.maxPerformanceCost) {
    const cost = item.performance.measuredCost;
    if (!verified(cost)) reasons.push("unverified-performance");
    else if (cost.value && costOrder[cost.value] > costOrder[required.maxPerformanceCost]) reasons.push("measured-performance-budget");
  }
  if (required.maxPreviewUnits !== undefined && (item.performance.schedulerUnits.value === null ||
    item.performance.schedulerUnits.value > required.maxPreviewUnits)) reasons.push("studio-preview-budget");
  if (required.intent?.some(value => !item.semantic.intents.value?.includes(value))) reasons.push("required-intent");
  if (required.pattern?.some(value => !item.semantic.patterns.value?.includes(value))) reasons.push("required-pattern");
  return reasons;
}

function missing(item: Profile) {
  const fields = supportKeys.filter(field => item.support[field].status !== "verified" &&
    item.support[field].status !== "unsupported").map(field => "support." + field);
  for (const [field, claim] of Object.entries(item.semantic)) if (claim.status === "unknown") fields.push("semantic." + field);
  if (!verified(item.performance.measuredCost)) fields.push("performance.measuredCost");
  if (!verified(item.behavior.sampledMotion)) fields.push("behavior.sampledMotion");
  for (const key of ["clientBoundary", "nativeProps", "previewAt390"] as const) {
    if (item.behavior[key].status === "unknown") fields.push("behavior." + key);
  }
  return fields.sort(compareIds);
}

export function createBrain(index: BrainIndex, { staleIds = [], invalidIndex = false }: { staleIds?: Iterable<string>; invalidIndex?: boolean } = {}) {
  const stale = new Set(staleIds);
  const records = index.records.map(record => ({ record, keywords: tokens(record.title + " " + record.category + " " + record.id) }));
  const byId = new Map(index.records.map(record => [record.id, record]));
  return {
    inspect(id: string) {
      const profile = byId.get(id);
      if (!profile) return { status: "not-found", profile: null };
      if (invalidIndex || stale.has(id)) return { status: "recheck-required", profile: null };
      return { status: "indexed", profile, unknowns: missing(profile), localStudioRequired: true };
    },
    query(mode: BrainResult["mode"], input: unknown): BrainResult {
      const request = asRequest(input);
      const intentPolicy = interpretMotion(request.query, [request.context?.screen, request.context?.state].filter(Boolean).join(" "), normalize);
      const policy = policySignals(intentPolicy.query);
      if (!policySignals(intentPolicy.policyText).has("fraud")) policy.delete("fraud");
      const signals = translate(intentPolicy.query);
      const { required, conflict } = resolveRequirements(request, policy);
      const filtered: Record<string, number> = {};
      function outcome(decision: Decision, explanation: string[], candidates: Candidate[] = []): BrainResult {
        return {
          schemaVersion: 1, algorithmVersion: 1, mode, decision, indexFingerprint: index.indexFingerprint, candidates,
          explanation, unknowns: [...new Set(candidates.flatMap(item => item.unknowns))].sort(compareIds),
          filteredReasons: Object.fromEntries(Object.entries(filtered).sort(([a], [b]) => compareIds(a, b))),
          signals, tieBreaker: "id-ascending", requirements: required,
        };
      }
      if (invalidIndex) return outcome("stale-index", ["The catalog evidence or rules changed. Run npm run brain:index to recheck."]);
      if (mode === "recommend" && (intentPolicy.polarity === "still" || request.context?.motionPolicy === "still" || policy.has("fraud"))) {
        return outcome("no-motion", policy.has("fraud")
          ? ["Reflect the application's authoritative pending, error or settled state immediately. A timer or animation cannot establish success.", "Verify that premature success never appears."]
          : ["Use an immediate state update with a readable label and stable focus.", "Verify keyboard and reduced-motion behavior on the target screen."]);
      }
      if (mode === "recommend" && intentPolicy.polarity === "unclear") {
        return outcome("need-more-context", ["Identify the selected interaction and whether it should animate. Conflicting, reported or unrelated requests do not authorize an installation."]);
      }
      if (conflict) {
        filtered["conflicting-requirements"] = 1;
        return outcome("no-suitable-component", ["The required formats or native React props are incompatible. Choose a coherent integration format."]);
      }
      if (index.environment === "not-prepared") return outcome("not-prepared", ["Prepare Studio using docs/DEVELOPER-GUIDE.md and run npm run brain:index."]);
      const hasIntent = semanticKeys.some(key => signals[key].length) || Boolean(required.intent?.length || required.pattern?.length ||
        request.prefer?.intent?.length || request.prefer?.pattern?.length);
      if (mode === "recommend" && !hasIntent) {
        return outcome("need-more-context", ["Describe the interaction or visible state the product needs, such as disclosure, input or progress."]);
      }
      const queryWords = tokens(intentPolicy.query);
      const intent = [...new Set([...signals.intents, ...required.intent ?? [], ...request.prefer?.intent ?? []])];
      const pattern = [...new Set([...signals.patterns, ...required.pattern ?? [], ...request.prefer?.pattern ?? []])];
      const desired = { ...signals, intents: intent, patterns: pattern };
      const results: Candidate[] = [];
      for (const { record, keywords } of records) {
        const reasons = stale.has(record.id) ? ["stale-source-or-evidence"] : exclusions(record, required);
        const intents = record.semantic.intents.value ?? [];
        if (mode === "recommend" && request.context?.state === "pending" &&
          !intents.some(value => value === "communicate-progress" || value === "loading-placeholder")) reasons.push("app-state-pending");
        if (mode === "recommend" && request.context?.state === "error" && !intents.includes("communicate-error")) reasons.push("app-state-error");
        if (reasons.length) {
          for (const reason of reasons) filtered[reason] = (filtered[reason] ?? 0) + 1;
          continue;
        }
        const ranked = score(record, desired, queryWords, keywords, request, required);
        const purposeful = ranked.scoreBreakdown.intent + ranked.scoreBreakdown.pattern;
        const semanticMatch = purposeful + ranked.scoreBreakdown.motion + ranked.scoreBreakdown.trigger + ranked.scoreBreakdown.useCase;
        if (mode === "recommend" ? purposeful === 0 : semanticMatch === 0 && ranked.scoreBreakdown.lexical === 0) continue;
        results.push(ranked);
      }
      results.sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
      const shortlist = results.slice(0, request.maxResults ?? 5);
      if (shortlist.length === 0) return outcome(stale.size && stale.size === records.length ? "stale-index" : "no-suitable-component",
        ["No evidence-backed result matches the intent and all required constraints.", "See filteredReasons for the failed gates."]);
      const explanation = [mode === "recommend" ? "Required constraints passed before ranking by evidence-backed intent and pattern."
        : "Discovery combines semantically supported matches and separately weighted title or category tokens.", fallback];
      if (request.context?.state === "pending" || desired.intents.some(value => value === "confirm-action" || value === "communicate-error")) {
        explanation.push("Connect feedback to application-owned state. The example cannot confirm a booking, payment or other external outcome.");
      }
      return outcome("candidates", explanation, shortlist);
    },
  };
}

function score(item: Profile, desired: Signals, queryWords: Set<string>, keywords: Set<string>, request: BrainRequest, required: Requirements): Candidate {
  const scoreBreakdown: Score = { intent: 0, pattern: 0, motion: 0, trigger: 0, useCase: 0, evidence: 0, platform: 0, preference: 0, lexical: 0, cost: 0 };
  const matches: Match[] = [];
  if (item.behavior.sampledMotion.status === "verified") scoreBreakdown.evidence = 10;
  else if (item.curated) scoreBreakdown.evidence = 4;
  for (const key of semanticKeys) {
    const claim = item.semantic[key];
    const values = (claim.value ?? []).filter(value => desired[key].includes(value));
    scoreBreakdown[scoreKey[key]] = Math.min(values.length, 2) * weights[key];
    for (const value of values) matches.push({ field: key, value, status: claim.status, evidence: claim.evidence });
  }
  if (item.behavior.sampledMotion.status === "verified") matches.push({ field: "behavior.sampledMotion", value: "sampled motion",
    status: "verified", evidence: item.behavior.sampledMotion.evidence });
  const show = (field: string, claim: Claim<unknown>) => {
    if (claim.value !== null) matches.push({ field, value: String(claim.value), status: claim.status, evidence: claim.evidence });
  };
  for (const key of required.support ?? []) show("support." + key, item.support[key]);
  if (required.nativeProps !== undefined) show("behavior.nativeProps", item.behavior.nativeProps);
  if (required.maxPerformanceCost) show("performance.measuredCost", item.performance.measuredCost);
  if (required.maxPreviewUnits !== undefined) show("performance.schedulerUnits", item.performance.schedulerUnits);
  scoreBreakdown.lexical = Math.min(9, [...queryWords].filter(word => word.length > 2 && keywords.has(word)).length * 3);
  const mobile = request.context?.platform === "mobile" || desired.qualifiers.includes("mobile");
  if (mobile && verified(item.behavior.previewAt390)) scoreBreakdown.platform = item.behavior.previewAt390.value?.overflowPx === 0 ? 6 : -10;
  if (mobile && verified(item.support["touch-emulated"])) scoreBreakdown.platform += 6;
  const preference = request.prefer;
  if (preference?.integrationKind?.includes(item.integrationKind)) scoreBreakdown.preference += 5;
  if (preference?.intensity && item.semantic.intensity.value === preference.intensity) scoreBreakdown.preference += 5;
  if (preference?.support) scoreBreakdown.preference += preference.support.filter(key => verified(item.support[key])).length * 5;
  if (preference?.performanceCost && verified(item.performance.measuredCost) && item.performance.measuredCost.value === preference.performanceCost) scoreBreakdown.cost += 8;
  if ((mobile || preference?.performanceCost === "low") && item.performance.schedulerUnits.value === 3) scoreBreakdown.cost -= 3;
  const disclosures = ["Local Studio must be running to open the preview or package."];
  if (item.semantic.notes.value) disclosures.push(item.semantic.notes.value);
  if (mobile && item.behavior.previewAt390.value?.overflowPx) disclosures.push("The original demo overflowed horizontally within its frame at 390 CSS px.");
  if (item.integrationKind === "html-iframe") disclosures.push("Standalone HTML runs in an iframe host. Native React props apply to the host boundary.");
  if (item.performance.schedulerUnits.value === 3) disclosures.push("Heavy Studio scheduling class. Device CPU and GPU budget remain separately measured.");
  return {
    id: item.id, title: item.title, provider: item.provider, integrationKind: item.integrationKind, sourceURL: item.source.sourceURL,
    demoURL: item.source.demoURL, upstreamCommit: item.source.upstreamCommit, upstreamHash: item.source.upstreamHash,
    studioURL: proposalOrigin + item.source.studioPath, installURL: proposalOrigin + item.source.registryPath,
    score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0), scoreBreakdown, matches, unknowns: missing(item),
    avoidWhen: item.semantic.avoidWhen.value ?? [], disclosures,
  };
}
