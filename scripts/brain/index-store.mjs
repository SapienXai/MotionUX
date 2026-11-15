import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { loadCatalog, vault } from "../studio/catalog.mjs";
import { atomicWrite } from "../studio/v11/library.mjs";
import { safeRelative } from "../studio/v11/paths.mjs";
import { asCuration } from "../../src/brain/validation.ts";
import { canonical, compareIds, hash, makeIndex, rebuild, verifyIndex } from "../../src/brain/indexer.ts";
import { createProfile, evidenceFor, evidencePath } from "./evidence.mjs";

const indexFile = resolve(vault, "brain/index.v1.json");
const stateFile = resolve(vault, "brain/state.v1.json");
const budget = 128 * 1024 ** 2;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const within = (base, path) => path.startsWith(base + sep);

export async function readJson(path, { optional = false, max = budget } = {}) {
  try {
    const stats = await lstat(path);
    if (!stats.isFile() || stats.size > max || await realpath(path) !== path) throw new Error("Unsafe or oversized JSON file");
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (optional && error.code === "ENOENT") return null;
    throw new Error("Cannot read valid JSON from " + basename(path));
  }
}

async function rules() {
  const paths = (await Promise.all(["src/brain", "schemas/brain"].map(async dir => (await readdir(dir)).sort().map(name => dir + "/" + name)))).flat();
  paths.push("metadata/brain/taxonomy.v1.json", "scripts/brain/evidence.mjs", "scripts/brain/index-store.mjs");
  return hash(await Promise.all(paths.map(async path => [path, digest(await readFile(path))])));
}

async function curate() {
  const base = resolve("metadata/brain/curation");
  const all = [];
  for (const file of (await readdir(base)).sort()) {
    if (!file.endsWith(".json")) continue;
    all.push(...asCuration(await readJson(resolve(base, file))));
  }
  const byId = new Map();
  for (const row of all) {
    if (byId.has(row.id)) throw new Error("Duplicate curated Brain ID");
    byId.set(row.id, row);
  }
  return byId;
}

async function reports() {
  const directory = evidencePath(vault);
  const gallery = await readJson(resolve(directory, "v10/report.json"), { optional: true });
  const testReports = new Map();
  for (const edition of await readdir(directory).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  })) {
    if (!/^v\d+$/.test(edition) || Number(edition.slice(1)) < 13) continue;
    for (const name of ["verification.json", "verification-selected.json"]) {
      const path = edition + "/" + name;
      const report = await readJson(resolve(directory, path), { optional: true });
      if (!report) continue;
      if (!Array.isArray(report.rows) || report.edition !== Number(edition.slice(1))) throw new Error("Invalid browser evidence report");
      for (const row of report.rows) {
        if (name === "verification.json" || (!row.errors?.length && row.sourceHash)) testReports.set(row.id, { row, path: "evidence/" + path });
      }
    }
  }
  if (gallery && (!Array.isArray(gallery.gallery) || !Array.isArray(gallery.comparisons))) throw new Error("Invalid Studio evidence report");
  const probeRows = [];
  const touch = await readJson(resolve(directory, "touch.json"), { optional: true });
  if (touch && !Array.isArray(touch)) throw new Error("Invalid touch evidence report");
  for (const row of touch ?? []) {
    if (row.sourceHash && row.registryHash && row.stateMatched === true && row.input === "Chromium CDP touchscreen" &&
      row.result?.length === 2 && row.result.every(result => result.before !== result.after && !result.error)) {
      probeRows.push({ id: row.id, sourceHash: row.sourceHash, registryHash: row.registryHash, capability: "touch-emulated",
        profile: "Chromium CDP · 390 CSS px · iPhone emulation",
        locator: "evidence/touch.json#rows/" + row.id,
        notes: "An emulated touch gesture changed the interaction state in both original and independent consumer." });
    }
  }
  return { gallery: new Map(gallery?.gallery.map(row => [row.id, row])), comparisons: new Map(gallery?.comparisons.map(row => [row.id, row])),
    editions: testReports, probes: Map.groupBy(probeRows, row => row.id), registryHashes: new Map() };
}

