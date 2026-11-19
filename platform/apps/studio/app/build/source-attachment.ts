import { maxProjectSources } from "@motionux/build-core/code-project";
import type { CompositionComponent } from "./component-picker";

export type SourceAttachment = { rows: CompositionComponent[]; unavailable: boolean };

export function attachmentIssue(
  selected: readonly CompositionComponent[],
  installed: readonly string[] | undefined,
) {
  if (!installed) return "format";
  if (selected.some(({ mode }) => mode !== "direct")) return "rights";
  if (selected.some(({ id }) => installed.includes(id))) return "installed";
  if (installed.length + selected.length > maxProjectSources) return "limit";
}
