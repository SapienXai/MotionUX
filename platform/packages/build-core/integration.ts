import type { InspectionReport } from "./inspection.ts";

export type IntegrationChallenge = {
  protocol: "motionux-build-integration/v1";
  operation: "apply-and-restore-disposable-copy";
  id: string;
  signer: string;
  expiresAt: number;
  project: {
    id: string;
    name: string;
    revision: number;
    documentDigest: string;
    route: string;
  };
  target: {
    root: string;
    jobIdentity: string;
    baselineIdentity: string;
    candidateIdentity: string;
  };
  source: {
    block: "Dialog";
    version: number;
    license: string;
    title: string;
    renderer: string;
    notice: string;
    lockfile: string;
  };
  baseline: string;
  candidate: string;
  files: { path: string; before: string; after: string }[];
};

export type IntegrationReview = {
  challenge: IntegrationChallenge;
  payload: string;
  digest: string;
};

export type IntegrationResult = {
  id: string;
  approval: string;
  status:
    | "verified-and-restored"
    | "failed-and-restored"
    | "cancelled-and-restored"
    | "rollback-unverified";
  route: string;
  baseline: string;
  candidate: string;
  restored?: string;
  integrated?: InspectionReport;
  rollback?: InspectionReport;
  failure?: string;
};
