import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, posix, resolve } from "node:path";
import ts from "typescript";
import { createBrain } from "../../../src/brain/ranker.ts";
import { verifyIndex } from "../../../src/brain/indexer.ts";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import type { Intent } from "@motionux/build-core/source-graph";
import { isLocalCodePin, type CodePin, type LocalCodePin } from "@motionux/build-core/code-project";
import { localBuildSource, localSourceFrameURL } from "../../../scripts/studio/build-local-sources.mjs";
import { adaptCodeComparison, adaptHeroVideo, coastVideo, comparisonSource, heroVideoSource } from "./code-adaptations.ts";

type Pin = { path: string; upstreamPath?: string; sha256: string; installedSHA256?: string };
type Entry = {
  id: string; slug?: string; provider: string; title: string; repo?: string; entry: string; upstreamHash: string; upstreamCommit?: string;
  group?: string; availability?: string;
  installRecipe: string; licenseNoticePath?: string; sourceURL: string; format?: string; sourceKind?: string;
  codeFiles: Pin[]; css?: string[]; assets?: { path: string; sha256: string }[];
};
export type SourceModule = {
  pin: CodePin; files: Record<string, string>; hashes: Record<string, string>; upstreamHashes: Record<string, string>;
  preparationPatches: { file: string; upstream: string; prepared: string; reason: string }[]; patches: { file: string; reason: string }[];
  exports: string[]; types: string; packages: string[]; css: string[]; api: string; example: string;
  assets: { path: string; bytes: Uint8Array; sha256: string; rights: string; attribution: string }[];
};
export type InventoryRow = {
  id: string; title: string; provider: string; entry: string; ready: boolean; reason: string; details: string;
  exports?: string[]; types?: string; packages?: string[]; closure?: string; license?: string;
};
const safe = (name: string) => /^[\w./-]+$/.test(name) && !name.startsWith("/") &&
  !name.split("/").some((part) => !part || part === "." || part === "..");
const packageName = (name: string) => name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0];
const textureCredits = new Map([
  ["fabric-of-squares.png", "Fabric Of Squares by Heliodor Jalba"],
  ["grid-noise.png", "Grid Noise by Daivid Serif"],
  ["inflicted.png", "Inflicted by Hugo Loning"],
  ["debut-light.png", "Debut Light by Luke McDonald"],
  ["groovepaper.png", "Groovepaper by Isaac"],
]);
export async function sourceRead(root: string, path: string, max = 2_000_000) {
  if (!safe(path)) throw new Error("path-escape");
  const target = resolve(root, path);
  const stat = await lstat(target);
  if (!stat.isFile() || stat.nlink !== 1 || stat.size > max || await realpath(target) !== target) throw new Error("unsafe-source-file");
  return readFile(target, "utf8");
}
export function analyzeModule(path: string, code: string) {
  const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports: string[] = [];
  const exports: string[] = [];
  const declarations: string[] = [];
  const forbidden: string[] = [];
  function scan(node: ts.Node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
      imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && ["require", "eval", "Function", "fetch", "WebSocket", "Worker", "SharedWorker"].includes(node.expression.text)))
      forbidden.push("dynamic-or-network-call");
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && ["Function", "WebSocket", "Worker", "SharedWorker", "EventSource", "XMLHttpRequest"].includes(node.expression.text))
      forbidden.push("dynamic-or-network-call");
    if (ts.isIdentifier(node) && ["process", "Deno", "Bun", "__dirname", "__filename"].includes(node.text)) forbidden.push("server-runtime-access");
    if (ts.isPropertyAccessExpression(node) && ["innerHTML", "outerHTML", "dangerouslySetInnerHTML"].includes(node.name.text)) forbidden.push("unsafe-dom");
    if (ts.isJsxAttribute(node) && ["dangerouslySetInnerHTML", "srcDoc"].includes(node.name.getText(file))) forbidden.push("unsafe-dom");
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (["script", "iframe", "object", "embed", "base"].includes(node.tagName.getText(file))) forbidden.push("executable-dom");
    }
    ts.forEachChild(node, scan);
  }
  scan(file);
  for (const statement of file.statements) {
    const flags = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (ts.isExportAssignment(statement)) exports.push("default");
    if (flags?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      const isDefault = flags.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);
      if (isDefault) exports.push("default");
      else if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement) &&
        "name" in statement && statement.name && ts.isIdentifier(statement.name as ts.Node)) exports.push((statement.name as ts.Identifier).text);
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) exports.push(declaration.name.text);
    }
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.exportClause && ts.isNamedExports(statement.exportClause))
      exports.push(...statement.exportClause.elements.filter((element) => !element.isTypeOnly).map((element) => element.name.text));
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) declarations.push(statement.getText(file));
  }
  return { imports: [...new Set(imports)], exports: [...new Set(exports)], types: declarations.join("\n").slice(0, 9500), forbidden: [...new Set(forbidden)] };
}
function rights(notice: string) {
  const text = notice.replace(/\s+/g, " ");
  if (/commons clause|non[- ]commercial|additional restrictions|commercial license|all rights reserved/i.test(text)) throw new Error("restricted-license");
  if (/^MIT License/i.test(text) && /Permission is hereby granted, free of charge[\s\S]+to deal in the Software without restriction/i.test(text)) return "MIT" as const;
  if (/Apache License[\s\S]+Version 2\.0[\s\S]+Grant of Copyright License/i.test(text)) return "Apache-2.0" as const;
  throw new Error("unverified-license");
}
function errorReason(error: unknown) {
  const text = error instanceof Error ? error.message : "source-unavailable";
  const code = /^(?:unsupported-dependency|missing-import|missing-source|unsupported-style|unsafe-source|missing-license|restricted-license|unverified-license|unverified-pin|unreviewed-html|unsupported-asset|unsupported-font|runtime-review|source-budget)/.exec(text)?.[0] ?? "source-unavailable";
  return { reason: code, details: text.slice(0, 280) };
}

