import { readFile, writeFile } from "node:fs/promises";

const read = async path => JSON.parse(await readFile(path, "utf8"));
const { items } = await read("metadata/reference-inventory.json");
const inspection = await read(".motionux-v9/designbookmark/inspection.json");
const providers = await read("metadata/v9-provider-candidates.json");
const statuses = new Map(inspection.results.map(item => [item.id, item]));
const map = items.map(entry => {
  const observed = statuses.get(entry.id);
  if (!observed) throw new Error("No observation for " + entry.id);
  const provider = providers.providers.find(provider => provider.name === entry.provider);
  const upstream = observed.upstream?.split("?")[0];
  const candidate = provider?.candidates.find(record => record.demo?.split("?")[0] === upstream)
    ?? provider?.candidates.find(record => record.id === upstream?.split("/").pop());
  const captured = entry.provider === "DesignBookmark" && observed.observed === "code-payload" && observed.sourceURL;
  const sourceStatus = captured ? "source-acquired" : candidate || upstream ? "upstream-linked" : "original-unavailable";
  const reason = captured ? "The official Copy code action returned runnable source. Its snapshot is held in the local source workspace." :
    upstream ? "DesignBookmark links to the provider's official implementation. The V8 preview is retained as a legacy entry." :
      "The official action returned no source that could be matched to this card.";
  return { id: entry.id, name: entry.name, provider: entry.provider, reference: observed.reference ?? entry.referencePreview,
    category: entry.category, sourceStatus, reason, legacy: true,
    ...(captured ? { sourceSHA256: observed.sha256, method: "official-copy-code", bytes: observed.bytes } : {}),
    ...(upstream ? { upstream, method: "official-provider-link" } : {}),
    ...(candidate?.source ? { source: candidate.source, revision: provider.revision, install: candidate.install } : {}),
  };
});
await writeFile("metadata/v9-reference.json", JSON.stringify({ schemaVersion: 1, items: map }, null, 2) + "\n");
