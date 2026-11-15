import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const files = await readdir("dist", { recursive: true, withFileTypes: true });
for (const entry of files.filter(entry => entry.isFile())) {
  const name = join(entry.parentPath, entry.name);
  if (/\.motionux-v9|\/v9\/live\/|\/originals\//.test(name)) throw new Error("Private output in public dist: " + name);
  if (!/\.(?:js|css|html|json)$/.test(name)) continue;
  const content = await readFile(name, "utf8");
  if (/Motion Studies design tokens|data-original-sources="local"|motionux-private-designbookmark-consumer/.test(content)) {
    throw new Error("Private source content in public dist: " + name);
  }
}
console.log("Public build contains Studio wiring and provenance without private specimen payloads.");
