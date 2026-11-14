import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix } from "node:path";
import ts from "typescript";

const registry = JSON.parse(readFileSync("registry.json"));
const provenance = JSON.parse(readFileSync("metadata/components.json"));
const groups = { navigation: "Navigation", feedback: "Feedback", inputs: "Form controls", gestures: "Gestures and cards", signals: "Typography, AI and media" };
const root = "components/recipes/";
const expected = Object.entries(groups).map(([group, title]) => {
  const entry = root + group + ".tsx";
  const files = new Map();
  function visit(path) {
    if (files.has(path)) return;
    const content = readFileSync(path, "utf8");
    const type = path.endsWith(".css") ? "registry:file" : path.endsWith(".tsx") ? "registry:component" : "registry:lib";
    files.set(path, {
      path, type, target: "@components/sapienx-motion/" + path.slice("components/".length),
    });
    if (type === "registry:file") return;
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    function imports(node) {
      const specifier = ts.isImportDeclaration(node) ? node.moduleSpecifier :
        ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : undefined;
      if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith(".")) {
        const base = posix.normalize(posix.join(dirname(path), specifier.text));
        if (!base.startsWith("components/")) throw new Error(`Recipe import escapes the registry: ${base}`);
        const dependency = [base, base + ".tsx", base + ".ts"].find(candidate => existsSync(candidate));
        if (!dependency) throw new Error(`Unresolved recipe import: ${base}`);
        visit(dependency);
      }
      ts.forEachChild(node, imports);
    }
    imports(source);
  }
  visit(entry);
  return {
    name: "gallery-recipes-" + group,
    type: "registry:component",
    title: `Gallery recipes · ${title}`,
    description: "The same interactive examples used in MotionUX Studio, including sample content, component styles and semantic theme tokens.",
    dependencies: ["motion@14.14.0", "lucide-react@0.454.0", "@fontsource-variable/inter@5.3.0"],
    files: [...files.values()],
  };
});

if (process.argv.includes("--check")) {
  const entries = registry.items.filter(item => item.name.startsWith("gallery-recipes-"));
  if (JSON.stringify(expected) !== JSON.stringify(entries)) throw new Error("Recipe registry drift. Run node scripts/recipe-registry.mjs.");
} else {
  registry.items = registry.items.filter(item => !item.name.startsWith("gallery-recipes-")).concat(expected);
  for (const { name } of expected) provenance.items[name] = {
    source: "MotionUX Studio interactive examples and component sources",
    kind: "original",
    license: "MIT",
    consumers: ["MotionUX Studio"],
    evidence: "scripts/fixture-parity.mjs",
  };
  writeFileSync("registry.json", JSON.stringify(registry, null, 2) + "\n");
  writeFileSync("metadata/components.json", JSON.stringify(provenance, null, 2) + "\n");
}
