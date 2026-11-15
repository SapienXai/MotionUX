import { realpath, lstat } from "node:fs/promises";
import { resolve, sep } from "node:path";

export function invalidPath(message = "File unavailable", code = "ENOENT") {
  return Object.assign(new Error(message), { code });
}

export function safeRelative(path) {
  return typeof path === "string" && path.length <= 400 && !/[\\\u0000-\u001f\u007f]/.test(path) &&
    path.split("/").every(part => part && part !== "." && part !== ".." && !part.startsWith("."));
}

export function requestURL(target, origin) {
  if (typeof target !== "string" || target.length > 8192) throw invalidPath("Request target too large", "TOO_LARGE");
  if (/%(?![0-9a-f]{2})/i.test(target)) throw invalidPath("Malformed URL", "INVALID_URL");
  const [path] = target.split("?");
  let decoded;
  try { decoded = decodeURIComponent(path); }
  catch { throw invalidPath("Malformed URL", "INVALID_URL"); }
  if (!path.startsWith("/") || /%(?:2f|5c)/i.test(path) || !(
    decoded === "/" || safeRelative(decoded.slice(1).replace(/\/$/, ""))
  )) throw invalidPath("Invalid URL path", "INVALID_URL");
  const url = new URL(target, origin);
  if (url.origin !== origin) throw invalidPath("Invalid origin", "INVALID_URL");
  return { url, path: decoded };
}

export async function safeFile(root, relative, boundary = root) {
  if (!safeRelative(relative)) throw invalidPath();
  const location = resolve(root, relative);
  const file = await realpath(location);
  const base = await realpath(boundary);
  if (!file.startsWith(base + sep) || file !== location || !(await lstat(file)).isFile()) throw invalidPath();
  return file;
}
