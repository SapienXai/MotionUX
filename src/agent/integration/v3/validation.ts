import Ajv2020 from "ajv/dist/2020.js";
import request from "../../../../schemas/agent/v3/request.json" with { type: "json" };
import review from "../../../../schemas/agent/v3/review.json" with { type: "json" };
import manifest from "../../../../schemas/agent/v3/manifest.json" with { type: "json" };
import grant from "../../../../schemas/agent/v3/grant.json" with { type: "json" };
import journal from "../../../../schemas/agent/v3/transaction.json" with { type: "json" };
import report from "../../../../schemas/agent/v3/report.json" with { type: "json" };
import { hash } from "../../../brain/indexer.ts";

import type { Request } from "./contracts.ts";

const schemas = { request, review, manifest, grant, journal, report };
const ajv = new Ajv2020({ strictTypes: false, strictRequired: false });
const validators = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)]));
export function validate(name: keyof typeof schemas, input: unknown) {
  if (!validators[name](input)) throw new Error("Invalid V3 " + name);
  return input;
}
export function requestOf(value: unknown): Request {
  return validate("request", value) as Request;
}
export function validFingerprint<T extends { fingerprint: string }>(value: T) {
  const { fingerprint, ...body } = value;
  return fingerprint === hash(body);
}
