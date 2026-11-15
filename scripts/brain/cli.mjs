import { parseArgs } from "node:util";
import { isAbsolute, resolve } from "node:path";
import { createBrain } from "../../src/brain/ranker.ts";
import { canonical, compareIds } from "../../src/brain/indexer.ts";
import { asRequest, asResult } from "../../src/brain/validation.ts";
import { semanticKeys, supportKeys } from "../../src/brain/contracts.ts";
import { atomicWrite } from "../studio/v11/library.mjs";
import { buildLocal, openLocal, readJson } from "./index-store.mjs";

const [command, ...args] = process.argv.slice(2);
const asJSON = args.includes("--json");
const commands = {
  index: { force: { type: "boolean" }, check: { type: "boolean" }, "explain-changes": { type: "boolean" } },
  doctor: {}, search: { query: { type: "string" }, request: { type: "string" } },
  recommend: { request: { type: "string" }, query: { type: "string" } }, inspect: { id: { type: "string" } }, evaluate: {},
};
const print = output => process.stdout.write(canonical(output) + "\n");
const safeMessage = message => String(message).replaceAll(process.cwd(), "[workspace]").replace(/(?:\/Users\/|\/home\/)[^\s]+/g, "[local-path]");
const indexPath = ".motionux-v9/brain/index.v1.json";
const prepared = ["Set up Studio using docs/DEVELOPER-GUIDE.md#set-up-studio", "Then run npm run brain:index.",
  "For offline fixture tests without the vault, run npm run test:brain."];

async function requestFrom(options) {
  if (Boolean(options.request) === Boolean(options.query)) throw new Error("Supply one of --query or --request");
  if (options.query) return asRequest({ schemaVersion: 1, query: options.query });
  const request = options.request;
  if (isAbsolute(request) || !request.endsWith(".json") || /^[a-z][a-z0-9+.-]*:/i.test(request) ||
    request.includes("\\") || request.split("/").includes("..")) throw new Error("Request must be a workspace-relative JSON file");
  return asRequest(await readJson(resolve(request), { max: 65536 }));
}

function describe(open) {
  const stale = new Set(open.staleIds);
  const records = open.invalidIndex ? [] : open.index.records.filter(row => !stale.has(row.id));
  const supported = Object.fromEntries(supportKeys.map(key => [key, records.filter(row => row.support[key].status === "verified").length]));
  const claims = {
    semantic: records.flatMap(row => semanticKeys.map(key => row.semantic[key])),
    support: records.flatMap(row => Object.values(row.support)),
    behavior: records.flatMap(row => Object.values(row.behavior)),
    performance: records.flatMap(row => Object.values(row.performance)),
  };
  const unknownPercent = Object.fromEntries(Object.entries(claims).map(([group, values]) => [group,
    values.length ? Number((100 * values.filter(value => value.status === "unknown").length / values.length).toFixed(2)) : null]));
  const stalePercent = open.index.records.length
    ? Number((100 * (open.invalidIndex ? open.index.records.length : open.staleIds.length) / open.index.records.length).toFixed(2)) : null;
  return {
    schemaVersion: 1, algorithmVersion: open.index.algorithmVersion, taxonomyVersion: open.index.taxonomyVersion, offline: true,
    indexPath, indexFingerprint: open.indexPresent ? open.index.indexFingerprint : null,
    indexStatus: open.invalidIndex || open.staleIds.length || open.unindexed ? "recheck-required" : open.index.environment,
    catalog: open.catalog, preparedReady: open.ready, unavailable: open.unavailable, indexedReady: records.length,
    curated: records.filter(row => row.curated).length, curatedProviders: [...new Set(records.filter(row => row.curated).map(row => row.provider))].sort(compareIds),
    stale: open.staleIds, stalePercent, unindexed: open.unindexed, pinMismatch: open.artifactMismatches,
    catalogWarnings: open.catalogWarnings, unknownPercent, supported,
    verifiedSampledMotion: records.filter(row => row.behavior.sampledMotion.status === "verified").length,
    ...(open.index.environment === "not-prepared" && { setup: prepared }),
  };
}

