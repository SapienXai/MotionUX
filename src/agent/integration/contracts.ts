export type Image = { sha256: string; mode: number };
export type Mutation = { path: string; fileType: string; operation: "create" | "modify" | "delete"; before: Image | null; after: Image | null };
export type Tree = { files: (Image & { path: string })[]; directories: { path: string; mode: number }[] };
export type Stage = "authorized" | "applying" | "applied" | "verifying" | "verified" | "failed" | "rolled-back" | "needs-manual-review";
export interface IntegrationRequest {
  schemaVersion: 2;
  mode: "fixture-only";
  planPath: string;
  requestPath: string;
  choiceId: string;
}
export interface IntegrationPlan {
  schemaVersion: 2;
  mode: "fixture-only";
  status: "preflight-passed";
  runId: string;
  fixtureRoot: string;
  route: string;
  sourceKind: "app-router";
  request: IntegrationRequest;
  planFingerprint: string;
  projectFingerprint: string;
  brainIndexFingerprint: string;
  brainSourceFingerprint: string;
  seedHash: string;
  createdAt: number;
  expiresAt: number;
  before: Tree;
  after: Tree;
  beforeHash: string;
  afterHash: string;
  mutationManifest: Mutation[];
  createdDirectories: Tree["directories"];
  source: {
    id: string; provider: string; format: "react"; url: string; commit: string; upstream: string; registry: string; notice: string;
    license: string; evidence: string[]; selectionRank: number; v1ReviewStatus: "proposed" | "conditional";
    code: { path: string; upstream: string; installed: string; adaptation: "identical" | "relative-utils-import" }[];
  };
  dependencies: { name: string; before: string | null; after: string; group: string }[];
  preflight: { status: "resolved"; checks: string[]; packagePrepMs: number };
  scope: { processes: string[]; writable: string[]; authority: string; risk: string[] };
  fingerprint: string;
}
export interface IntegrationTransaction {
  schemaVersion: 2;
  runId: string;
  reviewFingerprint: string;
  status: Stage;
  events: { sequence: number; state: Stage; detail: string }[];
  proof: { beforeHash: string; finalHash: string; restored: string[]; removed: string[]; directoryCount: number } | null;
  fingerprint: string;
}
export interface IntegrationReport {
  schemaVersion: 2;
  runId: string;
  status: Stage;
  sourceId: string;
  reviewFingerprint: string;
  beforeHash: string;
  appliedHash: string | null;
  rollbackHash: string | null;
  outcomes: { name: string; status: "passed" | "failed" | "unknown" | "blocked"; detail: string }[];
  artifacts: string[];
}
