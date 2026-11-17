import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  articleRecords, availableSections, defaultSectionLayout, designPresets, documentSchema,
  identityFor, isSectionChild, makeBlock, manualDocument, newProject, projectSchema,
  recipeIds, sectionFromRecipe, templates,
} from "../packages/build-core/model.ts";
import { canonical, createStore, fingerprint } from "../packages/build-core/store.ts";
import { compileDocument, resolveBlueprint } from "../packages/build-core/composer/blueprint.ts";
import { readTaskChanges, starterTasks } from "../packages/app-blocks/operations-data.ts";
import { exportTree, zipTree } from "../packages/app-export/export.ts";
import { crmBrief, crmFixture } from "./b3-fixtures.mjs";

const repo = resolve(import.meta.dirname, "../..");
const id = "b".repeat(32);
function section(document, recipe, prefix = "test") {
  let count = 0;
  return sectionFromRecipe(document, recipe, () => "b-" + prefix + "-" + ++count);
}

test("all six B9 documents parse identically with optional B10 fields", () => {
  for (const template of templates) {
    const document = manualDocument(template);
    const dto = JSON.parse(canonical(newProject(id, document)));
    assert.equal(canonical(projectSchema.parse(dto)), canonical(dto));
    for (const preset of designPresets) {
      const updated = documentSchema.parse({ ...document, identity: identityFor(preset) });
      assert.deepEqual(updated.pages, document.pages);
      assert.equal(updated.data, document.data);
      assert.deepEqual(updated.assets, document.assets);
    }
  }
});

test("versioned section recipes produce independent slots and reject unsafe composition", () => {
  const found = new Set();
  for (const template of templates) {
    const base = manualDocument(template);
    for (const [recipe] of availableSections(base.data)) {
      const composed = section(base, recipe);
      assert(composed.children.length && composed.children.every(({ type }) => isSectionChild(type)));
      assert.deepEqual(composed.props.sectionRecipe, { id: recipe, version: 1 });
      const document = structuredClone(base);
      document.pages[0].blocks.push(composed, section(base, recipe, "repeat"));
      assert(documentSchema.safeParse(document).success, template + " " + recipe);
      found.add(recipe);
    }
  }
  assert.deepEqual([...found].sort(), [...recipeIds].sort());
  const base = manualDocument("hotel-marketing");
  assert.throws(() => section(base, "work-queue"));
  for (const change of [
    (block) => block.children.push(makeBlock("MarketingHeader", "b-invalid")),
    (block) => block.children.push(section(base, "questions", "cycle")),
    (block) => block.children.push(block.children[0]),
    (block) => { block.props.layout.mobile = { columns: 3 }; },
    (block) => { block.props.layout.base.gap = "url(javascript:alert(1))"; },
    (block) => { block.props.layout.tablet = { columns: 2, order: [2, 1] }; },
    (block) => { block.props.sectionRecipe.id = "../../private"; },
    (block) => { block.children[0].props.image = { asset: "f".repeat(64), alt: "", focal: "center" }; },
  ]) {
    const document = structuredClone(base);
    const composed = section(document, "social-proof");
    change(composed);
    document.pages[0].blocks.push(composed);
    assert(!documentSchema.safeParse(document).success);
  }
});

test("authored collections are bounded, independently migrated and scoped by adapter", () => {
  const book = manualDocument("knowledge-base");
  const props = book.pages[0].blocks[1].props;
  const legacy = articleRecords(undefined, props.items);
  assert.deepEqual(legacy, articleRecords(undefined, props.items));
  assert.equal(legacy[0].title, "Start here");
  props.articles = { version: 1, records: [...legacy, { ...legacy[0], id: "guide-3", title: "Onboarding" }] };
  assert(documentSchema.safeParse(book).success);
  props.articles.records[2].id = legacy[0].id;
  assert(!documentSchema.safeParse(book).success);

  const operations = manualDocument("operations-workspace");
  const records = [...starterTasks("en"), { id: "launch", title: "Launch", owner: "Jordan", summary: "", priority: "normal", status: "completed" }];
  operations.tasks = { version: 1, records };
  assert(documentSchema.safeParse(operations).success);
  assert.deepEqual(readTaskChanges('{"launch":false,"forged":true,"dispatch":"true"}', records), { launch: false });
  assert.deepEqual(readTaskChanges('["dispatch","forged"]', records), { dispatch: true });
  assert(!documentSchema.safeParse({ ...manualDocument("blank-app"), tasks: operations.tasks }).success);
  records[1].id = records[0].id;
  assert(!documentSchema.safeParse(operations).success);
});

