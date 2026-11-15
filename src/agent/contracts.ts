import type { BrainRequest, BrainResult, Candidate, Support } from "../brain/contracts.ts";

export interface AgentRequest {
  schemaVersion: 1;
  project: string;
  route?: string;
  file?: string;
  goal: string;
  requirements?: {
    mode?: "read-only";
    platform?: "mobile" | "desktop" | "web" | "any";
    maxRecommendations?: number;
    support?: Support[];
    integrationKind?: "react" | "html-iframe";
    nativeProps?: boolean;
    maxPerformanceCost?: "low" | "moderate" | "high";
    motion?: "still" | "allow";
    state?: "pending" | "success" | "error" | "unchanged";
  };
}

export interface FileIdentity { path: string; hash: string; bytes: number }
export interface SourceFile extends FileIdentity { content: string }
export interface Citation { id: string; path: string; startLine: number; endLine: number; sha256: string }
export interface Fact {
  kind: "framework" | "dependency" | "alias" | "guidance" | "boundary" | "component" | "interaction" |
    "handler" | "state" | "motion" | "theme" | "asset";
  code: string;
  status: "observed" | "inferred" | "unknown" | "blocked";
  value: string;
  evidence: string[];
}

export type Phase = "pending" | "success" | "failure" | "cancellation";
export interface Ownership {
  phase: Phase;
  owner: "server" | "api" | "local-ui" | "unknown";
  status: "observed" | "unknown";
  evidence: string[];
  note: string;
}

export interface Coverage {
  probes: number;
  directoryEntries: number;
  filesConsidered: number;
  bytesRead: number;
  importsSeen: number;
  importsTraversed: number;
  maxDepth: number;
  filesRead: number;
  issues: { reason: string; path: string | null }[];
}
export interface Target {
  route: string | null;
  source: string | null;
  sourceKind: "app-router" | "pages-router" | "react-entry" | "component" | null;
  layouts: string[];
  dynamicSegments: string[];
  framework: { name: "next" | "react" | "unknown"; next: string | null; react: string | null; tailwind: string | null };
  projectFingerprint: string;
  coverage: Coverage;
}
export interface ProjectContext {
  schemaVersion: 1;
  status: "inspected" | "partial-inspection" | "need-more-context";
  mode: "read-only";
  target: Target;
  choices: string[];
  files: FileIdentity[];
  evidence: Citation[];
  observations: Fact[];
  stateOwnership: Ownership[];
  unknowns: string[];
}

export interface DependencyWarning {
  name: string;
  required: string;
  declared: string | null;
  status: "missing" | "incompatible" | "conditional";
}
export interface Recommendation {
  sourceId: string;
  title: string;
  provider: string;
  sourcePin: { commit: string | null; sha256: string };
  sourceURL: string;
  studioURL: string;
  installKind: Candidate["integrationKind"];
  score: number;
  scoreBreakdown: Candidate["scoreBreakdown"];
  why: Candidate["matches"];
  observedTargetNeed: string[];
  requiredIntegrationWork: string[];
  dependencyWarnings: DependencyWarning[];
  dependencyEvidence: string[];
  a11yRisk: string[];
  performanceRisk: string[];
  unknownEvidence: string[];
  avoidWhen: string[];
  reviewStatus: "proposed" | "conditional" | "incompatible";
}

export interface MotionPlan {
  schemaVersion: 1;
  status: "planned" | ProjectContext["status"];
  decision: BrainResult["decision"];
  mode: "read-only";
  goal: string;
  target: Target;
  projectFingerprint: string;
  context: ProjectContext;
  brain: {
    algorithmVersion: 1;
    indexFingerprint: string | null;
    sourceFingerprint: string | null;
    taxonomyVersion: 1;
    decision: BrainResult["decision"] | null;
    requirements: NonNullable<BrainRequest["require"]>;
    filteredReasons: BrainResult["filteredReasons"];
  };
  evidence: Citation[];
  recommendations: Recommendation[];
  unresolved: string[];
  rationale: string[];
  integrationPlan: { path: string; evidence: string[]; proposal: string }[];
  testPlan: { status: "proposed"; check: string; steps: string[] }[];
  rollbackPlan: string[];
  safety: { targetReadOnly: true; targetFilesWritten: 0; noExecution: true; noNetwork: true; noAppAccess: true };
  planFingerprint: string;
}
