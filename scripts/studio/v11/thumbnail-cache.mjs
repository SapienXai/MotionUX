import { createHash } from "node:crypto";
import { lstat } from "node:fs/promises";
import { resolve } from "node:path";

export const thumbnailWidths = [320, 368];
export const thumbnailSchemes = ["light", "dark"];

export function thumbnailKey(item, width, scheme) {
  const stamp = JSON.stringify([item.id, item.upstreamHash, item.upstreamCommit, item.codeFiles, width, item.preview.height, scheme, "default", 1]);
  return createHash("sha256").update(stamp).digest("hex").slice(0, 32);
}

export function thumbnailPath(vault, item, width, scheme) {
  return resolve(vault, "thumbnails", thumbnailKey(item, width, scheme) + ".jpeg");
}

export async function loadThumbnails(vault, catalog) {
  const entries = await Promise.all([...catalog.values()].map(async item => {
    if (item.availability !== "ready") return [item.id, []];
    const choices = await Promise.all(thumbnailSchemes.flatMap(scheme => thumbnailWidths.map(async width => {
      const file = thumbnailPath(vault, item, width, scheme);
      const index = await lstat(file).catch(error => {
        if (error.code !== "ENOENT") throw error;
      });
      if (!index?.isFile() || index.size < 256) return null;
      const key = thumbnailKey(item, width, scheme);
      return { scheme, width, height: item.preview.height, url: "/v11/thumbnails/" + key + ".jpeg", key, file };
    })));
    return [item.id, choices.filter(Boolean)];
  }));
  return new Map(entries.filter(([, options]) => options.length));
}
