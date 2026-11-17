import { z } from "zod";
import { designPresets, presetDetails } from "./creator-catalog.ts";
export * from "./creator-catalog.ts";

export const designDensity = ["compact", "balanced", "generous"] as const;
export const designType = ["editorial", "humanist", "system"] as const;
export const designRadius = ["crisp", "rounded", "soft"] as const;

export const identitySchema = z.strictObject({
  version: z.literal(1),
  preset: z.enum(designPresets),
  density: z.enum(designDensity),
  typography: z.enum(designType),
  radius: z.enum(designRadius),
});
export type DesignIdentity = z.infer<typeof identitySchema>;
export function identityFor(preset: DesignIdentity["preset"]): DesignIdentity {
  const { density, typography, radius } = presetDetails[preset];
  return { version: 1, preset, density, typography, radius };
}

export function identityAttributes(identity?: DesignIdentity) {
  return identity && {
    "data-project-identity": identity.preset,
    "data-project-density": identity.density,
    "data-project-type": identity.typography,
    "data-project-radius": identity.radius,
  };
}

export const sectionModes = ["stack", "grid", "split", "content-aside"] as const;
const gap = z.enum(["tight", "normal", "loose"]);
const alignment = z.enum(["start", "center", "stretch"]);
export const sectionLayoutSchema = z.strictObject({
  version: z.literal(1),
  mode: z.enum(sectionModes),
  width: z.enum(["reading", "content", "wide"]),
  surface: z.enum(["clear", "raised", "tinted"]),
  base: z.strictObject({ columns: z.number().int().min(1).max(4), gap, align: alignment }),
  tablet: z.strictObject({ columns: z.number().int().min(1).max(3).optional(), gap: gap.optional(), align: alignment.optional() }).optional(),
  mobile: z.strictObject({ columns: z.number().int().min(1).max(2).optional(), gap: gap.optional(), align: alignment.optional() }).optional(),
});
export type SectionLayout = z.infer<typeof sectionLayoutSchema>;
export const defaultSectionLayout: SectionLayout = {
  version: 1, mode: "grid", width: "content", surface: "clear",
  base: { columns: 3, gap: "normal", align: "stretch" },
};

const owner = z.string().max(56);
const recordId = z.string().regex(/^[a-z][a-z0-9-]{2,47}$/);
export const taskCollectionSchema = z.strictObject({
  version: z.literal(1),
  records: z.array(z.strictObject({
    id: recordId, title: z.string().max(88), owner, summary: z.string().max(180),
    priority: z.enum(["normal", "high"]), status: z.enum(["open", "completed"]),
  })).max(30),
}).refine(({ records }) => records.length === new Set(records.map(({ id }) => id)).size, "Use unique task IDs.");
export type TaskCollection = z.infer<typeof taskCollectionSchema>;
export type TaskRecord = TaskCollection["records"][number];

export const articlesSchema = z.strictObject({
  version: z.literal(1),
  records: z.array(z.strictObject({
    id: recordId, title: z.string().max(72), body: z.string().max(1000), tag: z.string().max(32),
  })).max(12),
}).refine(({ records }) => records.length === new Set(records.map(({ id }) => id)).size, "Use unique guide IDs.");
export type Articles = z.infer<typeof articlesSchema>;

export function articleRecords(articles: Articles | undefined, legacy: readonly { title: string; text: string }[] = []) {
  return articles?.records ?? legacy.map(({ title, text }, index) => ({
    id: "guide-" + String(index + 1), title, body: text, tag: "",
  }));
}
