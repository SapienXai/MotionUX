import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const editionFile = /^v[1-9][0-9]*\.json$/;

export async function readEditions() {
  const directory = resolve("metadata/editions");
  const files = (await readdir(directory)).filter(file => editionFile.test(file));
  return Promise.all(files.map(async file => {
    const edition = JSON.parse(await readFile(resolve(directory, file), "utf8"));
    if (file !== "v" + edition.ordinal + ".json" || !Array.isArray(edition.items) ||
      new Set(edition.items.map(item => item.provider + ":" + item.slug)).size !== edition.items.length) {
      throw new Error("Invalid edition manifest: " + file);
    }
    return edition;
  }));
}

export const indexName = "editions.v1.json";
export const groupPattern = /^v[1-9]\d*-[a-z0-9]+-[a-f0-9]{16}$/;

export async function readEditionGroups(vault) {
  try {
    const groups = JSON.parse(await readFile(resolve(vault, indexName), "utf8"));
    if (!Array.isArray(groups) || !groups.every(group => typeof group === "string" && groupPattern.test(group))) throw new Error("Invalid edition index");
    return [...new Set(groups)];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
