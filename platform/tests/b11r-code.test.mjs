import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseNativeOutput } from "../packages/build-core/composer/codex.ts";
import { createCodeFixture } from "./b11r-fixture.mjs";
import { compileCodeProject } from "../packages/app-export/code-program.ts";
import { restoreCodeSources } from "../packages/app-export/code-catalog.ts";
import { validateProgram } from "../packages/app-export/code-validator.ts";
import { exportTree, zipTree } from "../packages/app-export/export.ts";
import { documentSchema, manualDocument } from "../packages/build-core/model.ts";
import { fingerprint } from "../packages/build-core/store.ts";

test("a novel source API compiles into real modules, keeps editable config and deterministic Next/PWA closures", async (t) => {
  const fixture = await createCodeFixture();
  t.after(fixture.close);
  assert.equal(fixture.sources.length, 1);
  assert(fixture.sources[0].exports.includes("ExpandingNotice"));
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
    'setTimeout("eval()", 1);', 'window.parent.postMessage("escape","*");',
  ]) {
    const bad = structuredClone(fixture.proposal);
    bad.files[0].content += "\n" + code;
    assert.throws(() => validateProgram(bad, fixture.sources), { status: 422 }, code);
  }
  const unused = structuredClone(fixture.proposal);
  unused.files[0].content = unused.files[0].content.replace("<ExpandingNotice title=", "<FakeNotice title=");
  assert.throws(() => validateProgram(unused, fixture.sources), { status: 422 });
  for (const css of ['@import "https://example.test/font.css";', '.app { background: url(https://example.test); }']) {
    const bad = structuredClone(fixture.proposal);
    bad.files[1].content = css;
    assert.throws(() => validateProgram(bad, fixture.sources), { status: 422 });
  }
  const stale = structuredClone(fixture.project);
  stale.document.codeProject.files[0].content += "\n// changed";
  await assert.rejects(compileCodeProject(fixture.fake, stale), { status: 409 });
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
