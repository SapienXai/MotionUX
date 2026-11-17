import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { createCodeFixture, repo } from "./b11r-fixture.mjs";
import { exportTree, zipTree } from "../packages/app-export/export.ts";
import { inspect, serve } from "./b11r-consumer.mjs";

const run = promisify(execFile);
const fixture = await createCodeFixture();
const evidence = resolve(repo, ".motionux-v9/evidence/build-b11r");
await mkdir(evidence, { recursive: true, mode: 0o700 });
try {
  for (const pwa of [false, true]) {
    const work = await mkdtemp(resolve(repo, ".motionux-v9/build-tests/b11r-zip-"));
    let server;
    try {
      const tree = await exportTree(fixture.fake, fixture.project, { pwa });
      const archive = resolve(work, "source.zip");
      await writeFile(archive, zipTree(tree), { mode: 0o600 });
      await run("unzip", ["-q", archive, "-d", work]);
      await rm(archive);
      for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "typecheck"], ["run", "build"]])
        await run("npm", args, { cwd: work, timeout: 150_000, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, maxBuffer: 1_000_000 });
      server = await serve(work);
      const browser = await chromium.launch();
      try {
        const result = await inspect(browser, server.origin, fixture.project, "portable", pwa ? "pwa" : "next");
        assert.equal(result.journeys.length, 1);
        assert.equal(result.violations.length, 0);
        if (pwa) assert(result.offline.reload && result.offline.journeys.length === 1);
        console.log("Owned source fixture independently installed, built, interacted, and exported", pwa ? "PWA offline" : "Next", result.engine);
      } finally { await browser.close(); }
    } catch (error) {
      console.error(error.stdout ?? "", error.stderr ?? "");
      throw error;
    } finally {
      await server?.stop();
      await rm(work, { recursive: true, force: true });
    }
  }
} finally { await fixture.close(); }
