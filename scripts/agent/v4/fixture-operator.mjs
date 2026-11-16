import { generateKeyPairSync, sign } from "node:crypto";
import { canonical } from "../../../src/brain/indexer.ts";
import { issuer, operator, keyId, maxLifetimeMs, scopeFor } from "../../../src/agent/integration/v4/contract.mjs";
import { id } from "../v2/files.mjs";
import { dryRun, loadReview } from "../v3/review.mjs";
import { assertRoot } from "../v3/workspace.mjs";

const decisions = { accept: "accepted", decline: "declined", cancel: "cancelled", timeout: null };
const scenario = process.argv[2];
if (!process.send || !Object.hasOwn(decisions, scenario)) process.exit(1);
process.once("disconnect", () => process.exit(0));
const pair = generateKeyPairSync("ed25519");
const kid = keyId(pair.publicKey);
let issued;
let requested = false;
let revoked = false;
const envelope = claim => ({ claim, signature: sign(null, Buffer.from(canonical(claim)), pair.privateKey).toString("base64url") });

process.send({ type: "fixture-hello", key: pair.publicKey.export({ type: "spki", format: "der" }).toString("base64url") });
process.on("message", async packet => {
  try {
    if (packet?.type === "test-revoke" && issued?.decision === "accepted" && !revoked) {
      revoked = true;
      const { audience, nonce, event } = issued;
      process.send({ type: "fixture-revocation", envelope: envelope({
        schemaVersion: 1, kind: "fixture-revocation", issuer, kid, audience, nonce, grantEvent: event,
        issuedAt: Date.now(), reason: "operator-revoked",
      }) });
      return;
    }
    if (requested || packet?.type !== "review-fixture" ||
        ![packet.runId, packet.audience, packet.nonce].every(value => typeof value === "string" && /^[a-f0-9]{32}$/.test(value))) {
      throw new Error("Fixture request rejected.");
    }
    requested = true;
    if (scenario === "timeout") return;
    const review = await loadReview(packet.runId);
    await dryRun(review);
    const scope = scopeFor(review, await assertRoot(review));
    if (canonical(scope) !== canonical(packet.scope)) throw new Error("Fixture display and disk state differ.");
    const issuedAt = Date.now();
    issued = { schemaVersion: 1, kind: "fixture-decision", issuer, kid, audience: packet.audience, nonce: packet.nonce,
      event: id(), operator, decision: decisions[scenario], issuedAt,
      expiresAt: Math.min(issuedAt + maxLifetimeMs, review.expiresAt), scope };
    process.send({ type: "fixture-decision", envelope: envelope(issued) });
  } catch {
    process.send?.({ type: "fixture-refused" });
  }
});
