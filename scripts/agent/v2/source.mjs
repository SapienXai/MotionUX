import { resolve } from "node:path";
import { createRequire } from "node:module";
import { canonical } from "../../../src/brain/indexer.ts";
import { createMotionPlanner } from "../../../src/agent/planner.ts";
import { asPlan } from "../../../src/agent/validation.ts";
import { inspectProject } from "../inspect.mjs";
import { localBrain } from "../local-brain.mjs";
import { loadRequest } from "../report.mjs";
import { loadCatalog } from "../../studio/catalog.mjs";
import { file, fixturePath, readJSON, repo, seed, stop, vault } from "./files.mjs";

const semver = createRequire(import.meta.url)("semver");
export const sourceId = "kokonut-promise-toast";
export const route = "/bookings/confirmation";
export const screen = "src/app/(stay)/bookings/confirmation/page.tsx";
export const client = "src/ui/booking-receipt.tsx";
export const originalRoot = "originals/" + sourceId;
export const notice = originalRoot + "/LICENSE.txt";
export const entryPath = originalRoot + "/components/kokonutui/promise-toast.tsx";
export const allowedPackageFiles = [notice, entryPath, originalRoot + "/demos/example.tsx", originalRoot + "/lib/utils.ts", originalRoot + "/upstream.css"].sort();
export const defaultRequest = "fixtures/agent/requests/booking-confirmation.json";

export function gatePlan(plan, id) {
  if (plan.decision !== "candidates" || plan.status !== "planned" || plan.context.status !== "inspected") {
    stop("blocked", "The V1 decision does not authorize any integration.");
  }
  const choice = plan.recommendations.find(item => item.sourceId === id);
  if (!choice) stop("blocked", "Explicitly choose a source listed in the V1 plan.");
  if (choice.installKind !== "react") stop("unsupported-in-v2", "The fixture recipe only supports native React.");
  if (choice.reviewStatus === "incompatible") stop("blocked", "Declared dependency ranges are incompatible.");
  if (id !== sourceId || plan.target.route !== route || plan.target.source !== screen || plan.target.sourceKind !== "app-router" ||
      !plan.context.stateOwnership.some(row => row.phase === "success" && row.owner === "server" && row.evidence.length) ||
      !choice.why.some(row => row.field === "intents" && row.value === "confirm-action" && row.evidence.length)) {
    stop("unsupported-in-v2", "This exact source, route and authoritative booking state need a reviewed fixture adapter.");
  }
  return choice;
}

function reportPath(path) {
  if (!/^(?:\.\/)?\.motionux-v9\/agent\/reports\/[a-z0-9][a-z0-9._-]{0,93}\.json$/.test(path ?? "") || path.includes("..")) {
    stop("invalid-plan", "Select a V1 JSON report under .motionux-v9/agent/reports.");
  }
  return resolve(repo, path);
}

