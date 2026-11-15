import { createRequire } from "node:module";
import { realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { pipeline } from "node:stream/promises";
import { cache, fixtures } from "./workspace.mjs";
import { directory, readJSON, stop } from "../v2/files.mjs";

// Explicit provisioning from the local npm cache. The fixture runner uses the
// shared, offline cache and never calls this helper automatically.
try {
  const npm = await realpath(resolve(dirname(process.execPath), "npm"));
  const cacache = createRequire(npm)("cacache");
  const from = resolve(homedir(), ".npm/_cacache");
  const to = resolve(cache, "_cacache");
  await directory(to, true);
  const records = new Map();
  for (const fixture of ["next", "vite"]) {
    for (const name of [fixture + "/package-lock.json", "adapters/" + fixture + ".lock.json"]) {
      const lock = await readJSON(resolve(fixtures, name));
      for (const pkg of Object.values(lock.packages)) {
        if (!pkg.integrity || pkg.os?.length && !pkg.os.includes(process.platform) || pkg.cpu?.length && !pkg.cpu.includes(process.arch)) continue;
        if (!/^https:\/\/registry\.npmjs\.org\/[a-z\d@%_./-]+\.tgz$/i.test(pkg.resolved) ||
            !/^sha(?:512|1)-[a-z\d+/]+={0,2}$/i.test(pkg.integrity)) stop("incompatible", "A fixture lock contains an unsupported package.");
        records.set(pkg.integrity, pkg.resolved);
      }
    }
  }
  let added = 0;
  const missing = [];
  for (const [integrity, url] of records) {
    if (await cacache.get.hasContent(to, integrity)) continue;
    if (!await cacache.get.hasContent(from, integrity)) { missing.push(url); continue; }
    await pipeline(cacache.get.stream.byDigest(from, integrity), cacache.put.stream(to, "motionux-v3:" + url, { integrity }));
    added++;
  }
  process.stdout.write(JSON.stringify({ required: records.size, added, missing }) + "\n");
  if (missing.length) process.exitCode = 1;
} catch {
  process.stderr.write("Could not prime the shared offline cache from the reviewed locks.\n");
  process.exitCode = 1;
}
