import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  approvalKey,
  createIntegrationLab,
} from "../apps/preview-host/integration.ts";
import {
  createStore,
  canonical,
  fingerprint,
} from "../packages/build-core/store.ts";
import { manualDocument } from "../packages/build-core/model.ts";

const repo = resolve(import.meta.dirname, "../..");
const base = resolve(repo, ".motionux-v9");
const signer = generateKeyPairSync("ed25519");
const key = approvalKey(
  signer.publicKey.export({ format: "pem", type: "spki" }),
);
const signature = (value, privateKey = signer.privateKey) =>
  sign(null, Buffer.from(value), privateKey).toString("base64url");

async function fixture(context, check, options = {}, trustedKey = key) {
  await mkdir(base, { mode: 0o700, recursive: true });
  const vault = await mkdtemp(resolve(base, "integration-test-"));
  context.after(() => rm(vault, { recursive: true, force: true }));
  const store = createStore(vault);
  const project = await store.create(manualDocument("crm-dashboard"));
  const lab = createIntegrationLab(repo, vault, trustedKey, check, options);
  const root = resolve(vault, "build/integrations");
  const raw = resolve(vault, "build/projects", project.id, "project.json");
  return { project, lab, root, raw, open: () => store.open(project.id) };
}

function proof(value, _tree, route) {
  return { route, revision: value.revision, durationMs: 1, viewports: [] };
}

test("B7 pins the exact revision, source, scope and one-time host approval", async (t) => {
  const calls = [];
  const { lab, project, open, root, raw } = await fixture(
    t,
    (value, tree, route, title, phase) => {
      calls.push({
        phase,
        revision: value.revision,
        packageLock: fingerprint(tree["package-lock.json"]),
      });
      assert.equal(
        String(tree["runtime/project.ts"]).includes(title),
        phase === "integrated",
      );
      return proof(value, tree, route);
    },
  );
  const saved = await readFile(raw);
  await assert.rejects(lab.prepare(project, "https://example.com"), {
    status: 422,
  });
  const review = await lab.prepare(project, "/contacts");
  const id = review.challenge.id;
  assert.deepEqual(
    review.challenge.files.map(({ path }) => path),
    ["motionux-manifest.json", "runtime/project.ts"],
  );
  assert.equal(review.digest, fingerprint(review.payload));
  assert.equal(
    review.challenge.project.documentDigest,
    fingerprint(canonical(project.document)),
  );
  assert.equal(review.challenge.target.root, resolve(root, id, "project"));
  for (const untrusted of [
    "approved",
    signature(review.payload, generateKeyPairSync("ed25519").privateKey),
    signature(review.payload.replace("/contacts", "/pipeline")),
    signature(
      review.payload.replace(review.challenge.files[0].after, "0".repeat(64)),
    ),
  ])
    await assert.rejects(lab.execute(project.id, id, untrusted, open), {
      status: 403,
    });
  await assert.rejects(
    lab.execute("9".repeat(32), id, signature(review.payload), open),
    { status: 409 },
  );
  assert.deepEqual(await readdir(resolve(root, id)), ["candidate", "project"]);
  const result = await lab.execute(
    project.id,
    id,
    signature(review.payload),
    open,
  );
  assert.equal(result.status, "verified-and-restored");
  assert.equal(result.restored, review.challenge.baseline);
  assert.equal(result.approval, review.digest);
  assert.deepEqual(
    calls.map(({ phase, revision }) => [phase, revision]),
    [
      ["integrated", 1],
      ["restored", 0],
    ],
  );
  assert(
    calls.every(
      ({ packageLock }) => packageLock === review.challenge.source.lockfile,
    ),
  );
  assert.deepEqual(await readFile(raw), saved);
  assert.deepEqual(await readdir(root), ["receipts"]);
  await assert.rejects(
    lab.execute(project.id, id, signature(review.payload), open),
    { status: 409 },
  );
});

