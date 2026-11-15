import assert from "node:assert/strict";
import { test } from "node:test";
import regression from "../../fixtures/brain/polarity-holdout.v1.json" with { type: "json" };
import blind from "../../fixtures/brain/polarity-blind.v1.json" with { type: "json" };
import withheld from "../../fixtures/brain/polarity-final-holdout.v1.json" with { type: "json" };
import { createBrain } from "../../src/brain/ranker.ts";
import { index } from "../../fixtures/agent/models.mjs";
import { interpretMotion } from "../../src/brain/polarity.ts";
import { normalize } from "../../src/brain/taxonomy.ts";

const engine = createBrain(index);
for (const [name, scenarios] of [["regression", regression], ["second regression", blind], ["withheld", withheld]]) test(name + " bilingual policy corpus matches the confusion matrix", t => {
  const confusion = {};
  assert(scenarios.length >= 30);
  for (const { expected, query, screen, language } of scenarios) {
    assert(["tr", "en"].includes(language));
    const actual = interpretMotion(query, screen, normalize).polarity ?? "neutral";
    const decision = engine.query("recommend", { schemaVersion: 1, query, ...(screen && { context: { screen } }) }).decision;
    if (expected === "still") assert.equal(decision, "no-motion", query);
    if (expected === "unclear") assert.equal(decision, "need-more-context", query);
    if (expected === "motion") assert.notEqual(decision, "no-motion", query);
    confusion[expected] ??= {};
    confusion[expected][actual] = (confusion[expected][actual] ?? 0) + 1;
    if (actual !== expected) t.diagnostic(JSON.stringify({ language, query, screen, expected, actual }));
  }
  t.diagnostic(JSON.stringify({ cases: scenarios.length, confusion }));
  assert(Object.entries(confusion).every(([expected, results]) => Object.keys(results).every(actual => expected === actual)));
});
