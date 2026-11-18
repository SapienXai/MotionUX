import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { codeProposalSchema, codeProjectSchema, isLocalCodePin, localSourceRights, type CodeProject, type SourceReference } from "@motionux/build-core/code-project";
import type { BuildProject, Document } from "@motionux/build-core";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import { codeProfileFor, localSourceTemplate, restoreCodeSources, type SourceModule } from "./code-catalog.ts";
import { galleryOrigin, localFramePath } from "../../../scripts/studio/build-local-sources.mjs";
import { programHashes, validateProgram } from "./code-validator.ts";
import { mediaBytes } from "./media.ts";

const screenTemplate = `"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import Application from "../components/app";
import { settings } from "./config";
const editable: Record<string, string> = settings.kinds;
const digest = settings.digest;
export function AppScreen({ page }: { page: { route: string } }) {
  const [config, setConfig] = useState<Record<string, string>>(settings.values);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin === "null") return;
      try { if (new URL(event.origin).origin !== "http://127.0.0.1:5200") return; } catch { return; }
      const data = event.data;
      if (!data || data.type !== "motionux:controls" || data.digest !== digest || typeof data.values !== "object" || !data.values) return;
      const entries = Object.entries(data.values);
      if (entries.length !== Object.keys(editable).length) return;
      for (const [key, value] of entries) {
        if (!Object.hasOwn(editable, key) || typeof value !== "string" || value.length > 500) return;
        if (editable[key] === "color" && !/^#[a-f0-9]{6}$/i.test(value)) return;
        if (["spacing", "size"].includes(editable[key]) && !/^\\d{1,2}(?:px|rem)$/.test(value)) return;
        if (editable[key] === "motion" && !["still", "system"].includes(value)) return;
      }
      setConfig(Object.fromEntries(entries) as Record<string, string>);
    }
    addEventListener("message", receive);
    return () => removeEventListener("message", receive);
  }, []);
  return <MotionConfig reducedMotion={Object.entries(editable).some(([key, kind]) => kind === "motion" && config[key] === "still") ? "always" : "user"}><Application route={page.route} config={config} /></MotionConfig>;
}
`;

async function profile(repo: string, sources: SourceModule[]) {
  const root = resolve(repo, "platform/templates");
  const read = (file: string) => readFile(resolve(root, file), "utf8");
  const dependencyProfile = await codeProfileFor(repo, sources.flatMap(({ packages }) => packages));
  const [lock, pkg, state, nextTemplate, postcss, tsconfig, proxy] = await Promise.all([
    read(dependencyProfile + "/package-lock.json"), read(dependencyProfile + "/package.json"), read("source-driven/project-state.ts"),
    read("hotel-dashboard/next.config.mjs"), read("hotel-dashboard/postcss.config.mjs"), read("hotel-dashboard/tsconfig.json"), read("hotel-dashboard/proxy.ts"),
  ]);
  const next = sources.some(({ pin }) => pin.fidelity === "local-frame")
    ? nextTemplate.replace("frame-ancestors http://127.0.0.1:5200", `frame-src ${galleryOrigin}${localFramePath}; frame-ancestors http://127.0.0.1:5200`)
    : nextTemplate;
  return { lock, pkg, state, next, postcss, tsconfig, proxy, compiler: fingerprint(canonical({ abi: 3, state, screenTemplate, next, postcss, tsconfig, proxy })) };
}

export async function sealCodeProject(repo: string, proposal: unknown, sources: SourceModule[], references?: SourceReference[]): Promise<CodeProject> {
  const clean = validateProgram(proposal, sources);
  const selected = [...new Set(clean.usages.map(({ source }) => source))];
  const environment = await profile(repo, sources.filter(({ pin }) => selected.includes(pin.id)));
  const result = codeProjectSchema.safeParse({
    ...clean, version: 2, ...(references?.length && { references }),
    sources: selected.map((id) => sources.find(({ pin }) => pin.id === id)!.pin),
    artifacts: programHashes(clean), lock: fingerprint(environment.lock), compiler: environment.compiler,
  });
  if (!result.success) throw new BuildError(422, "Code project contract: " + result.error.issues.slice(0, 4).map(({ message }) => message).join(" "));
  return result.data;
}

export function codeDocument(codeProject: CodeProject): Document {
  return { name: codeProject.name, locale: codeProject.locale, theme: "system", template: "blank-app", data: "local-form-v1",
    runtime: "next-16", sidebar: "expanded", motionProfile: "system", assets: [], codeProject,
    pages: codeProject.pages.map(({ id, title, route }) => ({ id: "p-" + id, title, route, blocks: [] })) };
}