async function fileCache(cold = false) {
  // The sidecar is an optimization. It never supplies a source pin or replaces a content check on changed files.
  const previous = cold ? null : await readJson(stateFile, { optional: true }).catch(() => null);
  const prior = previous?.schemaVersion === 1 && previous.files && !Array.isArray(previous.files) ? previous.files : {};
  const files = new Map();
  const pending = new Map();
  const file = async absolute => {
    if (!within(vault, absolute)) throw new Error("Artifact is outside the local vault");
    if (!pending.has(absolute)) pending.set(absolute, (async () => {
      const stats = await lstat(absolute, { bigint: true });
      if (!stats.isFile() || stats.size > BigInt(budget) || await realpath(absolute) !== absolute) throw new Error("Unsafe prepared artifact");
      const key = relative(vault, absolute);
      const stamp = [stats.dev, stats.ino, stats.size, stats.mtimeNs, stats.ctimeNs].join("/");
      const cached = Object.hasOwn(prior, key) ? prior[key] : undefined;
      const sha = cached?.stamp === stamp && /^[a-f0-9]{64}$/.test(cached.sha) ? cached.sha : digest(await readFile(absolute));
      files.set(key, { stamp, sha });
      return sha;
    })());
    return pending.get(absolute);
  };
  return { file, files };
}

