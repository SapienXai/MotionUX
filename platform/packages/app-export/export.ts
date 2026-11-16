import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { strToU8, zipSync } from "fflate";
import { allBlocks, blockSpec, blockSpecVersion, projectSchema } from "@motionux/build-core";
import { canonical, fingerprint } from "@motionux/build-core/store";

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
  "runtime/blocks.tsx": "app-blocks/blocks.tsx",
  "runtime/crm-data.ts": "app-blocks/crm-data.ts",
  "runtime/crm.tsx": "app-blocks/crm.tsx",
  "runtime/profile.ts": "app-blocks/profile.ts",
  "runtime/data.ts": "app-blocks/data.ts",
  "runtime/frame.tsx": "app-blocks/frame.tsx",
  "runtime/hotel.css": "app-blocks/hotel.css",
  "runtime/model.ts": "build-core/model.ts",
  "runtime/tokens.css": "design-system/tokens.css",
} as const;
const localImports = (contents: string) =>
  contents
    .replaceAll('from "@motionux/build-core"', 'from "./model"')
    .replace(/from "(\.\/[a-z-]+)\.tsx?"/g, 'from "$1"');

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
    lang: document.locale, start_url: "/", scope: "/", display: "standalone",
    background_color: background, theme_color: background, icons,
  }, null, 2) + "\n";
  const routes = document.pages.map((page) => page.route).sort();
  files["runtime/pwa-config.json"] = JSON.stringify({
    project: id, routes, assets: ["/manifest.webmanifest", "/pwa/offline.html", ...icons.map(({ src }) => src)],
  }, null, 2) + "\n";
  const route = "app/[[...route]]/page.tsx";
  files[route] = String(files[route]).replace("../../runtime/screen", "../../runtime/pwa-screen");
  const pkg = JSON.parse(String(files["package.json"]));
  pkg.scripts.build += " && node scripts/build-offline.mjs";
  files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";
  files["README.md"] = String(files["README.md"]) + await readFile(resolve(template, "README.md"), "utf8");
  return { appId, routes, offline: "precache-local-snapshot", worker: "/sw.js" };
}

export async function exportTree(repo: string, value: unknown, options: { pwa?: boolean } = {}) {
  const project = projectSchema.parse(value);
  const template = resolve(repo, "platform/templates/hotel-dashboard");
  const files: SourceFiles = {};
  for (const path of templateFiles)
    files[path] = await readFile(resolve(template, path), "utf8");
  for (const [path, source] of Object.entries(sources))
    files[path] = localImports(
      await readFile(resolve(repo, "platform/packages", source), "utf8"),
    );
  if (project.document.template === "crm-dashboard")
    files["README.md"] = await readFile(resolve(repo, "platform/templates/crm-dashboard/README.md"), "utf8");
  if (project.document.template === "blank-app")
    files["README.md"] = String(files["README.md"]).replaceAll("Hotel Desk", "Local workspace");
  files.LICENSE = await readFile(resolve(repo, "LICENSE"), "utf8");
  const exportedProject = { schemaVersion: project.schemaVersion, id: project.id, revision: project.revision, document: project.document };
  files["runtime/project.ts"] =
    'import type { BuildProject } from "./model";\n\nexport const project: BuildProject = ' +
    JSON.stringify(JSON.parse(canonical(exportedProject)), null, 2) +
    ";\n";
  if (project.document.template !== "hotel-dashboard") {
    const name = project.document.template === "crm-dashboard" ? "meridian-crm" : "local-workspace";
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
