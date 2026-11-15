import { lstat, opendir, realpath, statfs } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const vault = fileURLToPath(new URL("../../.motionux-v9", import.meta.url));
const categories = [
  "original-runtimes-and-registry", "upstream", "thumbnails-and-preview-evidence", "v2-npm-cache",
  "v2-workspaces", "scratch-and-replicas", "traces", "test-outputs", "protected-library-backups-and-journals", "other-metadata",
];
const failure = message => new Error(message);
function classify(path) {
  const [top, system, section] = path.split("/");
  if (["user", "backups", "recovery", "brain"].includes(top) ||
      top === "agent" && system === "v2" && ["reviews", "locks"].includes(section) ||
      /(?:^|\/)journal(?:\.[^/]+)?$/.test(path)) return categories[8];
  if (["runtime", "registry", "next", "studio-shell"].includes(top)) return categories[0];
  if (["upstream", "designbookmark"].includes(top)) return categories[1];
  if (top === "agent" && system === "v2" && section === "npm-cache") return categories[3];
  if (top === "agent" && system === "v2" && section === "workspaces") return categories[4];
  if (top === "agent" && system === "v2" && ["scratch", "staging"].includes(section)) return categories[5];
  if (top === "evidence" && /(?:trace[^/]*\.zip|\.trace)$/.test(path)) return categories[6];
  if (top === "thumbnails" || top === "evidence" && /\.(?:png|webp|gif|mp4|webm|jpg)$/.test(path)) return categories[2];
  if (top === "evidence" || top === "agent") return categories[7];
  return categories[9];
}

const totals = () => ({ entries: 0, logicalBytes: 0, allocatedBytes: 0 });
const identity = (a, b) => a.dev === b.dev && a.ino === b.ino;
const stat = path => lstat(path, { bigint: true });

export async function auditStorage(root = vault, { limit = 4_000_000, signal = AbortSignal.timeout(480_000) } = {}) {
  const rootInfo = await stat(root);
  if (!rootInfo.isDirectory() || await realpath(root) !== root) throw failure("Vault root must be a canonical directory.");
  const usage = totals();
  const breakdown = Object.fromEntries(categories.map(key => [key, totals()]));
  const hardlinks = new Set();
  let symlinks = 0;
  let repeatedHardlinks = 0;
  let foreignMounts = 0;
  function include(relative, info) {
    if (++usage.entries > limit) throw failure("Vault traversal budget exceeded.");
    const result = breakdown[classify(relative)];
    result.entries++;
    if (info.isSymbolicLink()) symlinks++;
    const logicalBytes = info.isDirectory() ? 0 : Number(info.size);
    result.logicalBytes += logicalBytes;
    usage.logicalBytes += logicalBytes;
    if (!info.isDirectory() && info.nlink > 1n) {
      const key = info.dev + "/" + info.ino;
      if (hardlinks.has(key)) { repeatedHardlinks++; return; }
      if (hardlinks.size >= 250_000) throw failure("Vault hardlink accounting budget exceeded.");
      hardlinks.add(key);
    }
    const allocatedBytes = Number(info.blocks) * 512;
    result.allocatedBytes += allocatedBytes;
    usage.allocatedBytes += allocatedBytes;
  }
  async function directory(path, relative, expected, depth) {
    if (depth > 96) throw failure("Vault directory nesting budget exceeded.");
    signal.throwIfAborted();
    const validate = async () => {
      const current = await stat(path);
      if (!current.isDirectory() || !identity(expected, current) || await realpath(path) !== path) {
        throw failure("Vault directory changed during inspection.");
      }
    };
    await validate();
    const handle = await opendir(path, { bufferSize: 64 });
    try {
      await validate();
      for (;;) {
        signal.throwIfAborted();
        const names = [];
        for (let i = 0; i < 32; i++) {
          const child = await handle.read();
          if (!child) break;
          names.push(child.name);
        }
        if (!names.length) break;
        const found = await Promise.all(names.map(async name => {
          const absolute = join(path, name);
          return { absolute, childPath: relative ? relative + "/" + name : name, info: await stat(absolute) };
        }));
        for (const { absolute, childPath, info } of found) {
          if (info.dev !== rootInfo.dev) { foreignMounts++; continue; }
          include(childPath, info);
          if (info.isDirectory()) await directory(absolute, childPath, info, depth + 1);
        }
      }
      await validate();
    } finally { await handle.close(); }
  }
  include("", rootInfo);
  await directory(root, "", rootInfo, 0);
  const filesystem = await statfs(root);
  if (!identity(rootInfo, await stat(root))) throw failure("Vault root changed during inspection.");
  return { schemaVersion: 1, status: "complete", readOnly: true, usage, breakdown, symlinksSkipped: symlinks,
    duplicateHardlinkAllocationsSkipped: repeatedHardlinks, foreignMountsSkipped: foreignMounts,
    volumeAvailableBytes: filesystem.bavail * filesystem.bsize,
    accounting: ["Logical bytes sum each non-directory entry's reported size.",
      "Allocated bytes sum st_blocks × 512, counting hardlinked inodes once. APFS copy-on-write clones and snapshots can share blocks across inodes.",
      "The report cannot attribute exclusive physical bytes or predict reclaimed space. Cross-category hardlink allocation is assigned once to the first encountered category."],
    cleanup: { executed: false, manualReviewOnly: ["scratch-and-replicas"],
      protected: ["original-runtimes-and-registry", "upstream", "v2-npm-cache", "v2-workspaces",
        "protected-library-backups-and-journals", "thumbnails-and-preview-evidence", "traces", "test-outputs", "other-metadata"] } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw failure();
    process.stdout.write(JSON.stringify(await auditStorage()) + "\n");
  } catch {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, status: "incomplete", readOnly: true,
      message: "The vault is missing, changed during traversal, is unreadable or exceeded the audit budget. No partial totals are reported." }) + "\n");
    process.exitCode = 1;
  }
}
