import { spawnSync } from "node:child_process";
import { loadCatalog, preparation } from "./catalog.mjs";

let active;
try { active = await fetch("http://127.0.0.1:5199/", { signal: AbortSignal.timeout(800) }); }
catch { /* No Studio has responded on this port yet. */ }
if (active?.headers.get("X-MotionUX-Studio") === "v10") {
  console.log("MotionUX Studio is running at http://127.0.0.1:5199/");
  process.exit(0);
}
if (active) {
  console.error("Port 5199 is in use. Stop its listener before launching the private Studio.");
  process.exit(1);
}

const catalog = await loadCatalog();
const ready = [...catalog.values()].filter(item => item.availability === "ready");
if (!ready.length) {
  console.error("No prepared original sources were found in .motionux-v9.");
  console.error(preparation);
  process.exit(1);
}

const build = spawnSync("npm", ["run", "build", "--", "--logLevel", "error"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
await import("../v9/serve.mjs");
