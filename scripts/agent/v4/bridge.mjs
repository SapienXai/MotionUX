import { fork } from "node:child_process";
import { createPublicKey } from "node:crypto";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { canonical } from "../../../src/brain/indexer.ts";
import { canonicalDigest, keyId, scopeFor, verifyDecision, verifyRevocation } from "../../../src/agent/integration/v4/contract.mjs";
import { directory, id, repo, safeId, stop, vault } from "../v2/files.mjs";
import { assertRoot } from "../v3/workspace.mjs";

export const output = resolve(vault, "evidence/agent-v4");
export const evidenceFor = run => resolve(output, "runs", safeId(run));
const entry = fileURLToPath(new URL("fixture-operator.mjs", import.meta.url));
const leases = new WeakMap();

export async function consumeReceipt(path, receipt) {
  await directory(resolve(path, ".."), true);
  let file;
  try { file = await open(path, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") stop("host-grant-replayed", "This reviewed run already consumed a fixture grant.");
    throw error;
  }
  try { await file.writeFile(canonical(receipt) + "\n"); await file.sync(); }
  finally { await file.close(); }
  const parent = await open(resolve(path, ".."), "r");
  try { await parent.sync(); }
  catch (error) { if (!["EINVAL", "ENOTSUP", "EBADF"].includes(error.code)) throw error; }
  finally { await parent.close(); }
}

export async function fixtureOperator(review, scenario = "decline", { signal, deadline = 30_000 } = {}) {
  if (!["accept", "decline", "cancel", "timeout"].includes(scenario)) stop("host-approval-unverified", "No trusted host or named fixture scenario was supplied.");
  if (signal?.aborted) stop("cancelled", "The review was cancelled.");
  const began = performance.now();
  const scope = scopeFor(review, await assertRoot(review));
  const context = { audience: id(), nonce: id(), scope, reviewExpires: review.expiresAt };
  const local = new AbortController();
  const child = fork(entry, [scenario], { cwd: repo, env: {}, execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"] });
  let grant, expiry, closed = false;
  function abort(code, message) {
    if (!local.signal.aborted) local.abort(Object.assign(new Error(message), { code }));
  }
  function send(message) {
    child.send(message, error => {
      if (error && !closed) abort("host-disconnected", "The fixture operator channel closed.");
    });
  }
  const ready = new Promise((resolve, reject) => {
    local.signal.addEventListener("abort", () => reject(local.signal.reason), { once: true });
    child.once("error", () => abort("host-approval-unverified", "The separate fixture operator is unavailable."));
    child.once("disconnect", () => { if (!closed) abort("host-disconnected", "The fixture operator channel closed."); });
    child.on("message", message => {
      try {
        if (message?.type === "fixture-hello" && !context.key && typeof message.key === "string" && message.key.length <= 100) {
          context.key = createPublicKey({ key: Buffer.from(message.key, "base64url"), format: "der", type: "spki" });
          if (context.key.asymmetricKeyType !== "ed25519") stop("host-signature-invalid", "Unexpected fixture key type.");
          send({ type: "review-fixture", runId: review.runId, nonce: context.nonce, audience: context.audience, scope });
        } else if (message?.type === "fixture-decision" && context.key && !grant) {
          grant = verifyDecision(message.envelope, context);
          if (grant.decision === "accepted") {
            expiry = setTimeout(() => abort("host-grant-expired", "The fixture grant expired."), Math.max(1, grant.expiresAt - Date.now()));
          }
          resolve();
        } else if (message?.type === "fixture-revocation" && grant) {
          verifyRevocation(message.envelope, context, grant);
          abort("host-grant-revoked", "The fixture operator withdrew its grant.");
        } else abort("host-approval-unverified", "The operator could not independently verify the fixture review.");
      } catch (error) {
        abort(typeof error.code === "string" ? error.code : "host-approval-unverified", "The operator decision could not be verified.");
      }
    });
  });
  const cancel = () => abort("cancelled", "Fixture approval cancelled.");
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(() => abort("host-approval-timeout", "No fixture decision arrived."), deadline);
  const close = () => {
    closed = true;
    clearTimeout(timer);
    clearTimeout(expiry);
    signal?.removeEventListener("abort", cancel);
    abort("host-disconnected", "Fixture operator connection closed.");
    if (child.connected) child.disconnect();
    if (child.exitCode === null) child.kill();
  };
  try {
    await ready;
    clearTimeout(timer);
    const receipt = { schemaVersion: 1, issuer: grant.issuer, kid: keyId(context.key), operator: grant.operator, event: grant.event,
      grantDigest: canonicalDigest(grant), manifestDigest: scope.manifestDigest, decision: grant.decision,
      issuedAt: grant.issuedAt, expiresAt: grant.expiresAt, decisionMs: performance.now() - began };
    const capability = Object.freeze({});
    if (grant.decision === "accepted") leases.set(capability, { grant, scope, receipt, signal: local.signal, claimed: false });
    return {
      capability, receipt, signal: local.signal, close,
      revokeFixtureForTest: async () => {
        if (local.signal.aborted) return;
        const ended = new Promise(done => local.signal.addEventListener("abort", done, { once: true }));
        send({ type: "test-revoke" });
        await ended;
      },
    };
  } catch (error) { close(); throw error; }
}

export async function claimHostFixture(capability, review) {
  const lease = leases.get(capability);
  if (!lease || lease.claimed) stop("host-approval-unverified", "A single-use fixture operator grant is required.");
  const guard = async current => {
    lease.signal.throwIfAborted();
    if (Date.now() >= lease.grant.expiresAt) stop("host-grant-expired", "The fixture grant expired.");
    if (canonical(scopeFor(current, await assertRoot(current))) !== canonical(lease.scope)) {
      stop("host-scope-mismatch", "The current fixture or manifest changed.");
    }
    lease.signal.throwIfAborted();
  };
  await guard(review);
  await consumeReceipt(resolve(evidenceFor(review.runId), "consumed.json"), lease.receipt);
  lease.claimed = true;
  return guard;
}
