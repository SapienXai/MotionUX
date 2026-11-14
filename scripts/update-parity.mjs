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
const recipeItems = registry.items.filter(item => item.name.startsWith("gallery-recipes-"));
const recipes = Object.fromEntries(recipeItems.map(item => [item.name, contract(item.name)]));
const recipeSources = recipeItems.map(item => [item.name, readFileSync(item.files[0].path, "utf8")]);
const items = inventory.items.map(item => {
  const preset = specs.get(item.id);
  const installItem = preset?.item ?? item.registryItem;
  const selected = contract(installItem);
  const evidence = previous.items.find(entry => entry.id === item.id)?.evidence ?? null;
  return {
    id: item.id,
    baseItem: item.registryItem,
    installItem,
    recipe: preset ? undefined : recipeSources.find(([, content]) => content.includes(`"${item.id}": () => import(`))?.[0],
    preview: preset?.export ?? "studio/catalog.ts",
    legacyPin: item.version,
    ...selected,
    base: preset ? contract(item.registryItem) : null,
    visualSpec: item.evidence,
    provenance: { url: item.sourceUrl, license: item.sourceLicense, decision: item.decision },
    browserTest: item.test,
    consumerFixture: preset ? "scripts/fixture-parity.mjs" : null,
    evidence,
    parity: !selected.pin ? "blocked" : evidence?.pin === selected.pin ? "parity-ok" :
      preset || !previous.featured.includes(item.id) ? "not-tested" : "parity-broken",
  };
});
const next = { ...previous, defaultPin: pin, recipes, items };
writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
console.log(`Recorded ${items.length} contracts, ${items.filter(item => item.pin).length} matching ${pin}`);

function contract(name) {
  const source = registry.items.find(entry => entry.name === name);
  const artifact = published.items.find(entry => entry.name === name);
  if (!source) throw new Error(`Missing registry item ${name}`);
  const files = source.files.map(file => ({
    path: file.path,
    target: file.target,
    sha256: artifact?.files.some(candidate => candidate.path === file.path && candidate.target === file.target)
      ? createHash("sha256").update(git("show", `${pin}:${file.path}`)).digest("hex") : null,
  }));
  const reproducible = artifact && JSON.stringify(source) === JSON.stringify(artifact) && source.files.every((file, index) =>
    files[index].sha256 === createHash("sha256").update(readFileSync(file.path)).digest("hex"));
  return { pin: reproducible ? pin : null, files, publicContract: source };
}
