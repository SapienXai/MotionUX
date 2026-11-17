import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  blockSpec,
  compatibleBlock,
  manualDocument,
  newProject,
  projectSchema,
  referencedMedia,
  registry,
} from "../packages/build-core/model.ts";
import { createStore, fingerprint } from "../packages/build-core/store.ts";
import {
  compileDocument,
  normalizeBrief,
  resolveBlueprint,
} from "../packages/build-core/composer/blueprint.ts";
import { exportTree, zipTree } from "../packages/app-export/export.ts";
import {
  ingestMedia,
  mediaBytes,
  verifyMediaOwnership,
} from "../packages/app-export/media.ts";
import { hotelBriefs, hotelProposal } from "./b8-fixtures.mjs";

const repo = resolve(import.meta.dirname, "../..");
const root = resolve(repo, ".motionux-v9/build-tests");
test("Marketing templates export six real routes, pinned images, and retain legacy block compatibility", async () => {
  const owned = Object.keys(registry).filter(
    (id) => registry[id].family === "Marketing",
  );
  assert.equal(owned.length, 16);
  assert(
    owned.every(
      (id) =>
        compatibleBlock(id, "marketing-demo-v1") &&
        !compatibleBlock(id, "hotel-demo-v1") &&
        blockSpec(id).exportEligible,
    ),
  );
  const project = newProject("a".repeat(32), manualDocument("hotel-marketing"));
  assert.equal(project.document.theme, "system");
  assert.deepEqual(
    project.document.pages.map(({ route }) => route),
    ["/", "/rooms", "/terrace-suite", "/olive-room", "/about", "/contact"],
  );
  assert.equal(referencedMedia(project.document).size, 3);
  const files = await exportTree(repo, project);
  const manifest = JSON.parse(files["motionux-manifest.json"]);
  assert.equal(
    manifest.files.filter(({ path }) => path.startsWith("public/media/"))
      .length,
    6,
  );
  for (const { path, sha256 } of manifest.files)
    assert.equal(fingerprint(files[path]), sha256);
  assert.deepEqual(zipTree(files), zipTree(await exportTree(repo, project)));
  const pwa = await exportTree(repo, project, { pwa: true });
  assert(
    JSON.parse(pwa["runtime/pwa-config.json"]).assets.includes(
      "/media/seed-coast-720.webp",
    ),
  );
  const bad = structuredClone(project);
  bad.document.pages[0].blocks[1].props.destination = "https://other.example";
  assert(!projectSchema.safeParse(bad).success);
});

test("Marketing composition is deterministic, bilingual and confined to catalog assets and routes", () => {
  for (const [locale, value] of hotelBriefs) {
    const brief = normalizeBrief(value);
    const proposal = hotelProposal(locale);
    const plan = compileDocument(resolveBlueprint(proposal, brief));
    assert.equal(plan.document.locale, locale);
    assert.equal(plan.document.pages.length, 6);
    assert.deepEqual(
      plan.plan.pages.map(({ route, blocks }) => [
        route,
        blocks.map(({ id }) => id),
      ]),
      plan.document.pages.map(({ route, blocks }) => [
        route,
        blocks.map(({ type }) => type),
      ]),
    );
    const edits = {
      name: plan.plan.name,
      theme: plan.plan.theme,
      sidebar: plan.plan.sidebar,
      routes: plan.plan.routes,
    };
    assert.equal(
      compileDocument(resolveBlueprint(proposal, brief), edits).plan.digest,
      plan.plan.digest,
    );
    assert.throws(
      () =>
        compileDocument(resolveBlueprint(proposal, brief), {
          ...edits,
          routes: edits.routes.slice(0, -1),
        }),
      { status: 422 },
    );
    assert.equal(
      plan.plan.digest,
      compileDocument(resolveBlueprint(proposal, brief)).plan.digest,
    );
    if (locale === "tr") {
      assert.equal(plan.document.motionProfile, "none");
      assert.match(
        plan.document.pages[0].blocks.find(
          ({ type }) => type === "FAQAccordion",
        ).props.items[0].title,
        /Giriş/,
      );
    } else assert(plan.plan.limitations.length);
    const forged = structuredClone(proposal);
    forged.pages[0].blocks[0].asset = "/etc/hosts";
    assert.throws(() => resolveBlueprint(forged, brief), { status: 422 });
  }
});

test("Media validates content, rights, ownership, deduplication and bounded immutable bytes", async (t) => {
  await mkdir(root, { recursive: true, mode: 0o700 });
  const vault = await mkdtemp(resolve(root, "b8-media-"));
  t.after(() => rm(vault, { recursive: true, force: true }));
  const store = createStore(vault);
  const project = await store.create(manualDocument("hotel-marketing"));
  const other = await store.create(manualDocument("hotel-marketing"));
  const photo = await readFile(
    resolve(
      repo,
      "platform/templates/hotel-marketing/media/seed-room-720.webp",
    ),
  );
  const request = (body, more = {}, signal) =>
    new Request("http://127.0.0.1/media", {
      method: "POST",
      body,
      signal,
      headers: {
        "Content-Type": "image/webp",
        "X-MotionUX-Image-Name": "Room.webp",
        "X-MotionUX-Image-Rights": "confirmed",
        ...more,
      },
    });
  await assert.rejects(
    ingestMedia(
      vault,
      project.id,
      request("<svg/>", { "Content-Type": "image/svg+xml" }),
    ),
    { status: 415 },
  );
  await assert.rejects(
    ingestMedia(vault, project.id, request("pretend image")),
    { status: 422 },
  );
  await assert.rejects(
    ingestMedia(
      vault,
      project.id,
      request(photo, { "X-MotionUX-Image-Rights": "" }),
    ),
    { status: 422 },
  );
  await assert.rejects(
    ingestMedia(
      vault,
      project.id,
      request(photo, { "X-MotionUX-Image-Name": "%2e%2e%2Fsecret" }),
    ),
    { status: 422 },
  );
  await assert.rejects(
    ingestMedia(
      vault,
      project.id,
      request(new Uint8Array(4 * 1024 * 1024 + 1)),
    ),
    { status: 413 },
  );
  await assert.rejects(
    ingestMedia(vault, project.id, request(photo, {}, AbortSignal.abort())),
    { name: "AbortError" },
  );
  const image = await ingestMedia(vault, project.id, request(photo));
  assert.equal(
    (await ingestMedia(vault, project.id, request(photo))).id,
    image.id,
  );
  assert.equal(
    fingerprint(await mediaBytes(repo, vault, project.id, image.id, 720)),
    image.id,
  );
  await assert.rejects(mediaBytes(repo, vault, other.id, image.id, 720), {
    status: 404,
  });
  project.document.assets.push(image.id);
  await verifyMediaOwnership(repo, vault, project.id, project.document);
  await assert.rejects(
    verifyMediaOwnership(repo, vault, other.id, project.document),
    { status: 404 },
  );
  const source = resolve(
    vault,
    "build/media",
    project.id,
    image.id,
    "360.webp",
  );
  await rm(source);
  await symlink(resolve(repo, "README.md"), source);
  await assert.rejects(mediaBytes(repo, vault, project.id, image.id, 360));
});