test("the reviewed preset and section affect the exact Blueprint digest", () => {
  const draft = crmFixture();
  draft.preset = "precision";
  draft.pages[0].section = "metrics";
  draft.pages[0].mobileColumns = "two";
  const parsed = resolveBlueprint(draft, crmBrief);
  const compiled = compileDocument(parsed);
  const composed = compiled.document.pages[0].blocks.at(-1);
  assert.equal(compiled.plan.pages[0].addedSection, "metrics");
  assert.deepEqual(compiled.document.identity, identityFor("precision"));
  assert.equal(composed.props.layout.mobile.columns, 2);
  assert.notEqual(compileDocument({ ...parsed, preset: "warm" }).plan.digest, compiled.plan.digest);
  for (const bad of ["unknown", "work-queue", "editorial-hero"]) {
    const rejected = structuredClone(draft);
    rejected.pages[0].section = bad;
    assert.throws(() => resolveBlueprint(rejected, crmBrief));
  }
});

test("read, explicit Save and recovery preserve exact B9 bytes and prior identity", async (t) => {
  const root = resolve(repo, ".motionux-v9");
  await mkdir(root, { mode: 0o700, recursive: true });
  const vault = await mkdtemp(resolve(root, "b10-contract-"));
  t.after(() => rm(vault, { recursive: true, force: true }));
  const store = createStore(vault);
  const legacy = await store.create(manualDocument("knowledge-base"));
  const target = resolve(vault, "build/projects", legacy.id);
  const path = resolve(target, "project.json");
  const originalBytes = JSON.stringify(legacy, null, 2) + "\n";
  await writeFile(path, originalBytes);
  const loaded = await store.open(legacy.id);
  assert.equal(await readFile(path, "utf8"), originalBytes);
  loaded.document.identity = identityFor("warm");
  loaded.document.pages[0].blocks.push(section(loaded.document, "reference"));
  const saved = await store.save(legacy.id, loaded);
  assert.equal(saved.revision, 1);
  assert.equal(await readFile(resolve(target, "previous.json"), "utf8"), originalBytes);
  await assert.rejects(store.save(legacy.id, loaded), { status: 409 });
  await writeFile(path, "corrupt");
  const recovered = await store.restore(legacy.id);
  assert.deepEqual(recovered.document, legacy.document);
});

test("independent Next and PWA trees retain layout, authored tasks, pins and deterministic bytes", async () => {
  const doc = manualDocument("operations-workspace");
  doc.identity = identityFor("warm");
  doc.tasks = { version: 1, records: starterTasks("tr") };
  const composed = section(doc, "team-response");
  composed.props.layout = { ...defaultSectionLayout, mobile: { columns: 1 }, tablet: { columns: 3 } };
  doc.pages[0].blocks.push(composed);
  const input = newProject(id, doc);
  for (const pwa of [false, true]) {
    const files = await exportTree(repo, input, { pwa });
    const manifest = JSON.parse(files["motionux-manifest.json"]);
    assert.equal(manifest.documentDigest, fingerprint(canonical(input.document)));
    assert.equal(Boolean(manifest.pwa), pwa);
    assert(manifest.blocks.some(({ id }) => id === "CreatorSection"));
    assert(files["runtime/identity.css"].includes("@container creator-app"));
    assert.match(files["runtime/project.ts"], /Sevkiyat kontrol listesini doğrula/);
    assert.match(files["runtime/project.ts"], /"tablet": \{\s+"columns": 3/);
    for (const { path, sha256 } of manifest.files) assert.equal(fingerprint(files[path]), sha256);
    assert.deepEqual(zipTree(files), zipTree(await exportTree(repo, input, { pwa })));
  }
});

test("managed image references inside a section protect saved, previous and recovery revisions", async (t) => {
  const root = resolve(repo, ".motionux-v9");
  await mkdir(root, { mode: 0o700, recursive: true });
  const vault = await mkdtemp(resolve(root, "b10-media-"));
  t.after(() => rm(vault, { recursive: true, force: true }));
  const store = createStore(vault);
  const { referencedMedia } = await import("../packages/build-core/model.ts");
  const document = manualDocument("hotel-marketing");
  const composed = section(document, "editorial-hero");
  const ids = ["a", "b", "c"].map((letter) => letter.repeat(64));
  document.assets.push(...ids);
  document.pages[0].blocks.push(composed);
  const assign = (doc, asset, imageFit) => {
    const props = doc.pages[0].blocks.at(-1).children[0].props;
    props.image = { asset, alt: "Local photo", focal: "bottom" };
    props.imageFit = imageFit;
  };
  assign(document, ids[0], "cover");
  const created = await store.create(document);
  assign(created.document, ids[1], "contain");
  const saved = await store.save(created.id, created);
  const draft = structuredClone(saved.document);
  assign(draft, ids[2], "cover");
  await store.saveDraft(created.id, {
    version: 1, baseRevision: 1, updatedAt: Date.now(), pageId: draft.pages[0].id,
    selected: composed.id, panel: "canvas", mode: "edit", device: "mobile", document: draft,
  }, async () => {});
  await store.withMediaReferences(created.id, async (documents) => {
    assert.deepEqual(documents.map((doc) => ids.find((asset) => referencedMedia(doc).has(asset))), [ids[1], ids[0], ids[2]]);
  });
});
