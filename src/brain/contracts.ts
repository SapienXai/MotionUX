export type EvidenceStatus = "verified" | "observed" | "curated" | "unknown" | "unsupported";
export type IntegrationKind = "react" | "html-iframe";
export type Cost = "low" | "moderate" | "high";
export const supportKeys = ["pointer", "keyboard", "touch-emulated", "physical-mobile", "screen-reader", "reduced-motion", "rtl", "cancel", "interruptible"] as const;
export type Support = typeof supportKeys[number];
export const semanticKeys = ["intents", "patterns", "motions", "triggers", "useCases"] as const;
export type SemanticKey = typeof semanticKeys[number];

export interface Evidence {
  kind: "catalog" | "source-ast" | "source-review" | "browser-test" | "install-artifact";
  locator: string;
  sourcePinOrHash: string;
  testedProfile?: string;
  recordedAt?: string;
  notes?: string;
}

export interface Claim<T> {
  value: T | null;
  status: EvidenceStatus;
  confidence: "high" | "medium" | "none";
  evidence: Evidence[];
}

export interface Source {
  upstreamCommit: string | null;
  upstreamHash: string;
  sourceURL: string;
  demoURL: string;
  entry: string;
  code: { path: string; sha256: string; installedSHA256: string | null }[];
  assets: { sha256: string; path: string | null; url: string | null }[];
  notice: string | null;
  registryItem: string;
  registryPath: string;
  registryHash: string;
  studioPath: string;
}

export interface Profile {
  schemaVersion: 1;
  indexVersion: 1;
  taxonomyVersion: 1;
  id: string;
  title: string;
  provider: string;
  editionOrdinal: number;
  addedSequence: number;
  category: string;
  availability: "ready";
  integrationKind: IntegrationKind;
  source: Source;
  dependencies: Record<string, string>;
  fingerprint: string;
  curated: boolean;
  identity: Evidence;
  semantic: Record<SemanticKey, Claim<string[]>> & {
    intensity: Claim<"subtle" | "expressive">;
    avoidWhen: Claim<string[]>;
    notes: Claim<string>;
    interruption: Claim<string>;
    restart: Claim<string>;
  };
  support: Record<Support, Claim<boolean>>;
  behavior: {
    rendered: Claim<boolean>;
    sampledMotion: Claim<boolean>;
    install: Claim<boolean>;
    nativeProps: Claim<boolean>;
    clientBoundary: Claim<boolean>;
    previewAt390: Claim<{ overflowPx: number; motionPreference: "reduce" | "no-preference" }>;
  };
  performance: {
    measuredCost: Claim<Cost>;
    schedulerUnits: Claim<number>;
    graphics: Claim<"canvas-2d" | "webgl" | "canvas" | "shader">;
  };
  visualAcceptance: "pending";
}

export interface BrainIndex {
  schemaVersion: 1;
  indexVersion: 1;
  taxonomyVersion: 1;
  algorithmVersion: 1;
  environment: "prepared" | "not-prepared" | "synthetic";
  configFingerprint: string;
  sourceFingerprint: string;
  indexFingerprint: string;
  records: Profile[];
}

export interface Curation extends Record<Exclude<SemanticKey, "motions">, string[]> {
  id: string;
  sourceHash: string;
  entry: string;
  sourceURL: string;
  anchors: { symbol: string; line: number }[];
  motions?: string[];
  note: string;
  avoidWhen: string[];
  revision: 1;
}

export interface Requirements {
  integrationKind?: IntegrationKind[];
  support?: Support[];
  evidenceStatus?: "verified" | "observed" | "curated";
  allowedDependencies?: string[];
  dependencyPins?: Record<string, string>;
  nativeProps?: boolean;
  maxPerformanceCost?: Cost;
  maxPreviewUnits?: number;
  intent?: string[];
  pattern?: string[];
}

export interface BrainRequest {
  schemaVersion: 1;
  query: string;
  context?: {
    screen?: string;
    platform?: "desktop" | "mobile" | "web" | "any";
    designDirection?: string[];
    businessStateOwner?: "application" | "unknown";
    motionPolicy?: "still" | "allow" | "unknown";
    state?: "pending" | "success" | "error" | "unchanged" | "unknown";
  };
  require?: Requirements;
  prefer?: {
    intent?: string[];
    pattern?: string[];
    intensity?: "subtle" | "expressive";
    performanceCost?: Cost;
    integrationKind?: IntegrationKind[];
    support?: Support[];
  };
  maxResults?: number;
}

export type Signals = Record<SemanticKey, string[]> & { qualifiers: string[] };
export type Decision = "candidates" | "no-motion" | "no-suitable-component" | "need-more-context" | "not-prepared" | "stale-index";
export type Score = Record<"intent" | "pattern" | "motion" | "trigger" | "useCase" | "evidence" | "platform" | "preference" | "lexical" | "cost", number>;
export interface Match {
  field: string;
  value: string;
  status: EvidenceStatus;
  evidence: Evidence[];
}

export interface Candidate {
  id: string;
  title: string;
  provider: string;
  integrationKind: IntegrationKind;
  sourceURL: string;
  demoURL: string;
  upstreamCommit: string | null;
  upstreamHash: string;
  studioURL: string;
  installURL: string;
  score: number;
  scoreBreakdown: Score;
  matches: Match[];
  unknowns: string[];
  avoidWhen: string[];
  disclosures: string[];
}

export interface BrainResult {
  schemaVersion: 1;
  algorithmVersion: 1;
  mode: "search" | "recommend";
  decision: Decision;
  indexFingerprint: string | null;
  candidates: Candidate[];
  explanation: string[];
  unknowns: string[];
  filteredReasons: Record<string, number>;
  signals: Signals;
  tieBreaker: "id-ascending";
  requirements: Requirements;
}
