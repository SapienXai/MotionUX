import { writeFile } from "node:fs/promises";
import { createServer } from "vite";
import ts from "typescript";

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
try {
  const { previews, references } = await server.ssrLoadModule("/studio/catalog.ts");
  const templates = {};
  for (const item of references) {
    const { default: story } = await previews[item.id]();
    const code = story.usage;
    const file = ts.createSourceFile(item.id + ".tsx", code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    const imports = new Set();
    const tags = [];
    function visit(node) {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text.startsWith("@/components/")) {
        const names = node.importClause?.namedBindings;
        if (names && ts.isNamedImports(names)) for (const name of names.elements) imports.add(name.name.text);
      }
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && imports.has(node.tagName.getText(file))) tags.push(node);
      ts.forEachChild(node, visit);
    }
    visit(file);
    if (tags.length !== 1) throw new Error(`Expected one registry component in ${item.id}`);
    const [tag] = tags;
    const attributes = tag.attributes.properties.map(node => {
      if (!ts.isJsxAttribute(node)) throw new Error(`Use explicit named JSX props in ${item.id}`);
      return { key: node.name.getText(file), text: node.getText(file) };
    });
    templates[item.id] = {
      setup: code.slice(0, tag.getStart(file) + 1),
      component: tag.tagName.getText(file),
      attributes,
      suffix: code.slice(tag.attributes.end),
    };
  }
  const output = JSON.stringify(templates, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    const { readFile } = await import("node:fs/promises");
    if (output !== await readFile("metadata/usage-templates.json", "utf8")) throw new Error("Usage templates changed. Run node scripts/update-usage-templates.mjs.");
  } else await writeFile("metadata/usage-templates.json", output);
} finally {
  await server.close();
}
