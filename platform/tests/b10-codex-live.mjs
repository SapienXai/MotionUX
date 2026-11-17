import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createComposer } from "../packages/build-core/composer/service.ts";
import { createStore } from "../packages/build-core/store.ts";

const vault = resolve(import.meta.dirname, "../../.motionux-v9");
const evidence = resolve(vault, "evidence/build-b10");
await mkdir(evidence, { recursive: true, mode: 0o700 });
const scratch = await mkdtemp(resolve(vault, "b10-codex-"));
const composer = createComposer(scratch);
const store = createStore(scratch);
const job = randomBytes(16).toString("hex");
const report = {};
const started = performance.now();
try {
  const { plan } = await composer.generate({
    job,
    brief: "Create a fictional sales CRM with an overview, contacts and pipeline. Choose Product Precision. Add the compatible Metrics overview section to the home page. Use an explicit two-column mobile layout in that section. Keep the data local.",
  });
  assert.equal(plan.template, "crm-dashboard");
  assert.equal(plan.preset, "precision");
  assert.equal(plan.pages[0].addedSection, "metrics");
  const edits = { name: plan.name, routes: plan.routes, theme: plan.theme, sidebar: plan.sidebar, preset: "warm" };
  const review = composer.revise({ job, digest: plan.digest, edits });
  assert.notEqual(review.plan.digest, plan.digest);
  await assert.rejects(composer.create({ job, digest: plan.digest }), { status: 409 });
  const project = await composer.create({ job, digest: review.plan.digest });
  const saved = await store.open(project.id);
  assert.equal(saved.document.identity.preset, "warm");
  assert.equal(saved.document.pages[0].blocks.find((block) => block.props.sectionRecipe?.id === "metrics").props.layout.mobile.columns, 2);
  await assert.rejects(composer.create({ job, digest: review.plan.digest }), { status: 409 });
  Object.assign(report, { verified: true, proposed: plan.digest, reviewed: review.plan.digest, routes: plan.routes });
  console.log("Native Codex B10 reviewed preset and typed layout", JSON.stringify(report));
} catch (error) {
  Object.assign(report, { verified: false, error: error.message });
  throw error;
} finally {
  report.elapsedMs = Math.round(performance.now() - started);
  await rm(scratch, { recursive: true, force: true, maxRetries: 3 });
  await writeFile(resolve(evidence, "codex-live.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
}
