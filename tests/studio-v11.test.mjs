import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, request as sendRequest } from "node:http";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { createLibraryAPI, createLibraryStore, emptyLibrary, normalizeLibrary } from "../scripts/studio/v11/library.mjs";
import { describeKit, kitArchive } from "../scripts/studio/v11/kits.mjs";
import { requestURL, safeFile } from "../scripts/studio/v11/paths.mjs";
import { thumbnailKey } from "../scripts/studio/v11/thumbnail-cache.mjs";

const source = "demo-picker";
const catalog = new Map([[source, { id: source, sourceKind: "react", scenes: ["Rings"] }]]);
async function fixture(t) {
  const dir = await mkdtemp(resolve(await realpath(tmpdir()), "motionux-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("serialized optimistic revisions preserve favorites, collections, notes and imported missing originals", async t => {
  const dir = await fixture(t);
  const store = createLibraryStore(dir, catalog);
  const [save, stale] = await Promise.all([
    store.change({ action: "favorite", source, value: true, revision: 0 }),
    store.change({ action: "create", name: "Stale", revision: 0 }),
  ]);
  assert.equal(save.library.revision, 1);
  assert.deepEqual(stale, { conflict: true, library: save.library });
  const first = (await store.change({ action: "create", name: "One", revision: 1 })).library.collections[0];
  const second = (await store.change({ action: "create", name: "Two", revision: 2 })).library.collections[1];
  await store.change({ action: "membership", source, collections: [first.id, second.id], revision: 3 });
  await store.change({ action: "personal", source, value: { note: "Use a subtle color", tags: ["test"], scene: "Rings", theme: "dark" }, revision: 4 });
  await store.change({ action: "personal", source, value: { note: "Revised", tags: ["test"] }, keepPreferences: true, revision: 5 });
  await store.change({ action: "delete", collection: first.id, revision: 6 });
  const after = await createLibraryStore(dir, catalog).read();
  assert.deepEqual(after.favorites, [source]);
  assert.deepEqual(after.collections[0].items, [source]);
  assert.equal(after.details[source].scene, "Rings");
  assert.equal(after.details[source].theme, "dark");
  const imported = await store.change({ action: "import", mode: "merge", revision: 7, library: { ...emptyLibrary(), favorites: ["former-source"] } });
  assert.deepEqual(imported.library.favorites, [source, "former-source"]);
  assert.equal((await readdir(resolve(dir, "history"))).length, 1);
  assert.equal((await readdir(dir)).some(name => name.endsWith(".tmp")), false);
  await assert.rejects(() => store.change({ action: "favorite", source: "another-missing", value: true, revision: 8 }), { status: 404 });
  assert.equal((await store.read()).revision, 8);
  assert.deepEqual((await store.change({ action: "import", mode: "replace", revision: 8, library: emptyLibrary() })).library.favorites, []);
  assert.equal((await readdir(resolve(dir, "history"))).length, 2);
});

test("corrupt and invalid library data is rejected without changing the stored file", async t => {
  const dir = await fixture(t);
  const store = createLibraryStore(dir, catalog);
  const path = resolve(dir, "library.v1.json");
  await writeFile(path, "{bad json");
  await assert.rejects(() => store.read(), { status: 503 });
  await assert.rejects(() => store.change({ action: "favorite", source, value: true, revision: 0 }), { status: 503 });
  assert.equal(await readFile(path, "utf8"), "{bad json");
  for (const invalid of [
    { ...emptyLibrary(), schemaVersion: 2 },
    { ...emptyLibrary(), favorites: [source, source] },
    { ...emptyLibrary(), favorites: ["../secret"] },
    { ...emptyLibrary(), favorites: ["constructor"] },
    { ...emptyLibrary(), details: { [source]: { note: "x".repeat(401), tags: [] } } },
  ]) assert.throws(() => normalizeLibrary(invalid), { status: 400 });
  const child = resolve(dir, "other");
  await mkdir(child);
  const linked = resolve(dir, "linked");
  await symlink(child, linked);
  await assert.rejects(() => createLibraryStore(linked, catalog).change({ action: "favorite", source, value: true, revision: 0 }), /saved library cannot be read|Unsafe storage directory/);
  assert.deepEqual(await readdir(child), []);
});

test("library API rejects cross-origin, navigation, token, type, malformed and oversized requests", async t => {
  const dir = await fixture(t);
  const store = createLibraryStore(dir, catalog);
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  server.on("request", createLibraryAPI(store, origin));
  const metadata = { "sec-fetch-site": "same-origin", "sec-fetch-dest": "empty" };
  const call = (method, headers = {}, body) => new Promise((resolve, reject) => {
    const client = sendRequest(origin, { method, headers }, response => {
      let text = "";
      response.on("data", data => { text += data; });
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(text), headers: response.headers }));
    });
    client.on("error", reject);
    client.end(body);
  });
  assert.equal((await call("GET")).status, 403);
  assert.equal((await call("GET", { ...metadata, "sec-fetch-dest": "iframe" })).status, 403);
  const session = await call("GET", metadata);
  assert.equal(session.status, 200);
  assert.equal(session.headers["access-control-allow-origin"], undefined);
  assert.match(session.body.token, /^[a-f0-9]{64}$/);
  const headers = { ...metadata, "content-type": "application/json", origin, "x-motionux-token": session.body.token };
  const command = JSON.stringify({ action: "favorite", source, value: true, revision: 0 });
  assert.equal((await call("POST", { ...headers, origin: "https://external.invalid" }, command)).status, 403);
  assert.equal((await call("POST", { ...headers, "x-motionux-token": "a".repeat(64) }, command)).status, 403);
  assert.equal((await call("POST", { ...headers, "content-type": "text/plain" }, command)).status, 415);
  assert.equal((await call("POST", headers, "{")).status, 400);
  assert.equal((await call("POST", headers, "a".repeat(530 * 1024))).status, 413);
  assert.equal((await call("POST", headers, command)).status, 200);
  assert.equal((await call("POST", headers, command)).status, 409);
  assert.equal((await store.read()).revision, 1);
});

