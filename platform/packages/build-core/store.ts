import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import {
  newProject,
  draftSchema,
  projectId,
  projectSchema,
  type BuildProject,
  type CreatorDraft,
  type Document,
} from "./model.ts";

export const maxDocument = 192 * 1024;
export class BuildError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";
const randomId = () => randomBytes(16).toString("hex");

async function directory(path: string, create = false) {
  if (create)
    await mkdir(path, { mode: 0o700 }).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
  const stat = await lstat(path);
  if (
    !stat.isDirectory() ||
    (stat.mode & 0o777) !== 0o700 ||
    (await realpath(path)) !== path
  )
    throw new BuildError(
      403,
      "Managed directory ownership or identity failed.",
    );
  return stat.ino;
}
async function read(path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const handle = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const stat = await handle.stat();
      if (
        !stat.isFile() ||
        stat.nlink > 1 ||
        (stat.mode & 0o777) !== 0o600 ||
        stat.size > maxDocument
      )
        throw new BuildError(403, "Unsafe managed document.");
      // A concurrent atomic rename can unlink an opened regular file.
      // Close that descriptor and validate the current path again.
      if (stat.nlink === 0) continue;
      return await handle.readFile("utf8");
    } finally {
      await handle.close();
    }
  }
  throw new BuildError(409, "The managed document changed while it was being read.");
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}
export const fingerprint = (contents: string | Uint8Array) =>
  createHash("sha256").update(contents).digest("hex");

