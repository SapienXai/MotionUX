import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { strToU8, zipSync } from "fflate";
import { allBlocks, blockSpec, blockSpecVersion, defaultMotionDna, projectSchema, referencedMedia } from "@motionux/build-core";
import { canonical, fingerprint } from "@motionux/build-core/store";
import { compileCodeProject } from "./code-program.ts";
import { compileSourceTree } from "./source-tree.ts";
import { mediaBytes } from "./media.ts";

const templateFiles = [
  "README.md",
  "app/[[...route]]/page.tsx",
  "app/globals.css",
  "app/layout.tsx",
  "next.config.mjs",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "proxy.ts",
  "runtime/screen.tsx",
  "tsconfig.json",
] as const;
const sources = {
  "runtime/creator-section.tsx": "app-blocks/creator-section.tsx",
  "runtime/blocks.tsx": "app-blocks/blocks.tsx",
  "runtime/crm-data.ts": "app-blocks/crm-data.ts",
  "runtime/crm.tsx": "app-blocks/crm.tsx",
  "runtime/workspace.tsx": "app-blocks/workspace.tsx",
  "runtime/operations-data.ts": "app-blocks/operations-data.ts",
  "runtime/profile.ts": "app-blocks/profile.ts",
  "runtime/data.ts": "app-blocks/data.ts",
  "runtime/frame.tsx": "app-blocks/frame.tsx",
  "runtime/hotel.css": "app-blocks/hotel.css",
  "runtime/model.ts": "build-core/model.ts",
  "runtime/source-graph.ts": "build-core/source/graph.ts",
  "runtime/code-project.ts": "build-core/source/code-project.ts",
  "runtime/page-patterns.ts": "build-core/page-patterns.ts",
  "runtime/marketing-spec.ts": "build-core/marketing-spec.ts",
  "runtime/marketing-template.ts": "build-core/marketing-template.ts",
  "runtime/motion-dna.ts": "build-core/motion-dna.ts",
  "runtime/identity.css": "design-system/identity.css",
  "runtime/sections.ts": "build-core/sections.ts",
  "runtime/creator-catalog.ts": "build-core/creator-catalog.ts",
  "runtime/creator-design.ts": "build-core/creator-design.ts",
  "runtime/tokens.css": "design-system/tokens.css",
} as const;
const localImports = (contents: string) =>
  contents
    .replaceAll('from "./source/graph.ts"', 'from "./source-graph"')
    .replaceAll('from "./source/code-project.ts"', 'from "./code-project"')
    .replaceAll('from "@motionux/build-core"', 'from "./model"')
    .replace(/(from|export \* from) "(\.\/[a-z-]+)\.tsx?"/g, '$1 "$2"');

type SourceFiles = Record<string, string | Uint8Array>;
const pwaFiles = {
  "app/layout.tsx": "layout.tsx",
  "runtime/pwa-screen.tsx": "screen.tsx",
  "runtime/pwa-status.tsx": "pwa-status.tsx",
  "runtime/pwa.css": "pwa.css",
  "runtime/service-worker.js": "service-worker.js",
  "scripts/build-offline.mjs": "build-offline.mjs",
  "public/pwa/offline.html": "offline.html",
} as const;

