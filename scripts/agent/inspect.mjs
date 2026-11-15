import { dirname, extname, posix } from "node:path";
import { analyzeModule, analyzeStyles } from "../../src/agent/project-analyzer.ts";
import { collector, ownershipOf, projectFingerprint, readMetadata, runtimeUnknowns } from "../../src/agent/context.ts";
import { asContext } from "../../src/agent/validation.ts";
import { localSpecifier, workspace } from "./workspace.mjs";
import { resolveScreen, routeLabel, selector } from "./routes.mjs";

const sourceExt = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".css"];
const safePackages = /^(?:next|react|react-dom|motion|framer-motion|tailwindcss|shadcn|@radix-ui\/[a-z\d-]+|@base-ui\/react)(?:\/|$)/;
const sourcePrefix = /^(?:\.|\/|~|\\|(?:[a-z][a-z\d+.-]*):)/i;

function matchAlias(name, paths) {
  const matches = [];
  for (const [pattern, targets] of paths) {
    const first = pattern.indexOf("*");
    if (first < 0 && name === pattern) matches.push({ prefix: Infinity, medium: "", targets });
    if (first >= 0 && pattern.indexOf("*", first + 1) === -1) {
      const prefix = pattern.slice(0, first);
      const suffix = pattern.slice(first + 1);
      if (name.startsWith(prefix) && name.endsWith(suffix) && name.length >= prefix.length + suffix.length) {
        matches.push({ prefix: prefix.length, medium: name.slice(prefix.length, name.length - suffix.length), targets });
      }
    }
  }
  return matches.sort((a, b) => b.prefix - a.prefix)[0];
}

async function resolveImport(ws, from, specifier, aliases, baseUrl) {
  let proposals;
  const aliased = matchAlias(specifier, aliases);
  if (aliased) {
    proposals = aliased.targets.map(target => {
      const matched = target.replace("*", aliased.medium);
      if (/^(?:[a-z]+:|\/|~|\\)/i.test(matched) || /^(?:[a-z]+:|\/|~|\\)/i.test(baseUrl)) return null;
      return localSpecifier("_", baseUrl + "/" + matched);
    });
  } else if (specifier.startsWith(".")) proposals = [localSpecifier(from, specifier)];
  else if (!specifier.startsWith("node:") && (sourcePrefix.test(specifier) || specifier.startsWith("@/"))) {
    ws.note("blocked-or-unresolved-import", from);
    return null;
  } else return null;
  for (const proposal of proposals) {
    if (!proposal) { ws.note("blocked-or-unresolved-import", from); continue; }
    const target = await locate(ws, proposal, from);
    if (target !== undefined) return target;
  }
  ws.note("unresolved-local-import", from);
  return null;
}

async function locate(ws, path, from) {
  const extension = extname(path);
  const base = extension ? path.slice(0, -extension.length) : path;
  if (extension && !sourceExt.includes(extension)) {
    // Static paths to media and other non-source imports are never opened.
    if (/\.(?:png|jpeg|jpg|webp|avif|svg|woff2?|mp4|webm)$/i.test(extension)) return null;
    ws.note("unsupported-import-type", from);
    return null;
  }
  const mapped = { ".js": [".ts", ".tsx"], ".jsx": [".tsx"], ".mjs": [".mts"], ".cjs": [".cts"] }[extension] ?? [];
  const paths = extension ? [path, ...mapped.filter(ext => sourceExt.includes(ext)).map(ext => base + ext)]
    : sourceExt.filter(ext => ext !== ".css").map(ext => path + ext);
  for (const candidate of paths) {
    const contents = await ws.list(posix.dirname(candidate) === "." ? "" : posix.dirname(candidate));
    const entry = contents.find(item => item.name === posix.basename(candidate));
    if (entry?.kind === "link") { ws.note("symlink", from); return null; }
    if (entry?.kind === "file") return candidate;
  }
  if (!extension) {
    const parent = await ws.list(dirname(path) === "." ? "" : dirname(path));
    const folder = parent.find(item => item.name === posix.basename(path));
    if (folder?.kind === "link") { ws.note("symlink", from); return null; }
    if (folder?.kind === "directory") {
      const children = await ws.list(path);
      for (const ext of sourceExt) {
        const entry = children.find(item => item.name === "index" + ext);
        if (entry?.kind === "link") { ws.note("symlink", from); return null; }
        if (entry?.kind === "file") return path + "/" + entry.name;
      }
    }
  }
}

