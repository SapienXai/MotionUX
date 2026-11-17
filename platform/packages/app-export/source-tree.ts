import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import { sourceGraphSchema, type Intent, type SourceGraph, type SourceInstance, type SourcePlan } from "@motionux/build-core/source-graph";
import type { BuildProject, Document } from "@motionux/build-core";
import { mediaBytes } from "./media.ts";
import { restoreSources, type ResolvedSource } from "./source-catalog.ts";

const snippets = {
  accordion: `<Original0 transition={still ? { duration: 0 } : undefined} className="mx-source-body">
    {items.map((item, index) => <Original1 key={index} value={index}><Original2 className="mx-source-content">{item.label}</Original2>
      <Original3 className="mx-source-content">{item.text}</Original3></Original1>)}</Original0>`,
  disclosure: `<Original0 transition={still ? { duration: 0 } : undefined} className="mx-source-body">
    <Original1><button type="button" className="mx-primary">{items[0]?.label ?? instance.title}</button></Original1><Original2>{items[0]?.text ?? instance.description}</Original2></Original0>`,
  tabs: `<Original0 value={String(active)} onChange={(value) => select(Number(value))} label={instance.title} className="mx-source-body"
    items={items.map((item, index) => ({ id: String(index), title: item.label, content: <div className="mx-source-content">{item.text}</div> }))} />`,
  transition: `<><div className="mx-source-tabs">{items.map((item, index) => <button key={index} type="button" aria-pressed={index === active} onClick={() => select(index)}>{item.label}</button>)}</div>
    <Original0 activeIndex={active} transition={still ? { duration: 0 } : undefined} className="mx-source-body">
      {items.map((item, index) => <div key={index} className="mx-source-content">{item.text}</div>)}</Original0></>`,
  highlight: `<div className="mx-source-tabs"><Original0 defaultValue={String(active)} transition={still ? { duration: 0 } : undefined}>
    {items.map((item, index) => <button key={index} type="button" data-id={String(index)} aria-pressed={index === active} onClick={() => select(index)}>{item.label}</button>)}</Original0></div>`,
  wheel: `<Original0 label={instance.title} className="mx-source-body" columns={[{
    id: "choice", label: instance.title, options: items.map(({ label }) => ({ label, value: label })),
  }]} value={{ choice: items[active]?.label ?? "" }} onValueChange={({ choice }) => {
    const index = items.findIndex(({ label }) => label === choice);
    if (index >= 0) select(index);
  }} />`,
  slots: `<><Original0 key={slotEpoch} host={{ name: instance.title }} days={days} onBook={(slot) => {
    const hours = Math.floor(slot.start / 60);
    const time = String(hours).padStart(2, "0") + ":" + String(slot.start % 60).padStart(2, "0");
    setNotice(slot.date + " · " + time + " · " + slot.minutes + " min");
    if (entity && instance.action === "edit") {
      const end = slot.start + slot.minutes;
      const endTime = String(Math.floor(end / 60)).padStart(2, "0") + ":" + String(end % 60).padStart(2, "0");
      setSlotEpoch((current) => current + 1);
      edit(undefined, entity.fields.map((field) => field.type === "date" ? slot.date :
        field.id === entity.collision[1] ? time : field.id === entity.collision[2] ? endTime : ""));
    }
  }} /><output role="status">{notice}</output></>`,
  number: `still ? <span>{rows.length}</span> : <Original0 value={rows.length} />`,
} as const;

const projectModel = "build-core/source/graph.ts";
const shared = ["screen.tsx", "screen.css"] as const;
type Base = Awaited<ReturnType<typeof assets>>;
async function closureImages(repo: string, plan: SourcePlan) {
  const keys = [...new Set(plan.pages.flatMap(({ instances }) => instances.map(({ media }) => media)).filter(Boolean))].sort();
  const files: Record<string, Uint8Array> = {};
  for (const id of keys)
    for (const size of [360, 720] as const)
      files["public/media/" + id + "-" + size + ".webp"] = await mediaBytes(repo, undefined, "", id, size);
  return { files, digest: fingerprint(canonical(Object.entries(files).map(([path, bytes]) => [path, fingerprint(bytes)]))) };
}
async function assets(repo: string) {
  const tpl = resolve(repo, "platform/templates");
  const [lock, pkg, graph, ...base] = await Promise.all([
    readFile(resolve(tpl, "hotel-dashboard/package-lock.json"), "utf8"),
    readFile(resolve(tpl, "hotel-dashboard/package.json"), "utf8"),
    readFile(resolve(repo, "platform/packages", projectModel), "utf8"),
    ...shared.map((file) => readFile(resolve(tpl, "source-driven", file), "utf8")),
  ]);
  return { lock, pkg, graph, files: Object.fromEntries(shared.map((file, index) => ["runtime/" + file, base[index]])),
    compiler: fingerprint(canonical({ abi: 1, snippets, graph, base })) };
}

