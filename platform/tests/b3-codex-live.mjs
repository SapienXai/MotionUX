import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { runCodex } from "../packages/build-core/composer/codex.ts";
import {
  compileDocument,
  normalizeBrief,
  resolveBlueprint,
} from "../packages/build-core/composer/blueprint.ts";
import { briefs } from "./b3-fixtures.mjs";

const repo = resolve(import.meta.dirname, "../..");
const vault = resolve(repo, ".motionux-v9");
const evidence = resolve(vault, "evidence/build-b3");
await mkdir(evidence, { mode: 0o700, recursive: true });
const scratch = await mkdtemp(resolve(vault, "b3-codex-test-"));
const cases = [];
try {
  for (const [id, input, template, locale] of briefs) {
    const brief = normalizeBrief(input);
    const start = performance.now();
    try {
      const { proposal, usage, peakScratchBytes } = await runCodex(
        scratch,
        brief,
      );
      const compiled = compileDocument(resolveBlueprint(proposal, brief));
      assert.equal(compiled.document.template, template);
      assert.equal(compiled.document.locale, locale);
      if (id.startsWith("crm-"))
        assert.deepEqual([...compiled.plan.routes].sort(), [
          "/",
          "/activities",
          "/contacts",
          "/pipeline",
          "/settings",
        ]);
      if (id === "no-motion")
        assert.equal(compiled.document.motionProfile, "none");
      if (id === "unsupported")
        assert.equal(compiled.plan.limitations.length >= 2, true);
      cases.push({
        id,
        brief,
        elapsedMs: Math.round(performance.now() - start),
        usage,
        peakScratchBytes,
        proposal,
        ...compiled,
      });
      console.log(id, compiled.plan.digest);
    } catch (error) {
      cases.push({
        id,
        brief,
        elapsedMs: Math.round(performance.now() - start),
        error: error.message,
      });
      console.error(id, error.message);
      process.exitCode = 1;
    }
    await writeFile(
      resolve(evidence, "codex-live-acceptance.json"),
      JSON.stringify(cases, null, 2),
      { mode: 0o600 },
    );
  }
} finally {
  await rm(scratch, { recursive: true, force: true, maxRetries: 3 });
}
