import { createServer } from "node:net";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { command, npm, start } from "../v2/process.mjs";
import { directory, file, materialize, readJSON, repo, stop } from "../v2/files.mjs";
import { recheckRestored } from "../v2/recheck.mjs";
import { locked } from "../v2/transaction.mjs";
import { assertRoot, base, runFolder, scan } from "./workspace.mjs";

const hosts = {
  next: { binary: "next/dist/bin/next", build: ["build", "--webpack"], serve: port => ["start", "-H", "127.0.0.1", "-p", String(port)] },
  vite: { binary: "vite/bin/vite.js", build: ["build"], serve: port => ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"] },
};
const size = path => Number(execFileSync("/usr/bin/du", ["-sk", path], { encoding: "utf8" }).trim().split(/\s+/)[0]) * 1024;
const slot = task => locked("a".repeat(32), true, task, resolve(base, "build-locks"));
async function reservePort() {
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise(done => server.close(done));
  return port;
}

async function isolatedBuild(review, tree, phase, signal, { logs = runFolder(review.runId), fault = false } = {}) {
  const host = hosts[review.request.fixture];
  if (!host || process.platform !== "darwin") stop("environment-blocked", "The real fixture harness requires its macOS sandbox.");
  const scratch = resolve(base, "scratch");
  await directory(scratch, true);
  const replica = await mkdtemp(resolve(scratch, review.runId + "-" + phase + "-"));
  const cwd = resolve(replica, "app");
  const steps = [];
  let server;
  try {
    await materialize(cwd, tree, scan);
    steps.push(await npm(["ci"], { cwd, logs, logName: phase + "-npm-ci", signal }));
    const binary = resolve(cwd, "node_modules", host.binary);
    steps.push(await command(resolve(cwd, "node_modules/typescript/bin/tsc"), ["--noEmit"], { cwd, logs, logName: phase + "-typecheck", signal }));
    steps.push(await command(binary, host.build, { cwd, logs, logName: phase + "-build", signal }));
    const buildBytes = size(replica);
    if (buildBytes > 850 * 1024 ** 2) stop("build-budget", "The bounded fixture build is larger than 850 MiB.");
    const port = await reservePort();
    const origin = "http://127.0.0.1:" + port;
    server = await start(binary, host.serve(port), { cwd, logs, logName: phase + "-server", signal, local: port, timeout: 150_000 });
    const route = review.request.route ?? "/";
    let ready = false;
    for (let n = 0; n < 50 && !server.exited(); n++) {
      signal?.throwIfAborted();
      if (await fetch(origin + route, { signal: AbortSignal.timeout(600), redirect: "error" }).then(res => res.ok, () => false)) {
        ready = true;
        break;
      }
      await delay(250);
    }
    if (!ready) stop("verification-failed", "The built app did not serve the selected route.");
    steps.push(await command(resolve(repo, "scripts/agent/v3/browser.mjs"), [origin, route, review.request.fixture, phase, logs, fault ? "fault" : "normal"],
      { cwd, logs, logName: phase + "-playwright", signal, local: port, timeout: 120_000 }));
    const browser = await readJSON(resolve(logs, phase + "-browser.json"));
    if (!browser.checks?.length || browser.checks.some(check => check.status !== "passed")) stop("verification-failed", "The current browser gates did not pass.");
    return { commands: steps, browser, storage: { postBuildReplicaBytes: buildBytes, peakObservedReplicaBytes: Math.max(buildBytes, size(replica)) } };
  } finally {
    if (server) { server.kill(); await server.done; }
    await rm(replica, { force: true, recursive: true, maxRetries: 8, retryDelay: 100 });
  }
}

export async function verifyBuild(review, tree, phase, signal, options) {
  return slot(() => isolatedBuild(review, tree, phase, signal, options));
}

export async function preflightPackages(review, tree, signal, logs = runFolder(review.runId)) {
  return slot(async () => {
    const scratch = resolve(base, "scratch");
    await directory(scratch, true);
    const replica = await mkdtemp(resolve(scratch, review.runId + "-preflight-"));
    const cwd = resolve(replica, "app");
    const names = ["package.json", "package-lock.json"];
    try {
      await materialize(cwd, { files: new Map(names.map(name => [name, tree.files.get(name)])), dirs: new Map() }, scan);
      const result = await npm(["ci"], { cwd, logs, logName: "preflight-npm-ci", signal });
      for (const name of names) {
        if ((await file(resolve(cwd, name)))?.sha256 !== tree.files.get(name).sha256) {
          stop("incompatible", "npm changed one of the reviewed dependency images.");
        }
      }
      const allocatedBytes = size(replica);
      if (allocatedBytes > 850 * 1024 ** 2) stop("build-budget", "The disposable install exceeded 850 MiB.");
      return { ...result, allocatedBytes };
    } finally {
      await rm(replica, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
    }
  });
}

export async function recheck(review, journal, signal, fault = false, folder = runFolder(review.runId)) {
  const root = await assertRoot(review);
  return recheckRestored(review, journal, signal, { root, folder,
    readTree: async () => scan(await assertRoot(review)),
    verify: (_id, tree, phase, during, { logs }) => verifyBuild(review, tree, phase, during, { logs, fault }) });
}