function component(source: ResolvedSource) {
  const { id, entry, adapter } = source.pin;
  const path = "./sources/" + id + "/" + entry.replace(/\.tsx?$/, "");
  const exports = source.exports.map((name, index) => name + " as Original" + index).join(", ");
  const imports = adapter === "tabs" || adapter === "slots" || adapter === "wheel"
    ? "import Original0 from " + JSON.stringify(path) + ";"
    : adapter === "disclosure" ? "import Upstream from " + JSON.stringify(path) + ";\nconst { Disclosure: Original0, DisclosureTrigger: Original1, DisclosureContent: Original2 } = Upstream;"
      : "import { " + exports + " } from " + JSON.stringify(path) + ";";
  return `"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import type { SourceProps } from "./screen";
${imports}
export default function SourceAdapter({ instance, rows, entity, still, onSelect, activeFilter, edit }: SourceProps) {
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState("");
  const choices = ${JSON.stringify(adapter === "wheel")} ? entity?.fields.find(({ type }) => type === "choice")?.options ?? [] : [];
  const items = instance.items.length ? instance.items : choices.length ? choices.map((label) => ({ label, text: label })) :
    rows.slice(0, 7).map(({ values }) => ({ label: values[0], text: values.slice(1).join(" · ") }));
  function select(index: number) {
    setActive(index);
    if (!items[index]) return;
    if (instance.action === "filter") onSelect?.(items[index].label === activeFilter ? "" : items[index].label);
    if (${JSON.stringify(adapter === "wheel")} && instance.action === "edit") onSelect?.(items[index].label);
  }
  ${adapter === "slots" ? `const dateIndex = entity?.fields.findIndex(({ type }) => type === "date") ?? -1;
  const [calendar, setCalendar] = useState<string[]>([]);
  const [slotEpoch, setSlotEpoch] = useState(0);
  useEffect(() => {
    const now = new Date();
    setCalendar(Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + index)).toISOString().slice(0, 10)));
  }, []);
  const savedDates = [...new Set(rows.map(({ values }) => values[dateIndex])
    .filter((value) => /^\\d{4}-\\d{2}-\\d{2}$/.test(value ?? "")))].slice(0, 7);
  const clock = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
  const from = entity?.fields.findIndex(({ id }) => id === entity.collision[1]) ?? -1;
  const to = entity?.fields.findIndex(({ id }) => id === entity.collision[2]) ?? -1;
  const days = (savedDates.length ? savedDates : calendar).map((date) => {
    const busy = rows.filter(({ values }) => values[dateIndex] === date && values[from] && values[to])
      .map(({ values }) => [clock(values[from]), clock(values[to])] as [number, number])
      .filter(([a, b]) => Number.isFinite(a) && b > a && a >= 0 && b <= 1440);
    // SlotPicker draws busy intervals in absolute coordinates relative to this open window.
    const open: [number, number] = [Math.min(540, ...busy.map(([start]) => start)), Math.max(1080, ...busy.map(([, end]) => end))];
    return { date, open, busy };
  });
  if (!days.length) return <p role="status">{instance.description || instance.title}</p>;` : ""}
  return <MotionConfig reducedMotion={still ? "always" : "user"}>${adapter === "number" ? "{" + snippets[adapter] + "}" : snippets[adapter]}</MotionConfig>;
}
`;
}

