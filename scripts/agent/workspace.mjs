import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const motionRoot = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
export const limits = Object.freeze({ fileBytes: 96 * 1024, files: 48, bytes: 768 * 1024, depth: 4,
  entries: 1200, probes: 1100, path: 320, routeDepth: 12, ms: 2500 });
const extensions = new Set([".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".css", ".json", ".md"]);
const blocked = /^(?:node_modules|vendor|dist|build|out|coverage|secrets?|credentials?|tokens?|certs?|private|__tests__|test-results)(?:$|[._-])/i;
const secretFile = /(?:^|[._-])(?:env|secret|credential|token|private[-_]?key|passwd|password|keychain|api[-_]?key)(?:s?[._-]|$)/i;
const metadata = new Set(["package.json", "tsconfig.json", "jsconfig.json", "components.json", "README.md", "AGENTS.md"]);
const credentialMarker = /(?:gh[pousr]_[a-z\d]{8,}|sk-[a-z\d_-]{12,}|AKIA[A-Z0-9]{16})/i;
const allowedName = name => !name.startsWith(".") && !credentialMarker.test(name) &&
  (!blocked.test(name) && !secretFile.test(name) || /^(?:design-)?tokens\.css$/i.test(name));
const cleanSegment = /^[\p{L}\p{N}_@+ ().\[\]-]+$/u;
const invalidChars = /[\x00-\x1f\x7f\\]/;
const external = /^[a-z][a-z\d+.-]*:/i;
const utf8 = new TextDecoder("utf-8", { fatal: true });

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export const within = (root, path) => path === root || path.startsWith(root + sep);
export class AgentError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const invalid = (code, message) => new AgentError(code, message);
export const pathSafe = path => path.length <= limits.path && !isAbsolute(path) && path.split("/").every(
  name => name && cleanSegment.test(name) && allowedName(name));
const sameFile = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

export async function verifyRoot(project) {
  if (typeof project !== "string" || !project || project.length > 1024 || invalidChars.test(project) || external.test(project) ||
      project.startsWith("~") || project.startsWith("//") || project.split("/").includes("..")) {
    throw invalid("invalid-root", "Supply an explicit local project directory.");
  }
  const root = resolve(motionRoot, project);
  const components = root.split(sep).filter(Boolean);
  if (root === resolve("/") || root === homedir() || (!allowedName(basename(root)) || components.some(name => /^\.|^(?:node_modules|dist|coverage|build)$/i.test(name)))) {
    throw invalid("invalid-root", "The selected directory is outside the supported workspace policy.");
  }
  try {
    const details = await lstat(root);
    if (!details.isDirectory() || await realpath(root) !== root) throw new Error();
    return root;
  } catch {
    throw invalid("invalid-root", "The selected directory must exist and have a canonical path without symlinks.");
  }
}

async function inspectPath(root, path) {
  const absolute = resolve(root, path);
  if (!within(root, absolute)) return { problem: "outside-workspace" };
  try {
    const details = await lstat(absolute);
    if (details.isSymbolicLink() || await realpath(absolute) !== absolute) return { problem: "symlink" };
    return { absolute, details };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      let parent = dirname(absolute);
      while (parent !== root && within(root, parent)) {
        try {
          const ancestor = await lstat(parent);
          if (ancestor.isSymbolicLink() || await realpath(parent) !== parent) return { problem: "symlink" };
          return {};
        } catch (failure) {
          if (failure.code !== "ENOENT" && failure.code !== "ENOTDIR") return { problem: "unreadable" };
          parent = dirname(parent);
        }
      }
      return {};
    }
    return { problem: "unreadable" };
  }
}

// Recheck a canonical file against the opened descriptor before and after reading bounded bytes.
export async function readChecked(root, path, max) {
  const item = await inspectPath(root, path);
  if (item.problem || !item.details) return item;
  if (!item.details.isFile() || item.details.nlink !== 1) return { problem: "non-regular-file" };
  if (item.details.size > max) return { problem: "file-size" };
  let handle;
  try {
    handle = await open(item.absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const details = await handle.stat();
    const before = await inspectPath(root, path);
    if (!before.details || !sameFile(details, before.details) || !sameFile(details, item.details)) return { problem: "changed-during-read" };
    const bytes = Buffer.allocUnsafe(details.size + 1);
    let count = 0;
    while (count < bytes.length) {
      const { bytesRead } = await handle.read(bytes, count, bytes.length - count, count);
      if (!bytesRead) break;
      count += bytesRead;
    }
    const after = await inspectPath(root, path);
    if (count !== details.size || !after.details || !sameFile(details, after.details) || !sameFile(details, await handle.stat())) {
      return { problem: "changed-during-read" };
    }
    const content = utf8.decode(bytes.subarray(0, count));
    if (/\x00|\u001b/.test(content)) return { problem: "non-text-file" };
    return { path, content, bytes: count, hash: sha256(bytes.subarray(0, count)) };
  } catch {
    return { problem: "unreadable" };
  } finally {
    await handle?.close();
  }
}

export async function workspace(project, { signal, bounds = limits } = {}) {
  const root = await verifyRoot(project);
  const deadline = performance.now() + bounds.ms;
  const files = new Map();
  const listings = new Map();
  const issues = new Map();
  const budget = { probes: 0, directoryEntries: 0, filesConsidered: 0, bytesRead: 0, importsSeen: 0, importsTraversed: 0, maxDepth: 0 };
  let elapsed = false;
  const note = (reason, path) => {
    if (issues.size < 100) issues.set(reason + "\0" + (path ?? ""), { reason, path: path ?? null });
  };
  function check() {
    if (signal?.aborted) throw invalid("cancelled", "Inspection was cancelled.");
    if (performance.now() <= deadline) return true;
    elapsed = true;
    note("time-budget");
    return false;
  }
  function probe() {
    if (!check()) return false;
    if (budget.probes < bounds.probes) { budget.probes++; return true; }
    note("probe-budget");
    return false;
  }
  async function list(path) {
    if (listings.has(path)) return listings.get(path);
    if (path && !pathSafe(path)) { note("blocked-directory"); return []; }
    if (!probe()) return [];
    const item = await inspectPath(root, path);
    if (item.problem) note(item.problem);
    if (!item.details?.isDirectory()) return [];
    const entries = [];
    let directory;
    try {
      directory = await opendir(item.absolute);
      if (await realpath(item.absolute) !== item.absolute) { note("symlink"); return []; }
      while (check()) {
        if (budget.directoryEntries >= bounds.entries) { note("directory-entry-budget"); break; }
        const entry = await directory.read();
        if (!entry) break;
        budget.directoryEntries++;
        if (pathSafe(path ? path + "/" + entry.name : entry.name)) {
          entries.push({ name: entry.name, kind: entry.isSymbolicLink() ? "link" : entry.isDirectory() ? "directory" : "file" });
        }
      }
      if (await realpath(item.absolute) !== item.absolute) { note("changed-during-read"); return []; }
    } catch {
      note("unreadable-directory");
      return [];
    } finally {
      await directory?.close();
    }
    entries.sort((a, b) => a.name < b.name ? -1 : Number(a.name > b.name));
    listings.set(path, entries);
    return entries;
  }
  async function read(path, from) {
    if (files.has(path)) return files.get(path);
    if (!pathSafe(path) || !extensions.has(extname(path)) ||
        (extname(path) === ".json" || extname(path) === ".md") && !(dirname(path) === "." && metadata.has(basename(path)))) {
      note("blocked-file", from);
      return null;
    }
    if (!probe()) return null;
    budget.filesConsidered++;
    if (files.size >= bounds.files) { note("file-count-budget", from); return null; }
    const remaining = bounds.bytes - budget.bytesRead;
    if (remaining <= 0) { note("byte-budget", from); return null; }
    const item = await readChecked(root, path, Math.min(bounds.fileBytes, remaining));
    check();
    if (item.problem) note(item.problem === "file-size" && remaining < bounds.fileBytes ? "byte-budget" : item.problem, from ?? path);
    if (!item.hash) return null;
    budget.bytesRead += item.bytes;
    files.set(path, item);
    return item;
  }
  function atDepth(depth, from) {
    budget.maxDepth = Math.max(budget.maxDepth, Math.min(depth, bounds.depth));
    if (depth <= bounds.depth) return check();
    note("import-depth", from);
    return false;
  }
  return { root, files, check, read, list, note, budget, bounds, atDepth,
    issueList: () => [...issues.values()], expired: () => elapsed,
    manifest: () => [...files.values()].map(({ path, hash, bytes }) => ({ path, hash, bytes })).sort((a,b) => a.path < b.path ? -1 : Number(a.path > b.path)),
  };
}

export function localSpecifier(from, specifier) {
  if (!specifier || invalidChars.test(specifier) || external.test(specifier) || isAbsolute(specifier)) return null;
  const stack = dirname(from).split("/").filter(name => name && name !== ".");
  for (const part of specifier.split("/")) {
    if (part === "." || !part) continue;
    if (part === "..") {
      if (!stack.length) return null;
      stack.pop();
    } else if (!allowedName(part) || !cleanSegment.test(part)) return null;
    else stack.push(part);
  }
  const path = stack.join("/");
  return pathSafe(path) ? path : null;
}
