import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, dirname, posix, resolve } from "node:path";
import { createBrain } from "../../../src/brain/ranker.ts";
import { verifyIndex } from "../../../src/brain/indexer.ts";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import type { Intent, SourcePin } from "@motionux/build-core/source-graph";

const idPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
const filePattern = /^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/;
const safe = (path: string) => filePattern.test(path) && !path.split("/").some((part) => part === "." || part === "..");
const packages = new Set(["react", "react-dom", "motion", "clsx", "tailwind-merge", "lucide-react"]);
const providerHosts = new Set(["github.com", "raw.githubusercontent.com"]);
const types = [
  { adapter: "tabs", exports: ["SmoothTab"], hint: "Controlled motion tabs, rendering distinct content and mobile swipe. Provide item labels." },
  { adapter: "wheel", exports: ["WheelPicker"], hint: "A controlled keyboard and touch wheel for choosing a playlist, status or known option." },
  { adapter: "slots", exports: ["SlotPicker"], hint: "Select an available date/time/duration from supplied availability. onBook is a local selection." },
  { adapter: "accordion", exports: ["Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent"], hint: "Open and close grouped details, choices, FAQs or reference content." },
  { adapter: "disclosure", exports: ["Disclosure", "DisclosureTrigger", "DisclosureContent"], hint: "Expandable details and contextual help." },
  { adapter: "transition", exports: ["TransitionPanel"], hint: "Switch between multiple data views with explicit activeIndex and optional transition." },
  { adapter: "number", exports: ["NumberTicker"], hint: "Live numerical feedback for a count, with startValue and delay controls." },
  { adapter: "highlight", exports: ["AnimatedBackground"], hint: "Animated selection indicator for grouped records or filters." },
] as const;
type Contract = typeof types[number];
type FilePin = { path: string; sha256: string; installedSHA256?: string };
type Entry = {
  id: string; title: string; provider: string; repo?: string; upstreamCommit?: string; sourceURL?: string;
  upstreamHash: string; entry: string; licenseNoticePath?: string; installRecipe: string;
  codeFiles: FilePin[]; assets?: unknown[];
};
export type ResolvedSource = {
  pin: SourcePin;
  files: Record<string, string>;
  exports: readonly string[];
  description: string;
  excerpt: string;
  example: string;
  upstreamFiles: Record<string, { original: string; installed: string }>;
};

async function bounded(root: string, path: string, limit: number) {
  if (!safe(path)) throw new Error("Unsafe source path.");
  const target = resolve(root, path);
  const stat = await lstat(target);
  if (!stat.isFile() || stat.nlink !== 1 || stat.size > limit || await realpath(target) !== target)
    throw new Error("Invalid prepared source file.");
  return readFile(target, "utf8");
}

function contractFor(code: string): Contract | undefined {
  const declared = new Set<string>();
  for (const match of code.matchAll(/\bexport\s+(?:default\s+)?(?:function|const|class)\s+(\w+)|\bexport\s*\{([^}]+)\}/g)) {
    for (const name of (match[1] ?? match[2]).split(",")) declared.add(name.trim());
  }
  return types.find(({ exports }) => exports.every((name) => declared.has(name)));
}

