import { z } from "zod";
import { allBlocks, documentSchema, type Document } from "../model.ts";
import { BuildError, canonical } from "../store.ts";

const page = z.string().regex(/^p-[a-z0-9-]{3,50}$/);
const block = z.string().regex(/^(?:b-[a-z0-9-]{3,50}|[A-Za-z]{3,32}-[a-f0-9-]{36})$/);
const change = z.strictObject({
  page, block: block.nullable(),
  field: z.enum(["title", "description", "cta"]),
  value: z.string().trim().min(1).max(180),
});
const proposal = z.strictObject({ changes: z.array(change).max(8), explanation: z.string().max(300) });
export const ownedRevisionResponse = z.toJSONSchema(proposal);

export function ownedRevisionContext(document: Document) {
  return document.pages.map(({ id, route, title, blocks }) => ({
    id, route, title, blocks: allBlocks(blocks).map(({ id: blockId, type, props }) => ({
      id: blockId, type, title: props.title, description: props.description,
      ...(props.cta !== undefined ? { cta: props.cta } : {}),
    })),
  }));
}

export function applyOwnedRevision(document: Document, input: unknown) {
  const parsed = proposal.safeParse(input);
  if (!parsed.success || !parsed.data.changes.length) throw new BuildError(422,
    "No supported edit was produced. Ask to change a page title, block heading, description, or existing action label.");
  if (document.sourceGraph || document.codeProject) throw new BuildError(422, "This editor requires an owned block document.");
  const revised = structuredClone(document);
  const modified = new Set<string>();
  const routes = new Set<string>();
  for (const step of parsed.data.changes) {
    const target = revised.pages.find(({ id }) => id === step.page);
    if (!target) throw new BuildError(422, "The requested page is outside this revision.");
    const key = [step.page, step.block, step.field].join(":");
    if (modified.has(key)) throw new BuildError(422, "A revision may change each field once.");
    modified.add(key);
    routes.add(target.route);
    if (step.block === null) {
      if (step.field !== "title") throw new BuildError(422, "Pages expose a title field.");
      target.title = step.value;
    } else {
      const block = allBlocks(target.blocks).find(({ id }) => id === step.block);
      if (!block || block.props[step.field] === undefined) throw new BuildError(422, "The requested content field is unavailable.");
      block.props[step.field] = step.value;
    }
  }
  const valid = documentSchema.safeParse(revised);
  if (!valid.success || canonical(valid.data) === canonical(document))
    throw new BuildError(422, "The proposal did not produce valid new content.");
  return { document: valid.data, routes: [...routes] };
}
