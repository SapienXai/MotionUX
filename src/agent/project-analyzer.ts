import ts from "typescript";
import type { Fact, Phase, SourceFile } from "./contracts.ts";

export type Cite = (file: SourceFile, start: number, end: number) => string;
export type Observe = (kind: Fact["kind"], code: string, value: string, evidence: string[], status?: Fact["status"]) => void;
export interface ImportRef { specifier: string; reference: string; names: Map<string, string>; resolved?: string }
interface StateLink { phase: Phase; prop: string; component: string; authorityLocal: "api" | null; evidence: string }
interface PropLink { component: string; prop: string; evidence: string; callEvidence: string; sourceCall: string }
export interface Module {
  imports: ImportRef[];
  serverExports: Map<string, string>;
  bindings: PropLink[];
  phases: StateLink[];
  local: { phase: Phase; evidence: string; note: string }[];
  malformed: boolean;
  truncated: boolean;
}

const validSymbol = /^[\p{L}_$][\p{L}\p{N}_$.-]{0,63}$/u;
const secret = /(?:secret|password|credential|apikey|privatekey|sk-[a-z\d_-]{12,}|gh[pousr]_|AKIA[A-Z0-9]{16})/i;
const reference = (text: string) => validSymbol.test(text) && !secret.test(text) ? text : null;
const primitives: Readonly<Record<string, string>> = {
  button: "button", form: "form", input: "input", select: "select", textarea: "input", a: "navigation",
  details: "disclosure", summary: "disclosure-trigger", dialog: "dialog", progress: "progress",
};
const roles = new Set(["tab", "tablist", "tabpanel", "dialog", "alertdialog", "status", "alert", "progressbar", "listbox", "slider", "switch"]);
const media = new Set(["img", "Image", "svg", "canvas", "video", "iframe", "picture"]);
const events = new Set(["onClick", "onSubmit", "onChange", "onSelect", "onToggle", "onOpenChange", "onValueChange", "onKeyDown", "onKeyUp",
  "onPointerDown", "onPointerUp", "onPointerCancel", "onTouchStart", "onTouchEnd", "onDragStart", "onDragEnd", "onFocus", "onBlur"]);
const phases: Readonly<Record<string, Phase>> = {
  pending: "pending", loading: "pending", processing: "pending", success: "success", confirmed: "success", succeeded: "success",
  completed: "success", settled: "success", paid: "success", authenticated: "success", error: "failure", failed: "failure", failure: "failure",
  cancelled: "cancellation", canceled: "cancellation", aborted: "cancellation",
};
const stateFields = new Set(["status", "state", "phase", "kind", "outcome"]);
const directive = (node: ts.Statement) => ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) ? node.expression.text : "";
const asyncFunction = (node: ts.FunctionDeclaration) => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
const exported = (node: ts.FunctionDeclaration) => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
const defaultExport = (node: ts.FunctionDeclaration) => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword);

function nearestFunction(node: ts.Node | undefined): ts.SignatureDeclaration | undefined {
  for (let current = node; current; current = current.parent) if (ts.isFunctionLike(current)) return current;
}
function renderedBy(node: ts.Node, owner: ts.SignatureDeclaration | undefined) {
  for (let current = node.parent; current && current !== owner; current = current.parent) {
    if (ts.isReturnStatement(current)) return true;
  }
  return Boolean(owner && ts.isArrowFunction(owner) && !ts.isBlock(owner.body));
}
function containingCase(node: ts.Node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isConditionalExpression(current)) return current.condition;
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return current.left;
    if (ts.isIfStatement(current)) return current.expression;
    if (ts.isFunctionLike(current)) return null;
  }
  return null;
}
function propSource(owner: ts.SignatureDeclaration, root: ts.Expression, checker: ts.TypeChecker) {
  const same = (a: ts.Identifier, b: ts.Identifier) => checker.getSymbolAtLocation(a) === checker.getSymbolAtLocation(b);
  const parameter = owner.parameters[0]?.name;
  if (!parameter) return null;
  if (ts.isIdentifier(parameter) && ts.isPropertyAccessExpression(root) && ts.isIdentifier(root.expression) &&
      same(parameter, root.expression)) return root.name.text;
  if (!ts.isObjectBindingPattern(parameter) || !ts.isIdentifier(root)) return null;
  const match = parameter.elements.find(item => !item.dotDotDotToken && !item.initializer && ts.isIdentifier(item.name) && same(item.name, root));
  return match && (match.propertyName && ts.isIdentifier(match.propertyName) ? match.propertyName.text : root.text);
}

