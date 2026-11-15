import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const libraryLimit = 512 * 1024;
const maxCollections = 80;
const maxItems = 1000;
export const catalogID = /^(?=.{3,96}$)[a-z0-9]+-[a-z0-9][a-z0-9-]*$/;
const collectionID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export const emptyLibrary = () => ({ schemaVersion: 1, revision: 0, favorites: [], collections: [], details: {} });

export class LibraryError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (message, status = 400) => { throw new LibraryError(status, message); };
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
function text(value, max, min = 0) {
  if (typeof value !== "string" || value.length > max || value.trim().length < min) fail("A name, tag or note exceeds its allowed length.");
  return value.trim();
}
function items(values, re = catalogID, limit = maxItems) {
  if (!Array.isArray(values) || values.length > limit || values.some(value => typeof value !== "string" || !re.test(value))) {
    fail("The library contains an invalid item list.");
  }
  if (new Set(values).size !== values.length) fail("The library contains duplicate items.");
  return values.slice();
}
function detail(value) {
  if (!record(value) || !Array.isArray(value.tags) || value.tags.length > 12) fail("Invalid personal note or tags.");
  const tags = value.tags.map(tag => text(tag, 32, 1));
  if (new Set(tags.map(tag => tag.toLowerCase())).size !== tags.length) fail("Tags must be unique.");
  if (value.theme !== undefined && !["light", "dark"].includes(value.theme)) fail("Invalid preview theme.");
  return { note: text(value.note, 400), tags,
    ...(value.theme && { theme: value.theme }), ...(value.scene ? { scene: text(value.scene, 96, 1) } : {}) };
}
function uniqueNames(collections) {
  if (new Set(collections.map(entry => entry.name.toLowerCase())).size !== collections.length) fail("A collection already has that name.");
}
export function normalizeLibrary(value) {
  if (!record(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0
    || !record(value.details) || !Array.isArray(value.collections) || value.collections.length > maxCollections) {
    fail("Unsupported or malformed library document.");
  }
  const collections = value.collections.map(entry => {
    if (!record(entry) || typeof entry.id !== "string" || !collectionID.test(entry.id)) fail("Invalid collection ID.");
    return { id: entry.id, name: text(entry.name, 64, 1), items: items(entry.items) };
  });
  items(collections.map(entry => entry.id), collectionID, maxCollections);
  uniqueNames(collections);
  const keys = items(Object.keys(value.details));
  return { schemaVersion: 1, revision: value.revision, favorites: items(value.favorites), collections,
    details: Object.fromEntries(keys.map(key => [key, detail(value.details[key])])) };
}

const union = (a, b) => [...new Set([...a, ...b])];
function mergeLibrary(current, incoming) {
  const collections = structuredClone(current.collections);
  for (const entry of incoming.collections) {
    const target = collections.find(item => item.id === entry.id || item.name.toLowerCase() === entry.name.toLowerCase());
    if (target) target.items = union(target.items, entry.items);
    else collections.push(entry);
  }
  return { ...current, favorites: union(current.favorites, incoming.favorites), collections, details: { ...incoming.details, ...current.details } };
}

function update(current, command, catalog) {
  if (!record(command)) fail("Invalid library action.");
  const next = structuredClone(current);
  const source = command.source;
  const known = () => {
    if (typeof source !== "string" || !catalogID.test(source) || !catalog.has(source)) fail("That original is not in the local catalog.", 404);
  };
  const saved = () => typeof source === "string" && catalogID.test(source) &&
    (next.favorites.includes(source) || Object.hasOwn(next.details, source) || next.collections.some(entry => entry.items.includes(source)));
  const collection = next.collections.find(entry => entry.id === command.collection);
  switch (command.action) {
    case "favorite":
      if (typeof command.value !== "boolean") fail("Choose an explicit favorite state.");
      if (command.value) { known(); next.favorites = union(next.favorites, [source]); }
      else next.favorites = next.favorites.filter(id => id !== source);
      break;
    case "create":
      next.collections.push({ id: randomUUID(), name: text(command.name, 64, 1), items: [] });
      break;
    case "rename":
    case "delete":
      if (!collection) fail("That collection could not be found.", 404);
      if (command.action === "rename") collection.name = text(command.name, 64, 1);
      else next.collections = next.collections.filter(entry => entry !== collection);
      break;
    case "membership": {
      const selected = items(command.collections, collectionID, maxCollections);
      if (selected.some(id => !next.collections.some(entry => entry.id === id))) fail("A selected collection no longer exists.", 404);
      if (next.collections.some(entry => selected.includes(entry.id) && !entry.items.includes(source))) known();
      else if (!saved()) known();
      for (const entry of next.collections) entry.items = selected.includes(entry.id)
        ? union(entry.items, [source]) : entry.items.filter(id => id !== source);
      break;
    }
    case "personal": {
      if (!saved()) known();
      const value = detail(command.value);
      const spec = catalog.get(source);
      if (command.keepPreferences === true) {
        const old = current.details[source];
        if (old?.theme) value.theme = old.theme;
        else delete value.theme;
        if (old?.scene) value.scene = old.scene;
        else delete value.scene;
      } else if ((value.theme && spec?.sourceKind !== "react") || (value.scene && !spec?.scenes.includes(value.scene))) {
        fail("That scene or theme does not exist for this source.");
      }
      if (value.note || value.tags.length || value.scene || value.theme) Object.defineProperty(next.details, source, { value, enumerable: true, configurable: true });
      else delete next.details[source];
      break;
    }
    case "import": {
      if (!["merge", "replace"].includes(command.mode)) fail("Choose merge or replace.");
      const incoming = normalizeLibrary(command.library);
      return command.mode === "merge" ? mergeLibrary(current, incoming) : incoming;
    }
    default:
      fail("Unknown library action.");
  }
  return next;
}

export async function readLibrary(file) {
  try {
    const info = await lstat(file);
    if (!info.isFile() || info.size > libraryLimit || await realpath(file) !== file) throw new Error("Invalid library file.");
    return normalizeLibrary(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return emptyLibrary();
    throw new LibraryError(503, "The saved library cannot be read. Run npm run studio:doctor or restore a backup. Your file was kept.");
  }
}

export async function atomicWrite(file, contents) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  if (await realpath(dirname(file)) !== dirname(file)) throw new Error("Unsafe storage directory.");
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    const handle = await open(temporary, "wx", 0o600);
    try { await handle.writeFile(contents); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}

export function createLibraryStore(directory, catalog) {
  const file = resolve(directory, "library.v1.json");
  let queue = Promise.resolve();
  return {
    read: () => readLibrary(file),
    change(command) {
      const task = queue.then(async () => {
        const current = await readLibrary(file);
        if (command?.revision !== current.revision) return { conflict: true, library: current };
        const library = normalizeLibrary({ ...update(current, command, catalog), revision: current.revision + 1 });
        const data = JSON.stringify(library, null, 2) + "\n";
        if (Buffer.byteLength(data) > libraryLimit - 4096) fail("The library has reached its storage limit.", 413);
        if (command.action === "import") {
          const history = resolve(directory, "history", "library-r" + current.revision + "-" + randomUUID() + ".json");
          await atomicWrite(history, JSON.stringify(current, null, 2) + "\n");
        }
        await atomicWrite(file, data);
        return { library };
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}

export function createLibraryAPI(store, origin) {
  const token = randomBytes(32).toString("hex");
  function isToken(value) {
    return typeof value === "string" && value.length === token.length &&
      /^[a-f0-9]+$/.test(value) && timingSafeEqual(Buffer.from(token), Buffer.from(value));
  }
  return async function libraryAPI(request, response) {
    const send = (code, body) => response.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify(body));
    if (request.headers["sec-fetch-site"] !== "same-origin" || request.headers["sec-fetch-dest"] !== "empty") {
      return send(403, { message: "Open the library from the local Studio." });
    }
    try {
      if (request.method === "GET") return send(200, { library: await store.read(), token });
      if (request.method !== "POST") return send(405, { message: "Unsupported request." });
      if (request.headers.origin !== origin || !isToken(request.headers["x-motionux-token"])) {
        return send(403, { message: "The Studio session expired. Reload the library and retry." });
      }
      if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "")) {
        return send(415, { message: "Use an application/json request." });
      }
      if (Number(request.headers["content-length"]) > libraryLimit) return send(413, { message: "The library file is too large." });
      const chunks = [];
      let size = 0;
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > libraryLimit) { request.resume(); return send(413, { message: "The library file is too large." }); }
        chunks.push(chunk);
      }
      let command;
      try { command = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { fail("The library file contains invalid JSON."); }
      const result = await store.change(command);
      return send(result.conflict ? 409 : 200, result);
    } catch (error) {
      return send(error.status ?? 503, { message: error instanceof LibraryError ? error.message : "The library could not be saved. Your previous data is safe." });
    }
  };
}
