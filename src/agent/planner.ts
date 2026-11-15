import { createRequire } from "node:module";
import { createBrain } from "../brain/ranker.ts";
import { normalize, translate } from "../brain/taxonomy.ts";
import { asResult } from "../brain/validation.ts";
import type { BrainIndex, BrainRequest, BrainResult, Candidate, Profile } from "../brain/contracts.ts";
import type { AgentRequest, DependencyWarning, MotionPlan, ProjectContext, Recommendation } from "./contracts.ts";
import { fingerprint } from "./context.ts";
import { asAgentRequest, asPlan } from "./validation.ts";

const semver: { validRange: (range: string) => string | null; intersects: (a: string, b: string) => boolean } =
  createRequire(import.meta.url)("semver");
const sensitive = /\b(?:sk-[a-z\d_-]{10,}|gh[pousr]_[a-z\d]{10,}|AKIA[A-Z0-9]{16}|(?:bearer|password|api[_ -]?key|token)\s*[:=]\s*[^\s,;]+)\b/gi;
const location = /(?:\/(?:Users|home|private|var\/folders)\/|[A-Za-z]:\\)[^\s"'<>]+/g;
const stateIsAuthoritative = (owner: string) => owner === "server" || owner === "api";

function isCritical(goal: string, context: ProjectContext) {
  const text = normalize(goal + " " + (context.target.route ?? "") + " " + (context.target.source ?? ""));
  return /\b(?:booking|bookings|reservation|rezervasyon\w*|payment|payments|checkout|odeme\w*|auth|login|sign in|oturum\w*)\b/.test(text);
}

export function translateRequest(input: AgentRequest, context: ProjectContext) {
  const choice = input.requirements;
  const wording = normalize(input.goal);
  const asksForOutcome = /\b(?:confirmed booking|confirmed reservation|payment success|payment settled|rezervasyon\w* tamamland\w*|odeme\w* onay\w*)\b/.test(wording);
  const signal = translate(input.goal);
  const authoritative = context.stateOwnership.some(row => row.phase === "success" && stateIsAuthoritative(row.owner));
  const protectOutcome = isCritical(input.goal, context) && !authoritative &&
    (signal.intents.includes("confirm-action") || asksForOutcome || choice?.state === "success");
  const targetState = choice?.state ?? "unknown";
  const brain: BrainRequest = {
    schemaVersion: 1, query: input.goal,
    context: {
      screen: (context.target.route ?? context.target.source ?? "Selected screen").slice(0, 140),
      platform: choice?.platform ?? "web", businessStateOwner: authoritative ? "application" : "unknown",
      motionPolicy: protectOutcome || choice?.motion === "still" ? "still" : choice?.motion ?? "unknown",
      state: targetState === "success" && !authoritative ? "unknown" : targetState,
    },
    require: {
      ...(choice?.support?.length && { support: choice.support }),
      ...(choice?.integrationKind && { integrationKind: [choice.integrationKind] }),
      ...(choice?.nativeProps !== undefined && { nativeProps: choice.nativeProps }),
      ...(choice?.maxPerformanceCost && { maxPerformanceCost: choice.maxPerformanceCost }),
    },
    prefer: { integrationKind: ["react"], intensity: "subtle", ...(asksForOutcome && authoritative && { intent: ["confirm-action"] }) },
    maxResults: choice?.maxRecommendations ?? 3,
  };
  return { brain, protectOutcome };
}

function dependencyWarnings(profile: Profile, deps: ReadonlyMap<string, { value: string }>): DependencyWarning[] {
  return Object.entries(profile.dependencies).flatMap(([name, required]): DependencyWarning[] => {
    const declared = deps.get(name)?.value ?? null;
    if (declared === null) return [{ name, required, declared, status: "missing" }];
    const known = semver.validRange(declared) && semver.validRange(required);
    if (known && !semver.intersects(declared, required)) return [{ name, required, declared, status: "incompatible" }];
    if (declared !== required) return [{ name, required, declared, status: "conditional" }];
    return [];
  });
}

function needReferences(context: ProjectContext, brain: BrainResult | null) {
  const intents = brain?.signals.intents ?? [];
  const patterns = brain?.signals.patterns ?? [];
  const prefer = new Set<string>();
  if (intents.includes("confirm-action") || intents.includes("communicate-progress")) {
    for (const row of context.stateOwnership) for (const ref of row.evidence) prefer.add(ref);
  }
  if (intents.includes("communicate-error")) ["aria-invalid", "alert", "onSubmit", "form"].forEach(key => prefer.add(key));
  if (intents.includes("reveal-detail")) ["disclosure", "disclosure-trigger", "aria-expanded"].forEach(key => prefer.add(key));
  if (patterns.includes("tabs")) ["tab", "tablist", "onKeyDown"].forEach(key => prefer.add(key));
  if (intents.includes("collect-input")) ["select", "onChange", "slider"].forEach(key => prefer.add(key));
  const relevant = [...prefer].filter(id => id.startsWith("ref-"));
  for (const fact of context.observations) if (prefer.has(fact.code)) relevant.push(...fact.evidence);
  return [...new Set(relevant)].slice(0, 10);
}

function recommendation(candidate: Candidate, profile: Profile, context: ProjectContext, needs: string[],
    deps: ReadonlyMap<string, { value: string; evidence: string }>): Recommendation {
  const warnings = dependencyWarnings(profile, deps);
  const iframe = candidate.integrationKind === "html-iframe";
  const reviewStatus = warnings.some(item => item.status === "incompatible") ? "incompatible"
    : warnings.length || iframe || !needs.length ? "conditional" : "proposed";
  const dependencyEvidence = warnings.length ? [...new Set([
    ...context.observations.filter(item => item.code === "declared-dependency-group").flatMap(item => item.evidence),
    ...warnings.flatMap(item => {
      const id = deps.get(item.name)?.evidence;
      return id && context.evidence.some(ref => ref.id === id) ? [id] : [];
    }),
  ])].slice(0, 12) : [];
  return {
    sourceId: candidate.id, title: candidate.title, provider: candidate.provider,
    sourcePin: { commit: candidate.upstreamCommit, sha256: candidate.upstreamHash },
    sourceURL: candidate.sourceURL, studioURL: candidate.studioURL, installKind: candidate.integrationKind,
    score: candidate.score, scoreBreakdown: candidate.scoreBreakdown, why: candidate.matches, observedTargetNeed: needs,
    requiredIntegrationWork: [
      "Review the pinned source and existing interaction before choosing an adapter. Preserve the app's labels, tokens and provider physics.",
      ...(iframe ? ["Keep the HTML specimen isolated in its host. Define a titled, sandboxed frame, sizing and a reviewed message contract. Native React props do not reach its internal DOM."] :
        ["Place interaction glue at the existing client boundary. Adapt only props confirmed by the pinned Usage and preserve the current server boundary."]),
      "Pass product-owned status into feedback. The wrapper must never write booking, payment or auth outcomes.",
      ...(warnings.length ? ["Resolve the declared dependency ranges in an isolated consumer before considering installation."] : []),
      ...(profile.source.assets.length ? ["Verify the pinned asset paths and notices in the separate consumer before integrating."] : []),
      ...(!needs.length ? ["Locate the requested interaction in source with the product owner before wiring this catalog candidate."] : []),
    ],
    dependencyWarnings: warnings, dependencyEvidence,
    a11yRisk: [
      "Review focus continuity, keyboard activation, reduced motion and screen reader announcements on the target.",
      ...(profile.behavior.previewAt390.value?.overflowPx ? ["The sampled source preview overflowed at 390 CSS px. Check the target before adoption."] : []),
      ...(iframe ? ["Verify focus entry and exit, announcement scope, frame title and keyboard escape between host and frame."] : []),
    ],
    performanceRisk: [
      "Measure the target's long tasks, frame timing and memory through repeat interactions.",
      ...(profile.performance.graphics.value ? ["The source uses a graphics surface. Compare device CPU/GPU and cleanup against the existing screen."] : []),
      ...(iframe ? ["Measure frame startup, resize and teardown independently in a narrow viewport."] : []),
    ],
    unknownEvidence: candidate.unknowns, avoidWhen: candidate.avoidWhen, reviewStatus,
  };
}

function proposedChecks(context: ProjectContext, decision: MotionPlan["decision"], iframe: boolean): MotionPlan["testPlan"] {
  if (!context.target.source || !["no-motion", "candidates"].includes(decision)) return [];
  const error = context.observations.some(row => row.code === "aria-invalid");
  const disclosure = context.observations.some(row => row.code === "disclosure");
  const product = context.stateOwnership.some(row => stateIsAuthoritative(row.owner)) || /payment|booking|checkout|auth/.test(context.target.route ?? "");
  const checks: [string, string[]][] = [
    ["keyboard-focus", [disclosure ? "Tab to the summary. Use Enter and Space to open and close it, then confirm focus remains on the trigger." :
      "Tab and Shift+Tab through the existing controls. Activate with Enter and Space where appropriate and confirm predictable focus."]],
    ["touch-pointer-responsive", ["At 320px and 390px, tap and click each trigger near an edge. Check overflow, readable labels and normal scrolling.",
      "Use a physical device for device acceptance and record its model and browser."]],
    ["reduced-motion", [decision === "no-motion" ? "Exercise the update with both motion preferences. Verify immediate feedback and stable focus in each." :
      "Enable reduced motion. Repeat the action and confirm the same feedback is readable without spatial movement."]],
    ["screen-reader-manual", [error ? "Submit an invalid form with a screen reader. Verify the field error is announced once and tied to the input." :
      "With a screen reader, exercise the status/control. Confirm its name, current state and a single relevant announcement."]],
    ["interruption-errors", [product ? "Exercise pending, confirmed, failed and cancelled app responses. Rapidly retry and interrupt navigation. Success appears only for the real confirmation." :
      "Repeat the trigger in quick succession, cancel or navigate away, and confirm the older response never overwrites the current interaction."]],
    ["localization", ["Check long Turkish and English labels at narrow widths. Where RTL is supported, verify layout direction and physical vs logical navigation."]],
  ];
  if (decision === "candidates") checks.push(["performance", ["Collect CPU, RSS and frame timing before and after the proposed change using the same screen and action.", "Repeat mount/unmount and check cleanup."]]);
  if (iframe) checks.push(["iframe-boundary", ["Verify host/frame focus and message origin checks. Test blocked navigation, responsive height and frame teardown."]]);
  return checks.map(([check, steps]) => ({ status: "proposed", check, steps }));
}

type CatalogStatus = { staleIds?: Iterable<string>; invalidIndex?: boolean; unindexed?: number; indexPresent?: boolean };
export function createMotionPlanner(index: BrainIndex, catalog: CatalogStatus = {}) {
  const staleIds = [...catalog.staleIds ?? []];
  const engine = createBrain(index, { ...catalog, staleIds });
  const stale = Boolean(catalog.invalidIndex || catalog.unindexed && catalog.indexPresent || staleIds.length);
  return function plan(input: unknown, context: ProjectContext, deps = new Map<string, { value: string; evidence: string }>()): MotionPlan {
    const request = asAgentRequest(input);
    const { brain, protectOutcome } = translateRequest(request, context);
    let decision: MotionPlan["decision"] = "need-more-context";
    let match: BrainResult | null = null;
    let rationale: string[];
    if (context.status === "partial-inspection") {
      rationale = ["The selected route was only partially inspected. Resolve the named coverage issues or select a narrower screen file."];
    } else if (context.status === "need-more-context") {
      rationale = [context.choices.length ? "Several source files match. Choose an exact file." : "Supply an exact route or the workspace-relative screen file."];
    } else if (stale) {
      decision = "stale-index";
      rationale = ["Brain evidence or source pins changed. Run npm run brain:index in MotionUX and repeat the plan."];
    } else if (index.environment === "not-prepared") {
      decision = "not-prepared";
      rationale = ["Prepare the local Studio catalog and run npm run brain:index. Project inspection is available independently."];
    } else {
      match = asResult(engine.query("recommend", brain));
      decision = match.decision;
      rationale = [...match.explanation];
    }
    if (protectOutcome && decision === "no-motion") {
      rationale.unshift("The selected screen has no trace to an authoritative completed outcome. Display only the state supplied by the application and keep feedback immediate.");
    }
    if (decision === "no-motion" && context.observations.some(row => row.code === "aria-invalid")) {
      rationale.unshift("Render the existing inline error immediately and keep the field's invalid and description associations.");
    }
    const needs = needReferences(context, match);
    const recommendations = (match?.candidates ?? []).flatMap(item => {
      const checked = engine.inspect(item.id).profile;
      return checked ? [recommendation(item, checked, context, needs, deps)] : [];
    });
    const path = context.target.source;
    const addressed = new Map<string, string[]>();
    for (const id of needs) {
      const ref = context.evidence.find(row => row.id === id);
      if (ref) addressed.set(ref.path, [...addressed.get(ref.path) ?? [], id]);
    }
    if (path && !addressed.has(path)) {
      const anchor = context.evidence.find(ref => ref.path === path);
      addressed.set(path, anchor ? [anchor.id] : []);
    }
    const proposed = decision === "candidates" || decision === "no-motion";
    const authorities = new Set(context.stateOwnership.filter(row => row.owner === "server").map(row => row.evidence[0]));
    const integrationPlan = proposed ? [...addressed].map(([path, evidence]) => ({
      path, evidence, proposal: evidence.some(id => authorities.has(id))
        ? "Use this server result as the authority reference. Keep this business logic outside the presentation change."
        : decision === "no-motion" ? "Retain the existing control and use an immediate state update with readable text and stable focus."
          : "Review this render location. Keep the current state owner and pass its existing status to presentation-only glue at the client boundary.",
    })) : [];
    const unresolved = [...context.unknowns, ...context.target.coverage.issues.map(item => item.reason),
      ...Object.keys(match?.filteredReasons ?? {}), ...recommendations.flatMap(item => item.unknownEvidence)].slice(0, 80);
    const body = {
      schemaVersion: 1, status: context.status === "inspected" ? "planned" : context.status, decision, mode: "read-only",
      goal: request.goal.replace(sensitive, "[redacted]").replace(location, "[local-path]"),
      target: context.target, projectFingerprint: context.target.projectFingerprint, context,
      brain: { algorithmVersion: index.algorithmVersion, indexFingerprint: index.environment === "not-prepared" ? null : index.indexFingerprint,
        sourceFingerprint: index.environment === "not-prepared" ? null : index.sourceFingerprint, taxonomyVersion: index.taxonomyVersion,
        decision: match?.decision ?? (context.status === "inspected" ? decision : null),
        requirements: match?.requirements ?? brain.require ?? {}, filteredReasons: match?.filteredReasons ?? {} },
      evidence: context.evidence, recommendations, unresolved: [...new Set(unresolved)], rationale, integrationPlan,
      testPlan: proposedChecks(context, decision, recommendations.some(item => item.installKind === "html-iframe")),
      rollbackPlan: proposed ? ["Capture the selected route and its interaction files before a separately authorized change.",
        "For a future rollback, restore the touched files, remove introduced source/assets and restore the prior dependency manifest and lockfile. Rerun the original flow."] : [],
      safety: { targetReadOnly: true, targetFilesWritten: 0, noExecution: true, noNetwork: true, noAppAccess: true },
    } satisfies Omit<MotionPlan, "planFingerprint">;
    return asPlan({ ...body, planFingerprint: fingerprint(body) });
  };
}
