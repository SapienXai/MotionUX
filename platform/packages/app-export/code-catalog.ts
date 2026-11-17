import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, posix, resolve } from "node:path";
import ts from "typescript";
import { createBrain } from "../../../src/brain/ranker.ts";
import { verifyIndex } from "../../../src/brain/indexer.ts";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import type { Intent } from "@motionux/build-core/source-graph";
import type { CodePin } from "@motionux/build-core/code-project";

type Pin = { path: string; sha256: string; installedSHA256?: string };
type Entry = {
  id: string; provider: string; title: string; repo?: string; entry: string; upstreamHash: string; upstreamCommit?: string;
  installRecipe: string; licenseNoticePath?: string; sourceURL: string; format?: string; sourceKind?: string;
  codeFiles: Pin[]; css?: string[]; assets?: { path: string; sha256: string }[];
};
export type SourceModule = {
  pin: CodePin; files: Record<string, string>; hashes: Record<string, string>; patches: { file: string; reason: string }[];
  exports: string[]; types: string; packages: string[]; css: string[]; api: string; example: string;
};
export type InventoryRow = {
  id: string; title: string; provider: string; entry: string; ready: boolean; reason: string; details: string;
  exports?: string[]; types?: string; packages?: string[]; closure?: string; license?: string;
};
const safe = (name: string) => /^[\w./-]+$/.test(name) && !name.startsWith("/") &&
  !name.split("/").some((part) => !part || part === "." || part === "..");
const packageName = (name: string) => name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0];
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
      if (flags.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) exports.push("default");
      if ("name" in statement && statement.name && ts.isIdentifier(statement.name as ts.Node)) exports.push((statement.name as ts.Identifier).text);
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) exports.push(declaration.name.text);
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause))
      exports.push(...statement.exportClause.elements.map((element) => element.name.text));
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

