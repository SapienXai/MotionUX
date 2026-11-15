import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { exclusions } from "../../src/brain/ranker.ts";
import { asRequest, asResult } from "../../src/brain/validation.ts";

const div = (number, count) => count ? number / count : 0;
export async function evaluate(engine, index) {
  const fixture = JSON.parse(await readFile("fixtures/brain/scenarios.v1.json", "utf8"));
  assert.equal(fixture.schemaVersion, 1);
  assert(fixture.scenarios.length >= 40);
  const ids = new Set();
  const catalog = new Map(index.records.map(row => [row.id, row]));
  const rows = fixture.scenarios.map(entry => {
    assert(!ids.has(entry.id)); ids.add(entry.id);
    assert(["tr", "en"].includes(entry.language) && entry.rationale);
    for (const id of entry.acceptable ?? []) {
      assert(catalog.get(id)?.source.upstreamHash === fixture.pins[id], "Gold source pin is missing or stale for " + id);
    }
    const candidate = asResult(engine.query("recommend", asRequest(entry.request)));
    const expected = entry.acceptable ?? [];
    const result = candidate.candidates.map(row => row.id);
    const found = new Set(result);
    const rank = result.findIndex(id => expected.includes(id)) + 1;
    const violations = candidate.candidates.flatMap(row => exclusions(catalog.get(row.id), candidate.requirements));
    if (entry.expected !== "candidates" && result.length) violations.push("false-positive-recommendation");
    for (const [key, value] of Object.entries(entry.expectedRequirements ?? {})) {
      const actual = candidate.requirements[key];
      if (Array.isArray(value) ? value.some(item => !actual?.includes(item)) : actual !== value) violations.push("missed-hard-constraint:" + key);
    }
    if (entry.filterReason && !candidate.filteredReasons[entry.filterReason]) violations.push("missing-filter:" + entry.filterReason);
    const ungrounded = candidate.candidates.reduce((sum, row) => {
      if (!row.matches.some(match => match.field === "intents" || match.field === "patterns")) return sum + 1;
      return sum + row.matches.filter(match => !match.evidence.length ||
        match.evidence.some(evidence => evidence.sourcePinOrHash !== catalog.get(row.id).source.upstreamHash)).length;
    }, 0);
    return { id: entry.id, language: entry.language, expected: entry.expected, decision: candidate.decision, result, rank, violations, ungrounded,
      goldRecallAt5: expected.length ? expected.filter(id => found.has(id)).length / expected.length : null, hardCase: Boolean(entry.hardCase) };
  });
  const positives = rows.filter(row => row.expected === "candidates");
  const negatives = rows.filter(row => row.expected !== "candidates");
  const hard = rows.filter(row => row.hardCase);
  const languages = { tr: rows.filter(row => row.language === "tr").length, en: rows.filter(row => row.language === "en").length };
  const classes = ["no-motion", "no-suitable-component", "need-more-context"];
  const abstentions = Object.fromEntries(classes.map(decision => {
    const relevant = rows.filter(row => row.expected === decision);
    const predicted = rows.filter(row => row.decision === decision);
    const truePositives = relevant.filter(row => row.decision === decision).length;
    return [decision, { precision: div(truePositives, predicted.length), recall: div(truePositives, relevant.length), cases: relevant.length }];
  }));
  const metric = {
    scenarios: rows.length, languages, positives: positives.length, abstentionCases: negatives.length, hardCases: hard.length,
    hardViolations: rows.reduce((sum, row) => sum + row.violations.length, 0),
    evidenceMismatches: rows.reduce((sum, row) => sum + row.ungrounded, 0),
    hardAccuracy: div(hard.filter(row => !row.violations.length && row.expected === row.decision).length, hard.length),
    top1: div(positives.filter(row => row.rank === 1).length, positives.length),
    top3: div(positives.filter(row => row.rank && row.rank <= 3).length, positives.length),
    top5: div(positives.filter(row => row.rank && row.rank <= 5).length, positives.length),
    goldRecallAt5: div(positives.reduce((sum, row) => sum + row.goldRecallAt5, 0), positives.length),
    mrr: div(positives.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0), positives.length),
    abstentions, mismatches: rows.filter(row => row.decision !== row.expected || row.expected === "candidates" && !row.rank)
      .map(({ id, expected, decision, result }) => ({ id, expected, decision, result })),
  };
  assert(languages.tr >= 12 && languages.en >= 12 && hard.length >= 8 && negatives.length >= 8);
  return { ...metric, go: metric.top5 >= .8 && metric.goldRecallAt5 >= .8 && metric.hardAccuracy === 1 && !metric.hardViolations &&
    !metric.evidenceMismatches && negatives.every(row => row.expected === row.decision), rows };
}
