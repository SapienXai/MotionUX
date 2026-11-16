import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const root = resolve(".next/static");
const config = JSON.parse(await readFile("runtime/pwa-config.json", "utf8"));
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const sw = await readFile("runtime/service-worker.js", "utf8");
const assets = [...config.assets];
let size = 0;
for (const entry of await readdir(root, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile()) continue;
  const filename = resolve(entry.parentPath, entry.name);
  const path = relative(root, filename).split(sep).join("/");
  if (
    !/^[\w.\[\]/-]+$/.test(path) ||
    path.split("/").some((part) => part.startsWith("."))
  ) {
    throw new Error("Unexpected Next static asset: " + path);
  }
  size += (await stat(filename)).size;
  assets.push(
    "/_next/static/" + path.split("/").map(encodeURIComponent).join("/"),
  );
}
if (assets.length > 256 || size > 8 * 1024 * 1024) {
  throw new Error(
    "This export exceeded its offline asset budget (256 files / 8 MiB of Next static assets).",
  );
}
assets.sort();
const inventory = {
  namespace: "motionux-pwa:" + config.project + ":",
  documents: config.routes,
  assets,
};
const version = createHash("sha256")
  .update(JSON.stringify(inventory))
  .update(buildId)
  .update(sw)
  .digest("hex")
  .slice(0, 24);
await writeFile(
  "public/sw.js",
  "self.motionuxOffline = " +
    JSON.stringify({ ...inventory, version }) +
    ";\n" +
    sw,
);
console.log(
  "Offline snapshot: " +
    config.routes.length +
    " pages, " +
    assets.length +
    " assets (" +
    Math.round(size / 1024) +
    " KiB Next static).",
);
