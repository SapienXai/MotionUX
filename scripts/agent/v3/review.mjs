import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { requestOf, validFingerprint, validate } from "../../../src/agent/integration/v3/validation.ts";
import { canonical } from "../../../src/brain/indexer.ts";
import { digest, entry, file, id, json, materialize, readJSON, safePath, stop, treeHash } from "../v2/files.mjs";
import { assertRoot, fixtures, initRun, managed, rootIdentity, runFolder, saveTrees, scan, snapshots, sourceFixture } from "./workspace.mjs";
import { packageDelta } from "./dependencies.mjs";
import { planFor, pinnedSource } from "./selection.mjs";

const image = item => item ? { sha256: item.sha256, mode: item.mode, size: item.content.length } : null;
export function manifestOf(before, after, roles, dependencies) {
  const files = [...new Set([...before.files.keys(), ...after.files.keys()])].sort().flatMap(path => {
    const pre = image(before.files.get(path)), post = image(after.files.get(path));
    if (canonical(pre) === canonical(post)) return [];
    if (!safePath(path) || !roles[path]) stop("out-of-scope", "The adapter proposed an unreviewed file.");
    return [{ path, operation: pre ? post ? "modify" : "delete" : "create", role: roles[path], before: pre, after: post }];
  });
  const directories = [...after.dirs].filter(([path]) => !before.dirs.has(path)).map(([path, mode]) => ({ path, mode }))
    .sort((a, b) => a.path < b.path ? -1 : 1);
  if ([...before.dirs].some(([path, mode]) => after.dirs.get(path) !== mode)) stop("out-of-scope", "The adapter changes an existing directory.");
  return { mutations: files, directories, dependencies };
}

async function derive(request, signal) {
  const before = await scan(sourceFixture(request.fixture));
  const seeds = await readJSON(resolve(fixtures, "seeds.json"));
  if (treeHash(before) !== seeds[request.fixture]) stop("stale-fixture", "The checked-in seed differs from the approved fixture identity.");
  const from = path => {
    if (!before.files.has(path)) stop("incompatible", "Missing checked-in fixture manifest or lock.");
    return JSON.parse(before.files.get(path).content);
  };
  const manifest = from("package.json");
  const choice = await planFor(request, manifest, signal);
  const { plan, adapter, brainFingerprint } = choice;
  if (plan.decision !== "candidates") return { status: plan.decision, targetWrites: 0, rationale: plan.rationale };
  const { files, source } = await pinnedSource(choice);
  const lock = await file(resolve(fixtures, "adapters", request.fixture + ".lock.json"));
  const delta = packageDelta(manifest, from("package-lock.json"), JSON.parse(lock.content), adapter, choice.profile);
  const template = await file(resolve(fixtures, "adapters", adapter.template));
  const after = { files: new Map(before.files), dirs: new Map(before.dirs) };
  const roles = {};
  const write = (path, data, role, create) => {
    if (create === before.files.has(path)) stop("conflict", "The approved destination already exists or the reviewed glue is missing.");
    roles[path] = role;
    after.files.set(path, entry(data, before.files.get(path)?.mode));
    for (let parent = dirname(path); parent !== "."; parent = dirname(parent)) if (!after.dirs.has(parent)) after.dirs.set(parent, 0o700);
  };
  for (const [path, bytes] of files) write(path, bytes, path === adapter.notice ? "license" :
    adapter.styles.includes(path) ? "reference-css" : "source", true);
  write(adapter.glue, template.content, "host-adapter", false);
  write("package.json", JSON.stringify(delta.after, null, 2) + "\n", "npm-manifest", false);
  write("package-lock.json", lock.content, "npm-lock", false);
  return { before, after, source, brainFingerprint, planFingerprint: plan.planFingerprint,
    manifest: manifestOf(before, after, roles, delta.changes), adapter: adapter.id, hostState: adapter.state };
}

export async function reviewRequest(input, signal) {
  const request = requestOf(input);
  const current = await derive(request, signal);
  if (current.status) return current;
  const { before, after, ...selected } = current;
  const runId = id();
  await initRun(runId);
  await materialize(managed(runId), before, scan);
  const createdAt = Date.now();
  const body = { schemaVersion: 3, runId, status: "reviewed", request, ...selected, rootIdentity: await rootIdentity(managed(runId)),
    beforeHash: treeHash(before), afterHash: treeHash(after), manifestDigest: digest(selected.manifest), createdAt, expiresAt: createdAt + 900_000 };
  const review = { ...body, fingerprint: digest(body) };
  validate("review", review);
  await saveTrees(runId, before, after);
  const host = review.manifest.mutations.find(row => row.role === "host-adapter").path;
  const lines = ["# Reviewed presentation edit", "", review.hostState, "", "--- " + host,
    ...before.files.get(host).content.toString().trimEnd().split("\n").map(line => "-" + line),
    "+++ " + host, ...after.files.get(host).content.toString().trimEnd().split("\n").map(line => "+" + line)];
  await writeFile(resolve(runFolder(runId), "presentation.diff"), lines.join("\n") + "\n", { mode: 0o600, flag: "wx" });
  await json(resolve(runFolder(runId), "review.json"), review);
  return review;
}
export async function loadReview(runId) {
  const review = validate("review", await readJSON(resolve(runFolder(runId), "review.json")));
  if (review.runId !== runId || !validFingerprint(review) || digest(review.manifest) !== review.manifestDigest ||
      review.expiresAt !== review.createdAt + 900_000 || review.request.source !== review.source.id) stop("invalid-review", "Review fingerprint or ownership differs.");
  return review;
}
export async function fresh(review, signal) {
  await assertRoot(review);
  if (Date.now() >= review.expiresAt) stop("stale", "The fixture review expired.");
  const current = await derive(review.request, signal);
  if (current.status || current.brainFingerprint !== review.brainFingerprint || current.planFingerprint !== review.planFingerprint ||
      digest(current.manifest) !== review.manifestDigest || canonical(current.source) !== canonical(review.source) ||
      treeHash(current.before) !== review.beforeHash || treeHash(current.after) !== review.afterHash) stop("stale", "The reviewed policy, source or write set changed.");
}
export async function dryRun(review, signal) {
  const target = await assertRoot(review);
  await fresh(review, signal);
  if (treeHash(await scan(target)) !== review.beforeHash) stop("conflict", "The complete target differs from its reviewed baseline.");
  return { ...review, status: "authorization-required", targetWrites: 0, realProjectWrites: "disabled" };
}
export async function storedTrees(review) {
  return snapshots(review, await readJSON(resolve(runFolder(review.runId), "inventories.json")));
}