async function loadSource(vault: string, item: Entry, matched: string[], repositoryNotice?: Entry): Promise<ResolvedSource> {
  if (!idPattern.test(item.id) || !safe(item.entry) || !/^[0-9a-f]{40}$/.test(item.upstreamCommit ?? "") ||
    !item.sourceURL || !providerHosts.has(new URL(item.sourceURL).hostname) || !item.sourceURL.includes(item.upstreamCommit!) ||
    (item.assets?.length ?? 0) > 0) throw new Error("Source lacks an eligible pinned, asset-free closure.");
  const registryName = basename(item.installRecipe);
  const recipe = JSON.parse(await bounded(vault, "registry/" + registryName, 1_100_000)) as {
    name: string; files: { path: string; content: string }[];
  };
  if (recipe.name !== item.id || !Array.isArray(recipe.files)) throw new Error("Wrong source recipe.");
  const registry = new Map(recipe.files.map(({ path, content }) => [path, content]));
  const pins = new Map(item.codeFiles.map((file) => [file.path, file]));
  function pinned(path: string) {
    const source = registry.get(path);
    const pin = pins.get(path);
    if (!safe(path) || typeof source !== "string" || !pin || fingerprint(source) !== (pin.installedSHA256 ?? pin.sha256))
      throw new Error("Pinned source digest changed.");
    return source;
  }

  const entry = pinned(item.entry);
  if (pins.get(item.entry)?.sha256 !== item.upstreamHash) throw new Error("Upstream entry digest changed.");
  const contract = contractFor(entry);
  if (!contract) throw new Error("Source has no supported public API.");
  const adapter = contract.adapter;
  let notice: string;
  if (item.licenseNoticePath) notice = pinned(item.licenseNoticePath);
  else if (repositoryNotice?.licenseNoticePath) {
    const path = repositoryNotice.licenseNoticePath;
    const sibling = JSON.parse(await bounded(vault, "registry/" + basename(repositoryNotice.installRecipe), 1_100_000)) as typeof recipe;
    const file = sibling.files.find((entry) => entry.path === path);
    const pin = repositoryNotice.codeFiles.find((entry) => entry.path === path);
    if (!file || !pin || fingerprint(file.content) !== (pin.installedSHA256 ?? pin.sha256) ||
      pin.sha256 !== "f668f5ef3635eb906f10b1eea9a32e449eb6e1a183ab6879ef6d56c0980dd2f3")
      throw new Error("Pinned repository license is missing.");
    notice = file.content;
  } else throw new Error("Source has no rights record.");
  // License grants are evaluated on the actual notice. Sources without a recognized grant stay out of export and model context.
  const grant = notice.replace(/\s+/g, " ").trim();
  const license = /^MIT License Copyright /i.test(grant) &&
    /Permission is hereby granted, free of charge[\s\S]+to deal in the Software without restriction/i.test(grant) &&
    !/commons clause|non[- ]commercial|additional restrictions|commercial license/i.test(grant)
    ? "MIT"
    : /Apache License[\s\S]+Version 2\.0[\s\S]+Grant of Copyright License/i.test(grant) ? "Apache-2.0" : "";
  if (!license) throw new Error("Source redistribution terms require review.");
  if (license === "Apache-2.0" && recipe.files.some(({ path }) => /(?:^|\/)NOTICE(?:\.|$)/i.test(path) && path !== item.licenseNoticePath))
    throw new Error("Additional Apache notices require review.");

  const files: Record<string, string> = {};
  const upstreamFiles: ResolvedSource["upstreamFiles"] = {};
  function visit(path: string) {
    if (Object.hasOwn(upstreamFiles, path)) return;
    if (Object.keys(upstreamFiles).length >= 12) throw new Error("Source closure exceeds its file limit.");
    let code = pinned(path);
    if (!/\.[cm]?[jt]sx?$/.test(path) || /\b(?:require|import)\s*\(|\bfetch\s*\(|\bhttps?:\/\//.test(code.replace(/^[ \t]*(?:\/\/|\*).*$/gm, "")))
      throw new Error("Source needs a separate runtime review.");
    upstreamFiles[path] = { original: pins.get(path)!.sha256, installed: fingerprint(code) };
    const imports = [...code.matchAll(/(?:\bfrom\s*|\bimport\s*)(['"])([^'"\r\n]+)\1/g)];
    for (const match of imports) {
      const name = match[2];
      if (!name.startsWith(".") && !name.startsWith("@/")) {
        if (!packages.has(name.split("/")[0])) throw new Error("Dependency is not in the pinned Next profile.");
        continue;
      }
      const base = name.startsWith("@/") ? name.slice(2) : posix.normalize(posix.join(dirname(path), name));
      const target = [base, base + ".ts", base + ".tsx", base + "/index.tsx", base + "/index.ts"].find((file) => registry.has(file));
      if (!target) throw new Error("A required source dependency is missing.");
      visit(target);
      if (name.startsWith("@/")) {
        const relative = posix.relative(dirname(path), target).replace(/\.tsx?$/, "");
        code = code.replaceAll(match[1] + name + match[1], match[1] + (relative.startsWith(".") ? relative : "./" + relative) + match[1]);
      }
    }
    // React 19 changed unparameterized ReactElement props to unknown. These casts erase at compilation.
    if (path === item.entry && adapter === "accordion")
      code = code.replace("React.isValidElement(child)", "React.isValidElement<Record<string, unknown>>(child)");
    if (path === item.entry && adapter === "disclosure")
      code = code.replace("React.isValidElement(child)", "React.isValidElement<Record<string, unknown>>(child)")
        .replaceAll("child as React.ReactElement)", "child as React.ReactElement<{ className?: string }>)");
    files[path] = code;
  }
  visit(item.entry);
  files["LICENSE.txt"] = notice;
  if (Object.values(files).reduce((sum, value) => sum + Buffer.byteLength(value), 0) > 90_000)
    throw new Error("Source closure exceeds its byte limit.");
  const exampleFile = recipe.files.find(({ path }) => /(?:^|\/)demos?\//.test(path) && /\.tsx$/.test(path) && pins.has(path));
  const example = exampleFile ? pinned(exampleFile.path).slice(0, 2400) : "";
  // Model context includes verified implementation, imported helpers and example fragments. It never includes demo assets or private collections.
  const excerpt = Object.keys(upstreamFiles).sort((a, b) => a === item.entry ? -1 : b === item.entry ? 1 : a.localeCompare(b))
    .map((path) => {
      const contents = pinned(path);
      const limit = path === item.entry ? 8500 : 700;
      return path + "\n" + (contents.length <= limit ? contents :
        contents.slice(0, Math.max(500, limit - 2400)) + "\n/* Omitted middle of checked source */\n" + contents.slice(-Math.min(limit - 500, 2400)));
    }).join("\n");
  return {
    pin: { id: item.id, provider: item.provider, title: item.title, revision: item.upstreamCommit!, upstream: item.sourceURL, entry: item.entry,
      context: fingerprint(canonical({ excerpt, example })), closure: fingerprint(canonical({ files, upstreamFiles })), license, adapter: contract.adapter, matched },
    files, upstreamFiles, excerpt, example, exports: contract.exports, description: contract.hint,
  };
}

function repositoryLicense(item: Entry, entries: Map<string, Entry>) {
  if (item.licenseNoticePath || item.repo !== "https://github.com/ibelick/motion-primitives" ||
    !item.entry.startsWith("components/core/")) return undefined;
  return [...entries.values()].find((entry) => entry.repo === item.repo && entry.upstreamCommit === item.upstreamCommit &&
    entry.licenseNoticePath?.endsWith("/LICENSE.txt") && entry.entry.includes("/components/core/"));
}

async function open(repo: string) {
  const vault = resolve(repo, ".motionux-v9");
  try {
    const catalog = JSON.parse(await bounded(vault, "catalog.last-good.json", 24_000_000)) as Entry[];
    const index = verifyIndex(JSON.parse(await bounded(vault, "brain/index.v1.json", 24_000_000)));
    const entries = new Map(catalog.map((entry) => [entry.id, entry]));
    const staleIds = index.records.filter(({ id, source }) => entries.get(id)?.upstreamHash !== source.upstreamHash).map(({ id }) => id);
    return { vault, entries, brain: createBrain(index, { staleIds }),
      profiles: index.records.filter(({ id }) => !staleIds.includes(id)) };
  } catch {
    throw new BuildError(503, "The prepared MotionUX catalog and Brain index could not be read.");
  }
}

export async function resolveContext(repo: string, intent: Intent, preferred?: string) {
  const { brain, entries, vault, profiles } = await open(repo);
  const ready = new Set(profiles.map(({ id }) => id));
  const byId = new Map<string, { score: number; matched: Set<string> }>();
  for (const need of intent.requirements) {
    const result = brain.query("search", { schemaVersion: 1, query: need.search, maxResults: 20, require: { integrationKind: ["react"] } });
    for (const match of result.candidates) {
      const item = byId.get(match.id) ?? { score: 0, matched: new Set() };
      item.matched.add(need.id);
      item.score = Math.max(match.score, item.score);
      byId.set(match.id, item);
    }
  }
  if (preferred) byId.set(preferred, { score: 10_000, matched: new Set(["creator-selection"]) });
  // Match the full catalog by the source's API (not a per-component allowlist). The broader scan supplements the Brain's top results.
  const order = [...new Set([...byId.keys(), ...profiles.filter((profile) => profile.integrationKind === "react").map(({ id }) => id)])]
    .sort((a, b) => (byId.get(b)?.score ?? 0) - (byId.get(a)?.score ?? 0));
  const sources: ResolvedSource[] = [];
  for (const id of order) {
    const entry = entries.get(id);
    if (!entry || !ready.has(id) || (!entry.licenseNoticePath && !repositoryLicense(entry, entries)) || sources.length >= 7) continue;
    try {
      const source = await loadSource(vault, entry, [...byId.get(id)?.matched ?? []], repositoryLicense(entry, entries));
      if (id !== preferred && sources.some(({ pin }) => pin.adapter === source.pin.adapter)) continue;
      sources.push(source);
    } catch { /* Unverified sources never reach the model. */ }
  }
  if (!sources.length) throw new BuildError(422, "No compatible exportable source was found in the prepared catalog.");
  return { sources, preferredUnavailable: Boolean(preferred && !sources.some(({ pin }) => pin.id === preferred)) };
}

export async function restoreSources(repo: string, pins: SourcePin[]) {
  const { entries, vault, profiles } = await open(repo);
  const ready = new Set(profiles.map(({ id }) => id));
  return Promise.all(pins.map(async (pin) => {
    try {
      const entry = entries.get(pin.id);
      if (!entry || !ready.has(pin.id)) throw new Error("Missing pin.");
      const source = await loadSource(vault, entry, pin.matched, repositoryLicense(entry, entries));
      if (canonical(source.pin) !== canonical(pin)) throw new Error("Stale pin.");
      return source;
    } catch {
      throw new BuildError(409, "Source bytes or usage rights changed for " + pin.id + ". Rebuild before exporting.");
    }
  }));
}
