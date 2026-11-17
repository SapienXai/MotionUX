import { z } from "zod";
import { intentSchema, sourcePlanSchema, type SourceGraph } from "./graph.ts";

const id = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/);
const patch = z.strictObject({
  target: id,
  field: z.enum(["title", "description", "placement", "layout", "motion", "theme", "presentation"]),
  value: z.string().min(1).max(400),
});
const revisionSchema = z.strictObject({ changes: z.array(patch).max(5) });
export const sourceIntentResponse = z.toJSONSchema(intentSchema);
export const sourcePlanResponse = z.toJSONSchema(sourcePlanSchema);
export const sourceRevisionResponse = z.toJSONSchema(revisionSchema);

export function reviseSourcePlan(graph: SourceGraph, proposal: unknown) {
  const { changes } = revisionSchema.parse(proposal);
  const current = sourcePlanSchema.strip().parse(graph);
  const plan = structuredClone(current);
  const instances = plan.pages.flatMap(({ instances }) => instances);
  const selected = new Set<string>();
  for (const { target, field, value } of changes) {
    const key = target + "/" + field;
    if (selected.has(key)) throw new Error("A revision cannot change one field twice.");
    selected.add(key);
    const page = plan.pages.find((item) => item.id === target);
    const instance = instances.find((item) => item.id === target);
    if (target === "project" && field === "theme" && (value === "system" || value === "dark" || value === "light")) plan.theme = value;
    else if (target === "project" && field === "motion" && (value === "still" || value === "system")) plan.motion = value;
    else if (page && field === "layout" && (value === "stack" || value === "split" || value === "grid")) page.layout = value;
    else if (instance && field === "title") instance.title = value;
    else if (instance && field === "description") instance.description = value;
    else if (instance && field === "placement" && (value === "full" || value === "column")) instance.layout = value;
    else if (instance && field === "motion" && (value === "inherit" || value === "still")) instance.motion = value;
    else if (instance && field === "presentation" && ["records", "board", "agenda"].includes(instance.kind) &&
      (value === "records" || value === "board" || value === "agenda")) instance.kind = value;
    else throw new Error("The requested field is outside the source editor's revision contract.");
  }
  const parsed = sourcePlanSchema.parse(plan);
  if (JSON.stringify(current) === JSON.stringify(parsed)) throw new Error("The revision did not change the application.");
  return parsed;
}