export function analyzeModule(file: SourceFile, cite: Cite, observe: Observe, rsc: boolean): Module {
  const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true);
  const parse = source as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] };
  const result: Module = { imports: [], serverExports: new Map(), bindings: [], phases: [], local: [], malformed: Boolean(parse.parseDiagnostics?.length), truncated: false };
  const ref = (node: ts.Node) => cite(file, node.getStart(source), node.end);
  if (result.malformed) {
    const location = parse.parseDiagnostics![0].start;
    observe("component", "syntax-error", "Parser could not safely interpret this module", [cite(file, location, location + 1)], "blocked");
    return result;
  }
  // Bind identifiers in this source only. The host never resolves or reads an import.
  const program = ts.createProgram([file.path], { noLib: true, noResolve: true, allowJs: true }, {
    getSourceFile: name => name === file.path ? source : undefined,
    getDefaultLibFileName: () => "", writeFile: () => { throw new Error("Read-only analysis"); },
    getCurrentDirectory: () => "", getDirectories: () => [], fileExists: () => false, readFile: () => undefined,
    getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true, getNewLine: () => "\n",
  });
  const checker = program.getTypeChecker();
  const declaration = (name: ts.Identifier) => checker.getSymbolAtLocation(name)?.declarations?.[0];
  const statements = source.statements;
  const directives: ts.Statement[] = [];
  for (const statement of statements) { if (!directive(statement)) break; directives.push(statement); }
  const explicit = directives.find(node => ["use client", "use server"].includes(directive(node)));
  const serverOnly = statements.find(node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "server-only");
  const server = Boolean(explicit && directive(explicit) === "use server" || serverOnly);
  if (explicit || serverOnly || rsc) {
    const code = explicit && directive(explicit) === "use client" ? "client-module" : server ? "server-only" : "default-server-component";
    observe("boundary", code, code, [ref(explicit ?? serverOnly ?? statements[0] ?? source)], explicit || serverOnly ? "observed" : "inferred");
  }
  const potentialAuthorities: ts.FunctionDeclaration[] = [];
  for (const node of statements) {
    if (ts.isFunctionDeclaration(node) && node.name && exported(node) && asyncFunction(node) &&
        (server || Boolean(node.body?.statements[0] && directive(node.body.statements[0]) === "use server"))) {
      potentialAuthorities.push(node);
    }
    if (!((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))) continue;
    if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly || ts.isExportDeclaration(node) && node.isTypeOnly) continue;
    const names = new Map<string, string>();
    if (ts.isImportDeclaration(node) && node.importClause) {
      const { name, namedBindings } = node.importClause;
      if (name) names.set(name.text, "default");
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const item of namedBindings.elements) if (!item.isTypeOnly) names.set(item.name.text, item.propertyName?.text ?? item.name.text);
      }
    }
    result.imports.push({ specifier: node.moduleSpecifier.text, reference: ref(node.moduleSpecifier), names });
  }
  const identifiers: ts.Identifier[] = [];
  const jsx: (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[] = [];
  const schedules = new Set<ts.SignatureDeclaration | undefined>();
  const stack: ts.Node[] = [source];
  let count = 0;
  while (stack.length) {
    if (++count > 24_000) { result.truncated = true; break; }
    const node = stack.pop()!;
    ts.forEachChild(node, child => { stack.push(child); });
    if (ts.isFunctionDeclaration(node) && node.name && reference(node.name.text) && (exported(node) || defaultExport(node))) {
      observe("component", "export", node.name.text, [ref(node.name)]);
    }
    if (ts.isIdentifier(node)) identifiers.push(node);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) jsx.push(node);
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(source);
      if (events.has(name)) {
        const handler = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : undefined;
        const label = handler && ts.isIdentifier(handler) ? reference(handler.text) : null;
        const declarationNode = handler && ts.isIdentifier(handler) ? declaration(handler) : undefined;
        const located = declarationNode && (ts.isVariableDeclaration(declarationNode) || ts.isFunctionDeclaration(declarationNode)) && declarationNode.name;
        observe("handler", name, label ? "Bound handler " + label : "JSX handler binding", [ref(node), ...(located ? [ref(located)] : [])]);
      }
      if (name === "tabIndex" || name === "aria-live" || name === "aria-invalid" || name === "aria-busy" || name === "aria-expanded" ||
          name === "aria-describedby" || name === "lang" || name === "dir") observe("interaction", name, "JSX attribute", [ref(node)]);
      if (name === "className" && node.initializer && ts.isStringLiteral(node.initializer)) {
        const utilities = node.initializer.text.split(/\s+/);
        for (const family of ["spacing", "typography", "color", "responsive"] as const) {
          const patterns = { spacing: /^(?:p[xytbrls]?|m[xytbrls]?|gap|space-[xy])-\d/, typography: /^(?:font-|text-(?:xs|sm|base|lg|xl|[2-9]xl))/, color: /^(?:text|bg|border)-[a-z][\w-]+-\d/, responsive: /^(?:sm|md|lg|xl):/ };
          if (utilities.some(item => patterns[family].test(item))) observe("theme", "tailwind-" + family, "Static utility class", [ref(node)]);
        }
      }
    }
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const name = ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? expression.name.text : "";
      if (["useState", "useReducer", "useActionState", "useOptimistic", "useTransition"].includes(name)) {
        observe("state", name, "State hook call", [ref(node)]);
      }
      if (name === "focus") observe("interaction", "programmatic-focus", "Focus call", [ref(node)]);
      if (name === "useReducedMotion" || name === "useSpring") observe("motion", name, "Motion hook call", [ref(node)]);
      if (name === "setTimeout" || name === "setInterval" || name === "requestAnimationFrame") {
        for (let scope = nearestFunction(node); scope; scope = nearestFunction(scope.parent)) schedules.add(scope);
        observe("state", "visual-scheduler", name, [ref(node)]);
      }
      if (expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        result.imports.push({ specifier: node.arguments[0].text, reference: ref(node), names: new Map() });
      }
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      if ((name === "stiffness" || name === "damping" || name === "mass" || name === "duration") &&
          ts.isNumericLiteral(node.initializer) && /^\d{1,6}(?:\.\d{1,6})?$/.test(node.initializer.text)) {
        observe("motion", name, node.initializer.text, [ref(node)], "inferred");
      }
    }
  }
  for (const fn of potentialAuthorities) {
    if (!schedules.has(fn) && fn.body?.statements.some(statement => ts.isReturnStatement(statement) && statement.expression &&
      hasReadSource(statement.expression))) result.serverExports.set(defaultExport(fn) ? "default" : fn.name!.text, ref(fn.name!));
  }
  const constant = (node: ts.Identifier, owner: ts.SignatureDeclaration) => {
    const binding = declaration(node);
    return binding && ts.isVariableDeclaration(binding) && binding.pos < node.pos && nearestFunction(binding) === owner &&
      ts.isVariableDeclarationList(binding.parent) && Boolean(binding.parent.flags & ts.NodeFlags.Const) ? binding : null;
  };
  const bindingIsImport = (node: ts.Node) => ts.isIdentifier(node) && Boolean(declaration(node) &&
    (ts.isImportSpecifier(declaration(node)!) || ts.isImportClause(declaration(node)!)));
  const order = (a: ts.Node, b: ts.Node) => a.pos - b.pos;
  for (const node of jsx.sort(order)) {
    const tag = node.tagName.getText(source);
    const owner = nearestFunction(node);
    const role = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(source) === "role");
    if (role && ts.isJsxAttribute(role) && role.initializer && ts.isStringLiteral(role.initializer) && roles.has(role.initializer.text)) {
      observe("interaction", role.initializer.text, "Declared ARIA role", [ref(role)]);
    }
    if (Object.hasOwn(primitives, tag)) observe("interaction", primitives[tag], tag, [ref(node.tagName)]);
    if (media.has(tag)) observe("asset", tag, "Rendered element type in source", [ref(node.tagName)]);
    if (/^[A-Z]/.test(tag) && reference(tag)) observe("component", "jsx-use", tag, [ref(node.tagName)]);
    if (tag.startsWith("motion.")) observe("motion", "motion-element", "Motion JSX element", [ref(node.tagName)], "inferred");
    if (!owner || !renderedBy(node, owner)) continue;
    const attributes = node.attributes.properties;
    if (attributes.some(ts.isJsxSpreadAttribute)) continue;
    for (const attribute of attributes) {
      if (!ts.isJsxAttribute(attribute) || !attribute.initializer || !ts.isJsxExpression(attribute.initializer) ||
          !attribute.initializer.expression || !ts.isIdentifier(attribute.initializer.expression) ||
          !/^[A-Z]/.test(tag) || !reference(tag)) continue;
      const prop = reference(attribute.name.getText(source));
      if (!prop || !bindingIsImport(node.tagName) ||
          attributes.filter(item => ts.isJsxAttribute(item) && item.name.getText(source) === prop).length !== 1) continue;
      const binding = constant(attribute.initializer.expression, owner);
      const initializer = binding?.initializer;
      if (!binding || !initializer || !ts.isFunctionDeclaration(owner) || binding.parent.parent.parent !== owner.body ||
          !ts.isAwaitExpression(initializer) || !ts.isCallExpression(initializer.expression) ||
          !ts.isIdentifier(initializer.expression.expression) || !bindingIsImport(initializer.expression.expression)) continue;
      const input = attribute.initializer.expression;
      const symbol = checker.getSymbolAtLocation(input);
      if (identifiers.some(id => id !== binding.name && id !== input && id.text === input.text &&
          checker.getSymbolAtLocation(id) === symbol)) continue;
      result.bindings.push({ component: tag, prop, evidence: ref(attribute), callEvidence: ref(initializer),
        sourceCall: initializer.expression.expression.text });
    }
    const condition = containingCase(node);
    if (!condition || !ts.isBinaryExpression(condition) || condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken ||
        !ts.isStringLiteral(condition.right) || !Object.hasOwn(phases, condition.right.text)) continue;
    const anchor = ref(condition);
    if (!namesTrueBranch(node, condition)) continue;
    const phase = phases[condition.right.text];
    const lhs = condition.left;
    if (ts.isPropertyAccessExpression(lhs) && stateFields.has(lhs.name.text)) {
      const prop = propSource(owner, lhs.expression, checker);
      if (prop && ts.isFunctionDeclaration(owner) && owner.name && reference(owner.name.text) &&
          preservesReadSource(lhs.expression, identifiers, checker)) {
        result.phases.push({ phase, prop, component: defaultExport(owner) ? "default" : owner.name.text, authorityLocal: null, evidence: anchor });
      } else if (ts.isIdentifier(lhs.expression)) {
        const json = constant(lhs.expression, owner)?.initializer;
        if (json && ts.isAwaitExpression(json) && ts.isCallExpression(json.expression) && ts.isPropertyAccessExpression(json.expression.expression)) {
          const decode = json.expression.expression;
          if (decode.name.text === "json" && ts.isIdentifier(decode.expression)) {
            const response = constant(decode.expression, owner)?.initializer;
            const responseSymbol = checker.getSymbolAtLocation(decode.expression);
            if (response && ts.isAwaitExpression(response) && ts.isCallExpression(response.expression) &&
                ts.isIdentifier(response.expression.expression) && response.expression.expression.text === "fetch" &&
                !declaration(response.expression.expression) && preservesReadSource(lhs.expression, identifiers, checker) &&
                withinResponseGuard(node, responseSymbol, checker)) {
              result.phases.push({ phase, prop: "", component: "", authorityLocal: "api", evidence: anchor });
            }
          }
        }
      }
    } else if (ts.isIdentifier(lhs) && schedules.has(owner)) {
      result.local.push({ phase, evidence: anchor, note: "Render predicate shares a function with a visual scheduler. Authority is unproven." });
    }
  }
  for (const link of result.phases) observe("state", "phase-predicate", link.phase, [link.evidence]);
  for (const state of result.local) observe("state", "scheduled-phase-predicate", state.phase, [state.evidence], "inferred");
  return result;
}

