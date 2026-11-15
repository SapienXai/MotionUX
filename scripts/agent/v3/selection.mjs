import { resolve } from "node:path";
import { inspectProject } from "../inspect.mjs";
import { localBrain } from "../local-brain.mjs";
import { createMotionPlanner } from "../../../src/agent/planner.ts";
import { canonical } from "../../../src/brain/indexer.ts";
import { loadCatalog } from "../../studio/catalog.mjs";
import { file, fixturePath, readJSON, stop, vault } from "../v2/files.mjs";
import { adapterFor } from "../../../src/agent/integration/v3/adapters.ts";
import { sourceFixture } from "./workspace.mjs";
import semver from "semver";

export function sourceGate(plan, adapter, profile, request, manifest) {
  if (plan.status !== "planned" || plan.context.status !== "inspected") stop("partial-inspection", "The selected screen has incomplete coverage.");
  if (plan.decision !== "candidates") stop(plan.decision, "The current Brain decision blocks installation.");
  if (!profile) stop("adapter-unavailable", "Choose a reviewed original from the plan.");
  if (profile.integrationKind !== "react") stop("incompatible", "This runner requires a native React original.");
  for (const name of ["react", "react-dom"]) {
    if (!semver.satisfies(manifest.dependencies[name], profile.dependencies[name] ?? "")) {
      stop("incompatible", "The installed host React pin conflicts with the source.");
    }
  }
  if (!adapter || plan.target.source !== adapter.screen) stop("adapter-unavailable", "No reviewed adapter matches this screen and original.");
  if (profile.source.notice !== adapter.notice) stop("license-review-required", "The source notice does not match the reviewed license.");
  if (profile.behavior.install.status !== "verified" && !adapter.legacyComparison || profile.behavior.sampledMotion.status !== "verified" ||
      !["observed", "verified"].includes(profile.behavior.nativeProps.status) ||
      request.requirements.support?.some(key => profile.support[key].status !== "verified")) {
    stop("evidence-required", "Required source or interaction evidence is missing.");
  }
  const choice = plan.recommendations.find(row => row.sourceId === profile.id);
  if (!choice?.why.some(match => match.field === "patterns" && adapter.patterns.includes(match.value) && match.evidence.length) ||
      choice.reviewStatus === "incompatible") stop("no-suitable-component", "The fresh plan has no compatible evidence-backed match.");
  return choice;
}
export async function planFor(request, manifest, signal) {
  const project = sourceFixture(request.fixture);
  const agent = { schemaVersion: 1, project, ...(request.route ? { route: request.route } : { file: request.file }),
    goal: request.goal, requirements: { ...request.requirements, integrationKind: "react", maxRecommendations: 5 } };
  const found = await inspectProject(agent, { signal });
  if (found.root !== project || request.file && found.context.target.source !== request.file) stop("partial-inspection", "The selected route and file do not match.");
  const local = await localBrain();
  if (local.invalidIndex || local.artifactMismatches?.length || local.staleIds?.length || local.unindexed ||
      local.index.environment !== "prepared") stop("stale-index", "Prepare or refresh the Brain index first.");
  const plan = createMotionPlanner(local.index, local)(agent, found.context, found.dependencies);
  if (plan.decision !== "candidates") return { plan, brainFingerprint: local.index.indexFingerprint };
  const profile = local.index.records.find(row => row.id === request.source);
  const adapter = adapterFor(request);
  const choice = sourceGate(plan, adapter, profile, request, manifest);
  return { plan, profile, choice, adapter, brainFingerprint: local.index.indexFingerprint };
}

function allowImportAdaptation(original, installed) {
  if (original === installed) return "identical";
  const moduleSpecifiers = /((?:from\s*|import\s*)["'])([^"'\n]+)(["'])/g;
  const omitPaths = text => text.replace(moduleSpecifiers, "$1<path>$3");
  if (omitPaths(original) !== omitPaths(installed)) stop("incompatible", "A source file changed beyond import paths.");
  return "import-path";
}

export async function pinnedSource({ profile, choice, adapter }) {
  const row = (await loadCatalog()).get(profile.id);
  const pin = profile.source;
  if (!row || row.sourceKind !== "react" || row.availability !== "ready" || row.upstreamCommit !== choice.sourcePin.commit ||
      row.upstreamHash !== choice.sourcePin.sha256 || row.upstreamHash !== pin.upstreamHash ||
      row.sourceURL !== pin.sourceURL || row.licenseNoticePath !== adapter.notice || !row.upstreamCommit) {
    stop("stale-source", "The catalog identity differs from the reviewed native original.");
  }
  const registry = await file(row.installRecipe);
  if (registry?.sha256 !== pin.registryHash) stop("stale-source", "The private registry hash does not match.");
  const evidence = new Set(choice.why.flatMap(row => row.evidence.map(proof => proof.locator)));
  if (adapter.legacyComparison && profile.behavior.install.status !== "verified") {
    const report = await readJSON(resolve(vault, "evidence/v10/report.json"));
    const comparison = report.comparisons.find(sample => sample.id === profile.id);
    if (comparison?.sourceHash !== pin.upstreamHash || comparison.registryHash !== pin.registryHash ||
        !comparison.interactionSampled || !comparison.statesMatch ||
        !comparison.lanes.some(lane => lane.type === "installed" && lane.visible)) {
      stop("evidence-required", "The previous independent consumer evidence is unavailable or stale.");
    }
    evidence.add("evidence/v10/report.json#comparisons/" + profile.id);
  }
  const payload = JSON.parse(registry.content);
  if (payload.name !== profile.id || payload.css || payload.cssVars || payload.registryDependencies?.length ||
      canonical([...payload.dependencies].sort()) !== canonical(Object.entries(profile.dependencies).map(([name, version]) => name + "@" + version).sort())) {
    stop("incompatible", "The registry contains an unreviewed dependency or styling effect.");
  }
  const files = new Map();
  const code = [];
  const runtime = resolve(vault, "runtime", row.group);
  for (const path of [adapter.notice, ...adapter.files, ...adapter.styles]) {
    const fromRegistry = payload.files.find(value => value.target === path);
    const expected = pin.code.find(value => value.path === path);
    const original = await file(fixturePath(resolve(runtime, "original"), path));
    const installed = await file(fixturePath(resolve(runtime, "installed"), path));
    if (fromRegistry?.type !== "registry:file" || fromRegistry.path !== path || typeof fromRegistry.content !== "string" ||
        !expected || original?.sha256 !== expected.sha256 || installed?.sha256 !== expected.installedSHA256 ||
        !installed.content.equals(Buffer.from(fromRegistry.content))) stop("stale-source", "A pinned original or installed file differs.");
    const adaptation = allowImportAdaptation(original.content.toString(), installed.content.toString());
    if (!adapter.files.includes(path) && adaptation !== "identical") stop("stale-source", "The notice or stylesheet changed.");
    files.set(path, installed.content);
    code.push({ path, original: original.sha256, installed: installed.sha256, adaptation });
  }
  if (!files.get(adapter.notice).toString().startsWith(adapter.license + " License")) stop("license-review-required", "Review the source notice before installing.");
  return { files, source: { id: profile.id, commit: row.upstreamCommit, location: row.sourceURL, upstream: row.upstreamHash,
    registry: registry.sha256, license: adapter.license, notice: adapter.notice, props: adapter.props,
    evidence: [...evidence], code } };
}
