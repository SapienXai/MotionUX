import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { loadCatalog, vault } from "../catalog.mjs";

export async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function sourceIdentity(catalog, root = vault) {
  const files = new Set();
  const originals = [...catalog.values()].sort((a, b) => a.id.localeCompare(b.id));
  const providers = new Set(originals.map(item => item.group));
  for (const item of originals) {
    for (const lane of ["original", "installed"]) {
      for (const file of item.codeFiles) files.add(resolve(root, "runtime", item.group, lane, file.path));
    }
    files.add(item.installRecipe);
  }
  for (const provider of providers) {
    for (const lane of ["original", "installed"]) {
      const dist = resolve(root, "runtime", provider, lane, "dist");
      for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
        if (entry.isFile()) files.add(resolve(entry.parentPath, entry.name));
      }
    }
  }
  const hashes = {};
  for (const file of [...files].sort()) hashes[relative(root, file)] = await sha256(file);
  return {
    originals: originals.map(({ id, group, sourceKind, upstreamHash, upstreamCommit }) => ({ id, group, sourceKind, upstreamHash, ...(upstreamCommit && { upstreamCommit }) })),
    hashes,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const path = resolve(vault, "evidence/v11/baseline/source-identity.json");
  const current = await sourceIdentity(await loadCatalog());
  if (process.argv.includes("--record")) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(current, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  } else {
    const baseline = JSON.parse(await readFile(path, "utf8"));
    assert.deepEqual(current, baseline, "Original source, consumer package or generated preview changed");
  }
  console.log(`${current.originals.length} originals; ${Object.keys(current.hashes).length} captured source, installed, and preview file hashes.`);
}