export async function compileCodeProject(repo: string, project: BuildProject, use: "export" | "local" = "export") {
  const graph = codeProjectSchema.parse(project.document.codeProject);
  const hasLocal = graph.sources.some(isLocalCodePin);
  if (hasLocal && use === "export") throw new BuildError(409, localSourceRights);
  const sources = await restoreCodeSources(repo, graph.sources, use);
  const environment = await profile(repo, sources);
  if (fingerprint(environment.lock) !== graph.lock || environment.compiler !== graph.compiler)
    throw new BuildError(409, "The pinned compiler or dependency lock changed. Rebuild this code project before running or exporting.");
  const { version, artifacts } = graph;
  const proposal = codeProposalSchema.strip().parse(graph);
  validateProgram(proposal, sources);
  if (canonical(programHashes(proposal)) !== canonical(artifacts)) throw new BuildError(409, "Generated module hashes changed.");
  const config = Object.fromEntries(graph.controls.map(({ key, value }) => [key, value]));
  const files: Record<string, string | Uint8Array> = Object.fromEntries(graph.files.map(({ path, content }) => [path, content]));
  files["package.json"] = environment.pkg;
  files["package-lock.json"] = environment.lock;
  files["next.config.mjs"] = environment.next;
  files["postcss.config.mjs"] = environment.postcss;
  files["tsconfig.json"] = environment.tsconfig;
  files["proxy.ts"] = environment.proxy;
  files["runtime/state.ts"] = environment.state;
  files["runtime/config.ts"] = "export const settings = " + JSON.stringify({
    id: project.id, revision: project.revision, values: config, name: graph.name,
    digest: fingerprint(canonical(project.document)), kinds: Object.fromEntries(graph.controls.map(({ key, kind }) => [key, kind])),
  }, null, 2) + ";\n";
  // Run acknowledges its listener after hydration so Studio can replay draft controls.
  // Keep the pinned standalone runtime and both export formats byte-stable.
  files["runtime/screen.tsx"] = use === "local" ? screenTemplate.replace(
    '    addEventListener("message", receive);',
    '    addEventListener("message", receive);\n    if (window.parent !== window) window.parent.postMessage({ type: "motionux:controls-ready", digest }, "http://127.0.0.1:5200");',
  ) : screenTemplate;
  if (sources.some(({ pin }) => pin.fidelity === "local-frame")) files["runtime/local-source.tsx"] = await readFile(resolve(repo, localSourceTemplate), "utf8");
  files["app/layout.tsx"] = `import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "../styles/host.css";
import "../styles/app.css";
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang=${JSON.stringify(graph.locale)} dir=${JSON.stringify(graph.direction)}><body>{children}</body></html>;
}
`;
  const css = ["@import 'tailwindcss';", "@custom-variant dark (&:where(.dark, .dark *));", "body { margin: 0; }", "* { box-sizing: border-box; }"];
  for (const source of sources) {
    const prefix = "sources/" + source.pin.id + "/";
    for (const [path, code] of Object.entries(source.files)) files[prefix + path] = code;
    const entry = "./" + source.pin.id + "/" + source.pin.entry.replace(/\.tsx?$/, "");
    files["sources/" + source.pin.id + ".ts"] = 'export * from ' + JSON.stringify(entry) + ";\n" +
      (source.exports.includes("default") ? 'export { default } from ' + JSON.stringify(entry) + ";\n" : "");
    for (const style of source.css) css.unshift('@import "../' + prefix + style + '";');
  }
  files["styles/host.css"] = css.join("\n") + "\n";
  files["app/[[...route]]/page.tsx"] = `import { notFound } from "next/navigation";
import { AppScreen } from "../../runtime/screen";
const pages = ${JSON.stringify(graph.pages.map(({ route, title }) => ({ route, title })))};
export const dynamicParams = false;
export function generateStaticParams() { return pages.map(({ route }) => ({ route: route.split("/").filter(Boolean) })); }
type Props = { params: Promise<{ route?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const route = "/" + ((await params).route ?? []).join("/");
  return { title: pages.find((page) => page.route === route)?.title ?? ${JSON.stringify(graph.name)} };
}
export default async function Page({ params }: Props) {
  const route = "/" + ((await params).route ?? []).join("/");
  if (!pages.some((page) => page.route === route)) notFound();
  return <AppScreen page={{ route }} />;
}
`;
  const requested = graph.files.map(({ content }) => content).join("\n");
  const assetPins: { path: string; sha256: string; rights: string; attribution?: string }[] = [];
  for (const source of sources) for (const asset of source.assets) {
    files[asset.path] = asset.bytes;
    assetPins.push({ path: asset.path, sha256: asset.sha256, rights: asset.rights, attribution: asset.attribution });
  }
  const attributed = assetPins.filter(({ attribution }) => attribution);
  if (attributed.length) files["ASSET-NOTICES.txt"] = attributed.map(({ path, attribution }) =>
    path + "\n" + attribution + "\nCC BY-SA 3.0 · https://creativecommons.org/licenses/by-sa/3.0/\n",
  ).join("\n");
  for (const id of ["seed-coast", "seed-room", "seed-pool"]) {
    if (!requested.includes(id) && !requested.includes("/media/seed-${")) continue;
    for (const size of [360, 720] as const) {
      const path = "public/media/" + id + "-" + size + ".webp";
      const image = await mediaBytes(repo, undefined, project.id, id, size);
      files[path] = image;
      assetPins.push({ path, sha256: fingerprint(image), rights: "MotionUX-generated demonstration image" });
    }
  }
  files["README.md"] = "# " + graph.name + "\n\n" + (hasLocal
    ? "Local MotionUX Run replica. Its local-only source pins are resolved by Build.\n"
    : "Run npm ci, npm run build and npm start. The application stores fictional data in the browser. Original source notices are in sources/. No production integration is included.\n");
  files["SOURCE-MANIFEST.json"] = JSON.stringify({
    version, revision: project.revision, digest: fingerprint(canonical(project.document)), sources: sources.map(({ pin }) => pin),
    usages: graph.usages, generated: graph.generated, artifacts, assets: assetPins, design: graph.design, limitations: graph.limitations,
    adapters: sources.map(({ pin, patches, hashes, upstreamHashes, preparationPatches }) => ({
      id: pin.id, originalHashes: upstreamHashes, preparedHashes: hashes, preparationPatches, patches,
    })),
  }, null, 2) + "\n";
  return { files, graph, assets: assetPins, sources: sources.map(({ pin, patches }) => ({ ...pin, patches })) };
}