test("static route paths reject traversal, encoded separators, malformed and oversized requests", async t => {
  const dir = await fixture(t);
  const origin = "http://127.0.0.1:5199";
  for (const value of ["//foreign.invalid/test", "/%2e%2e/secret", "/v9/%2fetc", "/v9/%ZZ", "/.motionux-v9/registry",
    "/v9/source?file=%x", "/v9/source?item=" + "a".repeat(9000)]) {
    assert.throws(() => requestURL(value, origin));
  }
  assert.equal(requestURL("/v9/source?file=docs%2FDemo.tsx", origin).path, "/v9/source");
  const outside = resolve(dir, "secret");
  const assets = resolve(dir, "public");
  await mkdir(assets);
  await writeFile(outside, "private");
  await writeFile(resolve(assets, "visible.js"), "public");
  await symlink(outside, resolve(assets, "alias.js"));
  assert.equal(await safeFile(assets, "visible.js"), resolve(assets, "visible.js"));
  await assert.rejects(() => safeFile(assets, "alias.js"));
  await assert.rejects(() => safeFile(assets, "../secret"));
});

test("thumbnail keys change with theme, dimensions, source or installed artifact versions", () => {
  const item = { id: source, upstreamHash: "one", upstreamCommit: "pin", codeFiles: [], preview: { height: 300 } };
  const original = thumbnailKey(item, 320, "light");
  for (const key of [thumbnailKey(item, 368, "light"), thumbnailKey(item, 320, "dark"),
    thumbnailKey({ ...item, upstreamHash: "two" }, 320, "light"),
    thumbnailKey({ ...item, codeFiles: [{ sha256: "different" }] }, 320, "light")]) assert.notEqual(key, original);
});

