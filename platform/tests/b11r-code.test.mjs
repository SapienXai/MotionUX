import assert from "node:assert/strict";
import { test } from "node:test";
import { cp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseNativeOutput } from "../packages/build-core/composer/codex.ts";
import { createCodeFixture, repo } from "./b11r-fixture.mjs";
import { sealCodeProject, codeDocument, compileCodeProject } from "../packages/app-export/code-program.ts";
import { analyzeModule, compositionCatalog, inspectCodeCatalog, localCodeSources, localSourceTemplate, planSwitchID, restoreCodeSources } from "../packages/app-export/code-catalog.ts";
import { validateProgram } from "../packages/app-export/code-validator.ts";
import { exportTree, previewTree, zipTree } from "../packages/app-export/export.ts";
import { documentSchema, manualDocument } from "../packages/build-core/model.ts";
import { fingerprint } from "../packages/build-core/store.ts";
import { localBuildSource } from "../../scripts/studio/build-local-sources.mjs";

test("local Build frames require a prepared catalog identity and a pinned source", () => {
  const html = {
    availability: "ready", id: "designbookmark-test", slug: "test", upstreamHash: "a".repeat(64),
    group: "designbookmark", sourceKind: "html", sourceURL: "https://designbookmark.com/motion-src/code/db-test.txt",
  };
  assert(localBuildSource(html));
  for (const change of [{ sourceKind: "react" }, { sourceURL: "https://example.com/db-test.txt" },
    { upstreamHash: "none" }, { slug: undefined }, { id: "../test" }, { availability: "missing" }])
    assert(!localBuildSource({ ...html, ...change }));
  const react = {
    ...html, id: "reactbits-test", group: "reactbits", sourceKind: "react", repo: "https://github.com/DavidHDev/react-bits",
    upstreamCommit: "cf2801031f07f53d4684e65b961bde7c2e2a6921",
  };
  assert(localBuildSource(react));
  assert(!localBuildSource({ ...react, upstreamCommit: "a".repeat(40) }));
  assert(!localBuildSource({ ...react, group: "v14-reactbits-unknown" }));
});

test("mixed local projects compile only for Run and recheck the exact private source pins", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  const id = "designbookmark-local-test";
  const local = { availability: "ready", id, slug: "local-test", group: "designbookmark", sourceKind: "html",
    title: "Owned test specimen", provider: "Fixture", upstreamHash: "e".repeat(64),
    sourceURL: "https://designbookmark.com/motion-src/code/db-local-test.txt" };
  const path = resolve(fixture.vault, "catalog.last-good.json");
  const catalog = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, JSON.stringify([...catalog, local]));
  await cp(resolve(repo, localSourceTemplate), resolve(fixture.fake, localSourceTemplate));
  const sources = [...fixture.sources, ...await localCodeSources(fixture.fake)];
  assert.equal(sources.length, 2);
  assert(!((await inspectCodeCatalog(fixture.fake)).sources.has(id)));
  const { proposal } = fixture;
  proposal.files[0].content = proposal.files[0].content
    .replace('import { useState }', `import LocalSpecimen from "../sources/${id}";\nimport { useState }`)
    .replace("</main>", `<section data-instance="local" data-source="${id}"><LocalSpecimen /></section></main>`);
  proposal.usages.push({ source: id, module: "components/app.tsx", route: "/", instance: "local",
    reason: "Display isolated local specimen", interaction: "Try the specimen" });
  const graph = await sealCodeProject(fixture.fake, proposal, sources);
  const project = { ...fixture.project, document: codeDocument(graph) };
  for (const pwa of [false, true]) await assert.rejects(exportTree(fixture.fake, project, { pwa }), /local-only/);
  const preview = await previewTree(fixture.fake, project, fixture.vault);
  assert.match(preview[`sources/${id}/local.tsx`], /\/v10\/build-preview\/.+&view=run/);
  assert.match(preview["runtime/local-source.tsx"], /sandbox="allow-scripts"/);
  assert.match(preview["next.config.mjs"], /frame-src http:\/\/127\.0\.0\.1:5199\/v10\/build-preview\//);
  assert.equal(preview[`sources/${id}/LICENSE.txt`], undefined);
  await writeFile(path, JSON.stringify([...catalog, { ...local, upstreamHash: "d".repeat(64) }]));
  await assert.rejects(previewTree(fixture.fake, project, fixture.vault), /Pinned source changed/);
  // The export decision is made from the saved graph even if its local vault record disappears.
  await writeFile(path, JSON.stringify(catalog));
  await assert.rejects(exportTree(fixture.fake, project), /local-only/);
});

