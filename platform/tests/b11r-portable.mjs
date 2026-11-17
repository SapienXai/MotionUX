import { hasRenderedSource, sourceTarget, performSourceStep } from "../apps/preview-host/source-target.mjs";
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
        if (!pwa) {
          const page = await browser.newPage();
          await page.setContent('<select aria-label="Owner"><option value="all">All</option><option value="mira">Mira</option></select><dialog open aria-label="New record"><select aria-label="Owner"><option value="none">Unassigned</option><option value="mira">Mira</option></select></dialog>');
          const owner = await sourceTarget(page, { role: "combobox", name: "Owner" });
          await owner.selectOption("mira");
          assert.equal(await page.locator('dialog select').inputValue(), "mira");
          assert.equal(await page.locator('body > select').inputValue(), "all");
          await page.locator("dialog").evaluate((node) => node.remove());
          await (await sourceTarget(page, { role: "combobox", name: "Owner" })).selectOption("mira");
          assert.equal(await page.locator('body > select').inputValue(), "mira");
          await page.setContent('<div role="img" aria-label="Fixture surface" style="width:240px;height:160px;background:#ddd" onpointermove="this.dataset.x=event.clientX" onpointerup="this.dataset.released=String(true)"></div><div role="region" aria-label="Fixture scroll" style="height:60px;overflow:auto"><div style="height:600px">Scrollable fixture</div></div>');
          const surface = await performSourceStep(page, { role: "img", name: "Fixture surface", action: "hover", value: "" });
          const initialX = Number(await surface.getAttribute("data-x"));
          await performSourceStep(page, { role: "img", name: "Fixture surface", action: "drag", value: "80,0" });
          assert(Number(await surface.getAttribute("data-x")) > initialX);
          assert.equal(await surface.getAttribute("data-released"), "true");
          const scroll = await performSourceStep(page, { role: "region", name: "Fixture scroll", action: "wheel", value: "0,160" });
          for (let attempt = 0; attempt < 20 && !await scroll.evaluate((node) => node.scrollTop); attempt++)
            await new Promise((done) => setTimeout(done, 25));
          assert(await scroll.evaluate((node) => node.scrollTop) > 0);
          await assert.rejects(performSourceStep(page, { role: "img", name: "Fixture surface", action: "drag", value: "900,0" }));
          await page.setContent('<section id="source" style="position:relative;min-height:64px"><div style="height:0"><button style="position:absolute;bottom:0">Source undo</button></div></section>');
          const positioned = page.locator("#source");
          assert.equal(await hasRenderedSource(positioned), true, "A positioned source descendant remains rendered inside a zero-height anchor.");
          await positioned.locator("button").evaluate((node) => { node.hidden = true; });
          assert.equal(await hasRenderedSource(positioned), false, "An empty positioned anchor cannot establish source output.");
          console.log("Positioned source descendants render correctly and empty anchors fail verification");
          await page.close();
          console.log("Modal-scoped verification keeps the background filter unchanged");
        }
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
