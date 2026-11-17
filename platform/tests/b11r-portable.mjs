import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { canonical, fingerprint } from "../packages/build-core/store.ts";
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
        if (!pwa && process.argv.includes("--controls")) {
          const context = await browser.newContext();
          const parent = await context.newPage();
          const host = createServer((_request, response) => {
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end('<!doctype html><title>Control envelope fixture</title><iframe title="Consumer" src="' + server.origin + '"></iframe>');
          }).listen(5200, "127.0.0.1");
          await once(host, "listening");
          try {
            await parent.goto("http://127.0.0.1:5200/control-envelope-test");
            await parent.frameLocator("iframe").getByRole("heading", { level: 1 }).waitFor();
            const frame = parent.frames().find((frame) => frame.url().startsWith(server.origin));
            assert(frame);
            const heading = frame.getByRole("heading", { level: 1 });
            await heading.waitFor();
            await frame.getByRole("button", { name: "Show context", exact: true }).click();
            const digest = fingerprint(canonical(fixture.project.document));
            const values = Object.fromEntries(fixture.project.document.codeProject.controls.map(({ key, value }) => [key, value]));
            const send = (data) => parent.evaluate(({ data, origin }) => {
              document.querySelector("iframe").contentWindow.postMessage(data, origin);
            }, { data, origin: server.origin });
            const accepted = { type: "motionux:controls", digest, values: { ...values, heading: "Live authored heading" } };
            for (const invalid of [
              { ...accepted, digest: "stale" },
              { ...accepted, values: { ...accepted.values, "text-color": "url(https://invalid.test)" } },
              { ...accepted, values: { ...accepted.values, unknown: "unreviewed" } },
            ]) {
              await send(invalid);
              await new Promise((done) => setTimeout(done, 100));
              assert.equal(await heading.textContent(), "Compiler fixture");
            }
            await frame.evaluate((data) => window.postMessage(data, window.origin), accepted);
            await new Promise((done) => setTimeout(done, 100));
            assert.equal(await heading.textContent(), "Compiler fixture");
            await send(accepted);
            await heading.filter({ hasText: "Live authored heading" }).waitFor();
            assert.equal(await frame.locator('output[aria-label="Opens"]').textContent(), "1");
          } finally {
            await context.close();
            await new Promise((done) => host.close(done));
          }
          console.log("Control envelope rejected stale digest, forged sender, unknown keys and invalid values, retained source state on a valid edit");
        }
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
