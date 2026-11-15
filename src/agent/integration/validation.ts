import Ajv2020 from "ajv/dist/2020.js";
import requestSchema from "../../../schemas/agent/integration-request.v2.json" with { type: "json" };
import planSchema from "../../../schemas/agent/integration-plan.v2.json" with { type: "json" };
import transactionSchema from "../../../schemas/agent/integration-transaction.v2.json" with { type: "json" };
import reportSchema from "../../../schemas/agent/integration-report.v2.json" with { type: "json" };
import { canonical, hash } from "../../brain/indexer.ts";
import type { IntegrationPlan, IntegrationReport, IntegrationRequest, IntegrationTransaction, Tree } from "./contracts.ts";

const ajv = new Ajv2020({ strict: true, strictTypes: false });
const request = ajv.compile<IntegrationRequest>(requestSchema);
const plan = ajv.compile<IntegrationPlan>(planSchema);
const transaction = ajv.compile<IntegrationTransaction>(transactionSchema);
const report = ajv.compile<IntegrationReport>(reportSchema);
const normal = (paths: string[]) => paths.every((path, i) => !path.startsWith("/") &&
  path.split("/").every(part => part && !part.startsWith(".") && !part.includes("..")) && (!i || paths[i - 1] < path)) &&
  new Set(paths.map(path => path.toLowerCase())).size === paths.length;

export function validateRequest(input: unknown) {
  if (!request(input)) throw new Error("Invalid V2 request");
  return input;
}

export function diffTree(before: Tree, after: Tree) {
  const a = new Map(before.files.map(({ path, ...image }) => [path, image]));
  const b = new Map(after.files.map(({ path, ...image }) => [path, image]));
  return [...new Set([...a.keys(), ...b.keys()])].sort().flatMap(path => {
    const before = a.get(path) ?? null;
    const after = b.get(path) ?? null;
    if (canonical(before) === canonical(after)) return [];
    const operation = before && after ? "modify" : before ? "delete" : "create";
    return [{ path, fileType: path.slice(path.lastIndexOf(".") + 1), operation, before, after }];
  });
}

export function validatePlan(input: unknown): IntegrationPlan {
  if (!plan(input)) throw new Error("Invalid V2 review");
  const { fingerprint, ...body } = input;
  const directories = new Map(input.before.directories.map(dir => [dir.path, dir.mode]));
  const nextDirs = new Map(input.after.directories.map(dir => [dir.path, dir.mode]));
  const created = input.after.directories.filter(dir => !directories.has(dir.path));
  if (fingerprint !== hash(body) || input.beforeHash !== hash(input.before) || input.afterHash !== hash(input.after) ||
      input.fixtureRoot !== ".motionux-v9/agent/v2/workspaces/" + input.runId ||
      input.request.choiceId !== input.source.id || input.source.selectionRank < 1 || !input.source.evidence.length ||
      input.expiresAt <= input.createdAt || input.expiresAt - input.createdAt > 15 * 60_000 ||
      ![input.before, input.after].every(tree => normal(tree.files.map(row => row.path)) && normal(tree.directories.map(row => row.path))) ||
      [...directories].some(([path, mode]) => nextDirs.get(path) !== mode) ||
      canonical(created) !== canonical(input.createdDirectories) || !input.mutationManifest.length ||
      canonical(diffTree(input.before, input.after)) !== canonical(input.mutationManifest)) throw new Error("V2 review integrity mismatch");
  return input;
}

export function validateTransaction(input: unknown): IntegrationTransaction {
  if (!transaction(input)) throw new Error("Invalid V2 journal");
  const { fingerprint, ...body } = input;
  if (hash(body) !== fingerprint || !input.events.length || input.events[0].state !== "authorized" ||
      input.events.at(-1)?.state !== input.status || input.events.some((event, i) => event.sequence !== i + 1) ||
      (input.status === "rolled-back" && (!input.proof || input.proof.beforeHash !== input.proof.finalHash))) {
    throw new Error("V2 journal integrity mismatch");
  }
  return input;
}

export function validateReport(input: unknown) {
  if (!report(input)) throw new Error("Invalid V2 acceptance report");
  return input;
}
