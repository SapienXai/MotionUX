import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { directory } from "../v2/files.mjs";
import { command } from "../v2/process.mjs";
import { base } from "./workspace.mjs";

test("fixture verifier enforces macOS read/write and network scope or explicitly blocks the platform", async t => {
  const scratch = resolve(base, "scratch");
  await directory(scratch, true);
  const root = await mkdtemp(resolve(scratch, "sandbox-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = resolve(root, "inside"), logs = resolve(root, "logs");
  await directory(cwd, true);
  const outside = resolve(root, "private-sentinel.txt");
  await writeFile(outside, "fixture-owned");
  const probe = resolve(cwd, "probe.mjs");
  await writeFile(probe, `
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
assert.throws(() => readFileSync(${JSON.stringify(outside)}), { code: "EPERM" });
assert.throws(() => writeFileSync(${JSON.stringify(outside)}, "changed"), { code: "EPERM" });
const denied = await new Promise(resolve => {
  const s = createConnection(19, "127.0.0.1");
  s.on("error", error => resolve(error.code));
  s.on("connect", () => { s.destroy(); resolve("allowed"); });
});
assert.match(denied, /^(?:EPERM|EACCES)$/);
`);
  const run = () => command(probe, [], { cwd, logs, logName: "probe" });
  if (process.platform !== "darwin") {
    await assert.rejects(run(), { code: "environment-blocked" });
  } else {
    assert.equal((await run()).status, "passed");
  }
});
