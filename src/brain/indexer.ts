import { createHash } from "node:crypto";
import { asIndex } from "./validation.ts";
import type { BrainIndex, Profile } from "./contracts.ts";

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => compareIds(a, b));
    return "{" + entries.map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

export const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export interface Revision { id: string; fingerprint: string; upstreamHash: string; sourceURL: string }

export function validateRevisions(revisions: Revision[]) {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const sources = new Set<string>();
  for (const item of revisions) {
    if (ids.has(item.id) || urls.has(item.sourceURL) || sources.has(item.upstreamHash)) {
      throw new Error("Duplicate canonical Brain source for " + item.id);
    }
    ids.add(item.id);
    urls.add(item.sourceURL);
    sources.add(item.upstreamHash);
  }
}

export function fingerprintRecords(records: { id: string; fingerprint: string }[]) {
  return hash([...records].sort((a, b) => compareIds(a.id, b.id)).map(({ id, fingerprint }) => [id, fingerprint]));
}

export function makeIndex(records: Profile[], configFingerprint: string, environment: BrainIndex["environment"]): BrainIndex {
  const ordered = [...records].sort((a, b) => compareIds(a.id, b.id));
  validateRevisions(ordered.map(item => ({ id: item.id, fingerprint: item.fingerprint, ...item.source })));
  const payload = {
    schemaVersion: 1, indexVersion: 1, taxonomyVersion: 1, algorithmVersion: 1, environment,
    configFingerprint, sourceFingerprint: fingerprintRecords(ordered), records: ordered,
  } as const;
  return asIndex({ ...payload, indexFingerprint: hash(payload) });
}

export function verifyIndex(data: unknown): BrainIndex {
  const index = asIndex(data);
  const { indexFingerprint, ...payload } = index;
  validateRevisions(index.records.map(record => ({ id: record.id, fingerprint: record.fingerprint, ...record.source })));
  if (indexFingerprint !== hash(payload) || index.sourceFingerprint !== fingerprintRecords(index.records)) {
    throw new Error("Brain index fingerprint does not match its contents");
  }
  return index;
}

export async function rebuild<T extends Revision>(
  input: T[], previous: BrainIndex | null, configFingerprint: string, force: boolean, profile: (revision: T) => Promise<Profile>,
) {
  const order = [...input].sort((a, b) => compareIds(a.id, b.id));
  validateRevisions(order);
  const prior = new Map(previous?.records.map(record => [record.id, record]));
  const compatible = previous?.configFingerprint === configFingerprint;
  const changes: { id: string; reason: "new" | "removed" | "source-or-evidence" | "rules" | "forced" }[] = [];
  const records: Profile[] = [];
  let reused = 0;
  for (const revision of order) {
    const existing = prior.get(revision.id);
    prior.delete(revision.id);
    if (!force && compatible && existing?.fingerprint === revision.fingerprint) {
      reused++;
      records.push(existing);
    } else {
      changes.push({ id: revision.id, reason: !existing ? "new" : !compatible ? "rules" : force ? "forced" : "source-or-evidence" });
      records.push(await profile(revision));
    }
  }
  for (const id of prior.keys()) changes.push({ id, reason: "removed" });
  const index = makeIndex(records, configFingerprint, records.length ? "prepared" : "not-prepared");
  return { index, changes, rebuilt: records.length - reused, reused };
}