function synthesis(node: SourceInstance, plan: SourcePlan) {
  const words = plan.locale === "tr" ? { compare: "Karşılaştır", edit: "Düzenle", choose: "Seçim" } : { compare: "Compare", edit: "Edit", choose: "Selection" };
  const reference = "./adapter-" + node.source;
  const identity = JSON.stringify(node.id);
  const program = node.program;
  const field = JSON.stringify(program?.field ?? "");
  const label = JSON.stringify(program?.label ?? node.title);
  const profile = program?.operation ?? "detail";
  const panel =
    profile === "group-count" ? `<dl aria-label={${label}}>{[...groups].map(([value, count]) => <div key={value}><dt>{value}</dt><dd>{count}</dd></div>)}</dl>` :
    profile === "range-review" ? `<ol aria-label={${label}}>{ordered.map((row) => <li key={row.id}>{row.values.join(" · ")} <button type="button" onClick={() => props.edit(row)}>${words.edit}</button></li>)}</ol>` :
    `{selected && <dl className="mx-source-content" aria-labelledby={${identity} + "-title"}>
      {props.entity?.fields.filter((field) => !props.instance.fields.length || props.instance.fields.includes(field.id)).map((field) => {
        const index = props.entity?.fields.findIndex(({ id }) => id === field.id) ?? 0;
        return <div key={field.id}><dt>{field.label}</dt><dd>{selected.values[index]}{other && <> · {other.values[index]}</>}</dd></div>;
      })}
    </dl>}`;
  return `"use client";
import { useState } from "react";
import SourceInteraction from ${JSON.stringify(reference)};
import type { SourceProps } from "./screen";

export default function GeneratedInteraction(props: SourceProps) {
  const [choice, choose] = useState("");
  const [comparison, compare] = useState("");
  const [sourceChoice, setSourceChoice] = useState("");
  const rows = props.rows;
  const selected = rows.find((row) => row.id === choice) ?? rows[0];
  const other = rows.find((row) => row.id === comparison);
  ${profile === "group-count" ? `const index = props.entity?.fields.findIndex(({ id }) => id === ${field}) ?? 0;
  const groups = new Map<string, number>();
  for (const row of rows) { const value = row.values[Math.max(0, index)]; groups.set(value, (groups.get(value) ?? 0) + 1); }` :
  profile === "range-review" ? `const index = props.entity?.fields.findIndex(({ id }) => id === props.entity?.collision[1]) ?? 0;
  const ordered = [...rows].sort((a, b) => a.values[Math.max(0, index)].localeCompare(b.values[Math.max(0, index)]));` : ""}
  return <div className="mx-source-body">
    <SourceInteraction {...props} onSelect={(value) => {
      if (props.instance.action === "edit") setSourceChoice(value);
      else props.onSelect?.(value);
    }} />
    {rows.length > 0 && <div className="mx-tools mx-generated-action">
      <label>${words.choose}<select value={selected?.id ?? ""} onChange={(event) => choose(event.target.value)}>
        {rows.map((row) => <option key={row.id} value={row.id}>{row.values[0]}</option>)}
      </select></label>
      {${JSON.stringify(profile === "compare")} && <label>${words.compare}<select value={comparison} onChange={(event) => compare(event.target.value)}>
        <option value="">—</option>{rows.filter((row) => row.id !== selected?.id).map((row) => <option key={row.id} value={row.id}>{row.values[0]}</option>)}
      </select></label>}
      {props.instance.action === "edit" && <button type="button" className="mx-primary" onClick={() => {
        const prefill = selected && props.entity?.fields.map((field, index) =>
          sourceChoice && field.type === "choice" && field.options.includes(sourceChoice) ? sourceChoice : selected.values[index]);
        props.edit(selected, prefill);
      }}>${words.edit}</button>}
    </div>}
    ${panel}
  </div>;
}
`;
}

function generatedFiles(plan: SourcePlan) {
  return Object.fromEntries(plan.pages.flatMap(({ instances }) => instances).filter(({ kind }) => kind === "generated")
    .map((node) => ["runtime/generated-" + node.id + ".tsx", synthesis(node, plan)]));
}

export async function sealSourceGraph(repo: string, intent: Intent, plan: SourcePlan, available: ResolvedSource[]) {
  const build = await assets(repo);
  const nodes = plan.pages.flatMap(({ instances }) => instances);
  const indexed = new Map(available.map((item) => [item.pin.id, item.pin]));
  const selected = [...new Set(nodes.map(({ source }) => source).filter(Boolean))].sort();
  if (selected.some((id) => !indexed.has(id))) throw new BuildError(422, "The proposed source is outside the verified context.");
  const files = generatedFiles(plan);
  const images = await closureImages(repo, plan);
  const graph = sourceGraphSchema.safeParse({
    ...plan, version: 1, requirements: intent.requirements, sources: selected.map((id) => indexed.get(id)),
    lock: fingerprint(build.lock), compiler: build.compiler, mediaPin: images.digest,
    artifacts: nodes.filter(({ kind }) => kind === "generated").map((node) => {
      const file = "runtime/generated-" + node.id + ".tsx";
      return { instance: node.id, file, sha256: fingerprint(files[file]), generatedFrom: [node.source] };
    }),
  });
  if (!graph.success) throw new BuildError(422, graph.error.issues.slice(0, 4).map(({ message }) => message).join(" "));
  return graph.data;
}

export function sourceDocument(sourceGraph: SourceGraph): Document {
  return {
    runtime: "next-16", name: sourceGraph.name, data: "local-form-v1", template: "blank-app",
    sidebar: "expanded", assets: [], theme: sourceGraph.theme, locale: sourceGraph.locale,
    motionProfile: sourceGraph.motion === "still" ? "none" : "system", sourceGraph,
    pages: sourceGraph.pages.map(({ id, route, title }) => ({ id: "p-" + id, route, title: title.slice(0, 60), blocks: [] })),
  };
}

