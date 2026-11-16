import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { exportTree } from "../packages/app-export/export.ts";
import {
  defaultMotionDna,
  manualDocument,
  newProject,
  projectSchema,
} from "../packages/build-core/model.ts";
import { canonical, fingerprint } from "../packages/build-core/store.ts";

test("Motion DNA preserves documents authored before B5 and scopes both export formats to one revision", async () => {
  const repo = resolve(import.meta.dirname, "../..");
  const crm = newProject("5".repeat(32), manualDocument("crm-dashboard"));
  const previous = projectSchema.parse(JSON.parse(JSON.stringify(crm)));
  assert.equal(previous.document.motionDna, undefined);
  assert.equal(canonical(previous.document), canonical(crm.document));

  const hotel = newProject("6".repeat(32), manualDocument("hotel-dashboard"));
  const v1Document = { ...hotel.document };
  delete v1Document.locale;
  const old = projectSchema.parse({
    ...hotel,
    schemaVersion: 1,
    document: v1Document,
  });
  assert.equal(old.schemaVersion, 2);
  assert.equal(old.document.motionDna, undefined);

  const motionDna = {
    ...defaultMotionDna,
    transitionMs: 310,
    feedbackMs: 90,
    reducedMotion: "fade",
    pageTransition: "slide",
  };
  const updated = projectSchema.parse({
    ...crm,
    revision: 2,
    document: { ...crm.document, motionDna },
  });
  for (const invalid of [
    { ...motionDna, version: 2 },
    { ...motionDna, easing: "url(foo)" },
    { ...motionDna, reducedMotion: "ignore" },
    { ...motionDna, feedbackMs: NaN },
    { ...motionDna, transitionMs: 401 },
    { ...motionDna, feedbackMs: 37.5 },
    { ...motionDna, feedbackMs: 61 },
    { ...motionDna, extra: "arbitrary" },
  ]) {
    assert(
      !projectSchema.safeParse({
        ...crm,
        document: { ...crm.document, motionDna: invalid },
      }).success,
    );
  }
  const manifests = [];
  for (const pwa of [false, true]) {
    const files = await exportTree(repo, updated, { pwa });
    const manifest = JSON.parse(files["motionux-manifest.json"]);
    assert.deepEqual(manifest.motion, { ...motionDna, mode: "system" });
    assert(files["runtime/motion-dna.ts"]);
    assert.equal(
      manifest.documentDigest,
      fingerprint(canonical(updated.document)),
    );
    assert.equal(manifest.revision, 2);
    manifests.push(manifest);
  }
  assert.equal(manifests[0].documentDigest, manifests[1].documentDigest);
});
