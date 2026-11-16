import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

const [file, privateKeyFile] = process.argv.slice(2);
if (!file || !privateKeyFile || !process.stdin.isTTY || !process.stdout.isTTY)
  throw new Error(
    "Run interactively on the approval host: node sign-integration.mjs REVIEW.json PRIVATE.pem",
  );

const payload = await readFile(file);
if (payload.length > 8192) throw new Error("The review is too large.");
const review = JSON.parse(payload);
if (
  review.protocol !== "motionux-build-integration/v1" ||
  review.operation !== "apply-and-restore-disposable-copy" ||
  !/^[a-f0-9]{32}$/.test(review.id) ||
  !review.target?.root?.endsWith(
    "/build/integrations/" + review.id + "/project",
  ) ||
  review.source?.block !== "Dialog" ||
  JSON.stringify(review.files?.map((row) => row.path)) !==
    JSON.stringify(["motionux-manifest.json", "runtime/project.ts"]) ||
  !Number.isSafeInteger(review.expiresAt) ||
  review.expiresAt <= Date.now()
)
  throw new Error("Invalid or expired disposable Build review.");

const key = createPrivateKey(await readFile(privateKeyFile));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const signer = hash(
  createPublicKey(key).export({ type: "spki", format: "der" }),
);
if (key.asymmetricKeyType !== "ed25519" || signer !== review.signer)
  throw new Error("This key is not trusted by the reviewed Studio instance.");
const digest = hash(payload);
const display = JSON.stringify(review, null, 2).replace(
  /[\u202a-\u202e\u2066-\u2069]/g,
  (character) => "\\u" + character.charCodeAt(0).toString(16),
);
console.log(display);
const operator = createInterface({
  input: process.stdin,
  output: process.stdout,
});
try {
  const approval = await operator.question(
    "\nReview the route, project copy, file changes and source hashes above.\n" +
      "To approve this one run, type the full review digest.\n" +
      digest +
      "\n> ",
  );
  if (approval !== digest || review.expiresAt <= Date.now()) {
    console.log("No signature issued.");
    process.exitCode = 1;
  } else console.log("\n" + sign(null, payload, key).toString("base64url"));
} finally {
  operator.close();
}
