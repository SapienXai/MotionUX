import { validate, validFingerprint } from "../../../src/agent/integration/v3/validation.ts";
import { digest, id, stop } from "../v2/files.mjs";

export const realProjectWrites = "disabled";
const permissions = ["write-reviewed-files", "offline-build", "loopback-browser"];
const authorityInstances = new WeakSet();
const scopeOf = review => ({ schemaVersion: 3, kind: "fixture-harness", runId: review.runId, fixture: review.request.fixture,
  rootIdentity: review.rootIdentity, selector: review.request.route ?? review.request.file, source: review.source.id,
  commit: review.source.commit, manifestDigest: review.manifestDigest, reviewFingerprint: review.fingerprint,
  operation: "apply-reviewed-fixture", permissions });

export function fixtureAuthority(now = Date.now) {
  const records = new WeakMap();
  const harness = Object.freeze({
    mint(review) {
      validate("review", review);
      if (!validFingerprint(review) || digest(review.manifest) !== review.manifestDigest || now() >= review.expiresAt) {
        stop("authorization-required", "The fixture grant requires a current, intact review.");
      }
      const capability = Object.freeze({});
      const binding = { ...scopeOf(review), nonce: id(), until: Math.min(review.expiresAt, now() + 120_000) };
      validate("grant", binding);
      records.set(capability, { binding, claimed: false, revoked: false });
      return capability;
    },
    revoke(capability) {
      const grant = records.get(capability);
      if (grant) grant.revoked = true;
    },
    claim(capability, review) {
      const record = records.get(capability);
      if (!record || record.claimed || record.revoked) stop("authorization-required", "A fresh grant from this fixture harness is required.");
      const check = current => {
        if (record.revoked || record.binding.until <= now() ||
            digest({ ...scopeOf(current), nonce: record.binding.nonce, until: record.binding.until }) !== digest(record.binding)) {
          stop("authorization-required", "The grant expired, was revoked or does not match this exact fixture review.");
        }
      };
      check(review);
      record.claimed = true;
      return check;
    },
  });
  authorityInstances.add(harness);
  return harness;
}

export function claimFixtureGrant(harness, capability, review) {
  if (!authorityInstances.has(harness)) stop("authorization-required", "An independent fixture harness is required.");
  return harness.claim(capability, review);
}