export async function verifiedSource({ planPath, requestPath, choiceId }, signal) {
  let plan;
  try { plan = asPlan(await readJSON(reportPath(planPath))); }
  catch { stop("invalid-plan", "A valid private Agent V1 report is required."); }
  const choice = gatePlan(plan, choiceId);
  const request = await loadRequest(requestPath);
  if (resolve(repo, request.project) !== seed || request.route !== route || request.file) stop("blocked", "V2 only uses the reviewed booking fixture.");
  const inspected = await inspectProject(request, { signal });
  if (inspected.root !== seed) stop("blocked", "V2 only accepts the canonical source fixture.");
  const opened = await localBrain();
  const fresh = createMotionPlanner(opened.index, opened)(request, inspected.context, inspected.dependencies);
  if (fresh.decision === "stale-index" || fresh.planFingerprint !== plan.planFingerprint) {
    stop("stale", "V1 plan, source evidence or fixture changed. Generate a fresh V1 plan.");
  }
  const profile = opened.index.records.find(item => item.id === choiceId);
  const original = (await loadCatalog()).get(choiceId);
  if (!profile || original?.availability !== "ready" || original.upstreamCommit !== choice.sourcePin.commit ||
      original.upstreamHash !== choice.sourcePin.sha256 || original.sourceURL !== choice.sourceURL || profile.source.notice !== notice ||
      original.entry !== entryPath || original.format === "html") stop("stale", "The ready source no longer matches the reviewed pin.");
  const registry = await file(original.installRecipe);
  if (registry?.sha256 !== profile.source.registryHash) stop("stale", "Registry digest differs from the Brain pin.");
  const payload = JSON.parse(registry.content.toString("utf8"));
  if (payload.name !== choiceId || payload.registryDependencies?.length || payload.css || payload.cssVars ||
      canonical(payload.files.map(row => row.target).sort()) !== canonical(allowedPackageFiles) ||
      profile.source.assets.length || canonical(payload.dependencies) !== canonical(Object.entries(profile.dependencies)
        .sort(([a], [b]) => a < b ? -1 : Number(a > b)).map(([name, pin]) => name + "@" + pin))) {
    stop("unsupported-in-v2", "The registry items or declared effects exceed this reviewed recipe.");
  }
  const code = [];
  const files = new Map();
  for (const row of payload.files) {
    const pinned = profile.source.code.find(item => item.path === row.target);
    const root = resolve(vault, "runtime", original.group);
    if (row.type !== "registry:file" || row.path !== row.target || typeof row.content !== "string" || !pinned) {
      stop("unsupported-in-v2", "Unexpected file mapping in the local registry.");
    }
    const upstream = await file(fixturePath(resolve(root, "original"), row.target));
    const installed = await file(fixturePath(resolve(root, "installed"), row.target));
    if (!upstream || !installed || upstream.sha256 !== pinned.sha256 || installed.sha256 !== pinned.installedSHA256 ||
        !installed.content.equals(Buffer.from(row.content))) stop("stale", "An original or installed payload differs from the approved pin.");
    const expected = row.target === entryPath
      ? upstream.content.toString("utf8").replace('from "@/lib/utils"', 'from "../../lib/utils"')
      : upstream.content.toString("utf8");
    if (expected !== row.content) stop("unsupported-in-v2", "A provider file contains unreviewed adaptation.");
    files.set(row.target, installed.content);
    code.push({ path: row.target, upstream: upstream.sha256, installed: installed.sha256,
      adaptation: installed.sha256 === upstream.sha256 ? "identical" : "relative-utils-import" });
  }
  if (!files.get(notice).toString("utf8").startsWith("MIT License")) stop("blocked", "The reviewed MIT notice does not match.");
  const appConfig = await readJSON(resolve(seed, "components.json"));
  if (appConfig.aliases?.ui !== "@/ui" || appConfig.tailwind?.css !== "src/app/globals.css" || !appConfig.rsc || !appConfig.tsx) {
    stop("blocked", "Fixture shadcn targets changed.");
  }
  return { plan, files, dependencies: profile.dependencies, source: {
    id: choiceId, provider: choice.provider, format: "react", url: choice.sourceURL,
    commit: choice.sourcePin.commit, upstream: choice.sourcePin.sha256, registry: registry.sha256, notice, license: "MIT",
    code: code.sort((a, b) => a.path < b.path ? -1 : Number(a.path > b.path)),
    evidence: choice.why.flatMap(row => row.evidence.map(ref => ref.locator)).sort(), v1ReviewStatus: choice.reviewStatus,
    selectionRank: plan.recommendations.indexOf(choice) + 1,
  } };
}

export function manifests(before, dependencies) {
  if (before.scripts || before.overrides || before.workspaces || !before.private || before.name !== "motionux-fictional-booking" ||
      Object.keys(before).some(key => !["name", "private", "dependencies", "devDependencies"].includes(key))) {
    stop("blocked", "Unexpected package configuration in the reviewed fixture.");
  }
  const extra = { tailwindcss: "4.3.0", "@tailwindcss/postcss": "4.3.0", postcss: "8.5.16", typescript: "5.9.3", "@types/node": "24.19.2" };
  const after = structuredClone(before);
  const changes = [];
  for (const [name, version] of Object.entries({ ...dependencies, ...extra }).sort()) {
    const group = name.startsWith("@types/") || Object.hasOwn(extra, name) ? "devDependencies" : "dependencies";
    const previous = before[group][name] ?? null;
    if (!semver.validRange(version) || previous && (!semver.validRange(previous) || !semver.intersects(previous, version))) {
      stop("blocked", "A package range is incompatible with the fixture.");
    }
    if (version !== previous) changes.push({ name, before: previous, after: version, group });
    after[group][name] = version;
  }
  return { after, changes };
}
