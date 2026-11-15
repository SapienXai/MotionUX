import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { posix as path, resolve } from "node:path";
import ts from "typescript";
import { extendSources, sources } from "../v9/pilots.mjs";

const vault = resolve(".motionux-v9");
export const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const appRoots = { smoothui: "apps/docs", magicui: "apps/www", cultui: "apps/www", animateui: "apps/v1/apps/www" };
const providerStyles = { smoothui: "apps/docs/app/smoothui.css", magicui: "apps/www/styles/globals.css", kokonut: "app/globals.css",
  cultui: "apps/www/styles/globals.css", animateui: "apps/v1/apps/www/app/globals.css", motionprimitives: "app/globals.css" };
const licensePaths = { smoothui: "LICENSE", kokonut: "LICENSE", motionprimitives: "LICENCE.md" };
const cssDependencies = { animateui: { "tailwind-scrollbar": "4.0.2", clsx: "2.1.1" }, cultui: { "tailwindcss-animate": "1.0.7" } };
const extraDependencies = {
  smoothui: { "react-use-measure": "2.1.7", "@number-flow/react": "0.5.10", "motion-plus": null },
  magicui: { "canvas-confetti": "1.9.4", "@types/canvas-confetti": "1.9.0" },
};
const imageTypes = new Map(Object.entries({ ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".avif": "image/avif", ".gif": "image/gif", ".mp4": "video/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg" }));
const allowedPath = file => typeof file === "string" && file.length > 0 && !file.startsWith("/") && !file.includes("\\") && !file.split("/").some(part => part === ".." || part === ".");
const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();

export function providerAdapters() {
  const discovery = JSON.parse(readFileSync("metadata/v9-provider-candidates.json", "utf8"));
  if (!sources.magicui) extendSources(discovery);
  return new Map(discovery.providers.filter(provider => provider.revision && Object.hasOwn(providerStyles, provider.id) || provider.id === "reactbits")
    .map(provider => [provider.id, provider]));
}

export function openProvider(provider) {
  const root = resolve(vault, "upstream", provider.id);
  if (!existsSync(resolve(root, ".git"))) {
    execFileSync("git", ["clone", "--no-checkout", "--filter=blob:none", provider.repoURL + ".git", root], { stdio: "inherit" });
    execFileSync("git", ["-C", root, "fetch", "--depth=1", "origin", provider.revision], { stdio: "inherit" });
    execFileSync("git", ["-C", root, "checkout", "--detach", provider.revision], { stdio: "inherit" });
  }
  if (git(root, "rev-parse", "HEAD") !== provider.revision || git(root, "status", "--porcelain")) {
    throw new Error(provider.id + " checkout differs from the clean pinned revision");
  }
  const indexed = new Set(git(root, "ls-files").split("\n"));
  const read = file => {
    if (!allowedPath(file) || !indexed.has(file)) throw new Error("Missing pinned file " + file);
    const absolute = resolve(root, file);
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.size > 5 * 1024 * 1024) throw new Error("Unsupported pinned file " + file);
    return readFileSync(absolute);
  };
  const app = appRoots[provider.id] ?? "";
  const fromApp = file => path.join(app, file);
  const manifests = ["package.json", fromApp("package.json"), ...(provider.id === "smoothui"
    ? [...indexed].filter(file => /^packages\/[^/]+\/package\.json$/.test(file)) : [])];
  const packages = {};
  for (const file of new Set(manifests)) if (indexed.has(file)) {
    const record = JSON.parse(read(file));
    Object.assign(packages, record.devDependencies, record.dependencies, record.peerDependencies);
  }
  const base = sources[provider.id]?.dependencies ?? {};
  Object.assign(packages, base, cssDependencies[provider.id], extraDependencies[provider.id]);
  const stylesheet = providerStyles[provider.id];
  const css = stylesheet ? read(stylesheet).toString() : '@import "tailwindcss";\n';
  const notice = read(licensePaths[provider.id] ?? "LICENSE.md").toString();
  const font = sources[provider.id]?.font;
  const findPath = (...choices) => choices.flatMap(file => [file, ...[".tsx", ".ts", ".jsx", ".js", ".css", ".json", ".svg"].map(ext => file + ext),
    path.join(file, "index.tsx"), path.join(file, "index.ts"), path.join(file, "index.jsx")]).find(candidate => indexed.has(candidate));
  const resolveImport = (file, specifier) => {
    if (specifier.startsWith(".")) return findPath(path.join(path.dirname(file), specifier));
    if (specifier.startsWith("@/")) {
      const name = specifier.slice(2);
      if (provider.id === "magicui" && name === "lib/utils") return fromApp("registry/lib/utils.ts");
      return findPath(fromApp(name), name, path.join(app, "registry", name),
        path.join("apps/v1/packages/ui/src", name));
    }
    if (specifier.startsWith("@repo/smoothui/components/")) return findPath("packages/smoothui/components/" + specifier.split("/").at(-1));
    if (specifier === "@repo/smoothui-utils") return "packages/smoothui-utils/cn.ts";
    if (specifier === "@repo/ai-core") return "packages/smoothui/components/ai-core/index.tsx";
    if (specifier.startsWith("@workspace/ui/")) return findPath("apps/v1/packages/ui/src/" + specifier.slice(14));
    if (specifier.startsWith("@repo/shadcn-ui/")) return findPath("packages/shadcn-ui/" + specifier.slice(16), "packages/shadcn-ui/src/" + specifier.slice(16));
    if (specifier.startsWith("@ts-default/")) return findPath("src/ts-default/" + specifier.slice(12));
    if (specifier.startsWith("/")) return findPath(fromApp("public" + specifier), "public" + specifier);
    return undefined;
  };
  return { provider, read, indexed, findPath, resolveImport, packages, stylesheet, css, font, notice };
}