function human(result) {
  console.log("Decision " + result.decision);
  for (const line of result.explanation) console.log(line);
  for (const candidate of result.candidates) {
    console.log("\n" + candidate.title + " · " + candidate.integrationKind + " · " + candidate.score);
    if (candidate.matches.length) console.log("Matched " + candidate.matches.map(match => match.value + " (" + match.status + ")").join(", "));
    for (const note of candidate.disclosures.slice(1)) console.log(note);
    if (candidate.unknowns.length) console.log("Unverified " + candidate.unknowns.join(", "));
    console.log(candidate.studioURL);
  }
  if (Object.keys(result.filteredReasons).length) console.log("Filters " + canonical(result.filteredReasons));
}

async function main() {
  if (!Object.hasOwn(commands, command)) throw new Error("Use index, doctor, search, recommend, inspect or evaluate");
  const { values: flags } = parseArgs({ args, strict: true, allowPositionals: false,
    options: { ...commands[command], json: { type: "boolean" } } });
  if (command === "index") {
    if (flags.force && flags.check) throw new Error("--force and --check cannot be combined");
    const { index, changes, rebuilt, reused, current } = await buildLocal(flags);
    const response = { schemaVersion: 1, status: index.environment, indexPath, indexFingerprint: index.indexFingerprint,
      configFingerprint: index.configFingerprint, sourceFingerprint: index.sourceFingerprint,
      records: index.records.length, curated: index.records.filter(item => item.curated).length, rebuilt, reused, current,
      ...(flags["explain-changes"] && { changes }), ...(index.environment === "not-prepared" && { setup: prepared }) };
    if (asJSON) print(response);
    else {
      console.log("Brain index " + response.status + " · " + response.records + " ready · " + rebuilt + " rebuilt · " + reused + " reused");
      console.log(response.indexFingerprint);
      for (const line of response.setup ?? []) console.log(line);
      if (flags["explain-changes"]) for (const entry of changes) console.log(entry.id + " · " + entry.reason);
    }
    if (flags.check && !current && index.environment === "prepared") process.exitCode = 1;
    return;
  }
  const opened = await openLocal();
  const engine = createBrain(opened.index, opened);
  if (command === "doctor") { print(describe(opened)); return; }
  if (command === "inspect") {
    if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(flags.id ?? "")) throw new Error("Supply a valid original ID with --id");
    const result = engine.inspect(flags.id);
    if (opened.index.environment === "not-prepared") { print({ schemaVersion: 1, status: "not-prepared", setup: prepared }); return; }
    const output = { schemaVersion: 1, id: flags.id, indexFingerprint: opened.index.indexFingerprint, ...result };
    if (asJSON || !result.profile) print(output);
    else {
      const p = result.profile;
      console.log(p.title + " · " + p.integrationKind + " · " + p.source.upstreamHash);
      for (const [group, claims] of Object.entries({ semantic: p.semantic, support: p.support, behavior: p.behavior, performance: p.performance })) {
        for (const [key, claim] of Object.entries(claims)) {
          console.log(group + "." + key + " · " + claim.status + (claim.value === null ? "" : " · " + canonical(claim.value)));
          for (const source of claim.evidence) console.log("  " + source.locator + (source.testedProfile ? " · " + source.testedProfile : ""));
        }
      }
    }
    return;
  }
  if (command === "evaluate") {
    if (!opened.indexPresent) { print({ schemaVersion: 1, status: "not-prepared", setup: prepared }); process.exitCode = 1; return; }
    if (opened.invalidIndex || opened.staleIds.length || opened.unindexed) throw new Error("Rebuild the Brain index before evaluation");
    const { evaluate } = await import("./evaluate.mjs");
    const result = { indexFingerprint: opened.index.indexFingerprint, ...await evaluate(engine, opened.index) };
    await atomicWrite(resolve(".motionux-v9/evidence/brain-v1/evaluation.json"), canonical(result) + "\n");
    if (asJSON) print(result);
    else {
      const summary = Object.fromEntries(Object.entries(result).filter(([name]) => name !== "rows"));
      print(summary);
    }
    if (!result.go) process.exitCode = 1;
    return;
  }
  const decision = asResult(engine.query(command, await requestFrom(flags)));
  if (asJSON) print(decision);
  else human(decision);
}
try { await main(); } catch (error) {
  if (asJSON) print({ schemaVersion: 1, status: "error", message: safeMessage(error.message) });
  else console.error(safeMessage(error.message));
  process.exitCode = 1;
}
