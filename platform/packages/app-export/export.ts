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

export async function exportTree(repo: string, value: unknown) {
  const project = projectSchema.parse(value);
  const template = resolve(repo, "platform/templates/hotel-dashboard");
  const files: Record<string, string> = {};
  for (const path of templateFiles)
    files[path] = await readFile(resolve(template, path), "utf8");
  for (const [path, source] of Object.entries(sources))
    files[path] = localImports(
      await readFile(resolve(repo, "platform/packages", source), "utf8"),
    );
  if (project.document.template === "crm-dashboard")
    files["README.md"] = await readFile(resolve(repo, "platform/templates/crm-dashboard/README.md"), "utf8");
  if (project.document.template === "blank-app")
    files["README.md"] = files["README.md"].replaceAll("Hotel Desk", "Local workspace");
  files.LICENSE = await readFile(resolve(repo, "LICENSE"), "utf8");
  const exportedProject = { schemaVersion: project.schemaVersion, id: project.id, revision: project.revision, document: project.document };
  files["runtime/project.ts"] =
    'import type { BuildProject } from "./model";\n\nexport const project: BuildProject = ' +
    JSON.stringify(JSON.parse(canonical(exportedProject)), null, 2) +
    ";\n";
  if (project.document.template !== "hotel-dashboard") {
    const name = project.document.template === "crm-dashboard" ? "meridian-crm" : "local-workspace";
    const pkg = JSON.parse(files["package.json"]);
    const lock = JSON.parse(files["package-lock.json"]);
    pkg.name = name;
    lock.name = name;
    lock.packages[""].name = name;
    files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";
    files["package-lock.json"] = JSON.stringify(lock, null, 2) + "\n";
  }
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
export async function writeTree(root: string, tree: Record<string, string>) {
  for (const [path, value] of Object.entries(tree)) {
    if (!validPath(path)) throw new Error("Invalid exported filename.");
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, value, { flag: "wx", mode: 0o600 });
  }
}
export function zipTree(tree: Record<string, string>) {
  if (Object.keys(tree).some((path) => !validPath(path))) throw new Error("Invalid exported filename.");
  const mtime = new Date(2020, 0, 1);
  return zipSync(
    Object.fromEntries(
      Object.entries(tree).map(([path, value]) => [
        path,
        [strToU8(value), { mtime }],
      ]),
    ),
    { level: 6 },
  );
}
