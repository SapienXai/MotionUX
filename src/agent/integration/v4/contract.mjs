import { createHash, verify as checkSignature } from "node:crypto";
import Ajv2020 from "ajv/dist/2020.js";
import { canonical } from "../../../brain/indexer.ts";
import { validate, validFingerprint } from "../v3/validation.ts";
import { adapters } from "../v3/adapters.ts";
import manifest from "../../../../schemas/agent/v3/manifest.json" with { type: "json" };
import scopeSchema from "../../../../schemas/agent/v4/scope.json" with { type: "json" };
import grantSchema from "../../../../schemas/agent/v4/grant.json" with { type: "json" };
import revokeSchema from "../../../../schemas/agent/v4/revocation.json" with { type: "json" };
import { stop, safePath } from "../../../../scripts/agent/v2/files.mjs";
import { managed } from "../../../../scripts/agent/v3/workspace.mjs";

export const issuer = "motionux-fixture-operator";
export const operator = "scripted-fixture-operator";
export const maxLifetimeMs = 120_000;
export const realProjectWrites = "disabled";

const ajv = new Ajv2020({ strictTypes: false });
ajv.addSchema(manifest);
const scopeCheck = ajv.compile(scopeSchema);
const grantCheck = ajv.compile(grantSchema);
const revokeCheck = ajv.compile(revokeSchema);

export const canonicalDigest = value => createHash("sha256").update(canonical(value)).digest("hex");
export const keyId = key => createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex");
const orderedPaths = names => names.every((name, i) => safePath(name) && (!i || names[i - 1] < name)) &&
  new Set(names.map(name => name.toLowerCase())).size === names.length;

export function scopeFor(review, root) {
  validate("review", review);
  const supported = adapters.find(row => row.id === review.adapter && row.component === review.source.id && row.fixture === review.request.fixture &&
    (row.route ? row.route === review.request.route && !review.request.file : row.file === review.request.file && !review.request.route));
  const notice = review.source.code.find(file => file.path === review.source.notice);
  const columns = review.manifest.mutations;
  if (!supported || !notice || review.source.license !== supported.license ||
      root !== managed(review.runId) || !validFingerprint(review) ||
      canonicalDigest(review.manifest) !== review.manifestDigest ||
      !orderedPaths(columns.map(row => row.path)) || !orderedPaths(review.manifest.directories.map(row => row.path)) ||
      !orderedPaths(review.manifest.dependencies.map(row => row.name)) ||
      !columns.some(row => row.path === supported.notice && row.role === "license" && row.after?.sha256 === notice.installed) ||
      !columns.some(row => row.path === supported.glue && row.role === "host-adapter" && row.before && row.after) ||
      !columns.some(row => row.path === "package.json" && row.role === "npm-manifest" && row.before && row.after) ||
      !columns.some(row => row.path === "package-lock.json" && row.role === "npm-lock" && row.before && row.after) ||
      columns.some(row => row.operation !== (row.before ? row.after ? "modify" : "delete" : "create") ||
        !row.before && !row.after || canonical(row.before) === canonical(row.after))) {
    stop("host-scope-invalid", "The review has no exact supported fixture write set.");
  }
  const provider = new URL(review.source.location).pathname.split("/")[1];
  const value = {
    runId: review.runId, fixture: review.request.fixture, canonicalRoot: root, rootIdentity: review.rootIdentity,
    baseline: review.beforeHash, postimage: review.afterHash, reviewFingerprint: review.fingerprint,
    planFingerprint: review.planFingerprint, brainFingerprint: review.brainFingerprint,
    selector: review.request.route ? { kind: "route", value: review.request.route } : { kind: "file", value: review.request.file },
    source: { id: review.source.id, provider, location: review.source.location, commit: review.source.commit,
      upstream: review.source.upstream, registry: review.source.registry, noticeHash: notice.installed,
      license: review.source.license, licenseScope: "local-fixture" },
    adapter: review.adapter, manifest: review.manifest, manifestDigest: review.manifestDigest,
    permissions: ["apply-reviewed-files", "offline-build", "loopback-browser"],
  };
  if (!scopeCheck(value)) stop("host-scope-invalid", "The manifest binding is malformed.");
  return value;
}

function authenticate(packet, context) {
  const { claim, signature } = packet;
  const bytes = Buffer.from(signature, "base64url");
  if (bytes.toString("base64url") !== signature || context.key.asymmetricKeyType !== "ed25519" ||
      claim.kid !== keyId(context.key) || claim.audience !== context.audience || claim.nonce !== context.nonce ||
      !checkSignature(null, Buffer.from(canonical(claim)), context.key, bytes)) {
    stop("host-signature-invalid", "The signed packet does not come from the pinned fixture operator.");
  }
  return claim;
}

export function verifyDecision(packet, context, now = Date.now()) {
  if (!grantCheck(packet)) stop("host-approval-unverified", "No supported manifest-bound fixture decision was supplied.");
  const claim = authenticate(packet, context);
  if (claim.issuedAt > now || claim.expiresAt <= now || claim.expiresAt <= claim.issuedAt ||
      claim.expiresAt - claim.issuedAt > maxLifetimeMs || claim.expiresAt > context.reviewExpires) {
    stop("host-grant-expired", "The fixture decision is outside its allowed lifetime.");
  }
  if (canonical(claim.scope) !== canonical(context.scope)) stop("host-scope-mismatch", "The signed target or exact write set differs from the reviewed fixture.");
  return claim;
}

export function verifyRevocation(packet, context, grant, now = Date.now()) {
  if (!revokeCheck(packet)) stop("host-signature-invalid", "The revocation packet is malformed.");
  const revocation = authenticate(packet, context);
  if (revocation.grantEvent !== grant.event || revocation.issuedAt < grant.issuedAt || revocation.issuedAt > now) {
    stop("host-scope-mismatch", "The revocation belongs to another grant.");
  }
  return revocation;
}

export function hostCompatibility() {
  return { status: "host-approval-unverified", realProjectWrites, nativeManifestAuthority: false, fixtureOperator: "scripted-separate-process" };
}