function hasReadSource(expression: ts.Expression): boolean {
  if (ts.isCallExpression(expression) || ts.isPropertyAccessExpression(expression) || ts.isAwaitExpression(expression) || ts.isElementAccessExpression(expression)) return true;
  if (ts.isParenthesizedExpression(expression)) return hasReadSource(expression.expression);
  return ts.isBinaryExpression(expression) && (hasReadSource(expression.left) || hasReadSource(expression.right));
}

function preservesReadSource(origin: ts.Expression, identifiers: ts.Identifier[], checker: ts.TypeChecker) {
  const root = ts.isPropertyAccessExpression(origin) ? origin.expression : origin;
  if (!ts.isIdentifier(root)) return false;
  const symbol = checker.getSymbolAtLocation(root);
  if (!symbol) return false;
  return identifiers.filter(id => id.text === root.text && checker.getSymbolAtLocation(id) === symbol).every(id => {
    if (symbol.declarations?.includes(id.parent as ts.Declaration)) return true;
    let chain: ts.Node = id;
    let depth = 0;
    while ((ts.isPropertyAccessExpression(chain.parent) || ts.isElementAccessExpression(chain.parent)) && chain.parent.expression === chain) {
      chain = chain.parent;
      depth++;
    }
    const use = chain.parent;
    if (depth < (origin === root ? 1 : 2) || ts.isDeleteExpression(use) || ts.isPostfixUnaryExpression(use) ||
        ts.isCallExpression(use) && use.expression === chain) return false;
    if (ts.isPrefixUnaryExpression(use) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(use.operator)) return false;
    return !(ts.isBinaryExpression(use) && use.left === chain &&
      use.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && use.operatorToken.kind <= ts.SyntaxKind.LastAssignment);
  });
}