function trustedURL(value) {
  if (typeof value !== "string" || value.length > 1600) throw new Error("Invalid prepared source URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search ||
    url.hostname === "localhost" || /^\d|^\[/.test(url.hostname)) throw new Error("Unsafe prepared source URL");
  return value;
}

async function sourceFor(record, file) {
  const root = resolve(vault, "runtime", record.group);
  if (!within(resolve(vault, "runtime"), root) || !safeRelative(record.group) || record.group.includes("/")) throw new Error("Invalid prepared group");
  const artifact = resolve(vault, "registry", basename(record.installRecipe));
  const [registryHash, code] = await Promise.all([file(artifact), Promise.all(record.codeFiles.map(async item => {
    if (!safeRelative(item.path)) throw new Error("Invalid prepared artifact path");
    const [sha256, installedSHA256] = await Promise.all([file(resolve(root, "original", item.path)), file(resolve(root, "installed", item.path))]);
    if (sha256 !== item.sha256 || item.installedSHA256 && installedSHA256 !== item.installedSHA256) throw new Error("Artifact hash mismatch");
    return { path: item.path, sha256, installedSHA256 };
  }))]);
  const assets = [];
  for (const asset of record.assets ?? []) {
    if (typeof asset === "string") {
      if (!safeRelative(asset)) throw new Error("Invalid prepared asset path");
      assets.push({ path: asset, url: null, sha256: await file(resolve(root, "original", asset)) });
    } else {
      if (asset.path && !safeRelative(asset.path)) throw new Error("Invalid source asset path");
      assets.push({ path: asset.path ?? null, url: asset.sourceURL ? trustedURL(asset.sourceURL) : null, sha256: asset.sha256 });
    }
  }
  if (!code.some(value => value.path === record.entry && value.sha256 === record.upstreamHash)) throw new Error("Prepared entry is missing its source hash");
  return {
    upstreamCommit: record.upstreamCommit ?? null, upstreamHash: record.upstreamHash, sourceURL: trustedURL(record.sourceURL),
    demoURL: trustedURL(record.demoURL), entry: record.entry, code: code.sort((a, b) => compareIds(a.path, b.path)),
    assets: assets.sort((a, b) => compareIds(a.path ?? a.url ?? "", b.path ?? b.url ?? "")),
    notice: record.licenseNoticePath && safeRelative(record.licenseNoticePath) ? record.licenseNoticePath : null,
    registryItem: record.id, registryPath: "/v9/registry/" + record.id + ".json", registryHash,
    studioPath: "/?item=" + record.id + "#specimen",
  };
}

async function currentInputs(cold = false) {
  const catalogDiagnostics = [];
  const [catalog, configFingerprint, curation, observed, cache] = await Promise.all([
    loadCatalog({ diagnostics: catalogDiagnostics }), rules(), curate(), reports(), fileCache(cold),
  ]);
  const ready = [...catalog.values()].filter(row => row.availability === "ready");
  const queue = [...ready];
  const revisions = [];
  const mismatches = [];
  await Promise.all(Array.from({ length: 12 }, async () => {
    for (let item; (item = queue.shift());) {
      try {
        const source = await sourceFor(item, cache.file);
        observed.registryHashes.set(item.id, source.registryHash);
        const tests = evidenceFor(item, observed);
        const annotations = curation.get(item.id);
        const metadata = Object.fromEntries(["id", "title", "provider", "editionOrdinal", "addedSequence", "category", "dependencies",
          "sourceKind", "acceptance", "renderCost"].map(key => [key, item[key]]));
        revisions.push({ id: item.id, upstreamHash: item.upstreamHash, sourceURL: source.sourceURL, source, tests, annotations, metadata,
          path: resolve(vault, "runtime", item.group, "original", source.entry),
          fingerprint: hash({ source, metadata, tests, annotations }) });
      } catch {
        mismatches.push(item.id);
      }
    }
  }));
  const diagnostics = { catalog: catalog.size, ready: ready.length, unavailable: catalog.size - ready.length,
    artifactMismatches: mismatches.sort(compareIds), catalogWarnings: catalog.size ? catalogDiagnostics.length : 0 };
  return { revisions: revisions.sort((a, b) => compareIds(a.id, b.id)), diagnostics, configFingerprint, files: cache.files };
}

export async function buildLocal({ force = false, check = false } = {}) {
  const live = await currentInputs();
  if (live.diagnostics.artifactMismatches.length || live.diagnostics.catalogWarnings || live.diagnostics.unavailable) {
    throw new Error("Prepared catalog is inconsistent. Run npm run studio:doctor. The previous Brain index is preserved.");
  }
  const old = await readJson(indexFile, { optional: true }).then(value => value && verifyIndex(value)).catch(error => {
    if (check || !force) throw error;
    return null;
  });
  const next = await rebuild(live.revisions, old, live.configFingerprint, force, createProfile);
  if (!check && next.index.environment === "prepared") {
    // Validate the whole index before publishing. Sidecar writes are independently recoverable.
    await atomicWrite(indexFile, canonical(next.index) + "\n");
    await atomicWrite(stateFile, canonical({ schemaVersion: 1, indexFingerprint: next.index.indexFingerprint,
      files: Object.fromEntries(live.files) }) + "\n");
  }
  return { ...next, ...live.diagnostics, current: old?.indexFingerprint === next.index.indexFingerprint };
}

export async function measureLocalBuild() {
  const start = performance.now();
  const cold = await currentInputs(true);
  if (!cold.revisions.length || cold.diagnostics.artifactMismatches.length) throw new Error("Prepare and verify the local catalog first");
  const fresh = await rebuild(cold.revisions, null, cold.configFingerprint, true, createProfile);
  const coldMs = performance.now() - start;
  const next = performance.now();
  const warm = await currentInputs();
  const item = warm.revisions.find(revision => revision.annotations);
  if (!item) throw new Error("No source-reviewed profile to exercise");
  const changed = { ...item, annotations: { ...item.annotations, note: item.annotations.note + " Benchmark-only revision." },
    fingerprint: hash([item.fingerprint, "benchmark-only-curation-revision"]) };
  const plan = await rebuild(warm.revisions.map(revision => revision.id === changed.id ? changed : revision),
    fresh.index, warm.configFingerprint, false, createProfile);
  return { coldMs, incrementalMs: performance.now() - next, rebuilt: plan.rebuilt, reused: plan.reused, changedId: item.id, index: fresh.index };
}

export async function openLocal() {
  const live = await currentInputs();
  const previous = await readJson(indexFile, { optional: true });
  const index = previous ? verifyIndex(previous) : makeIndex([], live.configFingerprint, "not-prepared");
  const now = new Map(live.revisions.map(({ id, fingerprint }) => [id, fingerprint]));
  const old = new Set(index.records.map(record => record.id));
  const staleIds = index.records.filter(record => now.get(record.id) !== record.fingerprint).map(record => record.id);
  const unindexed = live.revisions.filter(record => !old.has(record.id)).length;
  const invalidIndex = Boolean(previous && (index.configFingerprint !== live.configFingerprint || live.diagnostics.catalogWarnings));
  return { index, staleIds, invalidIndex, unindexed, ...live.diagnostics, indexPresent: Boolean(previous) };
}
