import type { ReactNode } from "react";
import "./gallery-presets.css";

export function PresetFrame({ reducedMotion, children }: { reducedMotion?: boolean; children: ReactNode }) {
  return <div className="mx-feature" data-reduced={reducedMotion || undefined}>{children}</div>;
}
