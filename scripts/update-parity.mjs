import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync("metadata/reference-inventory.json"));
const registry = JSON.parse(readFileSync("registry.json"));
const path = "metadata/parity-manifest.json";
const previous = JSON.parse(readFileSync(path));
const pin = process.argv[2] ?? previous.defaultPin;
if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error("Use a verified, full registry commit SHA.");
const git = (...args) => execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] });
const published = JSON.parse(git("show", `${pin}:registry.json`));
const specs = new Map(Object.entries(previous.presets));
const items = inventory.items.map(item => {
  const preset = specs.get(item.id);
  const installItem = preset?.item ?? item.registryItem;
  const source = registry.items.find(entry => entry.name === installItem);
  const artifact = published.items.find(entry => entry.name === installItem);
  if (!source) throw new Error(`Missing registry item ${installItem}`);
  const files = source.files.map(file => ({
    path: file.path,
    target: file.target,
    sha256: artifact?.files.some(candidate => candidate.path === file.path && candidate.target === file.target)
      ? createHash("sha256").update(git("show", `${pin}:${file.path}`)).digest("hex") : null,
  }));
  const reproducible = artifact && JSON.stringify(source) === JSON.stringify(artifact) && source.files.every((file, index) =>
    files[index].sha256 === createHash("sha256").update(readFileSync(file.path)).digest("hex"));
  return {
    id: item.id,
    baseItem: item.registryItem,
    installItem,
    preview: preset?.export ?? "studio/catalog.ts",
    legacyPin: item.version,
    pin: reproducible ? pin : null,
    files,
    dependencies: source.dependencies ?? [],
    registryDependencies: source.registryDependencies ?? [],
    publicContract: source,
    visualSpec: item.evidence,
    provenance: { url: item.sourceUrl, license: item.sourceLicense, decision: item.decision },
    browserTest: item.test,
    consumerFixture: preset ? "scripts/fixture-parity.mjs" : null,
    evidence: previous.items.find(entry => entry.id === item.id)?.evidence ?? null,
    parity: reproducible ? (preset || !previous.featured.includes(item.id) ? "not-tested" : "parity-broken") : "blocked",
  };
});
const next = { ...previous, defaultPin: pin, items };
writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
console.log(`Recorded ${items.length} contracts, ${items.filter(item => item.pin).length} matching ${pin}`);