function moduleIndex(name: "adapters" | "generated", entries: [string, string][]) {
  return 'import type { Adapter } from "./screen";\n' + entries.map(([, path], index) => 'import Entry' + index + ' from "./' + path + '";').join("\n") +
    "\nexport const " + name + ": Record<string, Adapter | undefined> = {" +
    entries.map(([id], index) => JSON.stringify(id) + ": Entry" + index).join(", ") + "};\n";
}

function publicGraph(project: BuildProject) {
  const data = { ...project, document: { ...project.document } };
  return 'import type { SourceGraph } from "./source-graph";\nexport const project: { id: string; revision: number; document: { locale: string; name: string; template: string; theme: string; sourceGraph: SourceGraph } } = ' +
    JSON.stringify({ id: data.id, revision: data.revision, document: { locale: data.document.locale, name: data.document.name, template: data.document.template, theme: data.document.theme, sourceGraph: data.document.sourceGraph } }, null, 2) + ";\n";
}

const routePath = "app/[[...route]]/page.tsx";
export async function compileSourceTree(repo: string, project: BuildProject) {
  const graph = sourceGraphSchema.parse(project.document.sourceGraph);
  const build: Base = await assets(repo);
  if (graph.lock !== fingerprint(build.lock) || graph.compiler !== build.compiler)
    throw new BuildError(409, "The compiler or dependency lock changed. Rebuild this source project before running or exporting.");
  const sources = await restoreSources(repo, graph.sources);
  const images = await closureImages(repo, graph);
  if (images.digest !== graph.mediaPin) throw new BuildError(409, "A project asset digest changed.");
  const authored = generatedFiles(graph);
  if (Object.keys(authored).length !== graph.artifacts.length || graph.artifacts.some(({ file, sha256 }) => !authored[file] || fingerprint(authored[file]) !== sha256))
    throw new BuildError(409, "A generated artifact no longer matches this snapshot.");
  const baseline = resolve(repo, "platform/templates/hotel-dashboard");
  const [next, postcss, tsconfig, proxy] = await Promise.all(["next.config.mjs", "postcss.config.mjs", "tsconfig.json", "proxy.ts"].map((file) => readFile(resolve(baseline, file), "utf8")));
  const files: Record<string, string | Uint8Array> = {
    ...build.files, ...authored, ...images.files,
    "package.json": build.pkg, "package-lock.json": build.lock, "next.config.mjs": next, "postcss.config.mjs": postcss, "tsconfig.json": tsconfig, "proxy.ts": proxy,
    "README.md": "# " + graph.name + "\n\nRun npm ci, npm run build, and npm start. See runtime/project.ts for the application graph and runtime/sources for source notices. Interactive records are local to the browser.\n",
    "app/layout.tsx": `import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "../runtime/screen.css";
import { project } from "../runtime/project";
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang={project.document.locale} dir={project.document.sourceGraph.direction}><body>{children}</body></html>;
}`,
    [routePath]: `import { notFound } from "next/navigation";
import { AppScreen } from "../../runtime/screen";
import { project } from "../../runtime/project";
export const dynamicParams = false;
export function generateStaticParams() {
  return project.document.sourceGraph.pages.map((page) => ({ route: page.route.split("/").filter(Boolean) }));
}
type Params = { params: Promise<{ route?: string[] }> };
export async function generateMetadata({ params }: Params) {
  const path = "/" + ((await params).route ?? []).join("/");
  return { title: project.document.sourceGraph.pages.find((page) => page.route === path)?.title ?? project.document.name };
}
export default async function Page({ params }: Params) {
  const route = "/" + ((await params).route ?? []).join("/");
  if (!project.document.sourceGraph.pages.some((page) => page.route === route)) notFound();
  return <AppScreen id={project.id} page={{ route }} />;
}`,
    "runtime/source-graph.ts": build.graph,
    "runtime/project.ts": publicGraph(project),
    "runtime/adapters.ts": moduleIndex("adapters", sources.map(({ pin }) => [pin.id, "adapter-" + pin.id])),
    "runtime/generated.ts": moduleIndex("generated", graph.artifacts.map(({ instance }) => [instance, "generated-" + instance])),
  };
  for (const source of sources) {
    for (const [path, contents] of Object.entries(source.files)) files["runtime/sources/" + source.pin.id + "/" + path] = contents;
    files["runtime/adapter-" + source.pin.id + ".tsx"] = component(source);
  }
  return { files, sources: sources.map(({ pin, upstreamFiles, files }) => ({ ...pin, upstreamFiles,
    kind: Object.entries(upstreamFiles).some(([path, hashes]) => hashes.original !== fingerprint(files[path])) ? "source-adapted" : "upstream-original",
    notice: "runtime/sources/" + pin.id + "/LICENSE.txt",
    adapterFile: "runtime/adapter-" + pin.id + ".tsx",
  })) };
}
