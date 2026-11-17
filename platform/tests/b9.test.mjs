import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import {
  appendPageFromPattern,
  availablePagePatterns,
  makeBlock,
  manualDocument,
  newProject,
  projectSchema,
} from "../packages/build-core/model.ts";
import { compileDocument, resolveBlueprint } from "../packages/build-core/composer/blueprint.ts";
import { canonical, fingerprint } from "../packages/build-core/store.ts";
import { readTaskProgress } from "../packages/app-blocks/operations-data.ts";
import { exportTree, zipTree } from "../packages/app-export/export.ts";

const repo = resolve(import.meta.dirname, "../..");
const templates = ["knowledge-base", "operations-workspace"];
const firstPattern = { pattern: "reference", id: "p-new-library", title: "Team guide", route: "/team-guide" };
const blockTypes = (page) => page.blocks.map(({ type }) => type);

test("one versioned pattern creates independent, editable pages in both adapters", () => {
  for (const template of templates) {
    const seed = manualDocument(template, "tr");
    const pattern = availablePagePatterns(seed).find(({ id }) => id === "reference");
    assert.equal(pattern.label, "Başvuru kitaplığı");
    const first = appendPageFromPattern(seed, firstPattern);
    const second = appendPageFromPattern(first, {
      ...firstPattern, id: "p-safety", route: "/safety",
    });
    const [guide, safety] = second.pages.slice(-2);
    assert.deepEqual(guide.pattern, { id: "reference", version: 1 });
    assert.deepEqual(blockTypes(guide), ["PageHeader", "ArticleLibrary"]);
    assert.equal(guide.blocks[0].props.title, "Team guide");
    assert.equal(safety.blocks[1].props.items[0].title, "Başlangıç");
    assert.notEqual(guide.blocks[1].id, safety.blocks[1].id);
    guide.blocks[1].props.items[0].title = "Ekibe özel giriş";
    const saved = projectSchema.parse(newProject("9".repeat(32), second));
    assert.equal(saved.document.pages.at(-2).blocks[1].props.items[0].title, "Ekibe özel giriş");
    assert.equal(saved.document.pages.at(-1).blocks[1].props.items[0].title, "Başlangıç");
    assert.equal(seed.pages.length, 3);
  }
});

test("pattern and block grammar reject incompatible adapters, unknown patterns and invalid routes", () => {
  const knowledge = manualDocument("knowledge-base");
  assert.deepEqual(availablePagePatterns(knowledge).map(({ id }) => id), ["blank", "overview", "intake", "reference"]);
  for (const change of [
    { pattern: "queue" }, { pattern: "__proto__" }, { route: "/" },
    { route: "/api" }, { route: "/../notes" }, { id: knowledge.pages[0].id },
  ])
    assert.throws(() => appendPageFromPattern(knowledge, { ...firstPattern, ...change }));
  const expanded = Array.from({ length: 9 }, (_, i) => i).reduce(
    (doc, i) => appendPageFromPattern(doc, { ...firstPattern, route: "/guide-" + i, id: "p-guide-" + i }),
    knowledge,
  );
  assert.throws(() => appendPageFromPattern(expanded, firstPattern), /12 pages/);
  const adulterated = newProject("2".repeat(32), knowledge);
  adulterated.document.pages[0].blocks.push(makeBlock("OperationsQueue", "b-queue"));
  assert(!projectSchema.safeParse(adulterated).success);
  const site = manualDocument("hotel-marketing");
  const contact = appendPageFromPattern(site, { ...firstPattern, pattern: "inquiry" });
  assert.deepEqual(blockTypes(contact.pages.at(-1)), ["MarketingHeader", "ContactForm", "MarketingFooter"]);
  const blank = appendPageFromPattern(site, { ...firstPattern, pattern: "blank" }).pages.at(-1);
  assert.deepEqual(blockTypes(blank), ["PageHeader"]);
  assert.equal(blank.pattern, undefined);
});

test("Composer keeps owned content and rejects cross-adapter or missing workflow blocks", () => {
  for (const template of templates) {
    const seed = manualDocument(template);
    const proposed = {
      template, locale: "en", name: seed.name, summary: "Local application preview",
      theme: "system", motion: "system", sidebar: "expanded", unsupported: [],
      pages: seed.pages.map(({ route, title, blocks }) => ({
        route, label: title, heading: title, purpose: "Support the local workflow",
        blocks: blocks.slice(1).map(({ type }) => ({ id: type, reason: "Supports the local workflow" })),
      })),
    };
    const brief = "Create an accessible local team workspace with a reference library";
    const compiled = compileDocument(resolveBlueprint(proposed, brief));
    assert.equal(compiled.document.data, seed.data);
    const guides = compiled.document.pages.flatMap(({ blocks }) => blocks).find(({ type }) => type === "ArticleLibrary");
    assert.equal(guides.props.items[0].title, "Start here");
    const hostile = structuredClone(proposed);
    hostile.pages[0].blocks.push({ id: template === "knowledge-base" ? "OperationsQueue" : "Pipeline", reason: "Use live tasks" });
    assert.throws(() => resolveBlueprint(hostile, brief));
    proposed.pages[0].blocks[0].id = "Hero";
    assert.throws(() => resolveBlueprint(proposed, brief), /primary workflow/);
  }
});

test("queue state accepts only known IDs and is bounded", () => {
  assert.deepEqual(readTaskProgress('["dispatch", "invented", "dispatch", {"id":"spares"}, "access"]'), ["dispatch", "access"]);
  for (const value of [null, "bad JSON", '{"dispatch":true}', "[" + " ".repeat(512) + '"dispatch"]'])
    assert.deepEqual(readTaskProgress(value), []);
});

test("both independent exports preserve page provenance, own their runtime, and hash the same document", async () => {
  for (const [index, template] of templates.entries()) {
    const document = appendPageFromPattern(manualDocument(template), firstPattern);
    const project = newProject("3".repeat(32), document);
    const options = { pwa: index === 1 };
    const files = await exportTree(repo, project, options);
    const manifest = JSON.parse(files["motionux-manifest.json"]);
    assert.equal(manifest.dataAdapter, document.data);
    assert.equal(manifest.documentDigest, fingerprint(canonical(document)));
    assert.equal(Boolean(manifest.pwa), options.pwa);
    assert.match(files["runtime/project.ts"], /"pattern":\s*\{\s*"id":\s*"reference",\s*"version":\s*1/);
    assert(!files["runtime/workspace.tsx"].includes("@motionux/"));
    assert(manifest.blocks.some(({ id, license }) => id === "ArticleLibrary" && license === "MIT"));
    for (const entry of manifest.files) assert.equal(fingerprint(files[entry.path]), entry.sha256);
    assert.deepEqual(zipTree(files), zipTree(await exportTree(repo, project, options)));
  }
});
