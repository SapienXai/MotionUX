export type InspectionFinding = {
  category: "layout" | "accessibility" | "interaction";
  rule: string;
  summary: string;
  evidence: string;
  impact?: string;
};

export type InspectionReport = {
  route: string;
  revision: number;
  durationMs: number;
  viewports: {
    width: number;
    height: number;
    touch: boolean;
    findings: InspectionFinding[];
    manualReview: { rule: string; evidence: string }[];
  }[];
};
