import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { lastCatalog, preparation, vault } from "./catalog.mjs";
import { atomicWrite } from "./v11/library.mjs";
import { buildIdentity, inspectWorkspace, runningStudio } from "./v11/health.mjs";

const [active, fingerprint] = await Promise.all([runningStudio(), buildIdentity()]);
if (active?.version === "v11" && active.build === fingerprint) {
  console.log("MotionUX Studio is running at http://127.0.0.1:5199/");
  process.exit(0);
}
if (active) {
  console.error("Port 5199 is occupied by another or older server. Stop that process and retry npm run studio.");
  process.exit(1);
}

const { catalog, ready, issues, cachedOriginals } = await inspectWorkspace();
if (!ready) {
  console.error("No prepared original sources could be loaded from .motionux-v9.");
  console.error(preparation);
  for (const issue of issues) console.error(issue);
  process.exit(1);
}
console.log(`Preflight: ${ready}/${catalog.size} prepared originals, ${cachedOriginals} thumbnail sets.`);
for (const issue of issues) console.warn(issue);
if (issues.length) console.warn("Run npm run studio:doctor for details.");
try { await atomicWrite(lastCatalog, JSON.stringify([...catalog.values()]) + "\n"); }
catch { console.warn("Could not save the recovery index. Studio will use the prepared catalogs."); }

const shell = resolve(vault, "studio-shell");
const build = spawnSync("npm", ["run", "build", "--", "--logLevel", "error", "--outDir", shell, "--emptyOutDir"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
process.env.MOTIONUX_STUDIO_BUILD = fingerprint;
process.env.MOTIONUX_STUDIO_SHELL = shell;
await import("../v9/serve.mjs");
