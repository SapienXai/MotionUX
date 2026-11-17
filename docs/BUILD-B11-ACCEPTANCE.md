# Build B11 acceptance

Run the portable contract lane with **pnpm --dir platform test**. The source tests use owned fixtures for code selection, hash checks, generated artifacts, generic routing and rejection of unsupported or redirected sources.

On a signed-in Mac, run **pnpm --dir platform build** and **node platform/start.mjs --built --fixture=build-browser-b11native** on a free port 5200. With the prepared catalog, run **node platform/tests/b11-native.mjs** from the repo root. Optional case IDs are A, B, C, E1 and E2. Use the optional --source argument to exercise a Gallery-selected API and --suffix to retain separate evidence. Run **node platform/tests/b11-revision.mjs A** on the same current compiler and fixture to test a saved edit, targeted native revision, export and cancellation. Native evidence appears under the ignored .motionux-v9/evidence/build-b11 directory. Run **node platform/tests/b11-consumer.mjs --all-engines A B C** on completed ZIPs for independent Next.js builds, source interactions and offline behavior. **node platform/tests/b11-motion.mjs** uses the saved B graph to compare real Chromium frames and focus at normal and reduced-motion preferences.

| Gate | Required evidence |
| --- | --- |
| G1 | Normal Create app, native generation, revision and export |
| G2 | Two meaningful upstream instances in each of A, B and C, six distinct sources overall |
| G3 | Code context, closure, instance and export checksums |
| G4 | Novel route, layout and entity structures |
| G5 | A generated interaction exhibits its behavior, accepts edits and works independently |
| G6 | Distinct usable music planning, hotel and operations workflows |
| G7 | A preference affects actual motion and preserves access |
| G8 | Original, adapted and generated instance edits agree in saved Run and export |
| G9 | A/B/C clean builds and local edits offline in A/C |
| G10 | Two additional brief domains and an additional catalog source |
| G11 | Rights, stale revision, path, injection, network and same-origin boundaries |
| G12 | Legacy regression, preserved sources, cancellation, cleanup and resource bounds |

See the [B11 quality report](BUILD-B11-QUALITY-REPORT.md) for observed results. The [B10 report](BUILD-B10-QUALITY-REPORT.md) retains its manual acceptance gaps.
