import { dirname } from "node:path";
import { AgentError, pathSafe } from "./workspace.mjs";

const extensions = ["tsx", "ts", "jsx", "js"];
const sourceExtension = /\.(?:tsx?|jsx?|mjs|cjs)$/;
const group = /^\([\w-]+\)$/;
const dynamic = /^\[[\w-]+\]$/;
const rest = /^\[(?:\[)?\.\.\.[\w-]+\]\]?$/;
const optional = /^\[\[\.\.\.[\w-]+\]\]$/;
const slots = /^(?:@|\(\.)/;

function boundary(path, parts) {
  return { source: path, parts, sourceKind: "component", layouts: [] };
}

export function selector(input) {
  if (input.route && input.file) throw new AgentError("invalid-selector", "Choose one of --route or --file.");
  if (input.file) {
    const path = input.file.replace(/^\.\//, "");
    if (!pathSafe(path) || !sourceExtension.test(path)) throw new AgentError("invalid-selector", "Choose a workspace-relative JS or TS screen file.");
    return { file: path, route: null, parts: [] };
  }
  if (!input.route) return { file: null, route: null, parts: [] };
  const route = input.route.length > 1 ? input.route.replace(/\/$/, "") : input.route;
  const parts = route === "/" ? [] : route.slice(1).split("/");
  if (!route.startsWith("/") || parts.length > 12 ||
      !parts.every(part => safeLiteral(part) || dynamic.test(part) || rest.test(part))) {
    throw new AgentError("invalid-selector", "Use a local route such as /bookings/confirmation without a query, fragment or traversal.");
  }
  return { file: null, route, parts };
}

const safeLiteral = token => !/(?:gh[pousr]_[a-z\d]{8,}|sk-[a-z\d_-]{12,}|AKIA[A-Z0-9]{16})/i.test(token) && /^[\p{L}\p{N}_~-][\p{L}\p{N}._~-]{0,80}$/u.test(token) && !token.includes("..");
const possibleMatch = (name, parts, index) => group.test(name) || name === parts[index] ||
  (dynamic.test(name) && index < parts.length) || (rest.test(name) && (index < parts.length || optional.test(name)));
const precedence = name => group.test(name) ? 0 : rest.test(name) ? (optional.test(name) ? 1 : 2) : dynamic.test(name) ? 3 : 4;
const scoreRoute = names => [...names.filter(name => !group.test(name)).map(precedence), 5];
function compareMatch(a, b) {
  const left = scoreRoute(a.parts);
  const right = scoreRoute(b.parts);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i] !== right[i]) return (right[i] ?? 0) - (left[i] ?? 0);
  }
  return 0;
}

async function findApp(ws, base, requested) {
  const matches = [];
  async function search(path, index, parts, parentLayouts) {
    if (!ws.check()) return;
    if (parts.length > ws.bounds.routeDepth) { ws.note("route-depth"); return; }
    const entries = await ws.list(path);
    const layouts = [...parentLayouts];
    const layoutEntries = entries.filter(item => extensions.some(ext => item.name === "layout." + ext));
    if (layoutEntries.length > 1) ws.note("ambiguous-layout", path);
    layouts.push(...layoutEntries.map(item => path + "/" + item.name));
    if (index === requested.length) {
      for (const item of entries.filter(entry => extensions.some(ext => entry.name === "page." + ext))) {
        matches.push({ source: path + "/" + item.name, parts, sourceKind: "app-router", layouts });
      }
    }
    for (const entry of entries) {
      if (entry.kind === "file") continue;
      if (slots.test(entry.name)) {
        // Parallel slots under a selected layout can contribute an independent scene.
        if (entry.name.startsWith("@") || index === requested.length) ws.note("parallel-or-intercepting-route", path);
        continue;
      }
      if (!possibleMatch(entry.name, requested, index)) continue;
      if (entry.kind === "link") { ws.note("symlink"); continue; }
      const next = group.test(entry.name) ? index : rest.test(entry.name) ? requested.length : index + 1;
      await search(path + "/" + entry.name, next, [...parts, entry.name], layouts);
    }
  }
  await search(base, 0, [], []);
  return matches;
}

