import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  isSeedImage,
  mediaId,
  projectId,
  seedImages,
  type Document,
} from "@motionux/build-core";
import { BuildError, fingerprint } from "@motionux/build-core/store";

const sizes = [360, 720] as const;
const maxBytes = 4 * 1024 * 1024;
const maxAssets = 24;
const uploads = new Set<string>();
type Size = (typeof sizes)[number];
export type MediaRecord = {
  id: string;
  name: string;
  width: number;
  height: number;
  bytes: number;
  rights: "uploader-attested" | "generated-demo";
};
type MediaIndex = MediaRecord & { hashes: Record<Size, string> };
function record({
  id,
  name,
  width,
  height,
  bytes,
  rights,
}: MediaIndex): MediaRecord {
  return { id, name, width, height, bytes, rights };
}
const idPattern = /^[a-f0-9]{64}$/;
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";

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
    throw new BuildError(403, "The media directory failed its identity check.");
  return path;
}
async function privateFile(path: string, cap: number) {
  const handle = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = await handle.stat();
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      (before.mode & 0o777) !== 0o600 ||
      before.size > cap
    )
      throw new BuildError(403, "Unsafe local image file.");
    const buffer = await handle.readFile();
    if (buffer.length !== before.size)
      throw new BuildError(409, "Media changed while reading.");
    return buffer;
  } finally {
    await handle.close();
  }
}
async function mediaRoot(vault: string, id: string, create = false) {
  if (!projectId.safeParse(id).success)
    throw new BuildError(404, "Unknown project.");
  await directory(vault);
  await directory(resolve(vault, "build"));
  const root = await directory(resolve(vault, "build/media"), create);
  return directory(resolve(root, id), create);
}
async function indexFor(folder: string, id: string): Promise<MediaIndex> {
  await directory(folder);
  const index = JSON.parse(
    (await privateFile(resolve(folder, "image.json"), 2048)).toString("utf8"),
  );
  if (
    index.id !== id ||
    index.rights !== "uploader-attested" ||
    !idPattern.test(index.hashes?.[360]) ||
    index.hashes?.[720] !== id ||
    typeof index.name !== "string" ||
    index.name.length > 100 ||
    ![index.width, index.height, index.bytes].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    throw new BuildError(409, "Media metadata failed verification.");
  return index;
}
async function readUpload(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new BuildError(400, "Choose an image.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      request.signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes)
        throw new BuildError(413, "Images must be under 4 MiB.");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
const formats = new Map([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
export async function ingestMedia(
  vault: string,
  project: string,
  request: Request,
): Promise<MediaRecord> {
  const format = formats.get(request.headers.get("content-type") ?? "");
  if (!format) throw new BuildError(415, "Use a JPEG, PNG or WebP image.");
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new BuildError(413, "Images must be under 4 MiB.");
  if (request.headers.get("x-motionux-image-rights") !== "confirmed")
    throw new BuildError(
      422,
      "Confirm you can include this image in an export.",
    );
  let name: string;
  try {
    name = decodeURIComponent(
      request.headers.get("x-motionux-image-name") ?? "",
    ).normalize("NFC");
  } catch {
    throw new BuildError(422, "Use a valid filename.");
  }
  if (
    !name.trim() ||
    name.length > 100 ||
    /[\/\\\u0000-\u001f\u007f]/u.test(name)
  )
    throw new BuildError(422, "Use a filename from one to 100 characters.");
  if (uploads.size)
    throw new BuildError(409, "Wait for the current image import to finish.");
  const slot = vault + "/" + project;
  uploads.add(slot);
  let stage: string | undefined;
  try {
    const input = await readUpload(request);
    const { default: sharp } = await import("sharp");
    let original: { width: number; height: number };
    let renditions: Buffer[];
    try {
      const decoder = sharp(input, {
        limitInputPixels: 12_000_000,
        failOn: "warning",
        sequentialRead: true,
      });
      const data = await decoder.metadata();
      if (
        data.format !== format ||
        !data.width ||
        !data.height ||
        (data.pages ?? 1) !== 1 ||
        Math.max(data.width, data.height) > 5000
      )
        throw new Error("Unsupported image");
      original = { width: data.width, height: data.height };
      renditions = [];
      for (const size of sizes)
        renditions.push(
          await decoder
            .clone()
            .autoOrient()
            .resize(size, size, { fit: "cover" })
            .webp({ quality: 84 })
            .toBuffer(),
        );
    } catch {
      throw new BuildError(
        422,
        "This image is corrupt, animated or exceeds the dimension limit.",
      );
    }
    const [small, large] = renditions;
    const id = fingerprint(large);
    const root = await mediaRoot(vault, project, true);
    const destination = resolve(root, id);
    const existing = await indexFor(destination, id).catch((error) => {
      if (!missing(error)) throw error;
    });
    if (existing) return record(existing);
    if (
      (await readdir(root)).filter((item) => idPattern.test(item)).length >=
      maxAssets
    )
      throw new BuildError(413, "This project has reached its 24-image limit.");
    stage = await mkdtemp(resolve(root, ".upload-"));
    const index: MediaIndex = {
      id,
      name,
      ...original,
      bytes: small.length + large.length,
      rights: "uploader-attested",
      hashes: { 360: fingerprint(small), 720: id },
    };
    const options = { flag: "wx", mode: 0o600, flush: true };
    await writeFile(resolve(stage, "360.webp"), small, options);
    await writeFile(resolve(stage, "720.webp"), large, options);
    await writeFile(
      resolve(stage, "image.json"),
      JSON.stringify(index),
      options,
    );
    request.signal.throwIfAborted();
    await directory(root);
    await rename(stage, destination);
    stage = undefined;
    return record(index);
  } finally {
    uploads.delete(slot);
    if (stage) await rm(stage, { recursive: true, force: true });
  }
}

export async function listMedia(
  vault: string,
  project: string,
  seeds: boolean,
): Promise<MediaRecord[]> {
  const root = await mediaRoot(vault, project).catch((error) => {
    if (!missing(error)) throw error;
  });
  const items: MediaRecord[] = seeds
    ? Object.entries(seedImages).map(([id, name]) => ({
        id,
        name,
        width: 720,
        height: 720,
        bytes: 0,
        rights: "generated-demo",
      }))
    : [];
  if (!root) return items;
  for (const id of (await readdir(root)).sort())
    if (idPattern.test(id)) {
      items.push(record(await indexFor(resolve(root, id), id)));
    }
  return items;
}
export async function mediaBytes(
  repo: string,
  vault: string | undefined,
  project: string,
  id: string,
  size: Size,
) {
  if (!mediaId.safeParse(id).success || !sizes.includes(size))
    throw new BuildError(404, "Unknown image.");
  if (isSeedImage(id)) {
    const file = await open(
      resolve(
        repo,
        "platform/templates/hotel-marketing/media",
        id + "-" + size + ".webp",
      ),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      return await file.readFile();
    } finally {
      await file.close();
    }
  }
  if (!vault)
    throw new BuildError(422, "Managed media is unavailable for this export.");
  try {
    const root = await mediaRoot(vault, project);
    const folder = resolve(root, id);
    const index = await indexFor(folder, id);
    const bytes = await privateFile(resolve(folder, size + ".webp"), maxBytes);
    if (fingerprint(bytes) !== index.hashes[size])
      throw new BuildError(409, "The image hash changed.");
    return bytes;
  } catch (error) {
    if (missing(error))
      throw new BuildError(404, "This image does not belong to the project.");
    throw error;
  }
}
export async function verifyMediaOwnership(
  repo: string,
  vault: string,
  project: string,
  document: Document,
) {
  for (const id of document.assets) {
    if (isSeedImage(id) && document.template !== "hotel-marketing")
      throw new BuildError(
        422,
        "Demo media belongs to the marketing template.",
      );
    await mediaBytes(repo, vault, project, id, 720);
  }
}

const maxRendition = 1024 * 1024;
export const maxMediaBackup = 65 * 1024 * 1024;
type MediaBundle = { index: MediaIndex; small: Buffer; large: Buffer };

async function readBundle(root: string, id: string): Promise<MediaBundle> {
  const folder = resolve(root, id);
  const index = await indexFor(folder, id);
  const small = await privateFile(resolve(folder, "360.webp"), maxRendition);
  const large = await privateFile(resolve(folder, "720.webp"), maxRendition);
  if (
    fingerprint(small) !== index.hashes[360] ||
    fingerprint(large) !== index.hashes[720] ||
    small.length + large.length !== index.bytes
  )
    throw new BuildError(
      409,
      "The saved image bytes do not match their hashes.",
    );
  return { index, small, large };
}

async function saveBundle(
  folder: string,
  { index, small, large }: MediaBundle,
) {
  const options = { flag: "wx", mode: 0o600, flush: true };
  await mkdir(folder, { mode: 0o700 });
  await writeFile(resolve(folder, "360.webp"), small, options);
  await writeFile(resolve(folder, "720.webp"), large, options);
  await writeFile(
    resolve(folder, "image.json"),
    JSON.stringify(index),
    options,
  );
}

export async function backupMedia(vault: string, project: string) {
  const root = await mediaRoot(vault, project).catch((error) => {
    if (!missing(error)) throw error;
    return null;
  });
  if (!root) return { version: 1, project, assets: [] };
  const ids = (await readdir(root)).filter((id) => idPattern.test(id)).sort();
  if (ids.length > maxAssets)
    throw new BuildError(409, "Media quota exceeded.");
  const assets = [];
  for (const id of ids) {
    const { index, small, large } = await readBundle(root, id);
    assets.push({
      index,
      small: small.toString("base64"),
      large: large.toString("base64"),
    });
  }
  return { version: 1, project, assets };
}

function decodeRendition(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(maxRendition / 3) * 4
  )
    throw new BuildError(422, "Invalid backup image length.");
  const decoded = Buffer.from(value, "base64");
  if (
    !decoded.length ||
    decoded.length > maxRendition ||
    decoded.toString("base64") !== value
  )
    throw new BuildError(422, "Invalid backup image encoding.");
  return decoded;
}

async function checkedBundle(value: unknown): Promise<MediaBundle> {
  if (typeof value !== "object" || value === null)
    throw new BuildError(422, "Invalid backup image.");
  const {
    index,
    small: smallText,
    large: largeText,
  } = value as Partial<Record<"index" | "small" | "large", unknown>>;
  if (typeof index !== "object" || index === null)
    throw new BuildError(422, "Invalid backup image metadata.");
  const { id, name, width, height, bytes, rights, hashes } =
    index as Partial<MediaIndex>;
  const small = decodeRendition(smallText);
  const large = decodeRendition(largeText);
  if (
    typeof id !== "string" ||
    !idPattern.test(id) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100 ||
    /[\/\\\u0000-\u001f\u007f]/u.test(name) ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    ![width, height].every(
      (size) => Number.isSafeInteger(size) && size > 0 && size <= 5000,
    ) ||
    width * height > 12_000_000 ||
    rights !== "uploader-attested" ||
    bytes !== small.length + large.length ||
    hashes?.[720] !== id ||
    fingerprint(large) !== id ||
    hashes[360] !== fingerprint(small)
  ) {
    throw new BuildError(
      422,
      "Backup media integrity or rights verification failed.",
    );
  }
  try {
    const { default: sharp } = await import("sharp");
    for (const [size, input] of [
      [360, small],
      [720, large],
    ] as const) {
      const image = sharp(input, {
        limitInputPixels: size * size,
        failOn: "warning",
      });
      const meta = await image.metadata();
      if (
        meta.format !== "webp" ||
        meta.width !== size ||
        meta.height !== size ||
        (meta.pages ?? 1) !== 1 ||
        meta.exif ||
        meta.icc ||
        meta.iptc ||
        meta.xmp
      )
        throw new Error();
      await image.stats();
    }
  } catch {
    throw new BuildError(422, "The backup contains an invalid WebP rendition.");
  }
  return {
    index: {
      id,
      name,
      width,
      height,
      bytes,
      rights,
      hashes: { 360: hashes[360], 720: id },
    },
    small,
    large,
  };
}

export async function restoreMedia(
  vault: string,
  project: string,
  value: unknown,
  signal: AbortSignal,
) {
  const archive = value as {
    version?: unknown;
    project?: unknown;
    assets?: unknown;
  };
  if (
    !archive ||
    archive.version !== 1 ||
    archive.project !== project ||
    !Array.isArray(archive.assets) ||
    archive.assets.length > maxAssets
  )
    throw new BuildError(
      422,
      "Choose a version 1 media backup for this project.",
    );
  const root = await mediaRoot(vault, project, true);
  const known = new Set(
    (await readdir(root)).filter((id) => idPattern.test(id)),
  );
  const stage = await mkdtemp(resolve(root, ".restore-"));
  const incoming = new Set<string>();
  const installed: string[] = [];
  try {
    for (const value of archive.assets) {
      signal.throwIfAborted();
      const bundle = await checkedBundle(value);
      const { id } = bundle.index;
      if (incoming.has(id))
        throw new BuildError(422, "Duplicate backup image.");
      incoming.add(id);
      if (known.has(id)) {
        const current = await readBundle(root, id);
        if (current.index.hashes[360] !== bundle.index.hashes[360])
          throw new BuildError(
            409,
            "The backup conflicts with an existing rendition.",
          );
      } else {
        if (known.size >= maxAssets)
          throw new BuildError(
            413,
            "This project has reached its 24-image limit.",
          );
        await saveBundle(resolve(stage, id), bundle);
        known.add(id);
      }
    }
    signal.throwIfAborted();
    await directory(root);
    for (const id of await readdir(stage)) {
      await rename(resolve(stage, id), resolve(root, id));
      installed.push(id);
    }
    return {
      restored: installed.length,
      existing: incoming.size - installed.length,
    };
  } catch (error) {
    for (const id of installed)
      await rename(resolve(root, id), resolve(stage, id));
    throw error;
  } finally {
    await rm(stage, { force: true, recursive: true });
  }
}

export async function purgeMedia(
  vault: string,
  project: string,
  id: string,
  documents: Document[],
) {
  if (!idPattern.test(id))
    throw new BuildError(404, "Only uploaded images can be deleted.");
  if (documents.some(({ assets }) => assets.includes(id)))
    throw new BuildError(
      409,
      "This image is held by the saved project, its previous revision or a recovery draft.",
    );
  const root = await mediaRoot(vault, project);
  await readBundle(root, id).catch((error) => {
    if (missing(error))
      throw new BuildError(404, "This image no longer exists.");
    throw error;
  });
  const target = resolve(root, id);
  if (
    (await readdir(target)).sort().join(",") !== "360.webp,720.webp,image.json"
  )
    throw new BuildError(409, "The image folder contains unexpected files.");
  // Hide the asset from subsequent reads before removing its verified files.
  const stage = await mkdtemp(resolve(root, ".purge-"));
  try {
    await rename(target, resolve(stage, id));
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
  await rm(stage, { recursive: true, force: true });
  return { deleted: id };
}
