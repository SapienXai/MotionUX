import { resolve } from "node:path";
import { lstat, mkdir, open, realpath } from "node:fs/promises";
import { base as v2, digest, directory, file, entry, fixturePath, inventory, json, repo, safeId, snapshot, stop, treeHash, vault } from "../v2/files.mjs";

export const fixtures = resolve(repo, "fixtures/agent/v3");
export const base = resolve(vault, "agent/v3");
export const output = resolve(vault, "evidence/agent-v3");
export const locks = resolve(base, "locks");
export const cache = resolve(v2, "npm-cache");
export const runFolder = run => resolve(output, "runs", safeId(run));
export const managed = run => resolve(base, "workspaces", safeId(run));
export const sourceFixture = name => ["next", "vite"].includes(name) ? resolve(fixtures, name) : stop("project-not-authorized", "Select a checked-in fixture ID.");
export const scan = root => snapshot(root, { html: true });
export async function rootIdentity(root) {
  const node = await lstat(root, { bigint: true });
  if (!node.isDirectory() || (node.mode & 0o777n) !== 0o700n || await realpath(root) !== root) {
    stop("identity-mismatch", "The generated workspace is redirected or its permissions changed.");
  }
  return { dev: String(node.dev), ino: String(node.ino), mode: 448 };
}
export async function assertRoot(review) {
  const root = managed(review.runId);
  if (digest(await rootIdentity(root)) !== digest(review.rootIdentity)) stop("identity-mismatch", "The workspace identity changed.");
  return root;
}
export async function saveTrees(run, before, after) {
  const blobs = resolve(runFolder(run), "blobs");
  await directory(blobs, true);
  const unique = new Map([...before.files.values(), ...after.files.values()].map(value => [value.sha256, value]));
  for (const value of unique.values()) {
    const handle = await open(resolve(blobs, value.sha256), "wx", 0o600);
    try { await handle.writeFile(value.content); await handle.sync(); }
    finally { await handle.close(); }
  }
  await json(resolve(runFolder(run), "inventories.json"), { before: inventory(before), after: inventory(after) });
}
export async function snapshots(review, stored) {
  const folder = resolve(runFolder(review.runId), "blobs");
  const result = [];
  for (const [key, expected] of [["before", review.beforeHash], ["after", review.afterHash]]) {
    if (digest(stored[key]) !== expected) stop("invalid-artifact", "Saved inventory does not match the reviewed hash.");
    const tree = { files: new Map(), dirs: new Map(stored[key].directories.map(({ path, mode }) => [path, mode])) };
    for (const row of stored[key].files) {
      if (!/^[a-f0-9]{64}$/.test(row.sha256)) stop("invalid-artifact", "Invalid preimage key.");
      fixturePath(managed(review.runId), row.path);
      const data = await file(resolve(folder, row.sha256));
      if (data?.sha256 !== row.sha256 || data.mode !== 0o600) stop("invalid-artifact", "A reviewed snapshot changed.");
      tree.files.set(row.path, entry(data.content, row.mode));
    }
    if (treeHash(tree) !== expected) stop("invalid-artifact", "Saved image does not match the reviewed hash.");
    result.push(tree);
  }
  return result;
}
export async function initRun(run) {
  for (const parent of [resolve(output, "runs"), resolve(base, "workspaces")]) await directory(parent, true);
  await mkdir(runFolder(run), { mode: 0o700 });
}
