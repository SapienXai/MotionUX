import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createComposer } from "../packages/build-core/composer/service.ts";
import { createStore } from "../packages/build-core/store.ts";
import { hotelBriefs } from "./b8-fixtures.mjs";

const vault = resolve(import.meta.dirname, "../../.motionux-v9");
const evidence = resolve(vault, "evidence/build-b8");
await mkdir(evidence, { recursive: true, mode: 0o700 });
const scratch = await mkdtemp(resolve(vault, "b8-codex-"));
const report = [];
const composer = createComposer(scratch);
const store = createStore(scratch);
try {
  for (const [locale, input] of hotelBriefs) {
    const started = performance.now();
    try {
      const job = randomBytes(16).toString("hex");
      const { plan, usage } = await composer.generate({ job, brief: input });
      assert.equal(plan.locale, locale);
      assert.equal(plan.template, "hotel-marketing");
      assert.equal(plan.pages.length, 6);
      const { plan: approved } = composer.revise({
        job,
        digest: plan.digest,
        edits: {
          name: plan.name,
          theme: plan.theme,
          sidebar: plan.sidebar,
          routes: plan.routes,
        },
      });
      assert.equal(approved.digest, plan.digest);
      const project = await composer.create({ job, digest: approved.digest });
      const persisted = await store.open(project.id);
      assert.deepEqual(
        persisted.document.pages.map(({ route }) => route),
        plan.routes,
      );
      assert.equal(persisted.document.locale, locale);
      if (locale === "tr")
        assert.equal(persisted.document.motionProfile, "none");
      await assert.rejects(composer.create({ job, digest: approved.digest }), {
        status: 409,
      });
      report.push({
        locale,
        elapsedMs: Math.round(performance.now() - started),
        routes: plan.routes,
        digest: plan.digest,
        projectCreated: true,
        usage,
      });
      console.log(locale, approved.digest);
    } catch (error) {
      report.push({ locale, error: error.message });
      console.error(locale, error.message);
      process.exitCode = 1;
    }
  }
} finally {
  await rm(scratch, { recursive: true, force: true, maxRetries: 3 });
  await writeFile(
    resolve(evidence, "codex-live.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
}