function demoFor(adapter, slug, entry, manual) {
  const { provider, indexed, read } = adapter;
  if (manual) return { file: manual };
  const family = provider.id;
  if (family === "kokonut") {
    const demo = "components/mdx/demos/" + slug + "-demo.tsx";
    if (indexed.has(demo)) return { file: demo };
  }
  if (family === "smoothui") return { file: "apps/docs/examples/" + slug + ".tsx" };
  if (family === "magicui") return { file: "apps/www/registry/example/" + slug + "-demo.tsx" };
  if (family === "cultui") return { file: "apps/www/registry/default/example/" + slug + "-demo.tsx" };
  if (family === "animateui") return { file: entry.replace("/registry/", "/registry/demo/") };
  if (family === "motionprimitives") {
    const docs = "app/docs/" + slug + "/";
    const code = indexed.has(docs + "page.mdx") ? read(docs + "page.mdx").toString() : "";
    const linked = [...code.matchAll(/from ["']\.\/([^"']+)["']/g)].map(match => adapter.findPath(docs + match[1]));
    const examples = [...indexed].filter(file => file.startsWith(docs) && file.endsWith(".tsx") && !/page\.tsx$/.test(file));
    return { file: linked.find(Boolean) ?? examples[0] };
  }
  if (family === "reactbits") {
    const [, , category, name] = entry.split("/");
    const file = "src/constants/code/" + category + "/" + name[0].toLowerCase() + name.slice(1) + "Code.js";
    const code = read(file).toString();
    const usage = code.match(/usage:\s*`([\s\S]*?)`,/)?.[1];
    const jsx = usage?.match(/^<[A-Z]/m)?.index;
    if (jsx === undefined) throw new Error("No renderable official usage in " + file);
    const declarations = usage.slice(0, jsx).replace(/^import[^\n]+\n/gm, "").trim();
    const relative = path.relative("demos", entry).replace(/\.tsx$/, "");
    return { file, wrapper: `import ${name} from "${relative}";\n${declarations}\nexport default function Demo() { return (\n${usage.slice(jsx).trim().replace(/;\s*$/, "")}\n); }\n` };
  }
  return { file: entry };
}

const packageName = specifier => specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
const lookslocal = specifier => /^\.|^\/|^@\/|^@repo\/|^@workspace\/|^@ts-default\//.test(specifier);
const normalizeImport = (from, to) => {
  const relative = path.relative(path.dirname(from), to).replace(/\.(tsx?|jsx?)$/, "");
  return relative.startsWith(".") ? relative : "./" + relative;
};

function findComponent(code, filename) {
  const ast = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest);
  if (ast.statements.some(node => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) ||
    ts.isExportAssignment(node) && !node.isExportEquals || ts.isExportDeclaration(node) && node.exportClause?.elements?.some(element => element.name.text === "default"))) return "default";
  for (const node of ast.statements) {
    if (!node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (node.name?.text && /^[A-Z]/.test(node.name.text)) return node.name.text;
    const variable = node.declarationList?.declarations.find(variable => /^[A-Z]/.test(variable.name.getText(ast)));
    if (variable) return variable.name.getText(ast);
  }
  throw new Error("No exported example component in " + filename);
}