async function atomic(
  root: string,
  name: "project.json" | "previous.json" | "draft.json",
  encoded: string,
) {
  const target = resolve(root, name);
  const inode = await directory(root);
  const existing = await lstat(target).catch((error) => {
    if (!missing(error)) throw error;
    return null;
  });
  if (
    existing &&
    (!existing.isFile() ||
      existing.nlink !== 1 ||
      (existing.mode & 0o777) !== 0o600)
  )
    throw new BuildError(403, "Unsafe replacement target.");
  const temp = resolve(root, "." + randomId() + ".tmp");
  const handle = await open(temp, "wx", 0o600);
  try {
    await handle.writeFile(encoded);
    await handle.sync();
    await handle.close();
    if ((await directory(root)) !== inode)
      throw new BuildError(409, "Project directory changed.");
    const now = await lstat(target).catch((error) => {
      if (!missing(error)) throw error;
      return null;
    });
    if (
      now?.ino !== existing?.ino ||
      (now && (now.nlink !== 1 || !now.isFile()))
    )
      throw new BuildError(409, "Project file changed.");
    await rename(temp, target);
    const parent = await open(
      root,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    try {
      await parent.sync();
    } catch (error) {
      if (
        !["EINVAL", "ENOTSUP"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        throw error;
    } finally {
      await parent.close();
    }
  } finally {
    await handle.close();
    await unlink(temp).catch((error) => {
      if (!missing(error)) throw error;
    });
  }
}

export function createStore(vault: string) {
  const build = resolve(vault, "build");
  const projects = resolve(build, "projects");
  async function roots() {
    await directory(vault, true);
    await directory(build, true);
    await directory(projects, true);
  }
  async function rootFor(id: string) {
    if (!projectId.safeParse(id).success)
      throw new BuildError(404, "Unknown project.");
    await roots();
    const root = resolve(projects, id);
    await directory(root).catch((error) => {
      if (missing(error)) throw new BuildError(404, "Unknown project.");
      throw error;
    });
    return root;
  }
  async function load(
    root: string,
    id: string,
    previous = false,
  ): Promise<BuildProject> {
    let encoded: string;
    try {
      encoded = await read(
        resolve(root, previous ? "previous.json" : "project.json"),
      );
    } catch (error) {
      if (missing(error))
        throw new BuildError(404, "Project document does not exist.");
      if ((error as NodeJS.ErrnoException).code === "ELOOP")
        throw new BuildError(403, "Document links are forbidden.");
      throw error;
    }
    try {
      const parsed = projectSchema.parse(JSON.parse(encoded));
      if (parsed.id !== id) throw new Error();
      return parsed;
    } catch {
      throw new BuildError(
        422,
        "Project document is corrupt or uses an unsupported schema.",
      );
    }
  }
  async function claim(path: string) {
    const handle = await open(path, "wx", 0o600).catch((error) => {
      if (error.code === "EEXIST") return null;
      throw error;
    });
    if (!handle) return null;
    try {
      await handle.writeFile(canonical({ pid: process.pid, key: randomId() }));
      await handle.sync();
      return handle;
    } catch (error) {
      await handle.close();
      await unlink(path);
      throw error;
    }
  }
  async function loadDraft(root: string): Promise<CreatorDraft | null> {
    try {
      return draftSchema.parse(JSON.parse(await read(resolve(root, "draft.json"))));
    } catch (error) {
      if (missing(error)) return null;
      if (error instanceof BuildError) throw error;
      throw new BuildError(422, "The recovery draft cannot be read safely.");
    }
  }
  function ownerAlive(value: string) {
    try {
      const owner = JSON.parse(value);
      if (
        !Number.isSafeInteger(owner.pid) ||
        owner.pid < 2 ||
        !projectId.safeParse(owner.key).success
      )
        return true;
      process.kill(owner.pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== "ESRCH";
    }
  }
  async function locked<T>(root: string, task: () => Promise<T>) {
    const path = resolve(root, ".save-lock");
    let lock = await claim(path);
    if (!lock) {
      const prior = await read(path).catch(() => "");
      if (ownerAlive(prior))
        throw new BuildError(409, "Project is already being saved.");
      const recovery = resolve(root, ".save-recovery");
      const ticket = await claim(recovery);
      if (!ticket)
        throw new BuildError(409, "Project save recovery is already running.");
      try {
        if ((await read(path)) !== prior || ownerAlive(prior))
          throw new BuildError(409, "Project save owner changed.");
        await unlink(path);
        lock = await claim(path);
      } finally {
        await ticket.close();
        await unlink(recovery);
      }
    }
    if (!lock) throw new BuildError(409, "Project is already being saved.");
    try {
      return await task();
    } finally {
      await lock.close();
      await unlink(path);
    }
  }
  return {
    async create(document?: Document, blueprint?: BuildProject["blueprint"], reservedId?: string) {
      await roots();
      return locked(projects, async () => {
        const ids = await readdir(projects);
        if (ids.filter((id) => projectId.safeParse(id).success).length >= 24)
          throw new BuildError(
            409,
            "The local vault already holds 24 projects.",
          );
        const id = reservedId ? projectId.parse(reservedId) : randomId();
        const project = newProject(id, document, blueprint);
        const root = resolve(projects, id);
        await mkdir(root, { mode: 0o700 });
        await atomic(root, "project.json", canonical(project));
        return project;
      });
    },
    async list() {
      await roots();
      const ids = (await readdir(projects))
        .filter((id) => projectId.safeParse(id).success)
        .sort();
      return Promise.all(
        ids.slice(0, 24).map(async (id) => {
          try {
            const root = await rootFor(id);
            const value = await load(root, id);
            const updatedAt = await lstat(resolve(root, "project.json")).then((stat) => stat.mtimeMs, () => undefined);
            return {
              id,
              name: value.document.name,
              updatedAt,
              revision: value.revision,
              pages: value.document.pages.length,
              ...(value.document.codeProject && {
                codeSources: value.document.codeProject.sources.map(({ id }) => id),
              }),
              error: false,
            };
          } catch {
            return { id, name: "Recovery needed", revision: null, error: true };
          }
        }),
      );
    },
    async open(id: string) {
      return load(await rootFor(id), id);
    },
    async openPrevious(id: string) {
      const root = await rootFor(id);
      return locked(root, () => load(root, id, true));
    },
    async openDraft(id: string) {
      return loadDraft(await rootFor(id));
    },
    async saveDraft(id: string, body: unknown, verify: (document: Document) => Promise<void>) {
      const parsed = draftSchema.safeParse(body);
      if (!parsed.success) throw new BuildError(422, "Invalid recovery draft.");
      const next = parsed.data;
      const encoded = canonical(next);
      if (Buffer.byteLength(encoded) > maxDocument) throw new BuildError(413, "Recovery draft is too large.");
      const root = await rootFor(id);
      return locked(root, async () => {
        const current = await load(root, id);
        if (next.baseRevision !== current.revision)
          throw new BuildError(409, "The draft belongs to a different saved revision.");
        const previous = await loadDraft(root);
        if (previous && previous.updatedAt > next.updatedAt)
          throw new BuildError(409, "A newer recovery draft already exists.");
        await verify(next.document);
        await atomic(root, "draft.json", encoded);
        return next;
      });
    },
    async clearDraft(id: string, updatedAt: number) {
      const root = await rootFor(id);
      return locked(root, async () => {
        const draft = await loadDraft(root);
        if (!draft) return;
        if (draft.updatedAt !== updatedAt)
          throw new BuildError(409, "The recovery draft changed. Reopen the project.");
        await unlink(resolve(root, "draft.json"));
      });
    },
    async withProjectLock<T>(id: string, action: (project: BuildProject) => Promise<T>) {
      const root = await rootFor(id);
      return locked(root, async () => action(await load(root, id)));
    },
    async withMediaReferences<T>(id: string, action: (documents: Document[]) => Promise<T>) {
      const root = await rootFor(id);
      return locked(root, async () => {
        const current = await load(root, id);
        const previous = await load(root, id, true).catch((error) => {
          if (error instanceof BuildError && error.status === 404) return null;
          throw error;
        });
        const draft = await loadDraft(root);
        return action([current.document, ...(previous ? [previous.document] : []), ...(draft ? [draft.document] : [])]);
      });
    },
    async save(id: string, body: unknown, verify?: (document: Document) => Promise<void>) {
      const result = projectSchema.safeParse(body);
      if (!result.success || result.data.id !== id)
        throw new BuildError(
          422,
          "Invalid project document. Verify routes, block count and field values.",
        );
      const root = await rootFor(id);
      return locked(root, async () => {
        const current = await load(root, id);
        if (result.data.revision !== current.revision)
          throw new BuildError(
            409,
            "A newer revision exists. Reopen the project before saving.",
          );
        const next = projectSchema.parse({
          schemaVersion: 2,
          id: current.id,
          document: result.data.document,
          ...(current.blueprint ? { blueprint: current.blueprint } : {}),
          revision: current.revision + 1,
        });
        const encoded = canonical(next);
        if (Buffer.byteLength(encoded) > maxDocument)
          throw new BuildError(413, "Project is too large.");
        await verify?.(next.document);
        const draft = await loadDraft(root).catch(() => null);
        await atomic(root, "previous.json", await read(resolve(root, "project.json")));
        await atomic(root, "project.json", encoded);
        if (draft && canonical(draft.document) === canonical(next.document))
          await unlink(resolve(root, "draft.json")).catch(() => {});
        return next;
      });
    },
    async restore(id: string) {
      const root = await rootFor(id);
      return locked(root, async () => {
        const previous = await load(root, id, true);
        const current = await load(root, id).catch((error) => {
          if (error.status === 422) return null;
          throw error;
        });
        if (current)
          throw new BuildError(
            409,
            "Recovery is available for an invalid document.",
          );
        const next = projectSchema.parse({
          ...previous,
          revision: previous.revision + 2,
        });
        await atomic(root, "project.json", canonical(next));
        return next;
      });
    },
  };
}
