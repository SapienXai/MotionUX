import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, realpath, rename, rmdir, unlink } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { canonical } from "../../../src/brain/indexer.ts";
import { motionRoot, sha256, within } from "../workspace.mjs";

export const repo = motionRoot;
export const vault = resolve(repo, ".motionux-v9");
export const seed = resolve(repo, "fixtures/agent/booking-demo");
export const recipeRoot = resolve(repo, "fixtures/agent/v2/booking");
export const base = resolve(vault, "agent/v2");
export const evidenceRoot = resolve(vault, "evidence/agent-v2/runs");
export const fileLimit = 2 * 1024 * 1024;
const folderMode = 0o700;

export class V2Error extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export const stop = (code, message) => { throw new V2Error(code, message); };
export const digest = value => sha256(canonical(value));
export const order = (a, b) => a < b ? -1 : Number(a > b);
export const id = () => randomBytes(16).toString("hex");
export const safeId = value => /^[a-f\d]{32}$/.test(value ?? "") ? value : stop("invalid-id", "Use the generated 32-character run ID.");
const forbidden = /^(?:node_modules|dist|build|coverage|secrets?|credentials?|tokens?|private)(?:$|[._-])/i;
const secretFile = /(?:^|[._-])(?:env|secret|password|credential|private[-_]?key|pem|pfx|npmrc)(?:[._-]|$)/i;
const fixtureExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".json", ".md", ".txt"]);
const segment = /^[a-z0-9_([\]@][a-z0-9_().[\]@-]{0,94}$/i;
export const safePath = file => typeof file === "string" && file.length <= 245 && file.split("/").length <= 12 &&
  file.split("/").every(part => segment.test(part) && !part.includes("..") && !forbidden.test(part) && !secretFile.test(part));

export async function exists(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function directory(path, create = false) {
  if (!within(repo, path)) {
    stop("unsafe-path", "Directory is outside the managed fixture storage.");
  }
  if (create && !(await exists(path))) {
    await directory(dirname(path), true);
    try { await mkdir(path, { mode: folderMode }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  const stat = await exists(path);
  if (!stat?.isDirectory() || await realpath(path) !== path) stop("unsafe-path", "Managed directory is missing, redirected or unsafe.");
  return stat;
}

export function fixturePath(root, relative) {
  if (!safePath(relative)) stop("unsafe-path", "Fixture path is outside the supported safe name policy.");
  return resolve(root, relative);
}

const signature = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs, stat.mode, stat.nlink].join("/");
export async function file(path, cap = fileLimit) {
  await directory(dirname(path));
  const found = await exists(path);
  if (!found) return null;
  if (!found.isFile() || found.nlink !== 1 || found.size > cap || await realpath(path) !== path) {
    stop("unsafe-file", "A file is linked, special, redirected or larger than the allowed limit.");
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(cap) ||
        signature(before) !== signature(await lstat(path, { bigint: true })) || await realpath(path) !== path) {
      stop("changed-file", "File identity changed before reading.");
    }
    const bytes = Buffer.alloc(Number(before.size) + 1);
    let count = 0;
    while (count < bytes.length) {
      const { bytesRead } = await handle.read(bytes, count, bytes.length - count, count);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count !== Number(before.size) || signature(before) !== signature(await handle.stat({ bigint: true })) ||
        signature(before) !== signature(await lstat(path, { bigint: true })) || await realpath(path) !== path) {
      stop("changed-file", "File identity changed during reading.");
    }
    const content = bytes.subarray(0, count);
    return { sha256: sha256(content), mode: Number(before.mode) & 0o777, content };
  } finally { await handle.close(); }
}

export async function snapshot(root, { html = false } = {}) {
  await directory(root);
  let rows = 0;
  let bytes = 0;
  const files = new Map();
  const dirs = new Map();
  async function walk(path, folder) {
    const names = await readdir(path);
    const seen = new Set();
    for (const name of names.sort(order)) {
      const rel = folder ? folder + "/" + name : name;
      if (++rows > 140 || !safePath(rel) || seen.has(name.toLowerCase())) stop("unsafe-tree", "Tree exceeds its budget or has an unsafe or ambiguous path.");
      seen.add(name.toLowerCase());
      const target = fixturePath(root, rel);
      const info = await exists(target);
      if (info?.isDirectory() && await realpath(target) === target) {
        dirs.set(rel, info.mode & 0o777);
        await walk(target, rel);
      } else {
        if (!fixtureExtensions.has(extname(name)) && !(html && extname(name) === ".html")) stop("unsafe-tree", "Unsupported fixture file type.");
        const entry = await file(target);
        if (!entry || (bytes += entry.content.length) > 8 * 1024 * 1024) stop("unsafe-tree", "Tree changed or exceeds its byte budget.");
        files.set(rel, entry);
      }
    }
  }
  await walk(root, "");
  return { files, dirs };
}
export const image = entry => entry ? { sha256: entry.sha256, mode: entry.mode } : null;
export const entry = (content, mode = 0o644) => {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return { content: bytes, mode, sha256: sha256(bytes) };
};
export function inventory(tree) {
  return {
    files: [...tree.files].sort(([a], [b]) => order(a, b)).map(([path, value]) => ({ path, ...image(value) })),
    directories: [...tree.dirs].sort(([a], [b]) => order(a, b)).map(([path, mode]) => ({ path, mode })),
  };
}
export const treeHash = tree => digest(inventory(tree));
export const matches = (current, expected) => canonical(image(current)) === canonical(expected);

async function syncFolder(path) {
  const handle = await open(path, "r");
  try { await handle.sync(); }
  catch (error) { if (!["EINVAL", "ENOTSUP", "EBADF"].includes(error.code)) throw error; }
  finally { await handle.close(); }
}

export async function replace(path, value, expected) {
  const parent = dirname(path);
  const dirBefore = await directory(parent);
  if (!matches(await file(path), expected)) stop("conflict", "A file preimage changed.");
  const staged = resolve(base, "staging");
  await directory(staged, true);
  const temp = resolve(staged, id() + ".tmp");
  try {
    if (value) {
      const handle = await open(temp, "wx", 0o600);
      try { await handle.writeFile(value.content); await handle.chmod(value.mode); await handle.sync(); }
      finally { await handle.close(); }
    }
    const dirAfter = await directory(parent);
    if (dirBefore.dev !== dirAfter.dev || dirBefore.ino !== dirAfter.ino || !matches(await file(path), expected)) {
      stop("conflict", "A file or its parent changed during staging.");
    }
    if (value) await rename(temp, path);
    else await unlink(path);
    await syncFolder(parent);
    if (!matches(await file(path), image(value))) stop("conflict", "Readback differs from the authorized postimage.");
  } finally {
    await unlink(temp).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function createFolder(path, mode) {
  await directory(dirname(path));
  await mkdir(path, { mode });
  await chmod(path, mode);
  await syncFolder(dirname(path));
}
export async function removeFolder(path, mode) {
  const stat = await directory(path);
  if ((stat.mode & 0o777) !== mode) stop("conflict", "A transaction-created directory has a different mode.");
  await rmdir(path);
  await syncFolder(dirname(path));
}
export async function materialize(root, tree, readTree = snapshot) {
  await createFolder(root, folderMode);
  for (const [path, mode] of [...tree.dirs].sort(([a], [b]) => order(a, b))) await createFolder(fixturePath(root, path), mode);
  for (const [path, value] of tree.files) await replace(fixturePath(root, path), value, null);
  if (treeHash(await readTree(root)) !== treeHash(tree)) stop("conflict", "Fixture copy does not match the approved baseline.");
}
export async function json(path, value) {
  await directory(dirname(path), true);
  const prior = await file(path);
  await replace(path, entry(canonical(value) + "\n", 0o600), image(prior));
}
export async function readJSON(path) {
  const value = await file(path);
  if (!value) stop("missing-artifact", "The requested private artifact is unavailable.");
  try { return JSON.parse(value.content.toString("utf8")); }
  catch { stop("invalid-artifact", "The private artifact does not contain valid JSON."); }
}