export function inspectCandidate(adapter, selection, ordinal, sequence) {
  const { provider, read, packages, font, stylesheet } = adapter;
  const candidate = provider.candidates.find(candidate => candidate.id === selection.slug);
  const prefix = provider.repoURL + "/blob/" + provider.revision + "/";
  if (!candidate?.source?.startsWith(prefix)) throw new Error("No pinned upstream implementation");
  const entry = candidate.source.slice(prefix.length);
  const id = selection.id ?? provider.id + "-" + candidate.id;
  if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(id)) throw new Error("Invalid component ID " + id);
  // shadcn strips a literal src path segment when installing into a non-src project.
  const target = file => "originals/" + id + "/" + file.split("/").map(part => part === "src" ? "upstream" : part).join("/");
  const files = new Map();
  const assets = [];
  const external = new Set(["react", "react-dom"]);
  if (font) external.add("@fontsource-variable/" + font.toLowerCase());

  function add(file, supplied) {
    const output = target(file);
    if (files.has(output)) return output;
    const source = supplied ?? read(file).toString();
    const record = { path: output, target: output, upstreamPath: supplied ? undefined : file, type: "registry:file", source, content: source };
    files.set(output, record);
    if (!/\.[cm]?[jt]sx?$/.test(file)) return output;
    const imports = ts.preProcessFile(source, true, true).importedFiles;
    for (const { fileName: specifier } of imports) {
      const resolved = adapter.resolveImport(file, specifier);
      if (resolved) {
        const type = imageTypes.get(path.extname(resolved));
        let destination;
        if (type) {
          const bytes = read(resolved);
          assets.push({ path: resolved, sourceURL: prefix + resolved, sha256: digest(bytes) });
          destination = add(resolved + ".asset.ts", "export default " + JSON.stringify("data:" + type + ";base64," + bytes.toString("base64")) + ";\n");
        } else destination = add(resolved);
        const replacement = normalizeImport(output, destination);
        record.content = record.content.replaceAll(JSON.stringify(specifier), JSON.stringify(replacement))
          .replaceAll("'" + specifier + "'", "'" + replacement + "'");
      } else if (lookslocal(specifier)) throw new Error("Unresolved upstream import " + specifier + " in " + file);
      else external.add(packageName(specifier));
    }
    // Capture pinned public path assets in examples without forcing a host's public directory.
    const absoluteAssets = [...record.content.matchAll(/(["'])(\/[\w./-]+\.(?:svg|png|jpe?g|webp|avif|mp4|mp3|wav))\1/gi)];
    for (const [literal, , assetPath] of absoluteAssets) {
      const asset = adapter.resolveImport(file, assetPath);
      if (!asset) throw new Error("Missing named public asset " + assetPath);
      const bytes = read(asset);
      const type = imageTypes.get(path.extname(asset));
      assets.push({ path: asset, sourceURL: prefix + asset, sha256: digest(bytes) });
      record.content = record.content.replaceAll(literal, JSON.stringify("data:" + type + ";base64," + bytes.toString("base64")));
    }
    return output;
  }

  const entryPath = add(entry);
  const demo = demoFor(adapter, candidate.id, entry, selection.demo);
  if (!demo.file) throw new Error("No official demo");
  let demoPath;
  if (demo.wrapper) demoPath = add("demos/example.tsx", demo.wrapper);
  else {
    const source = read(demo.file).toString();
    const name = selection.export ?? findComponent(source, demo.file);
    const originalDemo = add(demo.file);
    demoPath = add("demos/example.tsx", "export { " + name + " as default } from " + JSON.stringify(normalizeImport(target("demos/example.tsx"), originalDemo)) + ";\n");
  }
  const cssPath = add("upstream.css", adapter.css);
  if (stylesheet) files.get(cssPath).upstreamPath = stylesheet;
  const noticePath = add("LICENSE.txt", adapter.notice);
  for (const [, specifier] of adapter.css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@(?:import|plugin)\s+["']([^"']+)["']/g)) {
    if (specifier !== "tailwindcss") external.add(packageName(specifier));
  }
  for (const name of [...external]) if (packages["@types/" + name]) external.add("@types/" + name);
  const dependencies = Object.fromEntries([...external].sort().map(name => {
    const version = packages[name];
    if (!version || /^(workspace:|catalog:|link:|file:|git)/.test(version)) throw new Error("Unsupported dependency " + name);
    return [name, version];
  }));
  const category = selection.category ?? ({
    backgrounds: "Effects", textanimations: "Text", text: "Text", texts: "Text", components: "Cards",
    buttons: "Buttons", animations: "Effects", micro: "Feedback", ai: "AI",
  })[candidate.category?.toLowerCase()] ?? candidate.category ?? "Effects";
  const usage = (font ? 'import "@fontsource-variable/' + font.toLowerCase() + '";\n' : "") +
    "import " + JSON.stringify("./" + cssPath) + ";\n" +
    "import Demo from " + JSON.stringify("./" + demoPath.replace(/\.tsx$/, "")) + ";\n\nexport default function Example() {\n  return <Demo />;\n}\n";
  return {
    id, slug: candidate.id, provider: provider.name, title: candidate.title, category,
    editionOrdinal: ordinal, addedSequence: sequence, renderCost: selection.renderCost ?? (candidate.category?.toLowerCase() === "backgrounds" || [...external].some(name => /^(ogl|three|@react-three\/)/.test(name)) ? "heavy" : "standard"),
    sourceMethod: "pinned-git-source", sourceAvailability: "available-local",
    fidelityStatus: [...files.values()].some(file => file.source !== file.content) ? "source-adapted" : "original-source-running",
    repo: provider.repoURL, upstreamCommit: provider.revision, demoURL: candidate.demo, sourceURL: candidate.source,
    upstreamHash: digest(read(entry)), entry: entryPath, css: [cssPath], fonts: font ? [font] : [], assets,
    dependencies, scenes: [], height: selection.height ?? (candidate.category?.toLowerCase() === "backgrounds" ? 420 : 380), usage,
    demo: demoPath, officialDemoPath: demo.file, licenseNoticePath: noticePath, files: [...files.values()],
  };
}
