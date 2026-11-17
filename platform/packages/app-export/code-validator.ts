import { posix } from "node:path";
import ts from "typescript";
import { BuildError, fingerprint } from "@motionux/build-core/store";
import { codeProposalSchema, type CodeProposal } from "@motionux/build-core/code-project";
import { analyzeModule, type SourceModule } from "./code-catalog.ts";

export const codePackages = new Set(["react", "react-dom", "motion/react", "lucide-react", "clsx", "tailwind-merge"]);
const runtimeImports = new Set(["runtime/state", "runtime/config"]);
export function validateProgram(raw: unknown, sources: SourceModule[]): CodeProposal {
  const result = codeProposalSchema.safeParse(raw);
  if (!result.success) throw new BuildError(422, "Generated program schema: " + result.error.issues.slice(0, 5).map(({ path, message }) => path.join(".") + " " + message).join(". "));
  const proposal = result.data;
  const files = new Map(proposal.files.map((file) => [file.path, file.content]));
  const available = new Map(sources.map((source) => [source.pin.id, source]));
  if (files.size !== proposal.files.length || !files.has("components/app.tsx") || !files.has("styles/app.css"))
    throw new BuildError(422, "Emit components/app.tsx, styles/app.css and unique bounded program files.");
  if (proposal.files.reduce((n, file) => n + Buffer.byteLength(file.content), 0) > 130_000)
    throw new BuildError(422, "Generated program exceeds its source budget.");
  const imports = new Map<string, string[]>();
  const sourceImports = new Map<string, Set<string>>();
  const sourceUses = new Set<string>();
  function fail(path: string, message: string): never { throw new BuildError(422, path + ": " + message); }
  for (const { path, content } of proposal.files) {
    if (path.endsWith(".css")) {
      if (/@(?:import|font-face|plugin|config)|expression\s*\(|url\s*\(/i.test(content))
        fail(path, "Import fonts and reviewed assets through the host. CSS cannot introduce external resources.");
      if (/(?:^|[\s,{}>+~])(?:html|body|:root)\s*\{/i.test(content))
        fail(path, "Scope application styles to .app. The host owns document margins.");
      continue;
    }
    const module = analyzeModule(path, content);
    if (module.forbidden.length) fail(path, "Disallowed capability " + module.forbidden.join(", "));
    const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const diagnostics = (file as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics;
    if (diagnostics.length) fail(path, ts.flattenDiagnosticMessageText(diagnostics[0].messageText, " "));
    const local: string[] = [];
    const ownSources = new Set<string>();
    for (const imported of module.imports) {
      if (!imported.startsWith(".")) {
        if (!codePackages.has(imported)) fail(path, "Import is outside the pinned runtime profile: " + imported);
        continue;
      }
      const absolute = posix.normalize(posix.join(posix.dirname(path), imported)).replace(/\.(?:tsx?|css)$/, "");
      if (absolute.startsWith("sources/") && /^sources\/[a-z0-9-]+$/.test(absolute)) {
        const id = absolute.slice(8);
        if (!available.has(id)) fail(path, "Source was not supplied as verified code context: " + id);
        ownSources.add(id);
        sourceUses.add(id);
      } else if (runtimeImports.has(absolute)) {
        continue;
      } else {
        const resolved = [absolute + ".tsx", absolute + ".ts"].find((file) => files.has(file));
        if (!resolved) fail(path, "Missing project module: " + imported);
        local.push(resolved);
      }
    }
    const runtimeBindings = new Map<string, string[]>();
    for (const statement of file.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.importClause ||
        statement.importClause.isTypeOnly) continue;
      const imported = statement.moduleSpecifier.text;
      const absolute = imported.startsWith(".") ? posix.normalize(posix.join(posix.dirname(path), imported)).replace(/\.tsx?$/, "") : "";
      if (!absolute.startsWith("sources/")) continue;
      const names: string[] = [];
      if (statement.importClause.name) names.push(statement.importClause.name.text);
      const bindings = statement.importClause.namedBindings;
      if (bindings && ts.isNamedImports(bindings))
        names.push(...bindings.elements.filter((item) => !item.isTypeOnly).map((item) => item.name.text));
      if (bindings && ts.isNamespaceImport(bindings)) names.push(bindings.name.text);
      runtimeBindings.set(absolute.slice(8), names);
    }
    const invoked = new Set<string>();
    function runtimeReference(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
        invoked.add(node.tagName.getText(file).split(".")[0]);
      if (ts.isCallExpression(node)) invoked.add(node.expression.getText(file).split(".")[0]);
      ts.forEachChild(node, runtimeReference);
    }
    runtimeReference(file);
    for (const id of ownSources) {
      if (!runtimeBindings.get(id)?.some((name) => invoked.has(name)))
        fail(path, "The imported source is never rendered or invoked: " + id);
    }
    imports.set(path, local);
    sourceImports.set(path, ownSources);
    function inspect(node: ts.Node) {
      if (ts.isElementAccessExpression(node)) {
        const receiver = node.expression.getText(file);
        const key = node.argumentExpression;
        if (["window", "document", "globalThis", "self"].includes(receiver) ||
          ts.isStringLiteralLike(key) && ["constructor", "__proto__", "prototype", "eval", "fetch"].includes(key.text))
          fail(path, "Computed ambient capability access is forbidden.");
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["setTimeout", "setInterval"].includes(node.expression.text) &&
        node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) fail(path, "String code timers are forbidden.");
      if (ts.isIdentifier(node) && ["globalThis", "navigator", "location", "frames", "opener", "parent", "top", "eval", "Function", "WebSocket", "XMLHttpRequest"].includes(node.text)) {
        const owner = node.parent;
        const propertyName = ts.isPropertyAccessExpression(owner) && owner.name === node ||
          (ts.isPropertyAssignment(owner) || ts.isPropertySignature(owner) || ts.isJsxAttribute(owner)) && owner.name === node;
        if (!propertyName) fail(path, "Use the host-provided route and persistent state APIs.");
      }
      if (ts.isPropertyAccessExpression(node) && ["constructor", "__proto__", "prototype", "cookie", "localStorage", "sessionStorage", "createElement", "write", "sendBeacon", "postMessage", "location"].includes(node.name.text)) {
        fail(path, "Disallowed browser capability: " + node.name.text);
      }
      if (ts.isPropertyAccessExpression(node) && ["parent", "top", "frames", "opener"].includes(node.name.text) &&
        /^(?:window|self|globalThis)$|\.defaultView$/.test(node.expression.getText(file)))
        fail(path, "Cross-window capability access is forbidden.");
      if (ts.isJsxAttribute(node)) {
        const name = node.name.getText(file);
        if (["action", "formAction", "target", "srcDoc"].includes(name)) fail(path, "Unsupported executable or navigation attribute.");
        if (["src", "href", "srcSet", "poster"].includes(name) && node.initializer && ts.isStringLiteral(node.initializer)) {
          if (/^(?:[a-z]+:|\/\/)/i.test(node.initializer.text) || node.initializer.text.startsWith("/api")) fail(path, "Links and assets must stay inside the exported application.");
        }
      }
      if (ts.isJsxAttribute(node) && node.name.getText(file) === "onSubmit" && !content.includes("preventDefault"))
        fail(path, "Local forms must prevent navigation.");
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "setInterval")
        fail(path, "Unbounded recurring timers are unsupported.");
      ts.forEachChild(node, inspect);
    }
    inspect(file);
  }
  const visited = new Set<string>();
  function reachable(path: string) {
    if (visited.has(path)) return;
    visited.add(path);
    imports.get(path)?.forEach(reachable);
  }
  reachable("components/app.tsx");
  for (const path of imports.keys()) if (!visited.has(path)) fail(path, "Unreachable generated module.");
  for (const use of proposal.usages) {
    if (!sourceImports.get(use.module)?.has(use.source)) fail(use.module, "Declared usage must import the real source.");
    if (!proposal.files.find(({ path, content }) => path === use.module && content.includes(use.instance)))
      fail(use.module, "Add the declared data-instance identifier to the actual source mount.");
    if (!proposal.pages.some(({ route }) => route === use.route)) fail(use.module, "Unknown usage route.");
  }
  for (const id of sourceUses) if (!proposal.usages.some(({ source }) => source === id)) fail(id, "Missing source interaction provenance.");
  for (const module of proposal.generated) {
    if (!files.has(module.file) || !module.generatedFrom.every((id) => sourceImports.get(module.file)?.has(id)))
      fail(module.file, "A generated module must actually import its cited source.");
  }
  if (!sourceUses.size) throw new BuildError(422, "The application must import a meaningful upstream source.");
  const keys = new Set(proposal.controls.map(({ key }) => key));
  if (keys.size !== proposal.controls.length) throw new BuildError(422, "Editable controls must have unique keys.");
  for (const field of proposal.controls) {
    if (!proposal.files.some(({ content }) => content.includes(JSON.stringify(field.key)) || content.includes("'" + field.key + "'") || content.includes("." + field.key.replaceAll("-", "_"))))
      throw new BuildError(422, "Editable control is not connected to the generated program: " + field.key);
  }
  return proposal;
}

export const programHashes = (proposal: CodeProposal) =>
  proposal.files.map(({ path, content }) => ({ path, sha256: fingerprint(content) }));
