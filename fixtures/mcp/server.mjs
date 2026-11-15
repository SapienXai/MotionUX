import { setTimeout as delay } from "node:timers/promises";
import { index, empty } from "../agent/models.mjs";
import { runServer } from "../../scripts/mcp/server.mjs";
import { inspectProject } from "../../scripts/agent/inspect.mjs";

const [mode, ...explicit] = process.argv.slice(2);
await runServer({ explicit, deadline: mode === "timeout" ? 70 : 10_000,
  async load() {
    if (mode === "slow" || mode === "timeout") await delay(320);
    if (mode === "empty") return { index: empty, ready: 0, catalog: 0 };
    if (mode === "corrupt") return { index: empty, invalidIndex: true };
    return { index, ...(mode === "stale" && { staleIds: [index.records[0].id] }),
      ...(mode === "pin" && { artifactMismatches: ["test-pin-mismatch"] }) };
  },
  inspect: mode === "cancel" ? async (request, options) => {
    await delay(800, undefined, options);
    return inspectProject(request, options);
  } : inspectProject });
