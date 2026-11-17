# Build quality gates

For B9 run the platform test, typecheck and build commands, then `node platform/tests/b9-browser.mjs`. On macOS run it with `--local` for isolated Next.js Run and the additional WebKit and Firefox export checks. The portable test covers Studio, clean independent exports and Chromium, including the offline Relay queue. Keep port 5200 free before starting either fixture. Reports and screenshots stay in `.motionux-v9/evidence/build-b9/`. [B9 pattern and adapter contracts](BUILD-B9-PAGE-PATTERNS.md)

For B8 run `pnpm --dir platform test`, `pnpm --dir platform typecheck`, `pnpm --dir platform build` and `node platform/tests/b8-browser.mjs` in sequence. Keep port 5200 free for the disposable fixture. With macOS Run and local originals available, add `--local` to the browser command and use `node platform/tests/b8-codex-live.mjs` for the signed-in native acceptance cases. The browser matrix records per-block coverage, draft and media recovery, preview cycles and screenshot evidence under `.motionux-v9/evidence/build-b8-ready/`. [B8 quality report](BUILD-B8-QUALITY-REPORT.md)

Verify the document contract and filesystem boundaries, then build the platform and test real editing in Chromium, Firefox and WebKit. Install exported source independently and verify production SSR, navigation, app interactions and axe. Compare original Gallery routes and source hashes before and after. Keep private screenshots, traces and metrics in the ignored vault. Record manual assistive technology, physical devices and unavailable metrics separately.

Run from the repository root:

```sh
pnpm --dir platform install --frozen-lockfile --ignore-scripts
pnpm --dir platform test
pnpm --dir platform typecheck
pnpm --dir platform build
node platform/tests/browser.mjs
node platform/tests/browser.mjs --local
MOTIONUX_TEST_PREVIEW=1 npm run verify
npm run --silent mcp:verify:codex
```

Use a free 5200 port for the browser harness. The portable CI lane verifies an edited export from a fresh npm installation using Chromium. The local macOS lane adds the sandboxed Next preview, pointer insertion, Firefox, WebKit, mobile touch and screenshot evidence. The harness owns a dedicated fixture namespace and removes the generated consumer after verification. Its screenshots, ZIP and performance report remain under the local evidence folder.

The browser gate installs the downloaded ZIP from a clean npm lockfile, checks the generated hashes, and builds and runs it outside the Studio package tree. It also builds a second page containing the 31 registered blocks to check their standalone render mapping. Chromium export budgets are 2.5 s LCP, 0.1 CLS and 512 KiB encoded JavaScript in the named local lab profile. Reports include renderer/GPU samples when Chromium and the OS expose them. Physical devices and manual screen readers require separate review.

For a prepared vault, verify the legacy side of the transition with a second local fixture server rather than rewriting the stored comparison baseline:

```sh
npm run build -- --outDir .motionux-v9/evidence/build-v1/legacy-build --emptyOutDir
MOTIONUX_LIBRARY_FIXTURE="$PWD/.motionux-v9/evidence/build-v1/legacy-test-library" \
  MOTIONUX_FIXTURE_PORT=5299 \
  MOTIONUX_STUDIO_SHELL="$PWD/.motionux-v9/evidence/build-v1/legacy-build" \
  node scripts/v9/serve.mjs
```

With that fixture listening, run `node scripts/studio/verify.mjs --build-foundation` and `node scripts/studio/v11/verify.mjs --build-foundation`. These write separate local reports for Gallery, Playground, comparison, library and Project Kit.

## B3 gates

Run `pnpm --dir platform test` for migration, adapter and compiler contracts, review replay/expiry/cancellation, input denial and source hashes. After building, `node platform/tests/b3-browser.mjs` verifies a manual CRM in Chromium with a clean independent install, typecheck and production build. Public CI runs both compiler fixtures and the actual CRM export without credentials. The existing Hotel browser suite remains required.

On a signed-in macOS desktop, run `node platform/tests/b3-codex-live.mjs` separately for five real planning briefs and `node platform/tests/b3-browser.mjs --local --live` for English brief → reviewed plan → Puck edit → sandboxed Next → independent Chromium, Firefox and WebKit. Use `--local` without `--live` for the manual template matrix. These commands own temporary fixture namespaces and leave evidence in `.motionux-v9/evidence/build-b3`. Run the Hotel suite against the same built Studio: `node platform/tests/browser.mjs --local`.

Compare B3 with Foundation's desktop loopback profile on the same browser, viewport and machine. Review CRM screenshots on desktop, tablet and mobile, test keyboard dialog return, contact search and sort, sales stage change and undo, dates, persistence and linked metrics. The mobile variant uses 4× CPU throttling and a 60 ms network profile in Chromium. Keep 2.5 s LCP, 0.1 CLS and 512 KiB encoded JS as the export lab ceilings, and the existing 850 MiB scratch budget for the macOS preview. Automated axe is scoped to named routes (serious/critical failures block). Manual screen reader, real touch hardware, RTL and production field metrics remain separate.

## B4 gates

After building Studio, run `node platform/tests/b4-pwa.mjs --local` on a free port 5200. The suite downloads both PWA ZIPs through the editor, verifies their file hashes, and installs and builds them independently. It checks Chromium's installability diagnostics, the worker's scope and offline inventory, reconnect and cache recovery, and actual offline edits and preferences on representative mobile layouts. CI runs both exports in Chromium. The local lane adds Firefox and WebKit and retains screenshots and a JSON report under `.motionux-v9/evidence/build-b4/`. Record physical iOS and Android installation separately.

## B5 gates

After building Studio, run `node platform/tests/b4-pwa.mjs --local --motion-dna` on a free port 5200. CRM and Hotel get distinct saved profiles. The suite checks computed page and feedback timing, observes animation starts on navigation and dialog opening, and checks focus with reduced motion and project-wide stillness. It compares Studio and isolated Next Run locally, validates the exported manifest, then verifies the same profile in the independently built PWA while its server is stopped. CI runs the Studio and offline Chromium lanes. Local evidence goes to `.motionux-v9/evidence/build-b5/`.

## B6 gates

Run `node platform/tests/b6-inspector-faults.mjs` to verify measured overflow, clipped controls, unnamed buttons, failed keyboard activation and runtime errors against deliberately broken DOM. It also asserts that cross-origin and mutating requests are blocked and a stale preview identity is rejected. After building Studio, run `node platform/tests/b4-pwa.mjs --local --inspector` on a free port 5200. The suite checks the Inspector in actual macOS Run for CRM Contacts and Hotel Bookings, tests API rejection, and checks the same routes in independent exports. It also runs the B5 three-engine offline regression. Linux CI runs the seeded fault and independent Chromium audit lanes. Browser reports remain under `.motionux-v9/evidence/build-b6/`.

## B7 gates

Run `pnpm --dir platform test` for missing, forged, tampered, expired and replayed signatures, stale revisions, cancellation between publication steps, symlink and mode drift, independent modifications and verification failures. On macOS with Chromium and Python 3 installed, build Studio and run `node platform/tests/b7-integration-browser.mjs` on a free port 5200. The native lane signs with a disposable key in a separate terminal process, exercises the CRM and Hotel copies on a real Next.js host, and rebuilds and checks the baseline after success and cancellation. It verifies the original managed project remains byte-identical and cleans the fixture vault. Evidence stays under `.motionux-v9/evidence/build-b7/`. The B6 suite remains required.
