import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cache = join(root, ".motionux-v9", "discovery");
const upstream = join(root, ".motionux-v9", "upstream");
const output = join(root, "metadata", "v9-provider-candidates.json");
const check = process.argv.includes("--check");
const refresh = process.argv.includes("--refresh-web");

const sha256 = text => createHash("sha256").update(text).digest("hex");
const json = text => JSON.parse(text);
const slug = text => text.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const titleize = text => text.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
const componentTypes = new Set(["registry:component", "registry:ui"]);

function repo(id, name, project, officialIndex, license) {
  const path = join(upstream, id);
  const git = (...args) => execFileSync("git", ["-C", path, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
  const revision = git("rev-parse", "HEAD");
  if (git("status", "--porcelain", "--untracked-files=no")) throw new Error(`${name} discovery requires an unmodified checkout`);
  const paths = new Set(git("ls-tree", "-r", "--name-only", revision).split("\n"));
  const repoURL = `https://github.com/${project}`;
  return {
    id, name, officialIndex, repoURL, revision, paths,
    licenseURL: license && paths.has(license) ? `${repoURL}/blob/${revision}/${license}` : null,
    read(file) {
      if (!paths.has(file)) throw new Error(`${name} has no tracked file ${file} at ${revision}`);
      return readFileSync(join(path, file), "utf8");
    },
  };
}

function source(provider, path) {
  return path && provider.paths.has(path) ? `${provider.repoURL}/blob/${provider.revision}/${path}` : null;
}

function registryCandidate(provider, item, { demo, registry, path, category }) {
  const code = provider.paths ? source(provider, path) : null;
  return {
    id: item.name,
    title: item.title || titleize(item.name),
    category,
    demo,
    source: code ?? registry,
    ...(registry && { install: registry }),
    access: code ? "repository-source" : "public-registry-listed",
    ...(item.dependencies?.length && { dependencies: item.dependencies }),
    ...(item.registryDependencies?.length && { registryDependencies: item.registryDependencies }),
  };
}

function unique(items, key = item => item.id) {
  const keys = new Set();
  return items.filter(item => {
    const id = key(item);
    if (keys.has(id)) return false;
    keys.add(id);
    return true;
  });
}

function registryProvider(provider, file, describe, include = item => componentTypes.has(item.type) && item.files?.length) {
  const content = provider.read(file);
  const entries = json(content).items;
  return report(provider, `Pinned registry inventory ${file}`, sha256(content),
    entries.length, unique(entries.filter(include).map(item => registryCandidate(provider, item, describe(item)))));
}

function report(provider, method, hash, listed, candidates) {
  if (!candidates.length) throw new Error(`${provider.name} discovery returned no candidates`);
  return {
    id: provider.id, name: provider.name, officialIndex: provider.officialIndex,
    repoURL: provider.repoURL ?? null, revision: provider.revision ?? null, licenseURL: provider.licenseURL ?? null,
    method, indexSha256: hash, listed, candidates: candidates.sort((a, b) => a.id.localeCompare(b.id, "en")),
  };
}

const kokonut = repo("kokonut", "Kokonut UI", "kokonut-labs/kokonutui", "https://kokonutui.com/docs", "LICENSE");
const kokonutDocs = new Map([...kokonut.paths]
  .filter(path => path.startsWith("content/docs/") && path.endsWith(".mdx"))
  .map(path => [basename(path, ".mdx"), path.slice("content/".length, -4)]));
const kokonutCatalog = registryProvider(kokonut, "public/r/registry.json", item => {
  const docs = kokonutDocs.get(item.name);
  return {
    demo: docs ? `https://kokonutui.com/${docs}` : kokonut.officialIndex,
    registry: `https://kokonutui.com/r/${item.name}.json`, path: item.files[0].path,
    category: docs?.split("/")[1] ?? "uncategorized",
  };
});

const smoothUI = repo("smoothui", "SmoothUI", "educlopez/smoothui", "https://smoothui.dev/docs/components", "LICENSE");
const smoothUIDocs = [...smoothUI.paths].filter(path => /^apps\/docs\/content\/docs\/(components|blocks)\/[\w-]+\.mdx$/.test(path));
const smoothUICatalog = report(smoothUI, "Pinned component and block docs mapped to workspace package entrypoints",
  sha256(smoothUIDocs.join("\n")), smoothUIDocs.length, unique(smoothUIDocs.flatMap(docs => {
    const [group, id] = docs.slice("apps/docs/content/docs/".length, -4).split("/");
    const packagePath = `packages/smoothui/${group}/${id}`;
    const entry = `${packagePath}/index.tsx`;
    if (!smoothUI.paths.has(entry)) return [];
    const docsTitle = smoothUI.read(docs).match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "");
    const manifest = `${packagePath}/package.json`;
    return [registryCandidate(smoothUI, {
      name: id, title: docsTitle,
      ...(smoothUI.paths.has(manifest) && { dependencies: Object.keys(json(smoothUI.read(manifest)).dependencies ?? {}) }),
    }, {
      demo: `https://smoothui.dev/docs/${group}/${id}`, registry: `https://smoothui.dev/r/${id}.json`,
      path: entry, category: group,
    })];
  })));

const reactBits = repo("reactbits", "React Bits", "DavidHDev/react-bits", "https://reactbits.dev", "LICENSE.md");
const reactBitsRegistry = reactBits.read("public/r/registry.json");
const reactBitsExamples = json(reactBitsRegistry).items;
const reactBitsDocs = new Map([...reactBits.read("src/constants/Information.js")
  .matchAll(/^\s*['"]([^'"]+)['"]:\s*\{[\s\S]*?docsUrl:\s*['"]([^'"]+)['"]/gm)]
  .map(([, key, url]) => [key, url]));
const preferredReactBitsVariants = ["TS-CSS", "TS-TW", "JS-CSS", "JS-TW"];
const reactBitsSources = { "TS-CSS": "ts-default", "TS-TW": "ts-tailwind", "JS-CSS": "content", "JS-TW": "tailwind" };
const reactBitsCatalog = report(reactBits, "Pinned registry. One variant per implementation, with TypeScript and plain CSS preferred.",
  sha256(reactBitsRegistry), reactBitsExamples.length, unique(preferredReactBitsVariants.flatMap(variant => reactBitsExamples
    .filter(item => item.name.endsWith(`-${variant}`) && item.files?.length)
    .map(item => {
      const entryName = item.name.slice(0, -variant.length - 1);
      const path = [...reactBits.paths].find(path => path.startsWith(`src/${reactBitsSources[variant]}/`) && path.endsWith(`/${item.files[0].path}`));
      const relative = path?.split("/").slice(2, 4).join("/");
      return {
        ...registryCandidate(reactBits, item, {
          demo: reactBitsDocs.get(relative) ?? reactBits.officialIndex, path,
          registry: `https://reactbits.dev/r/${item.name}.json`, category: path?.split("/")[2] ?? "uncategorized",
        }),
        id: slug(entryName), variant,
      };
    }))));

const motionPrimitives = repo("motionprimitives", "Motion Primitives", "ibelick/motion-primitives",
  "https://motion-primitives.com/docs", "LICENSE.md");
const motionPrimitivesCatalog = registryProvider(motionPrimitives, "public/c/registry.json", item => ({
  demo: `https://motion-primitives.com/docs/${item.name}`, registry: `https://motion-primitives.com/c/${item.name}.json`,
  path: item.files[0].path, category: "primitives",
}));

const magicUI = repo("magicui", "Magic UI", "magicuidesign/magicui", "https://magicui.design/docs/components", "LICENSE.md");
const magicUICatalog = registryProvider(magicUI, "apps/www/public/r/registry.json", item => ({
  demo: `https://magicui.design/docs/components/${item.name}`, registry: `https://magicui.design/r/${item.name}.json`,
  path: `apps/www/${item.files[0].path}`, category: item.categories?.[0] ?? "components",
}));

const animateUI = repo("animateui", "Animate UI", "imskyleen/animate-ui", "https://animate-ui.com/docs", "LICENSE.md");
const animateRoot = "apps/v1/apps/www";
const animateRegistryPath = `${animateRoot}/public/r/registry.json`;
const animateRegistry = animateUI.read(animateRegistryPath);
const animateEntries = json(animateRegistry).items;
const animateUIComponents = animateEntries.filter(item => item.name.startsWith("components-"));
const wrappedAnimatePrimitives = new Set(animateUIComponents.flatMap(item => item.registryDependencies ?? [])
  .map(dependency => dependency.split("/").at(-1)));
const animateUICatalog = report(animateUI, `Pinned ${animateRegistryPath}. Demo wrappers, icon packs and wrapped primitive duplicates omitted.`,
  sha256(animateRegistry), animateEntries.length, unique([...animateUIComponents,
    ...animateEntries.filter(item => item.name.startsWith("primitives-") && !wrappedAnimatePrimitives.has(item.name)),
  ].flatMap(item => {
    if (!item.files?.length) return [];
    const [, kind, group, name] = item.name.match(/^(components|primitives)-([a-z]+)-(.+)$/) ?? [];
    if (!kind) return [];
    const docs = `docs/${kind}/${group}/${name}`;
    return [{
      ...registryCandidate(animateUI, item, {
        demo: animateUI.paths.has(`${animateRoot}/content/${docs}.mdx`) ? `https://animate-ui.com/${docs}` : animateUI.officialIndex,
        registry: `https://animate-ui.com/r/v1/${item.name}.json`, path: `${animateRoot}/${item.files[0].path}`, category: group,
      }),
      ...(group === "base" || group === "radix" ? { variant: group } : {}),
    }];
  }), item => item.id.replace(/^(components|primitives)-(base|radix)-/, "$1-platform-")));

const cultUI = repo("cultui", "Cult UI", "nolly-studio/cult-ui", "https://www.cult-ui.com/docs", "LICENSE.md");
const cultUICatalog = registryProvider(cultUI, "apps/www/public/r/registry.json", item => ({
  demo: cultUI.paths.has(`apps/www/content/docs/components/${item.name}.mdx`)
    ? `https://www.cult-ui.com/docs/components/${item.name}` : cultUI.officialIndex,
  registry: `https://www.cult-ui.com/r/${item.name}.json`, path: `apps/www/${item.files[0].path}`,
  category: item.categories?.[0] ?? "components",
}), item => item.type === "registry:ui" && item.files?.length);

async function publicIndex(filename, url) {
  const path = join(cache, filename);
  if (!refresh && existsSync(path)) return readFileSync(path, "utf8");
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const content = await response.text();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return content;
}

const aceternity = { id: "aceternity", name: "Aceternity UI", officialIndex: "https://ui.aceternity.com/components" };
const motion = { id: "motion", name: "Motion examples", officialIndex: "https://motion.dev/examples?platform=react" };
const aceternityIndex = "https://ui.aceternity.com/registry/registry.json";
const [aceternityContent, motionContent, motionPlusContent] = await Promise.all([
  publicIndex("aceternity.json", aceternityIndex),
  publicIndex("motion.html", motion.officialIndex),
  publicIndex("motion-plus.html", `${motion.officialIndex}&plus=true`),
]);

const aceternityEntries = json(aceternityContent).items;
const aceternityCatalog = report(aceternity, `Official public shadcn index ${aceternityIndex}. Block entries omitted.`,
  sha256(aceternityContent), aceternityEntries.length, unique(aceternityEntries
    .filter(item => componentTypes.has(item.type) && item.files?.length)
    .map(item => registryCandidate(aceternity, item, {
      demo: `https://ui.aceternity.com/components/${item.name}`,
      registry: `https://ui.aceternity.com/registry/${item.name}.json`, category: item.categories?.[0] ?? "components",
    }))));

function decodeHTML(text) {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number(entity.slice(1)));
    return named[entity];
  });
}

