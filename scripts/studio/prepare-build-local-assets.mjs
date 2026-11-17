import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assets from "./build-local-assets.json" with { type: "json" };
import { vault } from "./catalog.mjs";

const directory = resolve(vault, "build-local-assets");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(directory, { recursive: true, mode: 0o700 });
for (const { file, source, download, sha256 } of Object.values(assets).flat()) {
  const path = resolve(directory, file);
  const cached = await readFile(path).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (cached && digest(cached) === sha256) continue;
  const response = await fetch(download ?? source, { redirect: "error", signal: AbortSignal.timeout(12_000) });
  if (!response.ok || Number(response.headers.get("Content-Length")) > 2_000_000) throw new Error("Local asset unavailable: " + file);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > 2_000_000 || digest(bytes) !== sha256) throw new Error("Local asset pin mismatch: " + file);
  const pending = path + "." + process.pid;
  await writeFile(pending, bytes, { mode: 0o600, flag: "wx" });
  await rename(pending, path);
}
console.log("Verified " + Object.values(assets).flat().length + " local Build media pins.");
