# Integration Lab

Open a saved project in [Build](http://127.0.0.1:5200/build). Select a page, open **Integration Lab** below the canvas, and choose **Prepare review**. The lab tests the registered MotionUX Dialog block with the saved theme and Motion DNA settings. It adds the block to a disposable Next.js copy, exercises it in the browser, then restores and rechecks the baseline. The two reviewed files are the generated project module and its manifest.

## Configure an approval host

Use an Ed25519 operator key whose private part is controlled by the approving operator independently of Studio and Codex. Run the following in protected storage outside the checkout on the approval host. Bring only the public file to Studio.

```sh
node --input-type=module -e '
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const options = { flag: "wx", mode: 0o600 };
writeFileSync("build-approver-private.pem", privateKey.export({ type: "pkcs8", format: "pem" }), options);
writeFileSync("build-approver-public.pem", publicKey.export({ type: "spki", format: "pem" }), options);
'
```

Start Studio on macOS with the public key checked against the approval host's copy.

```sh
pnpm --dir platform studio --approval-key=/path/to/build-approver-public.pem
```

Download the exact approval request from the review. On the separate approval host, run the signer from a trusted MotionUX checkout and inspect the project ID, saved revision, route, disposable target, exact file changes and pinned source hashes. Enter the full displayed digest to issue one signature.

```sh
node platform/apps/preview-host/sign-integration.mjs REVIEW.json PRIVATE.pem
```

Paste the detached signature in Studio and select **Apply, verify and restore**. Stop an active Run before applying. A review expires after five minutes and an accepted signature is consumed once. A valid signer authenticates the key holder. The key custodian is responsible for authenticating the human operator and protecting the signing device. The Studio process has no signer or native Codex approval adapter.

## Read the result

The lab binds the signature to the exact generated trees and their temporary directory identities. It builds the integrated copy with the existing isolated host, exercises the Dialog and runs Inspector in three Chromium sizes. It restores the original directory, checks file hashes and modes, builds it again, and verifies that the added Dialog has disappeared. Cancellation or a failed check also enters restoration. If the restored browser run fails or independent changes appear, the UI reports an unverified rollback and keeps the isolated evidence. A forced process termination can leave its isolated copy and approval record on disk for manual inspection.

Receipts stay under `.motionux-v9/build/integrations/receipts/` with the review, detached signature, integrated and restored browser results and tree hashes. Successful restoration removes the temporary sources and build output. The lab accepts saved Build project IDs and registered Dialog integration only. It has no request path for selecting an external checkout. [B7 test commands](BUILD-QUALITY-GATES.md#b7-gates)
