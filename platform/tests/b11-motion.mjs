import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { sourcePlanSchema } from "../packages/build-core/source/graph.ts";
import { restoreSources } from "../packages/app-export/source-catalog.ts";
import { sealSourceGraph, sourceDocument } from "../packages/app-export/source-tree.ts";
import { exportTree, writeTree } from "../packages/app-export/export.ts";

const repo = resolve(import.meta.dirname, "../..");
const root = resolve(repo, ".motionux-v9");
const evidence = resolve(root, "evidence/build-b11");
const project = JSON.parse(await readFile(resolve(evidence, "native-B-project.json"), "utf8"));
const saved = project.document.sourceGraph;
const plan = sourcePlanSchema.strip().parse(saved);
const references = await restoreSources(repo, saved.sources);
const pin = references.find(({ pin }) => pin.adapter === "transition")?.pin.id;
const target = plan.pages.flatMap((page) => page.instances.map((node) => ({ node, route: page.route })))
  .find(({ node }) => node.source === pin && node.items.length > 1);
assert(target, "The native graph needs a source Transition Panel with two options.");
plan.motion = "system";
target.node.motion = "inherit";
const graph = await sealSourceGraph(repo, { audience: plan.summary, requirements: saved.requirements }, plan, references);
const files = await exportTree(repo, { ...project, document: sourceDocument(graph) });
const work = await mkdtemp(resolve(root, "build-tests/b11-motion-"));
const run = promisify(execFile);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
let child, browser;
try {
  await writeTree(work, files);
  for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "typecheck"], ["run", "build"]])
    await run("npm", args, { cwd: work, env, timeout: 120_000 });
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((done) => socket.close(done));
  const origin = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: work, env, stdio: "ignore" });
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await fetch(origin).catch(() => null))?.ok) break;
    await delay(150);
  }
  browser = await chromium.launch();
  async function sample(reducedMotion) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion });
    try {
      assert((await page.goto(origin + target.route))?.ok());
      const region = page.locator('[data-instance="' + target.node.id + '"]');
      await region.locator(".mx-source-tabs button").nth(1).waitFor();
      await page.waitForLoadState("networkidle");
      const sampled = await region.evaluate(async (container) => {
        const button = container.querySelectorAll(".mx-source-tabs button")[1];
        button.focus();
        button.click();
        const frames = [];
        for (let index = 0; index < 25; index++) {
          await new Promise(requestAnimationFrame);
          const panel = [...container.querySelectorAll(".mx-source-body > div")].at(-1);
          if (!panel) continue;
          const style = getComputedStyle(panel);
          frames.push({ opacity: Number(style.opacity), transform: style.transform, filter: style.filter });
        }
        return { frames, selected: button.getAttribute("aria-pressed"), focused: document.activeElement === button };
      });
      return sampled;
    } finally { await page.close(); }
  }
  const system = await sample("no-preference");
  const reduced = await sample("reduce");
  assert(system.frames.length >= 20 && reduced.frames.length >= 20);
  assert(system.frames.some(({ opacity, transform }) => opacity < 0.9 && transform !== "none"));
  assert(reduced.frames.every(({ opacity, transform }) => opacity === 1 && transform === "none"));
  assert.equal(system.selected, "true");
  assert.equal(reduced.selected, "true");
  assert(system.focused && reduced.focused);
  const report = { source: pin, instance: target.node.id, browser: browser.version(), system, reduced };
  await writeFile(resolve(evidence, "transition-motion.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log("Captured " + system.frames.length + " normal and " + reduced.frames.length + " reduced-motion frames with retained focus.");
} catch (error) {
  console.error(error.stdout ?? "", error.stderr ?? "");
  throw error;
} finally {
  await browser?.close();
  if (child && child.exitCode === null) {
    const closed = once(child, "close");
    child.kill("SIGTERM");
    await closed;
  }
  await rm(work, { recursive: true, force: true });
}
