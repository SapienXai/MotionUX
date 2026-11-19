import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  readFile,
  symlink,
  link,
  rename,
  rm,
  readdir,
  mkdir,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  blockSchema,
  compatibleBlock,
  compositionPlan,
  makeBlock,
  newProject,
  projectSchema,
  registry,
  templatePlan,
} from "../packages/build-core/model.ts";
import { createStore, fingerprint } from "../packages/build-core/store.ts";
import {
  exportTree,
  zipTree,
  writeTree,
} from "../packages/app-export/export.ts";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const id = "1".repeat(32);
const buildVault = resolve(repo, ".motionux-v9/build-tests");

async function isolated(t) {
  await mkdir(resolve(repo, ".motionux-v9"), { mode: 0o700 }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
  await mkdir(buildVault, { mode: 0o700 }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
  const vault = await mkdtemp(resolve(buildVault, "contract-"));
  t.after(() => rm(vault, { recursive: true, force: true }));
  return vault;
}
test("versioned template generates a unique project with valid owned blocks", () => {
  const plan = compositionPlan.parse(templatePlan());
  const project = newProject(id);
  assert.equal(project.document.pages.length, 4);
  assert.deepEqual(project.document, plan.document);
  assert.equal(Object.keys(registry).filter((type) => type !== "CreatorSection" && compatibleBlock(type, "hotel-demo-v1")).length, 31);
  assert.equal(Object.keys(registry).filter((type) => type !== "CreatorSection" && (compatibleBlock(type, "hotel-demo-v1") || compatibleBlock(type, "crm-demo-v1"))).length, 35);
  for (const [type, spec] of Object.entries(registry)) {
    assert.equal(spec.license, "MIT");
    assert.equal(spec.exportEligible, true);
    assert.equal(spec.provenance, "owned-composition");
    assert(blockSchema.safeParse(makeBlock(type, "b-owned")).success);
  }
});

test("rejects path traversal, prototype fields, unknown blocks and excessive values", () => {
  const project = newProject(id);
  const block = project.document.pages[0].blocks[0];
  assert(!blockSchema.safeParse({ ...block, type: "raw-html" }).success);
  assert(
    !blockSchema.safeParse({
      ...block,
      props: { ...block.props, href: "javascript:alert(1)" },
    }).success,
  );
  assert(
    !blockSchema.safeParse(
      JSON.parse(
        JSON.stringify(block).replace(
          '"props":{',
          '"props":{"__proto__":{"inject":true},',
        ),
      ),
    ).success,
  );
  assert(
    !blockSchema.safeParse({
      ...block,
      props: { ...block.props, title: "a".repeat(73) },
    }).success,
  );
  for (const route of [
    "/../home",
    "/Mixed",
    "/api",
    "/%2f",
    "/https://example.test",
  ]) {
    assert(
      !projectSchema.safeParse({
        ...project,
        document: {
          ...project.document,
          pages: [
            ...project.document.pages,
            { id: "p-other", route, title: "Other", blocks: [] },
          ],
        },
      }).success,
    );
  }
  const child = makeBlock("KpiCard", "b-child");
  const inset = { ...makeBlock("SidebarInset", "b-inset"), children: [child] };
  assert(blockSchema.safeParse(inset).success);
  assert(!blockSchema.safeParse({ ...block, children: [child] }).success);
  assert(!blockSchema.safeParse({ ...inset, children: [inset] }).success);
  assert(!projectSchema.safeParse({ ...project, schemaVersion: 99 }).success);
  assert(
    !projectSchema.safeParse({
      ...project,
      document: { ...project.document, assets: ["/Users/customer"] },
    }).success,
  );
  assert(
    !projectSchema.safeParse({
      ...project,
      document: {
        ...project.document,
        pages: [
          ...project.document.pages,
          { ...project.document.pages[0], id: "p-other" },
        ],
      },
    }).success,
  );
});

test("writes are serialized, revisions conflict, valid backup survives corrupt JSON", async (t) => {
  const vault = await isolated(t);
  const store = createStore(vault);
  const old = await store.create();
  const first = structuredClone(old);
  first.document.name = "Coastal Hotel";
  const writes = await Promise.allSettled([
    store.save(old.id, first),
    store.save(old.id, first),
  ]);
  assert.equal(writes.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(
    writes.find((item) => item.status === "rejected").reason.status,
    409,
  );
  await assert.rejects(store.save(old.id, first), { status: 409 });
  const reopened = await createStore(vault).open(old.id);
  assert.equal(reopened.revision, 1);
  assert.equal(reopened.document.name, first.document.name);
  assert.deepEqual(await store.openPrevious(old.id), old);
  await assert.rejects(store.restore(old.id), { status: 409 });
  const root = resolve(vault, "build/projects", old.id);
  await writeFile(
    resolve(root, ".save-lock"),
    JSON.stringify({ pid: 2147483646, key: "9".repeat(32) }),
    { mode: 0o600 },
  );
  const updated = await store.save(old.id, {
    ...reopened,
    document: { ...reopened.document, name: "Another Hotel" },
  });
  await writeFile(
    resolve(root, ".interrupted.tmp"),
    "part of an incomplete save",
    { mode: 0o600 },
  );
  assert.deepEqual(await store.open(old.id), updated);
  await writeFile(resolve(root, "project.json"), "{", { mode: 0o600 });
  const [invalid] = await store.list();
  assert.equal(invalid.error, true);
  assert.equal(invalid.recoverable, true);
  assert.equal(invalid.name, "Coastal Hotel");
  const restored = await store.restore(old.id);
  assert.equal(restored.document.name, "Coastal Hotel");
  assert.equal(restored.revision, 3);
  await assert.rejects(store.open("../"), { status: 404 });
});

test("filesystem rejects redirected directories, hardlinked documents and overlarge persisted bytes", async (t) => {
  const vault = await isolated(t);
  const store = createStore(vault);
  const project = await store.create();
  const root = resolve(vault, "build/projects", project.id);
  const document = resolve(root, "project.json");
  const alias = resolve(vault, "copy.json");
  await link(document, alias);
  await assert.rejects(store.open(project.id), { status: 403 });
  await rm(alias);
  await rename(document, alias);
  await symlink(alias, document);
  await assert.rejects(store.open(project.id), { status: 403 });
  await rm(document);
  await rename(alias, document);
  await writeFile(document, " ".repeat(193 * 1024));
  await assert.rejects(store.open(project.id), { status: 403 });
  const second = "9".repeat(32);
  await symlink(root, resolve(root, "..", second), "dir");
  await assert.rejects(store.open(second), { status: 403 });
});

test("independent source tree is repeatable, edited source changes and writes cannot overwrite", async (t) => {
  const vault = await isolated(t);
  const project = newProject(id);
  const tree = await exportTree(repo, project);
  assert.deepEqual(zipTree(tree), zipTree(await exportTree(repo, project)));
  assert(
    Object.values(JSON.parse(tree["package-lock.json"]).packages).every(
      (value) => !value.link && !value.resolved?.startsWith("file:"),
    ),
  );
  assert.deepEqual(
    JSON.parse(tree["motionux-manifest.json"]).files.map((file) => file.sha256),
    JSON.parse(tree["motionux-manifest.json"]).files.map((file) =>
      fingerprint(tree[file.path]),
    ),
  );
  project.document.pages[0].blocks[0].props.title = "Review today";
  const next = await exportTree(repo, project);
  assert.match(next["runtime/project.ts"], /Review today/);
  assert.notEqual(
    fingerprint(tree["runtime/project.ts"]),
    fingerprint(next["runtime/project.ts"]),
  );
  assert(
    !Object.keys(next).some(
      (name) => name.includes(".motionux-v9") || name.includes("node_modules"),
    ),
  );
  await writeTree(vault, next);
  assert.equal(
    await readFile(resolve(vault, "runtime/project.ts"), "utf8"),
    next["runtime/project.ts"],
  );
  await assert.rejects(writeTree(vault, next), { code: "EEXIST" });
  await assert.rejects(
    writeTree(vault, { "../external.ts": "bad" }),
    /Invalid exported filename/,
  );
  assert((await readdir(vault)).includes("app"));
});
