import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { strToU8, zipSync } from "fflate";
import { projectSchema } from "@motionux/build-core";
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
  "runtime/data.ts": "app-blocks/data.ts",
  "runtime/frame.tsx": "app-blocks/frame.tsx",
  "runtime/hotel.css": "app-blocks/hotel.css",
  "runtime/model.ts": "build-core/model.ts",
  "runtime/tokens.css": "design-system/tokens.css",
} as const;
const localImports = (contents: string) =>
  contents
    .replaceAll('from "@motionux/build-core"', 'from "./model"')
    .replaceAll('from "./frame.tsx"', 'from "./frame"')
    .replaceAll('from "./data.ts"', 'from "./data"');

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
  files.LICENSE = await readFile(resolve(repo, "LICENSE"), "utf8");
  files["runtime/project.ts"] =
    'import type { BuildProject } from "./model";\n\nexport const project: BuildProject = ' +
    JSON.stringify(JSON.parse(canonical(project)), null, 2) +
    ";\n";
  const entries = Object.keys(files)
    .sort()
    .map((path) => ({ path, sha256: fingerprint(files[path]) }));
  files["motionux-manifest.json"] =
    JSON.stringify(
      {
        schemaVersion: 1,
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
export async function writeTree(root: string, tree: Record<string, string>) {
  for (const [path, value] of Object.entries(tree)) {
    if (
      !/^[\w.\[\]/-]+$/.test(path) ||
      path.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw new Error("Invalid exported filename.");
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, value, { flag: "wx", mode: 0o600 });
  }
}
export function zipTree(tree: Record<string, string>) {
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
