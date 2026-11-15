export type Fixture = "next" | "vite";
export type Request = {
  schemaVersion: 3;
  fixture: Fixture;
  route?: string;
  file?: string;
  goal: string;
  source?: string;
  requirements: { support?: string[] };
};
export type Status = "authorized-fixture" | "applying" | "applied" | "verifying" | "verified" | "failed" | "rolled-back" | "needs-manual-review";
export type FileImage = { sha256: string; mode: number; size: number };
export type Adapter = {
  id: string;
  component: string;
  screen: string;
  glue: string;
  template: string;
  patterns: string[];
  license: string;
  notice: string;
  props: string[];
  styles: string[];
  files: string[];
  packages: Record<string, string>;
  state: string;
  legacyComparison?: boolean;
} & ({ fixture: "next"; route: string; file?: never } | { fixture: "vite"; file: string; route?: never });
