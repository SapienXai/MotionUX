import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { resolve } from "node:path";
import { canonical } from "../../../src/brain/indexer.ts";
import { base, directory, entry, materialize, readJSON, repo, replace, stop } from "./files.mjs";
import { command, npm, start } from "./process.mjs";
import { runEvidence } from "./review.mjs";

async function nextPort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  return port;
}

export async function verifyBuild(run, tree, phase, signal, { logs = runEvidence(run) } = {}) {
  const scratch = resolve(base, "scratch");
  await directory(scratch, true);
  const container = await mkdtemp(resolve(scratch, "build-"));
  const cwd = resolve(container, "consumer");
  const steps = [];
  let server;
  try {
    await materialize(cwd, tree);
    // Harness-only settings bound Next's worker fanout and output tracing to this build replica.
    await replace(resolve(cwd, "next.config.mjs"), entry('export default { outputFileTracingRoot: process.cwd(), experimental: { cpus: 2 } };\n'), null);
    steps.push(await npm(["ci"], { cwd, logs, logName: phase + "-npm-ci", signal }));
    const next = resolve(cwd, "node_modules/next/dist/bin/next");
    steps.push(await command(next, ["build", "--webpack", "--debug-build-paths", "src/app/**,src/pages/**,!src/app/server-receipt/**"],
      { cwd, logs, logName: phase + "-next-build", signal }));
    steps.push(await command(resolve(cwd, "node_modules/typescript/bin/tsc"), ["--noEmit"], { cwd, logs, logName: phase + "-typecheck", signal }));
    const port = await nextPort();
    const origin = "http://127.0.0.1:" + port;
    server = await start(next, ["start", "-H", "127.0.0.1", "-p", String(port)],
      { cwd, logs, logName: phase + "-next-server", signal, local: port, timeout: 210_000 });
    let ready = false;
    for (let attempt = 0; attempt < 60 && !server.exited(); attempt++) {
      const response = await fetch(origin + "/bookings/confirmation", { signal: AbortSignal.timeout(750), redirect: "error" }).catch(() => null);
      if (response?.ok) { ready = true; break; }
      if (signal?.aborted) stop("cancelled", "Fixture verification cancelled.");
      await delay(250);
    }
    if (!ready) stop("verification-failed", "Next did not serve the authorized route.");
    steps.push(await command(resolve(repo, "scripts/agent/v2/browser.mjs"), [origin, logs, phase],
      { cwd, logs, logName: phase + "-playwright", signal, local: port, timeout: 180_000 }));
    return { commands: steps, browser: await readJSON(resolve(logs, phase + "-browser.json")) };
  } finally {
    if (server) { server.kill(); await server.done; }
    // Firefox/WebKit helpers can finish writing their temporary profiles just after browser.close().
    await rm(container, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

export function verifier(review) {
  return async (before, after, signal) => {
    const first = await verifyBuild(review.runId, before, "before", signal);
    const second = await verifyBuild(review.runId, after, "after", signal);
    assert.equal(canonical(first.browser.palette), canonical(second.browser.palette), "Host theme changed");
    return { before: first, after: second, themePreserved: true };
  };
}
