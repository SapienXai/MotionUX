import { execFileSync } from "node:child_process";
import { inspectWorkspace, runningStudio, buildIdentity } from "./health.mjs";
import { vault } from "../catalog.mjs";

const { catalog, ...workspace } = await inspectWorkspace({ deep: true });
const active = await runningStudio();
const current = await buildIdentity();
const available = [...catalog.values()].filter(item => item.availability === "ready");
console.log(JSON.stringify({
  ...workspace,
  originals: catalog.size,
  formats: Object.fromEntries(["react", "html"].map(kind => [kind, available.filter(entry => entry.sourceKind === kind).length])),
  vaultSize: execFileSync("du", ["-sh", vault], { encoding: "utf8" }).split(/\s+/)[0],
  loopback: active ? active.version === "v11" && active.build === current ? "ready" : "outdated Studio or occupied port" : "stopped",
}, null, 2));
if (workspace.issues.length || !workspace.ready) process.exitCode = 1;
