import { makeIndex, hash } from "../../src/brain/indexer.ts";
import { supportKeys } from "../../src/brain/contracts.ts";

const empty = () => ({ value: null, status: "unknown", confidence: "none", evidence: [] });
export function specimen(id, {
  intents = ["reveal-detail"], patterns = ["disclosure"], kind = "react", tested = [], cost, schedulerUnits = 1,
  useCases = ["content-details"], dependencies = { react: "19.3.1" }, curated = true,
} = {}) {
  const upstreamHash = hash(id);
  const evidence = { kind: "browser-test", locator: "fixtures/brain/synthetic.mjs#" + id, sourcePinOrHash: upstreamHash,
    testedProfile: "test-only synthetic browser evidence" };
  const claim = (value, status = "verified") => ({ value, status, confidence: status === "curated" ? "medium" : "high", evidence: [evidence] });
  const support = Object.fromEntries(supportKeys.map(key => [key, tested.includes(key) ? claim(true) : empty()]));
  return { schemaVersion: 1, indexVersion: 1, taxonomyVersion: 1, id, title: id.replaceAll("-", " "), provider: "Synthetic fixture",
    editionOrdinal: 1, addedSequence: 0, category: "Cards", availability: "ready", integrationKind: kind, identity: evidence,
    dependencies, fingerprint: hash({ id, tested, cost, kind }), curated, visualAcceptance: "pending",
    source: { upstreamCommit: null, upstreamHash, sourceURL: "https://example.test/fixture/" + id, demoURL: "https://example.test/demo/" + id,
      entry: "fixture.tsx", code: [{ path: "fixture.tsx", sha256: upstreamHash, installedSHA256: upstreamHash }], assets: [], notice: null,
      registryItem: id, registryHash: upstreamHash, registryPath: "/v9/registry/" + id + ".json", studioPath: "/?item=" + id + "#specimen" },
    semantic: { intents: curated ? claim(intents, "curated") : empty(), patterns: curated ? claim(patterns, "curated") : empty(),
      useCases: curated ? claim(useCases, "curated") : empty(), motions: empty(), triggers: empty(), intensity: empty(), interruption: empty(),
      restart: empty(), avoidWhen: empty(), notes: empty() },
    support, behavior: { rendered: claim(true), install: claim(true), sampledMotion: claim(true), nativeProps: claim(kind === "react"),
      clientBoundary: empty(), previewAt390: empty() },
    performance: { schedulerUnits: claim(schedulerUnits, "observed"), measuredCost: cost ? claim(cost) : empty(), graphics: empty() },
  };
}

export function syntheticIndex(count) {
  return makeIndex(Array.from({ length: count }, (_, n) => specimen("fixture-" + n, {
    ...n % 3 === 0 && { intents: ["communicate-progress"], patterns: ["progress"], useCases: ["ai-tool-status"] },
    ...n % 7 === 0 && { tested: ["keyboard", "touch-emulated"] },
  })), hash("synthetic fixture config"), "synthetic");
}