function motionLinks(page) {
  return [...page.matchAll(/href="\/examples\/(react-[a-z0-9-]+)" aria-label="([^"]+), React"/g)]
    .map(([, id, title]) => ({ id, title: decodeHTML(title) }));
}

const motionEntries = motionLinks(motionContent);
const motionPlus = new Set(motionLinks(motionPlusContent).map(item => item.id));
if (!motionPlus.size) throw new Error("Motion+ filter returned no React links");
const motionCandidates = unique(motionEntries).map(item => {
  const link = `https://motion.dev/examples/${item.id}`;
  return {
    ...item, category: item.title.includes(":") ? slug(item.title.split(":")[0].trim()) : "examples",
    demo: link, source: link,
    access: motionPlus.has(item.id) ? "motion-plus-listed" : "official-example-listed",
  };
});
const motionCatalog = report(motion, "Official React example listing and its Motion+ filter. Individual code payloads have not been acquired.",
  sha256(JSON.stringify(motionCandidates)), motionEntries.length, motionCandidates);

const providers = [kokonutCatalog, smoothUICatalog, reactBitsCatalog, motionPrimitivesCatalog, motionCatalog,
  magicUICatalog, aceternityCatalog, animateUICatalog, cultUICatalog];
const manifest = {
  schemaVersion: 1,
  scope: "Discovery only. These are provider listings, not MotionUX imports or verified live components. A listing does not establish publication rights.",
  totals: Object.fromEntries(providers.map(provider => [provider.id, provider.candidates.length])),
  providers,
};
const result = JSON.stringify(manifest, null, 2) + "\n";
if (check) {
  if (readFileSync(output, "utf8") !== result) throw new Error("Provider inventory differs. Review and regenerate with node scripts/v9/discover.mjs.");
} else writeFileSync(output, result);
console.log(JSON.stringify(manifest.totals, null, 2));
