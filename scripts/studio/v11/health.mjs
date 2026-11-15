import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { loadCatalog, vault } from "../catalog.mjs";
import { readLibrary } from "./library.mjs";
import { loadThumbnails } from "./thumbnail-cache.mjs";
import { sha256 } from "./identity.mjs";
import { safeFile } from "./paths.mjs";
import { indexName } from "../../originals/editions.mjs";

export async function inspectWorkspace({ deep = false } = {}) {
  const diagnostics = [];
  const catalog = await loadCatalog({ diagnostics });
  const thumbnails = await loadThumbnails(vault, catalog).catch(() => new Map());
  const issues = [...diagnostics];
  for (const item of catalog.values()) {
    if (item.availability !== "ready") issues.push(item.id + ": original or installed fixture incomplete");
    else if (deep) {
      try {
        const roots = ["original", "installed"].map(lane => resolve(vault, "runtime", item.group, lane));
        for (const [lane, root] of roots.entries()) for (const file of item.codeFiles) {
          const actual = await sha256(await safeFile(root, file.path, vault));
          const expected = lane ? file.installedSHA256 ?? file.sha256 : file.sha256;
          if (actual !== expected) issues.push(item.id + ": hash mismatch in " + file.path);
        }
        const recipe = JSON.parse(await readFile(await safeFile(resolve(vault, "registry"), basename(item.installRecipe), vault), "utf8"));
        for (const entry of recipe.files) {
          const expected = item.codeFiles.find(file => file.path === entry.target);
          if (!expected || createHash("sha256").update(entry.content).digest("hex") !== (expected.installedSHA256 ?? expected.sha256)) {
            issues.push(item.id + ": damaged registry item");
            break;
          }
        }
        for (const link of [item.demoURL, item.sourceURL]) {
          if (new URL(link).protocol !== "https:") issues.push(item.id + ": invalid upstream link");
        }
      } catch { issues.push(item.id + ": could not verify prepared artifacts"); }
    }
  }
  let library;
  try {
    const data = await readLibrary(resolve(vault, "user/library.v1.json"));
    library = { status: "readable", revision: data.revision, collections: data.collections.length };
  } catch { library = { status: "unreadable" }; issues.push("Saved library is unreadable. Restore a backup before saving changes."); }
  const ready = [...catalog.values()].filter(item => item.availability === "ready").length;
  return { catalog, ready, issues, library, cachedOriginals: thumbnails.size, thumbnailFiles: [...thumbnails.values()].flat().length };
}

export async function buildIdentity() {
  const files = ["index.html", "vite.config.mjs", "package-lock.json", "scripts/v9/serve.mjs", "scripts/studio/catalog.mjs", "scripts/v12/sources.mjs", "scripts/originals/editions.mjs",
    ...["paths", "library", "kits", "thumbnail-cache"].map(name => `scripts/studio/v11/${name}.mjs`)];
  for (const folder of ["studio"]) {
    for (const entry of await readdir(folder, { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) files.push(resolve(entry.parentPath, entry.name));
    }
  }
  const build = createHash("sha256");
  for (const file of files.sort()) build.update(await readFile(file));
  build.update(await readFile(resolve(vault, indexName)).catch(error => {
    if (error.code === "ENOENT") return "no-editions";
    throw error;
  }));
  const runtime = resolve(vault, "runtime");
  for (const file of (await readdir("metadata/editions")).filter(file => /^v\d+\.json$/.test(file)).sort()) {
    build.update(await readFile(resolve("metadata/editions", file)));
  }
  const providers = await readdir(runtime).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const provider of providers.filter(name => !name.startsWith(".")).sort()) {
    build.update(provider);
    build.update(await readFile(resolve(runtime, provider, "catalog.json")).catch(error => {
      if (["ENOENT", "ENOTDIR"].includes(error.code)) return "missing";
      throw error;
    }));
  }
  return build.digest("hex").slice(0, 20);
}

export async function runningStudio() {
  try {
    const response = await fetch("http://127.0.0.1:5199/", { signal: AbortSignal.timeout(800), redirect: "manual" });
    return { version: response.headers.get("x-motionux-studio"), build: response.headers.get("x-motionux-build") };
  } catch { return null; }
}