async function resolveModule(repo: string, item: Entry, catalog: Entry[], dependencies: Set<string>): Promise<SourceModule> {
  if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(item.id) || !safe(item.entry) || !/\.tsx?$/.test(item.entry)) throw new Error("unreviewed-html");
  if (!/^[a-f0-9]{40}$/.test(item.upstreamCommit ?? "") || !item.sourceURL.includes(item.upstreamCommit!) ||
    !/^https:\/\/(?:github\.com|raw\.githubusercontent\.com)\//.test(item.sourceURL)) throw new Error("unverified-pin");
  const vault = resolve(repo, ".motionux-v9");
  const registry = JSON.parse(await sourceRead(vault, "registry/" + basename(item.installRecipe))) as { name: string; files: { path: string; content: string }[] };
  if (registry.name !== item.id) throw new Error("unverified-pin: registry identity");
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
  const packages = new Set<string>();
  const patches: SourceModule["patches"] = [];
  const styles: string[] = [];
  function visit(path: string) {
    if (Object.hasOwn(files, path)) return;
    if (Object.keys(files).length > 30) throw new Error("source-budget: import count");
    let code = pinned(path);
    files[path] = code;
    hashes[path] = fingerprint(code);
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
    const info = analyzeModule(path, code);
    if (info.forbidden.length) throw new Error("runtime-review: " + info.forbidden.join(", "));
    for (const name of info.imports) {
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? name.slice(2) : posix.normalize(posix.join(posix.dirname(path), name));
        const target = [base, base + ".tsx", base + ".ts", base + "/index.tsx", base + "/index.ts"].find((path) => content.has(path));
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
        .replaceAll("child as React.ReactElement)", "child as React.ReactElement<Record<string, unknown>>)");
      patches.push({ file: path, reason: "Parameterize ReactElement for React 19 props typing." });
    }
    files[path] = code;
  }
  visit(item.entry);
  files["LICENSE.txt"] = notice;
  if (Object.values(files).reduce((n, text) => n + Buffer.byteLength(text), 0) > 160_000) throw new Error("source-budget: code bytes");
  // CSS imported by the entry is preserved. Global demo bundles are not imported as application resets.
  const examplePath = registry.files.find(({ path }) => /(?:^|\/)demos?\//.test(path) && /\.tsx$/.test(path) && pins.has(path))?.path;
  const example = examplePath ? pinned(examplePath) : "";
  const closure = fingerprint(canonical({ files, hashes, patches, packages: [...packages].sort(), license }));
  return { pin: { id: item.id, title: item.title, provider: item.provider, revision: item.upstreamCommit!, url: item.sourceURL,
    entry: item.entry, closure, license, fidelity: patches.length ? "source-adapted" : "upstream-original" }, files, hashes, patches, exports: api.exports, types: api.types, packages: [...packages].sort(),
    css: styles, api: entry, example: example.length < 20_000 ? example : "" };
}

export async function inspectCodeCatalog(repo: string) {
  const vault = resolve(repo, ".motionux-v9");
  const catalog = JSON.parse(await sourceRead(vault, "catalog.last-good.json", 24_000_000)) as Entry[];
  const pkg = JSON.parse(await sourceRead(repo, "platform/templates/hotel-dashboard/package.json"));
  const dependencies = new Set<string>(Object.keys(pkg.dependencies));
  const sources = new Map<string, SourceModule>();
  const rows: InventoryRow[] = [];
  for (const entry of catalog) {
    try {
      const source = await resolveModule(repo, entry, catalog, dependencies);
      sources.set(entry.id, source);
      rows.push({ id: entry.id, title: entry.title, provider: entry.provider, entry: entry.entry, ready: true, reason: "compiler-ready",
        details: source.patches.length ? "Source imports need tracked local adaptation." : "Pinned public source and dependency closure.",
        exports: source.exports, types: source.types, packages: source.packages, closure: source.pin.closure, license: source.pin.license });
    } catch (error) {
      rows.push({ id: entry.id, title: entry.title, provider: entry.provider, entry: entry.entry, ready: false, ...errorReason(error) });
    }
  }
  const reasons = Object.fromEntries([...new Set(rows.map(({ reason }) => reason))].sort().map((reason) => [reason, rows.filter((row) => row.reason === reason).length]));
  return { sources, rows, counts: { total: rows.length, compilerReady: sources.size, unavailable: rows.length - sources.size, reasons },
    fingerprint: fingerprint(canonical(rows)) };
}

export async function discoverCodeSources(repo: string, intent: Intent, preferred?: string) {
  const inventory = await inspectCodeCatalog(repo);
  const index = verifyIndex(JSON.parse(await sourceRead(resolve(repo, ".motionux-v9"), "brain/index.v1.json", 24_000_000)));
  const brain = createBrain(index);
  const scored = new Map<string, { score: number; needs: string[] }>();
  for (const need of intent.requirements) {
    const matches = brain.query("search", { schemaVersion: 1, query: need.search, maxResults: 20, require: { integrationKind: ["react"] } });
    for (const item of matches.candidates) {
      if (!inventory.sources.has(item.id)) continue;
      const existing = scored.get(item.id) ?? { score: 0, needs: [] };
      existing.score = Math.max(existing.score, item.score);
      existing.needs.push(need.id);
      scored.set(item.id, existing);
    }
  }
  const ordered = [...scored].sort((a, b) => b[1].score - a[1].score).slice(0, 23).map(([id, match]) => ({
    ...inventory.rows.find((row) => row.id === id)!, match,
  }));
  if (preferred && inventory.sources.has(preferred) && !ordered.some(({ id }) => id === preferred))
    ordered.push({ ...inventory.rows.find((row) => row.id === preferred)!, match: { score: 0, needs: [] } });
  return { inventory, candidates: ordered, preferred: preferred ? inventory.rows.find(({ id }) => id === preferred) ?? { id: preferred, ready: false, reason: "missing-source" } : undefined };
}

export async function restoreCodeSources(repo: string, pins: CodePin[]) {
  const inventory = await inspectCodeCatalog(repo);
  return pins.map((pin) => {
    const current = inventory.sources.get(pin.id);
    if (!current || canonical(pin) !== canonical(current.pin)) throw new BuildError(409, "Pinned source changed or is unavailable: " + pin.id);
    return current;
  });
}