// These published registry names predate the Gallery IDs. Entry, revision and every
// file are still independently pinned below, including for a historical name.
function validRegistryName(item: Entry, name: string) {
  if (name === item.id) return true;
  const prefix = item.repo === "https://github.com/kokonut-labs/kokonutui" ? "kokonut"
    : item.repo === "https://github.com/educlopez/smoothui" ? "smoothui" : undefined;
  return Boolean(prefix && item.slug && /^[a-z0-9-]+$/.test(item.slug) &&
    name === prefix + "-" + item.slug && basename(item.installRecipe) === name + ".json");
}

async function resolveModule(repo: string, item: Entry, catalog: Entry[], dependencies: Set<string>): Promise<SourceModule> {
  if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(item.id) || !safe(item.entry) || !/\.tsx?$/.test(item.entry)) throw new Error("unreviewed-html");
  if (!/^[a-f0-9]{40}$/.test(item.upstreamCommit ?? "") || !item.sourceURL.includes(item.upstreamCommit!) ||
    !/^https:\/\/(?:github\.com|raw\.githubusercontent\.com)\//.test(item.sourceURL)) throw new Error("unverified-pin");
  const vault = resolve(repo, ".motionux-v9");
  const registry = JSON.parse(await sourceRead(vault, "registry/" + basename(item.installRecipe), 4_000_000)) as { name: string; files: { path: string; content: string }[] };
  if (!validRegistryName(item, registry.name)) throw new Error("unverified-pin: registry identity");
  const content = new Map(registry.files.map((file) => [file.path, file.content]));
  const pins = new Map(item.codeFiles.map((pin) => [pin.path, pin]));
  function pinned(path: string) {
    const text = content.get(path);
    const pin = pins.get(path);
    if (!safe(path) || typeof text !== "string" || !pin) throw new Error("missing-source: " + path);
    if (fingerprint(text) !== (pin.installedSHA256 ?? pin.sha256)) throw new Error("unverified-pin: " + path);
    return text;
  }
  const entry = pinned(item.entry);
  if (pins.get(item.entry)?.sha256 !== item.upstreamHash) throw new Error("unverified-pin: upstream entry");
  const api = analyzeModule(item.entry, entry);
  if (!api.exports.length) throw new Error("runtime-review: no React exports");
  let notice: string;
  if (item.licenseNoticePath) notice = pinned(item.licenseNoticePath);
  else {
    const sibling = catalog.find((other) => other.repo === item.repo && other.upstreamCommit === item.upstreamCommit && other.licenseNoticePath?.endsWith("/LICENSE.txt"));
    if (!sibling?.licenseNoticePath || item.repo !== "https://github.com/ibelick/motion-primitives") throw new Error("missing-license");
    const other = JSON.parse(await sourceRead(vault, "registry/" + basename(sibling.installRecipe)));
    notice = other.files.find((file: { path: string }) => file.path === sibling.licenseNoticePath)?.content;
    const pin = sibling.codeFiles.find(({ path }) => path === sibling.licenseNoticePath);
    if (!notice || !pin || fingerprint(notice) !== pin.sha256 ||
      pin.sha256 !== "f668f5ef3635eb906f10b1eea9a32e449eb6e1a183ab6879ef6d56c0980dd2f3") throw new Error("missing-license: repository grant");
  }
  const license = rights(notice);
  const files: Record<string, string> = {};
  const hashes: Record<string, string> = {};
  const upstreamHashes: Record<string, string> = {};
  const preparationPatches: SourceModule["preparationPatches"] = [];
  const packages = new Set<string>();
  const patches: SourceModule["patches"] = [];
  const styles: string[] = [];
  const assets: SourceModule["assets"] = [];
  const adaptComparison = item.id === comparisonSource && fingerprint(entry) === "46b78d47b40f52b3e491fedebd80a50a1b9f69fc526ea4ea3837b6e9edb4c092";
  const adaptVideo = item.id === heroVideoSource && fingerprint(entry) === "a2f2982e04039359395922bd16eabfb70057dd42612023cc17da7cd8bd06e50b";
  if (adaptComparison) {
    const path = posix.join(posix.dirname(item.entry), "motionux-highlight.tsx");
    if (content.has(path)) throw new Error("runtime-review: adaptation path collision");
    const helper = await sourceRead(repo, "platform/templates/source-driven/highlight.tsx", 24_000);
    files[path] = helper;
    for (const name of analyzeModule(path, helper).imports) {
      const dependency = packageName(name);
      if (!dependencies.has(dependency)) throw new Error("unsupported-dependency: " + dependency);
      packages.add(dependency);
    }
  }
  if (adaptVideo) {
    const bytes = await readFile(resolve(repo, "platform/templates/source-driven/coast-preview.mp4"));
    if (fingerprint(bytes) !== coastVideo.sha256) throw new Error("unsupported-asset: local video hash mismatch");
    assets.push({ ...coastVideo, bytes, rights: "MotionUX-owned demonstration media", attribution: "" });
  }
  function visit(path: string) {
    if (Object.hasOwn(files, path)) return;
    if (Object.keys(files).length > 30) throw new Error("source-budget: import count");
    let code = pinned(path);
    files[path] = code;
    hashes[path] = fingerprint(code);
    upstreamHashes[path] = pins.get(path)!.sha256;
    if (hashes[path] !== upstreamHashes[path]) preparationPatches.push({
      file: path, upstream: upstreamHashes[path], prepared: hashes[path], reason: "Pinned source preparation adaptation retained from the vault.",
    });
    if (path.endsWith(".svg")) {
      if (/<(?:script|foreignObject|iframe)|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["'](?:https?:|data:|javascript:|\/\/)/i.test(code))
        throw new Error("unsupported-asset: active SVG");
      return;
    }
    if (path.endsWith(".css")) {
      if (/\\|@(?:font-face|plugin|config)|expression\s*\(/i.test(code))
        throw new Error("unsupported-style: font, escape or build plugin");
      const resources = [...code.matchAll(/@import\s+["']([^"']+)["']|url\s*\(\s*["']?([^"')\s]+)["']?\s*\)/g)];
      for (const resource of resources) {
        const name = resource[1] ?? resource[2];
        if (name === "tailwindcss" && resource[1]) continue;
        if (/^(?:[a-z]+:|\/)/i.test(name)) throw new Error("unsupported-style: remote asset");
        const target = posix.normalize(posix.join(posix.dirname(path), name));
        if (!safe(target) || !content.has(target)) throw new Error("unsupported-asset: missing CSS resource " + name);
        visit(target);
      }
      styles.push(path);
      return;
    }
    if (!/\.tsx?$/.test(path)) throw new Error("unsupported-asset: " + path);
    if (path === item.entry && adaptComparison) {
      code = adaptCodeComparison(code);
      patches.push({ file: path, reason: "Render a bounded Shiki syntax tree as React text and elements, with fixed local themes and grammars." });
    }
    if (path === item.entry && adaptVideo) {
      code = adaptHeroVideo(code);
      patches.push({ file: path, reason: "Run the original entry animation in a native modal with a pinned local video." });
    }
    if (path === item.entry && item.id === "smoothui-ai-message" &&
      hashes[path] === "88ca4b848c774446f8f6b8275532c71bb8356f602ac811b5f4f298b7f96cd433") {
      code = code.replace("<style dangerouslySetInnerHTML={{ __html: ACTION_STYLES }} />", "<style>{ACTION_STYLES}</style>");
      patches.push({ file: path, reason: "Render the unchanged static action stylesheet as React text." });
    }
    const info = analyzeModule(path, code);
    if (info.forbidden.length) throw new Error("runtime-review: " + info.forbidden.join(", "));
    for (const name of info.imports) {
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? name.slice(2) : posix.normalize(posix.join(posix.dirname(path), name));
        const target = [base, base + ".tsx", base + ".ts", base + "/index.tsx", base + "/index.ts"].find((path) => content.has(path) || Object.hasOwn(files, path));
        if (!target || !safe(target)) throw new Error("missing-import: " + name);
        visit(target);
        if (name.startsWith("@/")) {
          let relative = posix.relative(posix.dirname(path), target).replace(/\.tsx?$/, "");
          if (!relative.startsWith(".")) relative = "./" + relative;
          code = code.replaceAll('"' + name + '"', '"' + relative + '"').replaceAll("'" + name + "'", "'" + relative + "'");
          patches.push({ file: path, reason: "Resolve the package-local alias inside the isolated source directory." });
        }
      } else {
        const packageId = packageName(name);
        if (!dependencies.has(packageId)) throw new Error("unsupported-dependency: " + packageId);
        packages.add(packageId);
      }
    }
    // Type erasure only. React 19 makes an unparameterized element's props unknown.
    if (code.includes("React.cloneElement(child,") && code.includes("React.isValidElement(child)")) {
      code = code.replaceAll("React.isValidElement(child)", "React.isValidElement<Record<string, unknown>>(child)")
        .replaceAll("child as React.ReactElement)", "child as React.ReactElement<Record<string, unknown> & { className?: string }>)");
      patches.push({ file: path, reason: "Parameterize ReactElement for React 19 props typing." });
    }
    // This pinned Cult UI entry already embeds the original textures. Preserve
    // their bytes and compare them to the catalog's independent upstream pins.
    if (item.id === "cultui-bg-image-texture" && item.repo === "https://github.com/nolly-studio/cult-ui" &&
      item.upstreamCommit === "d71b1428b811c2779d46ea41b7ef8c9f9c9991c2" && path === item.entry &&
      hashes[path] === "6a5dd3a59c73a605ff2147ce0f37dee664ea672f76ceb4e9cc07c90c8d678b22") {
      code = code.replace(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g, (_, data: string) => {
        const bytes = Buffer.from(data, "base64");
        const sha256 = fingerprint(bytes);
        const asset = item.assets?.find((asset) => typeof asset === "object" && asset.sha256 === sha256);
        if (!asset || !/^apps\/www\/public\/textures\/[a-z-]+\.png$/.test(asset.path) ||
          bytes.length > 300_000 || !bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
          throw new Error("unsupported-asset: texture does not match its raster pin");
        const filename = basename(asset.path);
        const credit = textureCredits.get(filename);
        if (!credit) throw new Error("unverified-license: texture attribution");
        const target = "public/media/sources/" + item.id + "/" + filename;
        if (!assets.some(({ path }) => path === target)) assets.push({
          path: target, bytes, sha256, rights: "CC-BY-SA-3.0",
          attribution: credit + ", Subtle Patterns, transparent adaptation by Mike Hearn. " +
            "https://www.transparenttextures.com/" + filename.slice(0, -4) + ".html",
        });
        return target.slice("public".length);
      });
      if (assets.length) patches.push({ file: path, reason: "Serve the verified embedded texture bytes as local, offline-cacheable images." });
    }
    files[path] = code;
  }
  visit(item.entry);
  files["LICENSE.txt"] = notice;
  if (Object.values(files).reduce((n, text) => n + Buffer.byteLength(text), 0) > 160_000) throw new Error("source-budget: code bytes");
  // CSS imported by the entry is preserved. Global demo bundles are not imported as application resets.
  const examplePath = registry.files.find(({ path }) => /(?:^|\/)demos?\//.test(path) && /\.tsx$/.test(path) && pins.has(path))?.path;
  const example = examplePath ? pinned(examplePath) : "";
  const closure = fingerprint(canonical({ files, hashes, patches, packages: [...packages].sort(), license,
    ...(assets.length && { assets: assets.map(({ path, sha256 }) => ({ path, sha256 })) }) }));
  return { pin: { id: item.id, title: item.title, provider: item.provider, revision: item.upstreamCommit!, url: item.sourceURL,
    entry: item.entry, closure, license, fidelity: patches.length || preparationPatches.length ? "source-adapted" : "upstream-original" }, files, hashes, upstreamHashes, preparationPatches, patches, exports: api.exports, types: api.types, packages: [...packages].sort(),
    css: styles, api: files[item.entry], example: example.length < 20_000 ? example : "", assets };
}

export const codeProfiles = ["hotel-dashboard", "build-extended", "build-highlight"] as const;
async function profileDependencies(repo: string) {
  return (await Promise.all(codeProfiles.map(async (name) => {
    const manifest = await sourceRead(repo, "platform/templates/" + name + "/package.json").catch((error: NodeJS.ErrnoException) => {
      if (name !== codeProfiles[0] && error.code === "ENOENT") return null;
      throw error;
    });
    return manifest ? { name, dependencies: new Set(Object.keys(JSON.parse(manifest).dependencies)) } : null;
  }))).filter((profile) => profile !== null);
}

export async function codeProfileFor(repo: string, packages: Iterable<string>) {
  const requested = [...packages];
  const profile = (await profileDependencies(repo)).find(({ dependencies }) => requested.every((name) => dependencies.has(name)));
  if (!profile) throw new BuildError(409, "No pinned dependency profile supports this project.");
  return profile.name;
}

export async function inspectCodeCatalog(repo: string) {
  const vault = resolve(repo, ".motionux-v9");
  const catalog = JSON.parse(await sourceRead(vault, "catalog.last-good.json", 24_000_000)) as Entry[];
  const dependencies = new Set((await profileDependencies(repo)).flatMap((profile) => [...profile.dependencies]));
  const sources = new Map<string, SourceModule>();
  const rows: InventoryRow[] = [];
  for (const entry of catalog) {
    try {
      const source = await resolveModule(repo, entry, catalog, dependencies);
      sources.set(entry.id, source);
      rows.push({ id: entry.id, title: entry.title, provider: entry.provider, entry: entry.entry, ready: true, reason: "compiler-ready",
        details: source.pin.fidelity === "source-adapted" ? "Source imports need tracked local adaptation." : "Pinned public source and dependency closure.",
        exports: source.exports, types: source.types, packages: source.packages, closure: source.pin.closure, license: source.pin.license });
    } catch (error) {
      rows.push({ id: entry.id, title: entry.title, provider: entry.provider, entry: entry.entry, ready: false, ...errorReason(error) });
    }
  }
  const reasons = Object.fromEntries([...new Set(rows.map(({ reason }) => reason))].sort().map((reason) => [reason, rows.filter((row) => row.reason === reason).length]));
  return { sources, rows, counts: { total: rows.length, compilerReady: sources.size, unavailable: rows.length - sources.size, reasons },
    fingerprint: fingerprint(canonical(rows)) };
}

async function localEntries(repo: string) {
  const catalog = JSON.parse(await sourceRead(resolve(repo, ".motionux-v9"), "catalog.last-good.json", 24_000_000)) as Entry[];
  return catalog.filter((entry): entry is Entry & { slug: string; group: string } => localBuildSource(entry));
}

export async function listLocalBuildSources(repo: string) {
  return (await localEntries(repo)).map(({ id, slug, title, provider, upstreamHash }) => ({
    id, slug, title, provider, pin: upstreamHash,
  }));
}

export const localSourceTemplate = "platform/templates/source-driven/local-source.tsx";

export async function localCodeSources(repo: string): Promise<SourceModule[]> {
  const entries = await localEntries(repo);
  if (!entries.length) return [];
  const bridge = fingerprint(await sourceRead(repo, localSourceTemplate));
  return entries.map(({ id, slug, group, title, provider, upstreamHash, sourceURL }) => {
    const src = localSourceFrameURL(id, slug, upstreamHash, true);
    const code = `"use client";
import { LocalSourceFrame } from "../../runtime/local-source";
export default function LocalSource({ height }: { height?: number }) {
  return <LocalSourceFrame src=${JSON.stringify(src)} title=${JSON.stringify(title)} height={height} />;
}
`;
    const pin: LocalCodePin = { id, slug, group, title, provider, revision: upstreamHash, url: sourceURL,
      fidelity: "local-frame", license: "local-only", entry: "local.tsx", closure: fingerprint(canonical({ id, group, bridge, code })) };
    return { pin, files: { "local.tsx": code }, hashes: { "local.tsx": fingerprint(code) }, upstreamHashes: {},
      preparationPatches: [], patches: [], exports: ["default"], types: "default LocalSource(props: { height?: number })",
      packages: [], css: [], api: "Interactive isolated original with its own sample content and state. The app can position the frame and set its height, but cannot read or control its contents.",
      example: "<LocalSource height={380} />", assets: [] };
  });
}

export async function discoverCodeSources(repo: string, intent: Intent, preferred?: string, includeLocal = false) {
  const inventory = await inspectCodeCatalog(repo);
  const rows = new Map(inventory.rows.map((row) => [row.id, row]));
  if (includeLocal) for (const source of await localCodeSources(repo)) {
    inventory.sources.set(source.pin.id, source);
    rows.set(source.pin.id, { id: source.pin.id, title: source.pin.title, provider: source.pin.provider,
      entry: source.pin.entry, ready: true, reason: "local-only", details: source.api, types: source.types,
      exports: source.exports, license: source.pin.license });
  }
  const index = verifyIndex(JSON.parse(await sourceRead(resolve(repo, ".motionux-v9"), "brain/index.v1.json", 24_000_000)));
  const brain = createBrain(index);
  const scored = new Map<string, { score: number; needs: string[] }>();
  for (const need of intent.requirements) {
    const matches = brain.query("search", { schemaVersion: 1, query: need.search, maxResults: 20,
      ...(!includeLocal && { require: { integrationKind: ["react"] } }) });
    for (const item of matches.candidates) {
      if (!inventory.sources.has(item.id)) continue;
      const existing = scored.get(item.id) ?? { score: 0, needs: [] };
      existing.score = Math.max(existing.score, item.score);
      existing.needs.push(need.id);
      scored.set(item.id, existing);
    }
  }
  const ordered = [...scored].sort((a, b) => b[1].score - a[1].score).slice(0, 23).map(([id, match]) => ({
    ...rows.get(id)!, match,
  }));
  if (preferred && inventory.sources.has(preferred) && !ordered.some(({ id }) => id === preferred))
    ordered.push({ ...rows.get(preferred)!, match: { score: 0, needs: [] } });
  return { inventory, candidates: ordered, preferred: preferred ? rows.get(preferred) ?? { id: preferred, ready: false, reason: "missing-source" } : undefined };
}

export function sameCodePin(expected: CodePin, current: CodePin) {
  // Fidelity is a derived disclosure. Technical pins and bytes remain exact across metadata corrections.
  return canonical({ ...expected, fidelity: current.fidelity }) === canonical(current);
}

export async function restoreCodeSources(repo: string, pins: CodePin[], use: "export" | "local" = "export") {
  const inventory = await inspectCodeCatalog(repo);
  const local = use === "local" && pins.some(isLocalCodePin)
    ? new Map((await localCodeSources(repo)).map((source) => [source.pin.id, source])) : undefined;
  return pins.map((pin) => {
    const current = isLocalCodePin(pin) ? local?.get(pin.id) : inventory.sources.get(pin.id);
    if (!current || !sameCodePin(pin, current.pin)) throw new BuildError(409, "Pinned source changed or is unavailable: " + pin.id);
    return current;
  });
}
