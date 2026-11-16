import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { exportTree, zipTree } from "../packages/app-export/export.ts";
import { manualDocument, newProject } from "../packages/build-core/model.ts";
import { fingerprint } from "../packages/build-core/store.ts";

const repo = resolve(import.meta.dirname, "../..");
test("PWA export is opt-in, repeatable and tied to the same saved document", async () => {
  const project = newProject("3".repeat(32), manualDocument("crm-dashboard"));
  const standard = await exportTree(repo, project);
  const pwa = await exportTree(repo, project, { pwa: true });
  const sourceManifest = JSON.parse(standard["motionux-manifest.json"]);
  const pwaSource = JSON.parse(pwa["motionux-manifest.json"]);
  const appManifest = JSON.parse(pwa["public/manifest.webmanifest"]);
  assert(!sourceManifest.pwa && !standard["public/manifest.webmanifest"]);
  assert.equal(pwaSource.documentDigest, sourceManifest.documentDigest);
  assert.equal(pwa["runtime/project.ts"], standard["runtime/project.ts"]);
  assert.equal(appManifest.id, pwaSource.pwa.appId);
  assert.equal(appManifest.start_url, "/");
  assert.equal(appManifest.display, "standalone");
  assert.equal(appManifest.scope, "/");
  assert.deepEqual(pwaSource.pwa.routes, [
    "/",
    "/activities",
    "/contacts",
    "/pipeline",
    "/settings",
  ]);
  for (const icon of appManifest.icons) {
    const bytes = pwa["public" + icon.src];
    const width = Number(icon.sizes.split("x")[0]);
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), width);
  }
  for (const file of pwaSource.files)
    assert.equal(file.sha256, fingerprint(pwa[file.path]));
  assert.deepEqual(
    zipTree(pwa),
    zipTree(await exportTree(repo, project, { pwa: true })),
  );
  assert(
    !pwa["public/sw.js"],
    "The production build must attach its own asset inventory.",
  );
});
