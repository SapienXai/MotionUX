# Build quality gates

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