function withinResponseGuard(node: ts.Node, response: ts.Symbol | undefined, checker: ts.TypeChecker) {
  for (let child = node; child.parent; child = child.parent) {
    const parent = child.parent;
    if (ts.isFunctionLike(parent)) return false;
    if (ts.isIfStatement(parent) && child === parent.thenStatement && ts.isPropertyAccessExpression(parent.expression) &&
        parent.expression.name.text === "ok" && ts.isIdentifier(parent.expression.expression) &&
        checker.getSymbolAtLocation(parent.expression.expression) === response) return true;
  }
  return false;
}

function namesTrueBranch(node: ts.Node, predicate: ts.Expression) {
  for (let child = node; child.parent; child = child.parent) {
    const parent = child.parent;
    if (ts.isConditionalExpression(parent) && parent.condition === predicate) return child === parent.whenTrue;
    if (ts.isIfStatement(parent) && parent.expression === predicate) return child === parent.thenStatement;
    if (ts.isBinaryExpression(parent) && parent.left === predicate && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return child === parent.right;
    }
  }
  return false;
}

export function analyzeStyles(file: SourceFile, cite: Cite, observe: Observe) {
  // Remove comments while retaining offsets for source citations.
  const css = file.content.replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\r\n]/g, " "));
  for (const [code, expression, kind] of [
    ["custom-property", /(--[a-z][\w-]{0,62})\s*:/gi, "theme"],
    ["tailwind-theme", /@theme\b/g, "theme"],
    ["tailwind-css-import", /@import\s+["']tailwindcss["']/g, "theme"],
    ["reduced-motion-query", /prefers-reduced-motion\s*:\s*reduce/g, "motion"],
    ["css-transition", /\btransition(?:-duration|-timing-function)?\s*:/g, "motion"],
    ["css-keyframes", /@(?:-webkit-)?keyframes\b/g, "motion"],
  ] as const) {
    for (const item of [...css.matchAll(expression)].slice(0, 24)) {
      const value = item[1];
      if (!value || !secret.test(value)) observe(kind, code, value ?? code, [cite(file, item.index, item.index + item[0].length)]);
    }
  }
}
