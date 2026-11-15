import { mkdtemp, rm } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { createRequire } from "node:module";
import approvedSeed from "../../../fixtures/agent/v2/seed.v2.json" with { type: "json" };
import { canonical } from "../../../src/brain/indexer.ts";
import { diffTree, validatePlan, validateRequest } from "../../../src/agent/integration/validation.ts";
import { allowedPackageFiles, client, manifests, sourceId, route, screen, verifiedSource } from "./source.mjs";
import { base, digest, directory, entry, evidenceRoot, file, id, inventory, json, readJSON, recipeRoot, replace, safeId, seed, snapshot, stop, treeHash } from "./files.mjs";
import { npm } from "./process.mjs";

const semver = createRequire(import.meta.url)("semver");
const packagePath = "package.json";
const lockPath = "package-lock.json";
const apiPath = "src/app/api/booking-status/route.ts";
const gluePath = "src/ui/booking-motion.tsx";
const cssPath = "src/app/globals.css";
const layoutPath = "src/app/layout.tsx";
const paths = [...allowedPackageFiles, screen, client, packagePath, lockPath, apiPath, gluePath, cssPath, layoutPath].sort();
const reviewRoot = run => resolve(base, "reviews", safeId(run));
const pretty = value => JSON.stringify(value, null, 2) + "\n";
export const runEvidence = run => resolve(evidenceRoot, safeId(run));
export const managed = run => resolve(base, "workspaces", safeId(run));
export const ticket = review => "approve:" + review.runId + ":" + review.fingerprint;