async function addPwa(repo: string, project: ReturnType<typeof projectSchema.parse>, files: SourceFiles) {
  const template = resolve(repo, "platform/templates/pwa");
  for (const [path, name] of Object.entries(pwaFiles)) {
    files[path] = await readFile(resolve(template, name), "utf8");
  }
  const { document, id } = project;
  if (document.sourceGraph) {
    files["app/layout.tsx"] = String(files["app/layout.tsx"]).replace('import "./globals.css";', 'import "../runtime/screen.css";')
      .replace('<html lang={locale}>', '<html lang={locale} dir={project.document.sourceGraph.direction}>');
    files["runtime/pwa-status.tsx"] = String(files["runtime/pwa-status.tsx"])
      .replace('import { useOptionalApp } from "./frame";', 'import { project } from "./project";')
      .replace('useOptionalApp()?.theme', 'project.document.theme');
    files["runtime/pwa-screen.tsx"] = String(files["runtime/pwa-screen.tsx"]).replace(' documentNavigation', '');
  }
  const theme = document.template === "hotel-dashboard" ? "hotel" : document.template === "crm-dashboard" ? "crm" : "blank";
  for (const icon of ["192", "512", "maskable"]) {
    files["public/pwa/icon-" + icon + ".png"] = await readFile(resolve(template, "icons", theme + "-" + icon + ".png"));
  }
  const icons = [
    { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/pwa/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
  const background = theme === "hotel"
    ? document.theme === "dark" ? "#171e19" : "#f7f8f4"
    : document.theme === "dark" ? "#151727" : "#f6f7fc";
  const appId = "/?app=" + id;
  files["public/manifest.webmanifest"] = JSON.stringify({
    id: appId, name: document.name, short_name: Array.from(document.name).slice(0, 24).join(""),
    lang: document.locale, ...(document.sourceGraph && { dir: document.sourceGraph.direction }), start_url: "/", scope: "/", display: "standalone",
    background_color: background, theme_color: background, icons,
  }, null, 2) + "\n";
  const routes = document.pages.map((page) => page.route).sort();
  files["runtime/pwa-config.json"] = JSON.stringify({
    project: id, routes, assets: ["/manifest.webmanifest", "/pwa/offline.html", ...icons.map(({ src }) => src),
      ...Object.keys(files).filter((path) => path.startsWith("public/media/")).map((path) => path.slice("public".length))],
  }, null, 2) + "\n";
  const route = "app/[[...route]]/page.tsx";
  files[route] = String(files[route]).replace("../../runtime/screen", "../../runtime/pwa-screen");
  const pkg = JSON.parse(String(files["package.json"]));
  pkg.scripts.build += " && node scripts/build-offline.mjs";
  files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";
  files["README.md"] = String(files["README.md"]) + await readFile(resolve(template, "README.md"), "utf8");
  return { appId, routes, offline: "precache-local-snapshot", worker: "/sw.js" };
}

export async function exportTree(repo: string, value: unknown, options: { pwa?: boolean; vault?: string } = {}) {
  const project = projectSchema.parse(value);
  if (project.document.codeProject) {
    const { files, sources: provenance, assets } = await compileCodeProject(repo, project);
    const output: SourceFiles = { ...files };
    let pwa;
    if (options.pwa) {
      // Reuse the bounded worker and snapshot builder with this program's route and source tree.
      output["runtime/project.ts"] = "export const project = " + JSON.stringify({
        id: project.id, document: { name: project.document.name, locale: project.document.locale, theme: project.document.theme, template: project.document.template },
      }) + ";\n";
      pwa = await addPwa(repo, project, output);
      output["app/layout.tsx"] = String(files["app/layout.tsx"]).replace('import "../styles/app.css";', 'import "../styles/app.css";\nimport "../runtime/pwa.css";');
      output["runtime/pwa-status.tsx"] = String(output["runtime/pwa-status.tsx"])
        .replace('import { useOptionalApp } from "./frame";', 'import { project } from "./project";')
        .replace('useOptionalApp()?.theme', 'project.document.theme');
      output["runtime/pwa-screen.tsx"] = '"use client";\nimport { AppScreen as Application } from "./screen";\nimport { PwaStatus } from "./pwa-status";\nexport function AppScreen(props: Parameters<typeof Application>[0]) { return <><Application {...props} /><PwaStatus /></>; }\n';
    }
    output.LICENSE = await readFile(resolve(repo, "LICENSE"), "utf8");
    const entries = Object.keys(output).sort().map((path) => ({ path, sha256: fingerprint(output[path]) }));
    output["motionux-manifest.json"] = JSON.stringify({
      schemaVersion: project.schemaVersion, sourceVersion: 2, revision: project.revision,
      documentDigest: fingerprint(canonical(project.document)), digest: fingerprint(canonical(entries)),
      sources: provenance, artifacts: project.document.codeProject.artifacts, usages: project.document.codeProject.usages, assets,
      ...(pwa && { pwa }), files: entries,
    }, null, 2) + "\n";
    return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)));
  }
  if (project.document.sourceGraph) {
    const { files, sources: provenance } = await compileSourceTree(repo, project);
    const output: SourceFiles = { ...files };
    output.LICENSE = await readFile(resolve(repo, "LICENSE"), "utf8");
    const pwa = options.pwa ? await addPwa(repo, project, output) : undefined;
    const entries = Object.keys(output).sort().map((path) => ({ path, sha256: fingerprint(output[path]) }));
    output["motionux-manifest.json"] = JSON.stringify({
      schemaVersion: project.schemaVersion, revision: project.revision,
      documentDigest: fingerprint(canonical(project.document)), digest: fingerprint(canonical(entries)),
      design: project.document.sourceGraph.tone, motion: project.document.sourceGraph.motion,
      sources: provenance, artifacts: project.document.sourceGraph.artifacts,
      requirements: project.document.sourceGraph.requirements.map((need) => ({
        ...need, instances: project.document.sourceGraph!.pages.flatMap(({ route, instances }) =>
          instances.filter((item) => item.requirement === need.id).map(({ id, source, kind }) => ({ route, id, source, kind }))),
      })),
      limitations: project.document.sourceGraph.limitations,
      ...(pwa && { pwa }), files: entries,
    }, null, 2) + "\n";
    return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)));
  }
  const template = resolve(repo, "platform/templates/hotel-dashboard");
  const files: SourceFiles = {};
  for (const path of templateFiles)
    files[path] = await readFile(resolve(template, path), "utf8");
  for (const [path, source] of Object.entries(sources))
    files[path] = localImports(
      await readFile(resolve(repo, "platform/packages", source), "utf8"),
    );
  if (project.document.template === "hotel-marketing") {
    const site = resolve(repo, "platform/templates/hotel-marketing");
    files["runtime/screen.tsx"] = await readFile(resolve(site, "screen.tsx"), "utf8");
    files["runtime/marketing.tsx"] = localImports(await readFile(resolve(repo, "platform/packages/app-blocks/marketing.tsx"), "utf8"));
    files["runtime/marketing.css"] = await readFile(resolve(repo, "platform/packages/app-blocks/marketing.css"), "utf8");
    files["app/globals.css"] = String(files["app/globals.css"]).replace('@import "../runtime/hotel.css";', '@import "../runtime/marketing.css";');
    files["README.md"] = "Costa di Sera · A fictional boutique hotel demo. Run npm ci, npm run build and npm start. The inquiry form validates locally and sends nothing. Bundled demonstration images were generated for MotionUX. Other included image rights were attested by the project uploader.\n";
  }
  for (const id of referencedMedia(project.document))
    for (const size of [360, 720] as const)
      files["public/media/" + id + "-" + size + ".webp"] = await mediaBytes(repo, options.vault, project.id, id, size);
  if (project.document.template === "crm-dashboard")
    files["README.md"] = await readFile(resolve(repo, "platform/templates/crm-dashboard/README.md"), "utf8");
  if (project.document.template === "knowledge-base")
    files["README.md"] = "# Fieldnotes Handbook\n\nSearchable local guides and demo feedback. Run npm ci, npm run build and npm start.\n";
  if (project.document.template === "operations-workspace")
    files["README.md"] = "# Relay Operations\n\nWorkload, fictional tasks and runbooks. Task progress is scoped to this app revision in the browser. Run npm ci, npm run build and npm start.\n";
  if (project.document.template === "blank-app")
    files["README.md"] = String(files["README.md"]).replaceAll("Hotel Desk", "Local workspace");
  files.LICENSE = await readFile(resolve(repo, "LICENSE"), "utf8");
  const exportedProject = { schemaVersion: project.schemaVersion, id: project.id, revision: project.revision, document: project.document };
  files["runtime/project.ts"] =
    'import type { BuildProject } from "./model";\n\nexport const project: BuildProject = ' +
    JSON.stringify(JSON.parse(canonical(exportedProject)), null, 2) +
    ";\n";
  if (project.document.template !== "hotel-dashboard") {
    const names = {
      "crm-dashboard": "meridian-crm", "hotel-marketing": "costa-di-sera",
      "knowledge-base": "fieldnotes-handbook", "operations-workspace": "relay-operations", "blank-app": "local-workspace",
    };
    const name = names[project.document.template];
    const pkg = JSON.parse(String(files["package.json"]));
    const lock = JSON.parse(String(files["package-lock.json"]));
    pkg.name = name;
    lock.name = name;
    lock.packages[""].name = name;
    files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";
    files["package-lock.json"] = JSON.stringify(lock, null, 2) + "\n";
  }
  const pwa = options.pwa ? await addPwa(repo, project, files) : undefined;
  const entries = Object.keys(files)
    .sort()
    .map((path) => ({ path, sha256: fingerprint(files[path]) }));
  files["motionux-manifest.json"] =
    JSON.stringify(
      {
        schemaVersion: project.schemaVersion,
        documentDigest: fingerprint(canonical(project.document)),
        dataAdapter: project.document.data,
        runtime: { next: "16.4.6", react: "19.3.1" },
        blockSpecVersion,
        blocks: [...new Set(project.document.pages.flatMap((page) => allBlocks(page.blocks).map((block) => block.type)))].sort()
          .map((id) => { const spec = blockSpec(id); return { id, version: spec.version, license: spec.license, provenance: spec.provenance }; }),
        revision: project.revision,
        motion: {
          ...(project.document.motionDna ?? defaultMotionDna),
          mode: project.document.motionProfile,
        },
        ...(pwa ? { pwa } : {}),
        digest: fingerprint(canonical(entries)),
        provenance: "MotionUX-owned compositions · MIT",
        excluded: [
          "private source catalog",
          "user library",
          "fixtures and verification data",
        ],
        files: entries,
      },
      null,
      2,
    ) + "\n";
  return Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
function validPath(path: string) {
  return /^[\w.\[\]/-]+$/.test(path) &&
    !path.split("/").some((part) => !part || part === "." || part === "..");
}
export async function writeTree(root: string, tree: SourceFiles) {
  for (const [path, value] of Object.entries(tree)) {
    if (!validPath(path)) throw new Error("Invalid exported filename.");
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, value, { flag: "wx", mode: 0o600 });
  }
}
export function zipTree(tree: SourceFiles) {
  if (Object.keys(tree).some((path) => !validPath(path))) throw new Error("Invalid exported filename.");
  const mtime = new Date(2020, 0, 1);
  return zipSync(
    Object.fromEntries(
      Object.entries(tree).map(([path, value]) => [
        path,
        [typeof value === "string" ? strToU8(value) : value, { mtime }],
      ]),
    ),
    { level: 6 },
  );
}