test("B7 denies missing trust and expired approvals and refuses stale source revisions", async (t) => {
  const noKey = await fixture(t, proof, {}, null);
  await assert.rejects(noKey.lab.prepare(noKey.project, "/"), { status: 503 });
  let now = 1000;
  const { lab, project, open, root } = await fixture(t, proof, {
    now: () => now,
  });
  const old = await lab.prepare(project, "/");
  now = old.challenge.expiresAt;
  await assert.rejects(
    lab.execute(project.id, old.challenge.id, signature(old.payload), open),
    { status: 409 },
  );
  await lab.cancel(project.id, old.challenge.id);
  const fresh = await lab.prepare(project, "/");
  const result = await lab.execute(
    project.id,
    fresh.challenge.id,
    signature(fresh.payload),
    async () => ({ ...project, revision: 1 }),
  );
  assert.equal(result.status, "failed-and-restored");
  assert.match(result.failure, /source changed/);
  assert.equal(result.restored, fresh.challenge.baseline);
  assert.deepEqual(await readdir(root), ["receipts"]);
});

test("B7 restores the parked baseline on cancellation and restores after a verification failure", async (t) => {
  for (const scenario of ["cancel", "verify-failure"]) {
    const controller = new AbortController();
    const checked = [];
    const { lab, project, open } = await fixture(
      t,
      (value, tree, route, title, phase) => {
        checked.push(phase);
        if (phase === "integrated")
          throw new Error("Fixture verification failure");
        assert(!String(tree["runtime/project.ts"]).includes(title));
        return proof(value, tree, route);
      },
      {
        afterParking: async () => {
          if (scenario === "cancel") controller.abort();
        },
      },
    );
    const review = await lab.prepare(project, "/contacts");
    const result = await lab.execute(
      project.id,
      review.challenge.id,
      signature(review.payload),
      open,
      controller.signal,
    );
    assert.equal(
      result.status,
      scenario === "cancel" ? "cancelled-and-restored" : "failed-and-restored",
    );
    assert.equal(result.restored, review.challenge.baseline);
    assert.deepEqual(
      checked,
      scenario === "cancel" ? ["restored"] : ["integrated", "restored"],
    );
  }
});

test("B7 preserves independent changes and cannot claim a failed rollback browser check", async (t) => {
  let target;
  const { lab, project, open, root } = await fixture(
    t,
    async (value, tree, route, _title, phase) => {
      if (phase === "integrated")
        await writeFile(
          resolve(target, "unexpected.txt"),
          "independent fixture change",
        );
      return proof(value, tree, route);
    },
  );
  const review = await lab.prepare(project, "/contacts");
  target = review.challenge.target.root;
  const conflicted = await lab.execute(
    project.id,
    review.challenge.id,
    signature(review.payload),
    open,
  );
  assert.equal(conflicted.status, "rollback-unverified");
  assert.equal(
    await readFile(resolve(target, "unexpected.txt"), "utf8"),
    "independent fixture change",
  );
  assert.deepEqual(
    (await readdir(root)).sort(),
    [review.challenge.id, "receipts"].sort(),
  );

  const other = await fixture(t, (value, tree, route, _title, phase) => {
    if (phase === "restored")
      throw new Error("Fixture rollback browser failure");
    return proof(value, tree, route);
  });
  const next = await other.lab.prepare(other.project, "/");
  const result = await other.lab.execute(
    other.project.id,
    next.challenge.id,
    signature(next.payload),
    other.open,
  );
  assert.equal(result.status, "rollback-unverified");
  assert.equal(result.restored, next.challenge.baseline);
  assert(!result.rollback);
});

test("B7 rejects redirected paths and file mode drift before publishing", async (t) => {
  const { lab, project, open, raw } = await fixture(t, proof);
  const saved = await readFile(raw);
  const review = await lab.prepare(project, "/");
  const candidate = resolve(review.challenge.target.root, "../candidate");
  const file = resolve(candidate, "runtime/project.ts");
  await rm(file);
  await symlink(raw, file);
  const result = await lab.execute(
    project.id,
    review.challenge.id,
    signature(review.payload),
    open,
  );
  assert.equal(result.status, "failed-and-restored");
  assert.equal(result.restored, review.challenge.baseline);
  assert.deepEqual(await readFile(raw), saved);
  const next = await lab.prepare(project, "/");
  await chmod(resolve(next.challenge.target.root, "runtime/project.ts"), 0o644);
  const drift = await lab.execute(
    project.id,
    next.challenge.id,
    signature(next.payload),
    open,
  );
  assert.equal(drift.status, "rollback-unverified");
  assert.equal(drift.restored, undefined);
});