function validateLock(lock, manifest) {
  const root = lock.packages?.[""];
  if (lock.lockfileVersion !== 3 || root?.name !== manifest.name || Object.keys(lock.packages).length > 500 ||
      canonical(root.dependencies) !== canonical(manifest.dependencies) || canonical(root.devDependencies) !== canonical(manifest.devDependencies)) {
    stop("blocked", "Resolved npm lock does not match the reviewed manifest.");
  }
  for (const [path, record] of Object.entries(lock.packages)) {
    if (!path) continue;
    if (!/^(?:node_modules\/(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+)(?:\/node_modules\/(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+)*$/i.test(path) ||
        path.split("/").some(part => part === ".." || part === ".") || !semver.valid(record.version) || record.link) {
      stop("blocked", "The lock includes an unsupported package source.");
    }
    if (!record.inBundle && (!/^https:\/\/registry\.npmjs\.org\/[A-Za-z0-9@%_./-]+\.tgz$/.test(record.resolved ?? "") ||
        !/^sha(?:512|1)-[A-Za-z0-9+/]+={0,2}$/.test(record.integrity ?? "") || record.resolved.includes(".."))) {
      stop("blocked", "The lock includes an unpinned or non-registry artifact.");
    }
  }
  for (const [name, range] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    const resolved = lock.packages["node_modules/" + name]?.version;
    if (!resolved || !semver.satisfies(resolved, range)) stop("blocked", "Resolved dependency conflicts with a required range.");
  }
}

async function prepare(before, after, run, signal) {
  const root = resolve(base, "scratch");
  await directory(root, true);
  const scratch = await mkdtemp(resolve(root, "packages-"));
  const logs = runEvidence(run);
  const clock = performance.now();
  try {
    await replace(resolve(scratch, packagePath), entry(pretty(after)), null);
    const args = ["install", "--package-lock-only"];
    await npm(args, { cwd: scratch, logs, logName: "preflight-integrated", signal });
    const post = await file(resolve(scratch, lockPath));
    validateLock(JSON.parse(post.content), after);
    const previous = await file(resolve(scratch, packagePath));
    await replace(resolve(scratch, packagePath), entry(pretty(before)), { sha256: previous.sha256, mode: previous.mode });
    await npm(args, { cwd: scratch, logs, logName: "preflight-baseline", signal });
    const pre = await file(resolve(scratch, lockPath));
    validateLock(JSON.parse(pre.content), before);
    return { pre: pre.content, post: post.content, ms: +(performance.now() - clock).toFixed(2) };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

function changeOnce(text, before, after) {
  if (text.split(before).length !== 2) stop("stale", "An exact presentation integration anchor changed.");
  return text.replace(before, after);
}
async function changesFor(original, upstream, lock, manifest) {
  const before = { files: new Map(original.files), dirs: new Map(original.dirs) };
  if (before.files.has(lockPath)) stop("blocked", "The source fixture must use the managed baseline lock.");
  before.files.set(lockPath, entry(lock.pre));
  const after = { files: new Map(before.files), dirs: new Map(before.dirs) };
  const set = (path, content) => {
    after.files.set(path, entry(content, before.files.get(path)?.mode));
    for (let folder = posix.dirname(path); folder !== "." && !after.dirs.has(folder); folder = posix.dirname(folder)) after.dirs.set(folder, 0o700);
  };
  set(packagePath, pretty(manifest));
  set(lockPath, lock.post);
  for (const [path, bytes] of upstream) {
    if (before.files.has(path)) stop("blocked", "A registry destination already exists.");
    set(path, bytes);
  }
  for (const [dest, template] of [[apiPath, "route-handler.txt"], [gluePath, "booking-motion.txt"]]) {
    if (before.files.has(dest)) stop("blocked", "A presentation adapter destination already exists.");
    set(dest, (await file(resolve(recipeRoot, template))).content);
  }
  const routeSource = before.files.get(screen).content.toString("utf8");
  set(screen, changeOnce(routeSource, "<BookingReceipt booking={booking} />",
    '<BookingReceipt key={reference ?? "demonstration"} booking={booking} reference={reference ?? "demonstration"} />'));
  let receipt = before.files.get(client).content.toString("utf8");
  receipt = changeOnce(receipt, 'import type { Booking } from "@/lib/booking-ledger";',
    'import type { Booking } from "@/lib/booking-ledger";\nimport { BookingMotion } from "./booking-motion";');
  receipt = changeOnce(receipt, "({ booking }: { booking: Booking }) {", "({ booking, reference }: { booking: Booking; reference?: string }) {\n  const [latest, setLatest] = useState<Booking | null>(null);\n  const currentBooking = latest ?? booking;");
  receipt = receipt.replaceAll("booking.status", "currentBooking.status").replaceAll("booking.room", "currentBooking.room");
  receipt = changeOnce(receipt, "  </article>;", "    {reference && <BookingMotion reference={reference} onBooking={setLatest} />}\n  </article>;");
  set(client, receipt);
  const layout = before.files.get(layoutPath).content.toString("utf8");
  set(layoutPath, changeOnce(layout, 'import "./globals.css";',
    'import "./globals.css";\n\nexport const metadata = { title: "Reservations | Juniper House" };'));
  const css = before.files.get(cssPath).content.toString("utf8");
  set(cssPath, changeOnce(css, '@import "./palette.css";', '@import "./palette.css";\n@source "../../originals/kokonut-promise-toast";'));
  return { before, after };
}

async function storeBlobs(run, ...trees) {
  const folder = resolve(reviewRoot(run), "blobs");
  await directory(folder, true);
  for (const tree of trees) for (const value of tree.files.values()) {
    const path = resolve(folder, value.sha256);
    if (!(await file(path))) await replace(path, entry(value.content, 0o600), null);
  }
}
export async function readBlobs(review, type) {
  const tree = review[type];
  const files = new Map();
  for (const row of tree.files) {
    const bytes = await file(resolve(reviewRoot(review.runId), "blobs", row.sha256));
    if (!bytes || bytes.sha256 !== row.sha256) stop("invalid-artifact", "A transaction snapshot is missing or corrupt.");
    files.set(row.path, entry(bytes.content, row.mode));
  }
  return { files, dirs: new Map(tree.directories.map(row => [row.path, row.mode])) };
}

async function reviewedSeed() {
  const original = await snapshot(seed);
  const namesAndHashes = inventory(original).files.map(({ path, sha256 }) => ({ path, sha256 }));
  if (canonical(namesAndHashes) !== canonical(approvedSeed.files)) stop("stale", "The synthetic fixture differs from the reviewed seed inventory.");
  return original;
}

export async function review(request, signal) {
  validateRequest(request);
  const checked = await verifiedSource(request, signal);
  const original = await reviewedSeed();
  const originalManifest = JSON.parse(original.files.get(packagePath).content);
  const manifest = manifests(originalManifest, checked.dependencies);
  const run = id();
  const locks = await prepare(originalManifest, manifest.after, run, signal);
  const trees = await changesFor(original, checked.files, locks, manifest.after);
  const before = inventory(trees.before);
  const after = inventory(trees.after);
  const createdAt = Date.now();
  const body = { schemaVersion: 2, mode: "fixture-only", status: "preflight-passed", runId: run,
    fixtureRoot: ".motionux-v9/agent/v2/workspaces/" + run, route, sourceKind: "app-router", request,
    planFingerprint: checked.plan.planFingerprint, projectFingerprint: checked.plan.projectFingerprint,
    brainIndexFingerprint: checked.plan.brain.indexFingerprint, brainSourceFingerprint: checked.plan.brain.sourceFingerprint,
    seedHash: treeHash(original), createdAt, expiresAt: createdAt + 15 * 60_000, before, after, beforeHash: digest(before), afterHash: digest(after),
    mutationManifest: diffTree(before, after), createdDirectories: after.directories.filter(dir => !trees.before.dirs.has(dir.path)),
    source: checked.source, dependencies: manifest.changes,
    preflight: { status: "resolved", checks: ["Fresh V1 plan and ready exact source pin", "Pinned original and local registry file bytes",
      "MIT notice and import-only provider adaptation", "npm strict peer resolution and pinned tarball integrity",
      "Host aliases and CSS utilities scoped to the fixture", "Complete approved seed inventory and allowlisted presentation edits"],
      packagePrepMs: locks.ms },
    scope: { processes: ["Offline npm lock/ci with lifecycle scripts disabled", "Fixed tsc and Next build/start", "Playwright over loopback"],
      writable: [".motionux-v9/agent/v2/workspaces/" + run, ".motionux-v9/agent/v2/scratch", ".motionux-v9/evidence/agent-v2/runs/" + run],
      authority: "The existing booking ledger supplies accepted API and initial server status.",
      risk: ["The upstream demo stylesheet stays intact on disk. Its global theme resets are kept out of the host page.",
        "Device and screen reader acceptance require separate verification."] },
  };
  const result = validatePlan({ ...body, fingerprint: digest(body) });
  scopeReview(result);
  await storeBlobs(run, trees.before, trees.after);
  await json(resolve(reviewRoot(run), "review.json"), result);
  return result;
}

function scopeReview(value) {
  if (canonical(value.mutationManifest.map(item => item.path)) !== canonical(paths) || value.source.id !== sourceId) {
    stop("blocked", "Mutation manifest exceeds the reviewed fixture adapter scope.");
  }
  return value;
}
export const loadReview = async run => scopeReview(validatePlan(await readJSON(resolve(reviewRoot(run), "review.json"))));

export async function revalidate(value, signal) {
  if (Date.now() >= value.expiresAt) stop("stale", "The review expired. Generate a fresh preflight.");
  const checked = await verifiedSource(value.request, signal);
  const original = await reviewedSeed();
  if (treeHash(original) !== value.seedHash || checked.plan.planFingerprint !== value.planFingerprint ||
      canonical(checked.source) !== canonical(value.source)) stop("stale", "The reviewed fixture, source or V1 plan changed.");
  const before = await readBlobs(value, "before");
  const after = await readBlobs(value, "after");
  const pristine = JSON.parse(original.files.get(packagePath).content);
  const manifest = manifests(pristine, checked.dependencies);
  const lock = { pre: before.files.get(lockPath).content, post: after.files.get(lockPath).content };
  validateLock(JSON.parse(lock.pre), pristine);
  validateLock(JSON.parse(lock.post), manifest.after);
  const expected = await changesFor(original, checked.files, lock, manifest.after);
  if (treeHash(expected.before) !== value.beforeHash || treeHash(expected.after) !== value.afterHash ||
      canonical(manifest.changes) !== canonical(value.dependencies)) stop("stale", "The reviewed adapter or package changes do not match.");
  return expected;
}
