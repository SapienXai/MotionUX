import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { atomicWrite } from "../studio/v11/library.mjs";
import { safeFile } from "../studio/v11/paths.mjs";
import { vault } from "../studio/catalog.mjs";
import { providerAdapters } from "./adapters.mjs";
import { groupPattern, indexName, readEditionGroups, readEditions } from "./editions.mjs";

const [mode, editionName, snapshot] = process.argv.slice(2);
const edition = (await readEditions()).find(item => "v" + item.ordinal === editionName);
if (!edition) throw new Error("Specify an edition, e.g. v13.");
if (mode === "refresh") {
  const providers = providerAdapters();
  const run = promisify(execFile);
  const changes = await Promise.all(Object.entries(edition.pins).map(async ([name, pinned]) => {
    const { stdout } = await run("git", ["ls-remote", providers.get(name).repoURL + ".git", "HEAD"], { timeout: 15000 });
    const remote = stdout.trim().split(/\s+/)[0];
    return { provider: name, pinned, remote, changed: remote !== pinned };
  }));
  console.log(JSON.stringify(changes, null, 2));
} else if (mode === "rollback") {
  if (!/^edition-index-before-\d{17}\.json$/.test(snapshot ?? "")) throw new Error("Specify a recorded local index checkpoint filename.");
  const root = resolve(vault, "evidence", editionName);
  const selected = JSON.parse(await readFile(await safeFile(root, snapshot, vault), "utf8"));
  if (!Array.isArray(selected) || !selected.every(group => groupPattern.test(group))) throw new Error("Invalid edition checkpoint.");
  for (const group of selected) await safeFile(resolve(vault, "runtime", group), "catalog.json", vault);
  const before = await readEditionGroups(vault);
  const checkpoint = new Date().toISOString().replace(/[^0-9]/g, "");
  await atomicWrite(resolve(root, "edition-index-before-" + checkpoint + ".json"), JSON.stringify(before, null, 2) + "\n");
  await atomicWrite(resolve(vault, indexName), JSON.stringify(selected, null, 2) + "\n");
  console.log("Restored local edition index. Restart Studio.");
} else throw new Error("Use refresh or rollback.");
