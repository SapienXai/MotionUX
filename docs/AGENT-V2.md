# MotionUX Agent V2

Agent V2 consumes a fresh Agent V1 recommendation and installs one reviewed native React original in a managed Next.js fixture. It validates the exact mutations, builds independent before and after consumers, exercises the real route and restores the snapshot on demand. The writable fixture lives under the ignored MotionUX vault.

## Run a reviewed integration

Use Node 24, the prepared local Brain catalog, Playwright browsers, and the V2 package cache on macOS. Public contract tests run without the private catalog or macOS. [Studio setup](DEVELOPER-GUIDE.md#set-up-studio) · [Agent V1](AGENT-V1.md)

```sh
npm run agent:v2:doctor
npm run agent:plan -- --request ./fixtures/agent/requests/booking-confirmation.json \
  --output .motionux-v9/agent/reports/booking.json --json
npm run agent:v2:review -- --plan .motionux-v9/agent/reports/booking.json \
  --source kokonut-promise-toast
npm run agent:v2:dry-run -- --review RUN_ID
npm run agent:v2:apply -- --review RUN_ID --authorized-fixture EXACT_APPROVAL
npm run agent:v2:verify -- --run RUN_ID
npm run agent:v2:rollback -- --run RUN_ID --recheck
npm run agent:v2:status -- --run RUN_ID
npm run test:agent:v2
```

Replace `RUN_ID` with the review's generated ID. Inspect the dry-run, then pass its exact approval only if the source and affected files are authorized. The approval binds one reviewed manifest and generated workspace and expires after 15 minutes. `evaluate` takes the same flags as `apply` and runs the full apply, verify, rollback and restored-route sequence. Use `npm run --silent … -- --json` for a single machine-readable object. [Schemas](../schemas/agent/)

The review reads the explicit V1 report and reruns the same V1 request against the current fixture and catalog. Pass the matching private V1 request with `--request` when it differs from the booking example. V1 abstention, missing capability evidence, stale evidence, unsupported formats, incompatible dependencies and a source missing from the shortlist block the run. The current recipe allows only `kokonut-promise-toast` on `/bookings/confirmation`. Additional sources need their own reviewed adapters.

### Offline npm cache

V2 uses its own ignored `.motionux-v9/agent/v2/npm-cache`. Seed it from an approved local npm cache if needed. On APFS, `cp -cR` creates a copy-on-write copy. Run this once when the destination is empty.

```sh
mkdir -p -m 700 .motionux-v9/agent/v2/npm-cache
cp -cR ~/.npm/_cacache .motionux-v9/agent/v2/npm-cache/_cacache
```

If preflight reports an uncached package, review the exact failed public npm tarball independently. Any separately authorized package acquisition should use that exact URL, an empty npm configuration and the V2 cache, with lifecycle scripts disabled. Review, apply and verification use offline npm and a sandbox that denies external connections. [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## Review and permissions

The manifest lists the exact operation, path, file type, permissions and SHA-256 before and after. It includes the full baseline and integrated tree inventories, the offline lockfile diff, the mutable presentation targets and the source's commit, entry hash, registry hash and notice. npm strict peer resolution verifies the manifest before apply. The independent `npm ci` verifies installation during acceptance.

The original fixture is the read-only seed. A checked-in inventory pins every seed file, including build configuration and routes outside the V1 import graph. Only its generated clone under `.motionux-v9/agent/v2/workspaces/<run-id>/` receives the transaction. The seed and selected registry are checked again immediately before the first mutation. The CLI accepts generated run IDs. It provides no arbitrary project path, global approval, target scripts or component fallback. Public repository code uses a fixed browser and build runner.

The new host adapter keeps the server page and original booking ledger in charge of booking truth. It uses the source's exported hook and renderer on verified fixture API responses. The provider TSX matches the local registry byte-for-byte. Its existing registry adaptation changes only the `utils` import. The original Tailwind classes and motion parameters remain in place. The provider's broad demo theme stylesheet is preserved as a material and stays out of the host CSS cascade. The host opts into its classes with Tailwind's `@source`. The clone adds the document title missing in the baseline and retains the theme and controls.

All toolchain writes are bounded to a disposable build replica, the V2 cache when used, and private evidence. Subprocesses use a stripped environment and fixed executables/arguments. npm resolves only integrity-pinned npm registry artifacts from cache with lifecycle scripts disabled. Browser and server use a single loopback port. Firefox uses the inherited macOS process sandbox for the smoke check because its nested sandbox cannot initialize inside it. Browser caches live in the private build replica. Next uses webpack, two build workers and selected route paths. The fixture's separate `/server-receipt` example assumes another local backend and is excluded from this build. The integrated confirmation route, existing checkout/details, and local simulation API run on the actual built app. [Next CLI options](https://nextjs.org/docs/app/api-reference/cli/next)

## Journaling and recovery

A content-hashed journal is persisted before the first writes. A run lock blocks parallel apply and verify. A dead writer's lock can be taken over by rollback. Verified means the scoped production build and browser checks passed. Use `status` to distinguish `applied`, `verified`, `rolled-back` and `needs-manual-review`.

Rollback restores modified and deleted preimages, including the lockfile, removes introduced files and directories, and verifies the complete baseline tree. A repeated rollback returns the same proof. Recheck builds and opens the restored route from the exact restored snapshot. If a file differs from both reviewed images, rollback stops and preserves the change. Inspect the journal and saved blobs before resolving the conflict. Corrupt journals fail closed. A damaged recovery claim may need manual inspection of the recorded PID and private lock.

The writer checks canonical paths, regular single-link files, file counts and extents, same-directory identity and expected hashes around atomic replacement. Workspaces are private mode 0700 and staged writes remain on the same filesystem. Authorized operators should keep the workspace stable during an operation. A separate process running as the same OS user with unrestricted access to the private vault is outside the trust boundary.

## Evidence

- `.motionux-v9/agent/v2/reviews/<run-id>/review.json` contains the exact manifest and source pins. The neighboring blob store contains private snapshots.
- `.motionux-v9/evidence/agent-v2/runs/<run-id>/` contains report JSON and Markdown, journal, build logs, before/after/restored screenshots and traces. Open traces locally with the installed Playwright CLI. [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- Real acceptance covers Chromium keyboard and touch emulation at 320/390px, Firefox and WebKit smoke, Axe in the stable visible state, reduced motion, SSR, fixture server/API status, races, cancellation, navigation and retry. Physical mobile, manual screen readers, RTL, renderer RSS and live backend behavior remain open.
- Contract tests use synthetic bytes for transaction failure injection, SIGKILL recovery, lock contention, conflict preservation and malformed metadata. These are separate from the browser result on the real original.

The accepted local run used a Next.js 16.4.6 production build. It restored six modified files, including both npm manifests, and removed seven created files. Both the restored route and a repeated rollback passed. The upstream animation produced 60 sampled frames with 21 distinct transform or opacity states. The matched Chromium sample recorded a document-ready p95 of 21.4 → 28.0 ms, JS heap p95 of 3.03 → 3.51 MiB, and 134,119 → 194,858 encoded JS bytes. CLS was 0 → 0.01. These measurements describe this fixture and machine.

A successful machine-readable run includes a status and evidence references similar to the following excerpt.

```json
{
  "schemaVersion": 2,
  "status": "rolled-back",
  "sourceId": "kokonut-promise-toast",
  "outcomes": [
    { "name": "upstream-motion-and-keyboard", "status": "passed" },
    { "name": "rollback-tree", "status": "passed" },
    { "name": "physical-mobile", "status": "unknown" }
  ]
}
```

In the Markdown report, the **Manifest** lists each path and operation, **Checks** explains each observed result, and **Private artifacts** points to evidence files. Reports keep provider materials, lockfile snapshots, screenshots and traces in the ignored vault.

The next milestone is read-only MCP discovery backed by stable evidence contracts. General-project edits need a separate V3 authorization and acceptance gate. [Roadmap](ROADMAP.md)