test("composition resolves a reviewed local behavior and keeps reference-only sources out of executable imports", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  const path = resolve(fixture.vault, "catalog.last-good.json");
  const catalog = JSON.parse(await readFile(path, "utf8"));
  const plan = { availability: "ready", id: planSwitchID, slug: "plan-switch", group: "designbookmark", sourceKind: "html",
    title: "Plan switch", provider: "DesignBookmark", upstreamHash: "e349989db70d39ad10adf574a5fa662bc131e6c47ff5371bb42b68296f3c29f1",
    sourceURL: "https://designbookmark.com/motion-src/code/db-plan-switch.txt" };
  const reference = { ...plan, id: "designbookmark-test-reference", slug: "test-reference", title: "Reference", upstreamHash: "a".repeat(64) };
  await writeFile(path, JSON.stringify([...catalog, plan, reference]));
  for (const file of ["billing-period.tsx", "billing-period.css"]) {
    const template = "platform/templates/source-driven/" + file;
    await cp(resolve(repo, template), resolve(fixture.fake, template));
  }
  const available = await compositionCatalog(fixture.fake);
  assert.equal(available.rows.find(({ id }) => id === reference.id).mode, "reference");
  assert.deepEqual(available.references.map(({ id }) => id), [reference.id]);
  assert.equal(available.adapter.pin.fidelity, "local-adapter");
  assert.equal(available.adapter.pin.license, "local-only");
  assert.match(available.adapter.files["billing-period.tsx"], /onChange/);
  assert.doesNotMatch(available.adapter.files["billing-period.tsx"], /iframe/);
  assert.deepEqual((await restoreCodeSources(fixture.fake, [available.adapter.pin], "local")).map(({ pin }) => pin.id), [planSwitchID]);
  await assert.rejects(restoreCodeSources(fixture.fake, [available.adapter.pin]), /Pinned source changed/);
  await writeFile(path, JSON.stringify([...catalog, { ...plan, upstreamHash: "b".repeat(64) }, reference]));
  await assert.rejects(restoreCodeSources(fixture.fake, [available.adapter.pin], "local"), /Pinned source changed/);
});

test("a novel source API compiles into real modules, keeps editable config and deterministic Next/PWA closures", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  assert.equal(fixture.sources.length, 1);
  assert(fixture.sources[0].exports.includes("default"));
  assert(!fixture.sources[0].exports.includes("ExpandingNotice"));
  for (const pwa of [false, true]) {
    const tree = await exportTree(fixture.fake, fixture.project, { pwa });
    const manifest = JSON.parse(tree["motionux-manifest.json"]);
    assert.equal(manifest.sourceVersion, 2);
    assert.equal(manifest.sources[0].id, "portable-source");
    assert.equal(Boolean(manifest.pwa), pwa);
    assert(tree["components/app.tsx"].includes("ExpandingNotice"));
    assert(tree["sources/portable-source/component.tsx"]);
    assert(!tree["runtime/screen.tsx"].includes("mx-section"));
    for (const { path, sha256 } of manifest.files) assert.equal(fingerprint(tree[path]), sha256);
    assert.deepEqual(zipTree(tree), zipTree(await exportTree(fixture.fake, fixture.project, { pwa })));
  }
  const changed = structuredClone(fixture.project);
  changed.document.codeProject.controls[0].value = "Changed in Studio";
  const tree = await exportTree(fixture.fake, changed);
  assert(tree["runtime/config.ts"].includes("Changed in Studio"));
  const photos = structuredClone(fixture.proposal);
  photos.files[0].content += '\nconst image = (name: string) => `/media/seed-${name}-720.webp`;';
  const photoProject = { ...fixture.project, document: codeDocument(await sealCodeProject(fixture.fake, photos, fixture.sources)) };
  const photoTree = await exportTree(fixture.fake, photoProject);
  for (const name of ["coast", "room", "pool"]) for (const size of [360, 720])
    assert(photoTree["public/media/seed-" + name + "-" + size + ".webp"], "Dynamic owned photo references need their pinned renditions");
  assert.equal(tree["components/app.tsx"], fixture.proposal.files[0].content);
  assert(documentSchema.safeParse(fixture.project.document).success);
  assert(documentSchema.safeParse(manualDocument("hotel-dashboard")).success);
});

