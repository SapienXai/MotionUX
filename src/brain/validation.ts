import Ajv2020 from "ajv/dist/2020.js";
import indexSchema from "../../schemas/brain/index.v1.json" with { type: "json" };
import requestSchema from "../../schemas/brain/request.v1.json" with { type: "json" };
import resultSchema from "../../schemas/brain/result.v1.json" with { type: "json" };
import curationSchema from "../../schemas/brain/curation.v1.json" with { type: "json" };
import taxonomySchema from "../../schemas/brain/taxonomy.v1.json" with { type: "json" };
import type { BrainIndex, BrainRequest, BrainResult, Claim, Curation } from "./contracts.ts";

const ajv = new Ajv2020({ allErrors: false, strict: true, strictTypes: false });
const validateIndex = ajv.compile<BrainIndex>(indexSchema);
const validateRequest = ajv.compile<BrainRequest>(requestSchema);
const validateResult = ajv.compile<BrainResult>(resultSchema);
const validateCuration = ajv.compile<{ schemaVersion: 1; records: Curation[] }>(curationSchema);
const validateTaxonomy = ajv.compile(taxonomySchema);

export function assertTaxonomy(value: unknown) {
  if (!validateTaxonomy(value)) throw new Error("Invalid Brain ontology " + ajv.errorsText(validateTaxonomy.errors));
}

export function asIndex(value: unknown): BrainIndex {
  if (!validateIndex(value)) throw new Error("Invalid Brain index " + ajv.errorsText(validateIndex.errors));
  const ids = new Set<string>();
  for (const record of value.records) {
    if (ids.has(record.id)) throw new Error("Duplicate Brain index ID " + record.id);
    ids.add(record.id);
    if (record.source.registryPath !== "/v9/registry/" + record.id + ".json" ||
      record.source.studioPath !== "/?item=" + record.id + "#specimen") throw new Error("Mismatched Brain source routes");
    for (const group of [record.semantic, record.support, record.behavior, record.performance]) {
      const claims: Claim<unknown>[] = Object.values(group);
      if (claims.some(claim => claim.evidence.some(ref => ref.sourcePinOrHash !== record.source.upstreamHash))) {
        throw new Error("Brain claim evidence does not match its source for " + record.id);
      }
    }
  }
  return value;
}

export function asRequest(value: unknown): BrainRequest {
  if (!validateRequest(value)) throw new Error("Invalid Brain request " + ajv.errorsText(validateRequest.errors));
  if (!value.query.trim()) throw new Error("Brain query must contain text");
  return value;
}

export function asResult(value: unknown): BrainResult {
  if (!validateResult(value)) throw new Error("Invalid Brain result " + ajv.errorsText(validateResult.errors));
  return value;
}

export function asCuration(value: unknown): Curation[] {
  if (!validateCuration(value)) throw new Error("Invalid Brain curation " + ajv.errorsText(validateCuration.errors));
  return value.records;
}
