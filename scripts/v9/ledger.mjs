import { readdir, readFile, writeFile } from "node:fs/promises";

const dir = ".motionux-v9/runtime";
const read = path => readFile(path, "utf8").then(JSON.parse);
const optional = async (path, fallback) => {
  try { return await read(path); }
  catch (error) { if (error.code !== "ENOENT") throw error; return fallback; }
};
const reference = await read("metadata/v9-reference.json");
const runtime = (await Promise.all((await readdir(dir)).map(provider => optional(`${dir}/${provider}/catalog.json`, [])))).flat();
const verification = await read(".motionux-v9/evidence/verification.json");
const normalized = await optional(".motionux-v9/evidence/normalized.json", []);
const refs = new Map(reference.items.map(item => [item.id, item]));
const runtimeIds = new Set(runtime.map(item => item.id));
const deduplicated = new Set();
const items = runtime.map(item => {
  if (deduplicated.has(item.id)) throw new Error("Repeated runtime ID: " + item.id);
  deduplicated.add(item.id);
  const mount = verification.smoke.find(row => row.id === item.id);
  const optical = normalized.find(row => row.id === item.id);
  const pilot = verification.pilots.filter(row => row.id === item.id);
  const adapted = item.fidelityStatus === "source-adapted";
  return {
    id: item.id, title: item.title, provider: item.provider, category: item.category,
    referenceId: refs.has(item.id) ? item.id : undefined, upstreamDemoURL: item.demoURL,
    upstreamSourceURL: item.sourceMethod === "official-copy-code" ? undefined : item.sourceURL,
    upstreamCommit: item.upstreamCommit, upstreamHash: item.upstreamHash,
    sourceMethod: item.sourceMethod, format: item.format ?? "React", publication: "private-workspace",
    licenseNoticePath: item.licenseNoticePath,
    state: mount?.verified ? adapted ? "original-adapted" : "original-source-running" :
      mount ? "parity-broken" : "source-installed",
    verified: {
      originalAndInstalledMount: mount?.verified ?? null,
      behaviorProfiles: pilot.filter(row => row.behaviorEqual && !row.errors?.length).length,
      initialAriaProfiles: pilot.filter(row => row.ariaEqual).length,
      pixelComparisons: optical?.comparisons.map(row => ({
        scheme: row.scheme, width: row.width, differentPixels: row.differentPixels, totalPixels: row.totalPixels,
        interactionCompared: row.interactionCompared, behaviorEqual: row.behaviorEqual, error: Boolean(row.error),
      })) ?? [],
    },
  };
});
for (const ref of reference.items.filter(item => !runtimeIds.has(item.id))) items.push({
  id: ref.id, title: ref.name, provider: ref.provider, category: ref.category, referenceId: ref.id,
  upstreamDemoURL: ref.upstream ?? ref.reference, state: ref.sourceStatus, reason: ref.reason,
});
items.sort((left, right) => left.id.localeCompare(right.id));
const report = {
  schemaVersion: 1,
  scope: "Public evidence summary. Component files, original demo assets and screenshots stay in the private local workspace. Mounting and sampled behavior are narrower than full V9 acceptance.",
  counts: {
    localInstallations: runtime.length,
    mountedInBoth: items.filter(item => item.verified?.originalAndInstalledMount).length,
    originalReferenceMounts: items.filter(item => item.referenceId && item.verified?.originalAndInstalledMount).length,
    additionalMounts: items.filter(item => !item.referenceId && item.verified?.originalAndInstalledMount).length,
    exactSourceBytes: items.filter(item => item.state === "original-source-running").length,
    minimallyAdapted: items.filter(item => item.state === "original-adapted").length,
    mountFailures: items.filter(item => item.state === "parity-broken").length,
    accepted: 0,
  },
  items,
};
await writeFile("metadata/v9-import-ledger.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.counts));
