import { createHash } from "node:crypto";
import ts from "typescript";
import { canonical, compareIds } from "../brain/indexer.ts";
import type { Citation, Fact, FileIdentity, Ownership, Phase, SourceFile, Target } from "./contracts.ts";
import type { Cite, Module, Observe } from "./project-analyzer.ts";

export const fingerprint = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export const projectFingerprint = (files: FileIdentity[]) => fingerprint(files.map(file => [file.path, file.hash]).sort(([a], [b]) => compareIds(a, b)));

export function collector() {
  const evidence = new Map<string, Citation>();
  const observations = new Map<string, Fact>();
  const lineStarts = new Map<string, number[]>();
  const cite: Cite = (file, start, end) => {
    let lines = lineStarts.get(file.path);
    if (!lines) {
      lines = [0];
      for (const match of file.content.matchAll(/\r\n|[\r\n]/g)) lines.push(match.index + match[0].length);
      lineStarts.set(file.path, lines);
    }
    const lineAt = (index: number) => {
      let low = 0;
      let high = lines.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (lines[middle] <= index) low = middle + 1;
        else high = middle;
      }
      return Math.max(1, low);
    };
    const startLine = lineAt(start);
    const endLine = Math.max(startLine, lineAt(end - 1));
    const id = "ref-" + fingerprint([file.path, startLine, endLine, file.hash]).slice(0, 16);
    evidence.set(id, { id, path: file.path, startLine, endLine, sha256: file.hash });
    return id;
  };
  const observe: Observe = (kind, code, value, refs, status = "observed") => {
    const key = [kind, code, value, status].join("\0");
    const current = observations.get(key);
    if (current) {
      for (const id of refs) if (current.evidence.length < 4 && !current.evidence.includes(id)) current.evidence.push(id);
    } else if (observations.size < 240) observations.set(key, { kind, code, value, status, evidence: refs });
  };
  function finish(ownership: Ownership[]) {
    const rows = [...observations.values()].sort((a, b) => compareIds(a.kind + a.code + a.value, b.kind + b.code + b.value));
    const used = new Set([...rows.flatMap(row => row.evidence), ...ownership.flatMap(row => row.evidence)]);
    return { observations: rows, evidence: [...evidence.values()].filter(ref => used.has(ref.id))
      .sort((a, b) => compareIds(a.path, b.path) || a.startLine - b.startLine || a.endLine - b.endLine) };
  }
  return { cite, observe, finish };
}

export function ownershipOf(modules: Map<string, Module>, root: string | null): Ownership[] {
  const phaseOrder: Phase[] = ["pending", "success", "failure", "cancellation"];
  const owned = new Map<Phase, Ownership>();
  // Prefer a trace anchored to the selected route. Other modules contribute evidence,
  // but arbitrary declarations in a transitive dependency cannot establish its state.
  const route = root && modules.get(root);
  if (route) {
    for (const state of route.phases.filter(state => state.authorityLocal === "api")) {
      owned.set(state.phase, { phase: state.phase, owner: "api", status: "observed", evidence: [state.evidence],
        note: "Render predicate reads a decoded fetch response in a successful response branch. Runtime API correctness needs verification." });
    }
    for (const link of route.bindings) {
      const action = route.imports.find(item => item.resolved && item.names.has(link.sourceCall));
      const view = route.imports.find(item => item.resolved && item.names.has(link.component));
      if (!action?.resolved || !view?.resolved) continue;
      const source = modules.get(action.resolved)?.serverExports.get(action.names.get(link.sourceCall)!);
      if (!source) continue;
      for (const state of modules.get(view.resolved)?.phases ?? []) {
        if (state.prop !== link.prop || state.component !== view.names.get(link.component)) continue;
        const prior = owned.get(state.phase);
        if (prior) continue;
        owned.set(state.phase, { phase: state.phase, owner: "server", status: "observed", evidence: [source, link.callEvidence, link.evidence, state.evidence],
          note: "Selected route passes an awaited server-module result to the exact render predicate. Actual backend settlement remains unverified." });
      }
    }
  }
  for (const module of modules.values()) {
    for (const state of module.local) {
      if (!owned.has(state.phase)) owned.set(state.phase, { phase: state.phase, status: "unknown", owner: "unknown",
        evidence: [state.evidence], note: state.note });
    }
  }
  return phaseOrder.map(phase => owned.get(phase) ?? { phase, owner: "unknown", status: "unknown", evidence: [],
    note: "No bounded source trace to this outcome." });
}

export const runtimeUnknowns = [
  "physical-mobile", "screen-reader", "rtl-runtime", "reduced-motion-runtime", "real-gesture-behavior",
  "performance-cpu-gpu", "backend-correctness", "visual-acceptance", "untraced-callbacks",
];