async function findPages(ws, base, requested) {
  const matches = [];
  const rootEntries = await ws.list(base);
  const layouts = rootEntries.filter(entry => extensions.some(ext => entry.name === "_app." + ext)).map(entry => base + "/" + entry.name);
  if (layouts.length > 1) ws.note("ambiguous-layout", base);
  async function search(path, index, parts) {
    const entries = await ws.list(path);
    for (const entry of entries) {
      const ext = extensions.find(ext => entry.name.endsWith("." + ext));
      const name = entry.kind === "directory" || !ext ? entry.name : entry.name.slice(0, -ext.length - 1);
      if (name.startsWith("_") || name === "api" && index === 0) continue;
      const full = path + "/" + entry.name;
      if (entry.kind !== "directory" && ext) {
        if (name === "index" && index === requested.length || name === requested[index] && index === requested.length - 1 ||
            dynamic.test(name) && index === requested.length - 1 || rest.test(name) && (index < requested.length || optional.test(name))) {
          matches.push({ source: full, parts: name === "index" ? parts : [...parts, name], sourceKind: "pages-router", layouts });
        }
      } else if (index < requested.length && (name === requested[index] || dynamic.test(name))) {
        if (entry.kind === "link") ws.note("symlink");
        else if (entry.kind === "directory") await search(full, index + 1, [...parts, name]);
      }
    }
  }
  await search(base, 0, []);
  return matches;
}

export async function resolveScreen(ws, selection, framework) {
  if (selection.file) {
    const path = selection.file;
    const root = /^(?:src\/)?app\//.exec(path)?.[0];
    if (root && /\/page\.(?:tsx?|jsx?)$/.test(path)) {
      const parts = dirname(path).slice(root.length).split("/").filter(Boolean);
      const layouts = [];
      for (let i = 0; i <= parts.length; i++) {
        const folder = [root.slice(0, -1), ...parts.slice(0, i)].join("/");
        layouts.push(...(await ws.list(folder)).filter(entry => extensions.some(ext => entry.name === "layout." + ext))
          .map(entry => folder + "/" + entry.name));
      }
      return { match: { ...boundary(path, parts), sourceKind: "app-router", layouts }, choices: [] };
    }
    return { match: boundary(path, []), choices: [] };
  }
  if (selection.route === null) return { match: null, choices: [] };
  const matches = [];
  if (framework === "next" || framework === "unknown") {
    const roots = await ws.list("");
    const src = roots.some(item => item.name === "src") ? await ws.list("src") : [];
    for (const [kind, search] of [["app", findApp], ["pages", findPages]]) {
      const base = roots.some(item => item.name === kind) ? kind : src.some(item => item.name === kind) ? "src/" + kind : null;
      if (base) matches.push(...await search(ws, base, selection.parts));
    }
  }
  if (framework !== "next" && !matches.length && selection.route === "/") {
    for (const folder of ["src", ""]) {
      const entries = (await ws.list(folder)).filter(entry => extensions.some(ext => entry.name === "main." + ext || entry.name === "index." + ext));
      if (entries.length) {
        matches.push(...entries.map(entry => ({ ...boundary(folder ? folder + "/" + entry.name : entry.name, []), sourceKind: "react-entry" })));
        break;
      }
    }
  }
  matches.sort(compareMatch);
  const best = matches.filter(match => compareMatch(match, matches[0]) === 0);
  return { match: best.length === 1 ? best[0] : null, choices: best.map(match => match.source).sort().slice(0, 12) };
}

export function routeLabel(selection, match) {
  if (!match || match.sourceKind === "component" || !match.parts.length) return selection.route;
  const pattern = "/" + match.parts.filter(part => !group.test(part)).join("/");
  return pattern;
}
