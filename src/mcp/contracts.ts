import brain from "../../schemas/brain/request.v1.json" with { type: "json" };
import agent from "../../schemas/agent/request.v1.json" with { type: "json" };

const object = (properties: Record<string, object>, required: string[] = []) =>
  ({ type: "object", properties, required, additionalProperties: false } as const);
const text = (maxLength: number) => ({ type: "string", minLength: 1, maxLength } as const);
const { context, require: hard, prefer, query } = brain.properties;
const { project, route, file, goal, requirements } = agent.properties;

// Inline the single Agent reference so hosts can validate without resolving external schema URLs.
const support = hard.properties.support;
const planRequirements = { ...requirements, properties: { ...requirements.properties, support } };
const selection = { ...object({ project, route, file, goal, requirements: planRequirements }, ["project", "goal"]),
  oneOf: [{ required: ["route"] }, { required: ["file"] }] };

export const toolInputs = {
  motionux_status: object({}),
  search_motion: object({ query, context, require: hard, prefer, maxResults: { type: "integer", minimum: 1, maximum: 10 } }, ["query"]),
  recommend_motion: object({ query, context, require: hard, prefer, maxResults: { type: "integer", minimum: 1, maximum: 5 } }, ["query"]),
  inspect_component: object({ id: { ...text(96), pattern: "^[a-z0-9][a-z0-9-]{0,95}$" } }, ["id"]),
  plan_motion: selection,
} as const;
export type ToolName = keyof typeof toolInputs;

export const descriptions: Record<ToolName, string> = {
  motionux_status: "Check the local MotionUX catalog, Brain index freshness, and evidence coverage.",
  search_motion: "Find pinned motion components by Turkish or English interaction intent and optional Brain filters.",
  recommend_motion: "Rank pinned motion with evidence and hard requirements, including a no-motion or no-suitable-component decision.",
  inspect_component: "Inspect one pinned component's claims, missing evidence, dependency ranges and source links by ID.",
  plan_motion: "Produce a read-only Agent V1 motion plan for exactly one route or screen file in an explicitly authorized project. Returns evidence and proposed tests.",
};

export const payloadLimit = 24 * 1024;
export const maxRequestBytes = 64 * 1024;
export const toolDeadlineMs = 10_000;
export const maxConcurrent = 3;