type JsonField = { key: string; value: ts.Expression; start: number; end: number };
function jsonProperties(node: ts.Expression | undefined, source: ts.SourceFile): JsonField[] {
  if (!node || !ts.isObjectLiteralExpression(node)) return [];
  return node.properties.flatMap(property => ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name)
    ? [{ key: property.name.text, value: property.initializer, start: property.name.getStart(source), end: property.end }] : []);
}
const readString = (field: JsonField | undefined) => field && ts.isStringLiteral(field.value) ? field.value.text : null;
const packageName = /^(?:@[a-z0-9][a-z0-9_.-]{0,63}\/)?[a-z0-9][a-z0-9_.-]{0,80}$/i;
const safeVersion = /^(?:[~^<>=*\dxXvV. |+\-]|(?:alpha|beta|canary|rc|next|latest)){1,100}$/;
const sensitive = /(?:^|[/_-])(?:secret|credential|password|token|api[-_]?key)(?:s?[/_.-]|$)/i;
export function readMetadata(file: SourceFile, cite: Cite, observe: Observe) {
  const source = ts.parseJsonText(file.path, file.content);
  const properties = (node: ts.Expression | undefined) => jsonProperties(node, source);
  const parse = source as ts.JsonSourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] };
  const fields = (parse.parseDiagnostics?.length ? [] : properties(source.statements[0]?.expression));
  const deps = new Map<string, { value: string; evidence: string }>();
  const aliasPaths = new Map<string, string[]>();
  let baseUrl = ".";
  let invalid = Boolean(parse.parseDiagnostics?.length) || new Set(fields.map(item => item.key)).size !== fields.length;
  const framework: Target["framework"] = { name: "unknown", next: null, react: null, tailwind: null };
  const field = (key: string) => fields.find(item => item.key === key);
  if (file.path === "package.json") {
    for (const group of ["devDependencies", "peerDependencies", "dependencies", "optionalDependencies"]) {
      const declaration = field(group);
      if (declaration) observe("dependency", "declared-dependency-group", group, [cite(file, declaration.start, declaration.end)]);
      const entries = properties(declaration?.value);
      if (entries.length > 300 || new Set(entries.map(item => item.key)).size !== entries.length) invalid = true;
      for (const item of entries.slice(0, 300)) {
        if (!packageName.test(item.key) || sensitive.test(item.key)) continue;
        const declared = readString(item);
        if (!declared) continue;
        const evidence = cite(file, item.start, item.end);
        deps.set(item.key, { value: safeVersion.test(declared) ? declared : "unresolved-specifier", evidence });
        if (/^(?:react|react-dom|next|vite|tailwindcss|motion|framer-motion|shadcn|@radix-ui\/[^/]+|@base-ui\/react)$/.test(item.key)) {
          observe("dependency", item.key, deps.get(item.key)!.value, [evidence]);
        }
      }
    }
    framework.name = deps.has("next") ? "next" : deps.has("react") ? "react" : "unknown";
    framework.next = deps.get("next")?.value ?? null;
    framework.react = deps.get("react")?.value ?? null;
    framework.tailwind = deps.get("tailwindcss")?.value ?? null;
  }
  if (file.path === "components.json") {
    const schema = field("$schema");
    if (schema && readString(schema)?.startsWith("https://ui.shadcn.com/")) observe("dependency", "shadcn-config", "shadcn/ui schema declared", [cite(file, schema.start, schema.end)]);
    for (const entry of properties(field("aliases")?.value).slice(0, 16)) {
      const value = readString(entry);
      if (/^[a-z][a-z0-9-]{0,32}$/i.test(entry.key) && value && !sensitive.test(value) && /^[@~a-z0-9._-]+(?:\/[a-z0-9._-]+)*$/i.test(value) &&
          !value.split("/").includes("..")) observe("alias", entry.key, value, [cite(file, entry.start, entry.end)]);
    }
  }
  if (file.path === "tsconfig.json" || file.path === "jsconfig.json") {
    const compiler = properties(field("compilerOptions")?.value);
    baseUrl = readString(compiler.find(item => item.key === "baseUrl")) ?? ".";
    if (field("extends")) {
      const entry = field("extends")!;
      observe("alias", "extends", "Inherited compiler configuration remains unresolved", [cite(file, entry.start, entry.end)], "unknown");
    }
    for (const entry of properties(compiler.find(item => item.key === "paths")?.value).slice(0, 32)) {
      if (!/^[~@a-z0-9_][~@a-z0-9_/.*-]{0,80}$/i.test(entry.key) || !ts.isArrayLiteralExpression(entry.value)) continue;
      const values = entry.value.elements.flatMap(element => ts.isStringLiteral(element) ? [element.text] : []).slice(0, 4);
      if (values.length) {
        aliasPaths.set(entry.key, values);
        if (!sensitive.test(entry.key)) observe("alias", "typescript-path", entry.key, [cite(file, entry.start, entry.end)]);
      }
    }
  }
  if (!fields.length && source.statements.length && !ts.isObjectLiteralExpression(source.statements[0].expression)) invalid = true;
  return { deps, aliasPaths, baseUrl, framework, invalid };
}