test("untrusted generated imports, HTML, CSS, asset URLs and stale hashes fail closed", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  for (const code of [
    'import fs from "node:fs";', 'import anything from "../../outside";', 'void import("react");',
    'void fetch("https://example.test");', 'void process.env;', 'eval("1");',
    'const x = <iframe src="/api/build" />;', 'const x = <div dangerouslySetInnerHTML={{__html:"unsafe"}} />;',
    'document.cookie;', 'const capability = ({})["constructor"];', 'window["fetch"]("https://example.test");',
    'window.open("/unexpected");', 'const image = "https://untrusted.test/image.png";',
    'setTimeout("eval()", 1);', 'window.parent.postMessage("escape","*");', 'void opener;', 'void top;',
  ]) {
    const bad = structuredClone(fixture.proposal);
    bad.files[0].content += "\n" + code;
    assert.throws(() => validateProgram(bad, fixture.sources), { status: 422 }, code);
  }
  const directive = structuredClone(fixture.proposal);
  directive.files[0].content = '/// <reference path="../../outside.ts" />\n' + directive.files[0].content;
  assert.throws(() => validateProgram(directive, fixture.sources), { status: 422 });
  const geometry = structuredClone(fixture.proposal);
  geometry.files[0].content += '\nfunction offset(rect: DOMRect) { const opener = rect; return opener.top; }';
  geometry.files[1].content += " .app .panel-body { color: inherit; }";
  geometry.files[0].content += '\nfunction Target({ target }: { target: string }) { return <p>{target}</p>; } const targetNode = <Target target="Saturn" />;';
  assert.doesNotThrow(() => validateProgram(geometry, fixture.sources));
  const computed = structuredClone(fixture.proposal);
  computed.files[0].content = computed.files[0].content.replace('data-instance="notice"', 'data-instance={route === "/" ? "notice" : "notice-notes"}');
  assert.doesNotThrow(() => validateProgram(computed, fixture.sources));
  const unused = structuredClone(fixture.proposal);
  unused.files[0].content = unused.files[0].content.replace("<ExpandingNotice title=", "<FakeNotice title=");
  assert.throws(() => validateProgram(unused, fixture.sources), { status: 422 });
  for (const css of ['@import "https://example.test/font.css";', '.app { background: url(https://example.test); }', '.app { background: \\75rl(https://example.test); }']) {
    const bad = structuredClone(fixture.proposal);
    bad.files[1].content = css;
    assert.throws(() => validateProgram(bad, fixture.sources), { status: 422 });
  }
  const stale = structuredClone(fixture.project);
  stale.document.codeProject.files[0].content += "\n// changed";
  await assert.rejects(compileCodeProject(fixture.fake, stale), { status: 409 });
  const disclosure = structuredClone(fixture.project.document.codeProject.sources);
  disclosure[0].fidelity = "source-adapted";
  assert.equal((await restoreCodeSources(fixture.fake, disclosure))[0].pin.fidelity, "upstream-original");
  const recipe = resolve(fixture.vault, "registry/portable-source.json");
  const payload = JSON.parse(await readFile(recipe, "utf8"));
  payload.files[0].content += "\n// source changed";
  await writeFile(recipe, JSON.stringify(payload));
  await assert.rejects(restoreCodeSources(fixture.fake, fixture.project.document.codeProject.sources), { status: 409 });
});

test("native code responses retain bounded executable modules beyond the legacy Blueprint limit", () => {
  const program = JSON.stringify({ module: "x".repeat(40_000) });
  assert.equal(parseNativeOutput(program, true).module.length, 40_000);
  assert.throws(() => parseNativeOutput(program), { status: 422 });
  assert.throws(() => parseNativeOutput(JSON.stringify({ module: "x".repeat(192 * 1024) }), true), { status: 422 });
});

test("source metadata distinguishes a named default declaration from a named runtime export", () => {
  const metadata = analyzeModule("source.tsx", "export default function Form() {}\nexport function Field() {}\nexport interface Props { label: string }\nexport type Errors = Record<string,string>;");
  assert.deepEqual(metadata.exports, ["default", "Field"]);
  assert(metadata.types.includes("interface Props"));
  assert(metadata.types.includes("type Errors"));
});

test("prepared source adaptations retain separate upstream and prepared hashes and disclose fidelity", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  const catalogFile = resolve(fixture.vault, "catalog.last-good.json");
  const recipeFile = resolve(fixture.vault, "registry/portable-source.json");
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  const recipe = JSON.parse(await readFile(recipeFile, "utf8"));
  const upstream = fingerprint(recipe.files[0].content);
  recipe.files[0].content += "\n// Owned preparation fixture\n";
  const prepared = fingerprint(recipe.files[0].content);
  catalog[0].codeFiles[0].installedSHA256 = prepared;
  await writeFile(catalogFile, JSON.stringify(catalog));
  await writeFile(recipeFile, JSON.stringify(recipe));
  const source = (await inspectCodeCatalog(fixture.fake)).sources.get("portable-source");
  assert.equal(source.pin.fidelity, "source-adapted");
  assert.equal(source.upstreamHashes["component.tsx"], upstream);
  assert.equal(source.hashes["component.tsx"], prepared);
  assert.equal(source.preparationPatches.length, 1);
  await assert.rejects(restoreCodeSources(fixture.fake, fixture.project.document.codeProject.sources), { status: 409 });
});

test("source verification supports bounded pointer actions without a component API case", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  for (const action of ["hover", "drag", "wheel"]) {
    const proposal = structuredClone(fixture.proposal);
    proposal.journeys[0].steps[0] = { role: "img", name: "Surface", action, value: action === "hover" ? "" : "80,-40", expected: "Context" };
    assert.doesNotThrow(() => validateProgram(proposal, fixture.sources));
    if (action !== "hover") {
      proposal.journeys[0].steps[0].value = "900,0";
      assert.throws(() => validateProgram(proposal, fixture.sources), { status: 422 });
    }
  }
});
