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
