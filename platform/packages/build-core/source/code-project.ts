import { z } from "zod";

const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,55}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const sourceId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,95}$/);
const text = z.string().min(1).max(600);
export const codeRoute = z.string().regex(/^\/(?:[a-z][a-z0-9-]{0,39}(?:\/[a-z][a-z0-9-]{0,39}){0,2})?$/)
  .refine((path) => !/^\/(?:api|pwa|media|sources|block-review)(?:\/|$)/.test(path));
export const modulePath = z.string().regex(/^(?:components\/[a-z][a-z0-9-]*\.tsx|lib\/[a-z][a-z0-9-]*\.ts|styles\/app\.css)$/);
const sourceIdentity = z.strictObject({
  id: sourceId, provider: text, title: text, url: z.url(), entry: z.string().max(300), closure: hash,
});
const portablePin = sourceIdentity.extend({
  revision: z.string().regex(/^[a-f0-9]{40}$/),
  fidelity: z.enum(["upstream-original", "source-adapted"]),
  license: z.enum(["MIT", "Apache-2.0"]),
});
const localPin = sourceIdentity.extend({
  revision: hash, slug: sourceId, group: sourceId,
  fidelity: z.enum(["local-frame", "local-adapter"]), license: z.literal("local-only"),
});
export const codePin = z.union([portablePin, localPin]);
export const localSourceRights = "This project uses local-only sources. Export is unavailable.";
export const maxCompositionSources = 4;
export const maxProjectSources = 6;
export const sourceReferenceSchema = z.strictObject({ id: sourceId, title: text, provider: text, pin: hash });
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
const control = z.strictObject({
  key: identifier, label: z.string().min(1).max(80), value: z.string().max(500),
  kind: z.enum(["text", "color", "spacing", "size", "motion"]),
});
const usage = z.strictObject({
  source: sourceId, module: modulePath, reason: text,
  instance: identifier, route: codeRoute, interaction: text,
});
const journeyStep = z.strictObject({
  role: z.enum(["button", "link", "textbox", "combobox", "spinbutton", "checkbox", "radio", "tab", "img", "region", "group"]),
  name: z.string().min(1).max(160),
  action: z.enum(["click", "fill", "select", "press", "hover", "drag", "wheel"]),
  value: z.string().max(300),
  expected: z.string().min(1).max(300),
}).superRefine((step, ctx) => {
  if (["drag", "wheel"].includes(step.action) &&
    (!/^-?\d{1,3},-?\d{1,3}$/.test(step.value) || step.value.split(",").some((value) => Math.abs(Number(value)) > 800)))
    ctx.addIssue({ code: "custom", message: "Pointer motion needs bounded dx,dy pixels, each between -800 and 800." });
});
const journey = z.strictObject({ title: text, route: codeRoute, steps: z.array(journeyStep).min(1).max(8) });
const synthesis = z.strictObject({ file: modulePath, purpose: text, generatedFrom: z.array(sourceId).min(1).max(4) });
const file = z.strictObject({ path: modulePath, content: z.string().min(1).max(45_000) });
const page = z.strictObject({ id: identifier, title: z.string().min(1).max(60), route: codeRoute, firstTask: text });
export const codeProposalSchema = z.strictObject({
  name: z.string().min(1).max(80), summary: text, locale: z.enum(["en", "tr"]), direction: z.enum(["ltr", "rtl"]),
  design: z.strictObject({ composition: text, typography: text, mobile: text, motion: text }),
  pages: z.array(page).min(1).max(8), files: z.array(file).min(2).max(12),
  controls: z.array(control).min(3).max(18),
  usages: z.array(usage).min(1).max(12), generated: z.array(synthesis).min(1).max(7),
  journeys: z.array(journey).min(1).max(5), limitations: z.array(text).max(6),
});
export const codeProjectSchema = codeProposalSchema.extend({
  version: z.literal(2),
  sources: z.array(codePin).min(1).max(maxProjectSources),
  references: z.array(sourceReferenceSchema).max(maxCompositionSources).optional(),
  lock: hash, compiler: hash, artifacts: z.array(z.strictObject({ path: modulePath, sha256: hash })).min(2).max(12),
}).superRefine((graph, ctx) => {
  function require(condition: unknown, message: string) {
    if (!condition) ctx.addIssue({ code: "custom", message });
  }
  const unique = (items: string[]) => items.length === new Set(items).size;
  require(unique(graph.pages.map(({ route }) => route)) && graph.pages.some(({ route }) => route === "/") && unique(graph.pages.map(({ id }) => id)), "Require unique pages and one home route.");
  require(unique(graph.files.map(({ path }) => path)) && graph.files.some(({ path }) => path === "components/app.tsx") &&
    graph.files.some(({ path }) => path === "styles/app.css"), "Require unique module paths, components/app.tsx and styles/app.css.");
  require(unique(graph.controls.map(({ key }) => key)) && unique(graph.sources.map(({ id }) => id)), "Duplicate control or source.");
  require(!graph.references || unique([...graph.sources, ...graph.references].map(({ id }) => id)), "A component must have one composition role.");
  require(graph.controls.every(({ kind, value }) => {
    if (kind === "color") return /^#[a-f0-9]{6}$/i.test(value);
    if (kind === "spacing" || kind === "size") return /^\d{1,2}(?:px|rem)$/.test(value);
    if (kind === "motion") return ["system", "still"].includes(value);
    return true;
  }), "Invalid editable value.");
  require(graph.artifacts.length === graph.files.length && graph.artifacts.every(({ path }) => graph.files.some((file) => file.path === path)), "Artifact manifest does not match the files.");
  for (const usage of graph.usages) {
    require(graph.sources.some(({ id }) => id === usage.source) && graph.files.some(({ path }) => path === usage.module) &&
      graph.pages.some(({ route }) => route === usage.route), "Invalid source usage relationship.");
  }
  require(graph.sources.every(({ id }) => graph.usages.some(({ source }) => source === id)), "Unused source pin.");
  require(unique(graph.generated.map(({ file }) => file)), "Duplicate generated module.");
  for (const module of graph.generated) require(graph.files.some(({ path }) => path === module.file) &&
    module.generatedFrom.every((id) => graph.sources.some((source) => source.id === id)), "Invalid generated module relationship.");
  for (const journey of graph.journeys) require(graph.pages.some(({ route }) => route === journey.route), "Journey references an unknown page.");
});
export type CodeProject = z.infer<typeof codeProjectSchema>;
export type CodeProposal = z.infer<typeof codeProposalSchema>;
export type CodePin = z.infer<typeof codePin>;
export type LocalCodePin = z.infer<typeof localPin>;
export const isLocalCodePin = (pin: CodePin): pin is LocalCodePin => pin.license === "local-only";