export async function inspectProject(input, options = {}) {
  const pick = selector(input);
  const ws = await workspace(input.project, options);
  const { cite, observe, finish } = collector();
  const dependencies = new Map();
  const modules = new Map();
  const framework = { name: "unknown", next: null, react: null, tailwind: null };
  const packageFile = pick.route !== null || pick.file ? await ws.read("package.json") : null;
  if (packageFile) {
    const metadata = readMetadata(packageFile, cite, observe);
    if (metadata.invalid) ws.note("malformed-project-metadata", "package.json");
    Object.assign(framework, metadata.framework);
    for (const [name, info] of metadata.deps) {
      // Needed for per-candidate dependency checks. The report never emits unreferenced dependencies.
      dependencies.set(name, info);
    }
  }
  const result = await resolveScreen(ws, pick, framework.name);
  const match = result.match;
  let source = null;
  if (match) {
    const file = await ws.read(match.source);
    if (file) source = match.source;
    else ws.note("selected-file-unavailable");
  }
  if (source) {
    const aliases = new Map();
    let baseUrl = ".";
    for (const name of ["tsconfig.json", "jsconfig.json", "components.json", "README.md", "AGENTS.md"]) {
      if (name === "jsconfig.json" && ws.files.has("tsconfig.json")) continue;
      const file = await ws.read(name);
      if (!file) continue;
      if (name.endsWith(".json")) {
        const metadata = readMetadata(file, cite, observe);
        if (metadata.invalid) ws.note("malformed-project-metadata", name);
        if (name !== "components.json") {
          baseUrl = metadata.baseUrl;
          for (const [key, paths] of metadata.aliasPaths) aliases.set(key, paths);
        }
      } else {
        observe("guidance", "untrusted-document", "Read as evidence only", [cite(file, 0, 1)]);
        for (const topic of file.content.matchAll(/^#{1,4}\s+(?:design tokens|design system|theme|motion policy|accessibility)\s*$/gim)) {
          observe("guidance", "design-topic", "Project guidance topic", [cite(file, topic.index, topic.index + topic[0].length)], "inferred");
        }
      }
    }
    const queue = [source, ...match.layouts].map(path => ({ path, depth: 0 }));
    const scheduled = new Set(queue.map(item => item.path));
    for (const { path, depth } of queue) {
      if (!ws.atDepth(depth)) break;
      const file = await ws.read(path);
      if (!file) continue;
      let imports;
      try {
        if (path.endsWith(".css")) {
          analyzeStyles(file, cite, observe);
          const declarations = file.content.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, " "));
          imports = [...declarations.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map(item =>
            ({ specifier: item[1], reference: cite(file, item.index, item.index + item[0].length) }));
        } else {
          const module = analyzeModule(file, cite, observe, match.sourceKind === "app-router" && (path === source || match.layouts.includes(path)));
          modules.set(path, module);
          if (module.malformed) ws.note("malformed-source", path);
          if (module.truncated) ws.note("ast-node-budget", path);
          imports = module.imports;
        }
      } catch {
        ws.note("parser-limit", path);
        continue;
      }
      for (const ref of imports) {
        if (!ws.check()) break;
        ws.budget.importsSeen++;
        if (ws.budget.importsSeen > ws.bounds.probes) { ws.note("import-budget", path); break; }
        const target = await resolveImport(ws, path, ref.specifier, aliases, baseUrl);
        if (target) {
          ref.resolved = target;
          if (!scheduled.has(target) && ws.atDepth(depth + 1, path)) {
            ws.budget.importsTraversed++;
            scheduled.add(target);
            queue.push({ path: target, depth: depth + 1 });
          }
        } else if (safePackages.test(ref.specifier)) {
          // Keep only known framework/library identifiers and no raw import paths.
          const name = ref.specifier.split("/").slice(0, ref.specifier.startsWith("@") ? 2 : 1).join("/");
          observe("dependency", "source-import", name, [ref.reference]);
        }
      }
    }
  }
  ws.check();
  const states = ownershipOf(modules, source);
  const files = ws.manifest();
  const issues = ws.issueList();
  const coverage = { ...ws.budget, filesRead: files.length, issues };
  const target = {
    route: routeLabel(pick, match),
    source,
    sourceKind: source ? match.sourceKind : null,
    layouts: source ? match.layouts.filter(path => ws.files.has(path)) : [],
    dynamicSegments: source ? match.parts.filter(part => part.startsWith("[")) : [],
    projectFingerprint: projectFingerprint(files),
    framework,
    coverage,
  };
  const status = issues.length ? "partial-inspection" : source ? "inspected" : "need-more-context";
  const context = asContext({ schemaVersion: 1, mode: "read-only", status, target, choices: result.choices.length > 1 ? result.choices : [],
    files, ...finish(states), stateOwnership: states, unknowns: runtimeUnknowns });
  return { context, dependencies, root: ws.root };
}
