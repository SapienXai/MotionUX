import { z } from "zod";

const token = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/);
const text = z.string().min(1).max(400);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const sourceId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,95}$/);
const route = z.string().regex(/^\/(?:[a-z][a-z0-9-]{0,39}(?:\/[a-z][a-z0-9-]{0,39}){0,2})?$/)
  .refine((value) => !/^\/(?:api|pwa|block-review)(?:\/|$)/.test(value));
const requirement = z.strictObject({ id: token, goal: text, search: text });
const field = z.strictObject({ id: token, label: text, type: z.enum(["text", "number", "date", "time", "choice"]), options: z.array(text).max(10), required: z.boolean() });
const entity = z.strictObject({
  id: token, label: text, fields: z.array(field).min(1).max(9),
  examples: z.array(z.array(z.string().max(200)).max(9)).max(16),
  collision: z.array(token).max(3),
});
const instance = z.strictObject({
  id: token, requirement: token, kind: z.enum(["intro", "records", "board", "agenda", "cards", "source", "generated"]),
  title: text, description: z.string().max(600), entity: z.union([token, z.literal("")]),
  layout: z.enum(["full", "column"]), source: z.union([sourceId, z.literal("")]),
  fields: z.array(token).max(9), items: z.array(z.strictObject({ label: text, text })).max(8),
  media: z.union([z.literal(""), z.enum(["seed-coast", "seed-room", "seed-pool"])]),
  alternative: z.string().max(200),
  program: z.union([z.strictObject({
    operation: z.enum(["compare", "detail", "group-count", "range-review"]),
    field: z.union([token, z.literal("")]), label: text,
  }), z.null()]),
  action: z.enum(["none", "edit", "filter", "compare"]), motion: z.enum(["inherit", "still"]),
});
const page = z.strictObject({
  id: token, title: text, route, layout: z.enum(["stack", "split", "grid"]),
  instances: z.array(instance).min(1).max(8),
});
export const intentSchema = z.strictObject({
  audience: text, requirements: z.array(requirement).min(2).max(7),
});

export const sourcePlanSchema = z.strictObject({
  name: z.string().min(1).max(80), summary: text, locale: z.enum(["en", "tr"]), direction: z.enum(["ltr", "rtl"]),
  shell: z.enum(["editorial", "sidebar", "workspace"]), theme: z.enum(["light", "dark", "system"]),
  tone: z.enum(["ink", "ocean", "olive", "plum"]), motion: z.enum(["system", "still"]),
  entities: z.array(entity).max(4), pages: z.array(page).min(1).max(9),
  limitations: z.array(text).max(6),
});
export const sourcePinSchema = z.strictObject({
  id: sourceId, title: text, provider: text, revision: z.string().min(1).max(128),
  upstream: z.url().refine((value) => value.startsWith("https://")),
  entry: z.string().max(250),
  context: digest, closure: digest,
  adapter: z.enum(["disclosure", "accordion", "tabs", "transition", "slots", "number", "compare", "highlight"]),
  license: z.string().max(60), matched: z.array(z.string().max(200)).max(8),
});
export const sourceGraphSchema = sourcePlanSchema.extend({
  version: z.literal(1), requirements: intentSchema.shape.requirements,
  sources: z.array(sourcePinSchema).min(1).max(7),
  artifacts: z.array(z.strictObject({ instance: token, file: z.string().max(160), sha256: digest, generatedFrom: z.array(sourceId).min(1).max(3) })).max(20),
  lock: digest, compiler: digest, mediaPin: digest,
}).superRefine((graph, ctx) => {
  function require(test: unknown, message: string) {
    if (!test) ctx.addIssue({ code: "custom", message });
  }
  const unique = (items: string[]) => new Set(items).size === items.length;
  const instances = graph.pages.flatMap(({ instances }) => instances);
  require(unique(graph.pages.map(({ id }) => id)) && unique(graph.pages.map(({ route }) => route)) &&
    graph.pages.some(({ route }) => route === "/"), "Require one home route and unique routes and page IDs.");
  require(unique(instances.map(({ id }) => id)) && unique(graph.requirements.map(({ id }) => id)) &&
    unique(graph.sources.map(({ id }) => id)) && unique(graph.entities.map(({ id }) => id)), "Duplicate graph identifier.");
  for (const item of graph.entities) {
    require(unique(item.fields.map(({ id }) => id)) && item.examples.every((row) => row.length === item.fields.length),
      "Entity fields or seed rows are inconsistent.");
    require(item.fields.every((field) => field.type !== "choice" || Boolean(field.options.length)), "A choice field requires options.");
    if (item.collision.length) {
      const types = item.collision.map((id) => item.fields.find((field) => field.id === id)?.type);
      require(unique(item.collision) && types.length === 3 && types[1] === "time" && types[2] === "time", "A collision group requires a partition and two time fields.");
    }
  }
  for (const node of instances) {
    const data = graph.entities.find(({ id }) => id === node.entity);
    require(graph.requirements.some(({ id }) => id === node.requirement), "An instance references an unknown requirement.");
    require(!node.entity || data, "An instance references an unknown entity.");
    require(["records", "agenda", "board"].includes(node.kind) ? data : true, "A data view requires an entity.");
    require(node.fields.every((field) => data?.fields.some(({ id }) => id === field)), "An instance references an unknown field.");
    require(node.kind === "source" || node.kind === "generated" ? graph.sources.some(({ id }) => id === node.source) : !node.source, "Missing or unused source binding.");
    require(Boolean(node.media) === Boolean(node.alternative), "An image requires alternative text.");
    require(node.kind === "generated" ? node.program && data : !node.program, "A generated interaction requires a data-bound program.");
    require(!node.program?.field || data?.fields.some(({ id }) => id === node.program?.field), "Program field is not in the bound entity.");
    require(node.program?.operation !== "range-review" || Boolean(data?.collision.length), "Time range review requires a collision group.");
    require(node.kind !== "generated" || graph.artifacts.some(({ instance }) => instance === node.id), "Missing generated artifact.");
  }
  require(graph.sources.every((source) => instances.some((item) => item.source === source.id)), "A pinned source must be used.");
  require(graph.requirements.every((need) => instances.some((item) => item.requirement === need.id) ||
    graph.limitations.some((limit) => limit.startsWith(need.id + ":"))), "Each requirement needs an instance or explicit limitation.");
  require(unique(graph.artifacts.map(({ instance }) => instance)) &&
    graph.artifacts.every((item) => instances.some((node) => node.kind === "generated" && node.id === item.instance) &&
    item.generatedFrom.every((source) => graph.sources.some(({ id }) => id === source))), "Invalid artifact linkage.");
});

export type SourceGraph = z.infer<typeof sourceGraphSchema>;
export type SourcePlan = z.infer<typeof sourcePlanSchema>;
export type SourcePin = z.infer<typeof sourcePinSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type SourceInstance = SourcePlan["pages"][number]["instances"][number];

export const sourceIntentResponse = z.toJSONSchema(intentSchema);
export const sourcePlanResponse = z.toJSONSchema(sourcePlanSchema);