test("portable kits keep registry bytes and report conflicting pins and missing items", async t => {
  const dir = await fixture(t);
  const entries = new Map([
    ["a-kit", { id: "a-kit", title: "A", sourceKind: "react", availability: "ready", dependencies: { react: "18" } }],
    ["b-kit", { id: "b-kit", title: "B", sourceKind: "html", availability: "ready", dependencies: { react: "19" } }],
  ]);
  const plan = describeKit(["a-kit", "b-kit", "missing-kit"], entries);
  assert.deepEqual(plan.conflicts, [{ name: "react", versions: ["18", "19"] }]);
  assert.deepEqual(plan.missing, ["missing-kit"]);
  const zip = resolve(dir, "kit.zip");
  await writeFile(zip, kitArchive("Kit", plan, [{ id: "a-kit", bytes: Buffer.from("registry payload") }]));
  assert.match(execFileSync("unzip", ["-t", zip], { encoding: "utf8" }), /No errors detected/);
  assert.equal(execFileSync("unzip", ["-p", zip, "registry/a-kit.json"], { encoding: "utf8" }), "registry payload");
});

test("private backup restores vault and personal data, keeps the old destination, and rejects a damaged or escaping archive", async t => {
  const dir = await fixture(t);
  const vault = resolve(dir, "vault");
  const dest = resolve(dir, "restored");
  const path = resolve(dir, "backup.tar.gz");
  await mkdir(resolve(vault, "runtime/provider/dist"), { recursive: true });
  await mkdir(resolve(vault, "user"));
  await mkdir(resolve(dest, "user"), { recursive: true });
  await writeFile(resolve(vault, "runtime/provider/dist/live.html"), "<h1>original</h1>");
  await writeFile(resolve(vault, "user/library.v1.json"), JSON.stringify({ ...emptyLibrary(), revision: 2 }));
  await writeFile(resolve(dest, "user/library.v1.json"), JSON.stringify(emptyLibrary()));
  const run = (...args) => execFileSync("python3", ["scripts/studio/v11/backup.py", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  run("backup", path, "--vault", vault);
  run("restore", path, "--vault", dest, "--check");
  assert.equal(JSON.parse(await readFile(resolve(dest, "user/library.v1.json"), "utf8")).revision, 0);
  run("restore", path, "--vault", dest);
  assert.equal(await readFile(resolve(dest, "runtime/provider/dist/live.html"), "utf8"), "<h1>original</h1>");
  assert.equal(JSON.parse(await readFile(resolve(dest, "user/library.v1.json"), "utf8")).revision, 2);
  const previous = (await readdir(resolve(dest, "recovery"))).find(name => name.startsWith("before-"));
  assert.equal(JSON.parse(await readFile(resolve(dest, "recovery", previous, "user/library.v1.json"), "utf8")).revision, 0);
  const invalid = resolve(dir, "invalid.tar.gz");
  execFileSync("python3", ["-c", "import io,sys,tarfile\nwith tarfile.open(sys.argv[1], 'w:gz') as f:\n i=tarfile.TarInfo('../escape'); i.size=3; f.addfile(i,io.BytesIO(b'bad'))", invalid]);
  assert.throws(() => run("restore", invalid, "--vault", dest), /outside its vault scope/);
  assert.equal(JSON.parse(await readFile(resolve(dest, "user/library.v1.json"), "utf8")).revision, 2);
  const invalidLibrary = resolve(dir, "invalid-library.tar.gz");
  await writeFile(resolve(vault, "user/library.v1.json"), JSON.stringify({ ...emptyLibrary(), favorites: ["../bad"] }));
  run("backup", invalidLibrary, "--vault", vault, "--scope", "library");
  assert.throws(() => run("restore", invalidLibrary, "--vault", dest), /Invalid or unsupported library data/);
  assert.equal(JSON.parse(await readFile(resolve(dest, "user/library.v1.json"), "utf8")).revision, 2);
  const truncated = resolve(dir, "truncated.tar.gz");
  const complete = await readFile(path);
  await writeFile(truncated, complete.subarray(0, 90));
  assert.throws(() => run("restore", truncated, "--vault", dest));
});
