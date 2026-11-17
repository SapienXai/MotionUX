# B8 creator quality report

**Status: `MOTIONUX_B8_READY` for local Studio, managed projects and the verified export matrix.** The acceptance workflow covers shared Studio navigation, theme and search, revision-bound recovery, media backup/restore/purge, and individual verification of the 16 owned marketing blocks. The checks for the release commit run in the [main CI workflow](https://github.com/SapienXai/MotionUX/actions/workflows/ci.yml?query=branch%3Amain).

## Baseline and source integrity

The starting revision was `df9b26117672c2fb66c237a786512804bb40f7b5`. Its five GitHub jobs passed. The local vault preflight found 500 ready originals and 500 thumbnail sets. A byte audit matched 5,707 available baseline hashes and measured 9,969 current source hashes. B8 modifies Studio serving, Build and owned compositions. The private source vault stays local. [Starting workflow](https://github.com/SapienXai/MotionUX/actions/runs/43984231464)

## Functional evidence

| Area | Verification |
| --- | --- |
| Discovery | Verified 500 originals, live Playground, My Library, shared search and explicit light/dark/system in the 5200 entry. The browser reopened the last project after a Gallery round trip at 390 px. |
| Creator | Restored unsaved title, page and selected block through reload and Gallery navigation, then recovered from the vault after removing the browser checkpoint. The saved revision remained unchanged until Save. |
| Saved Run | Isolated Next.js rendered the edited heading and uploaded image. Inspector checked the saved home route at 390, 768 and 1,440 CSS pixels. |
| B7 rollback | Native browser acceptance exercised Ed25519 host approval, isolated installation and verified rollback in disposable Sales CRM and Hotel Desk projects. |
| Independent export | Fresh npm install, TypeScript and production build from the generated project. Six routes, hash-checked manifest, local form validation, mobile nav and lightbox in Chromium, WebKit and Firefox. Chromium verified service-worker navigation and an imported image offline. |
| Media | Browser upload, reviewed use, backup, detached purge and restore passed. Unit checks covered corrupted or wrong-project archives, cancellation, repeat restores and protection of saved, previous and draft references. |
| Composer | Native signed-in English and Turkish proposals each passed review and created a disposable six-route project. The service test reopened each saved document and rejected a repeated approval. A separate local Chromium session generated both Blueprints through the UI, opened each project in Run and compared its heading and language with the exported source. Deterministic fixture cases check bilingual output, stable plan digests and rejected untrusted fields. |
| Regression | Root verification passed 203 Node.js tests across seven suites, checked 322 copyable examples and passed 461 Playwright tests with 3 inherited skips. The local hotel and CRM suites exercised Motion DNA, Inspector and offline behavior in Chromium, Firefox and WebKit. |
| Dependency audit | The platform production audit reported zero advisories after moving Zod to 4.6.6 and fflate to 0.8.3. |

The browser matrix individually checks **16 of 16** owned marketing blocks in Edit, Interact, isolated Next.js Run and standalone export. It verifies named content or controls, visible images and overflow by block. Exports cover Chromium, WebKit and Firefox at 320, 390, 768 and 1,440 px in light and dark under reduced-motion emulation. The default template uses 15 blocks. The test adds LogoCloud from the palette and edits its content. The full scenario exercises navigation, mobile menu, room links, FAQ, keyboard lightbox, local form validation and PWA offline imagery. All 12 route screenshots were visually compared across desktop/light and mobile/dark.

## Performance and evidence

The run uses local Node 24.20.0 and Apple Silicon macOS. The measurements are loopback observations. The new hotel route has no prior version for a same-page comparison.

| Metric | B7 baseline | B8 observation |
| --- | --- | --- |
| Standalone hotel website LCP at 1,440 px | New route | 40 ms Chromium |
| Layout stability | New route | 0.0113 CLS |
| Initial encoded JavaScript | New route | Approximately 165 KiB in Chromium, ceiling 512 KiB |
| Input to updated preview heading | No comparable Interact path | 10–15 ms across four Edit samples and 9–12 ms across three Interact samples in the local runs |
| Saved Run to rendered heading | No matched baseline | Approximately 6.5 s for three same-revision Run/Stop cycles |
| Studio production build directory | 361 MiB | 408 MiB |
| Local vault after completed B8 browser cleanup | 3.0 GiB | 3.0 GiB at rounded precision |
| 500-source Gallery endurance | 120 stops, 8 peak live documents, 14.52 MiB final root heap | 120 stops, 8 peak live documents, 14.49 MiB final root heap |
| 500-source Gallery sampled peak renderer RSS | 1,389 MiB in the saved V14 run | 1,458 MiB in the B8 run |
| Run scratch and export repeatability | 850 MiB scratch ceiling | Approximately 77 MiB allocated peak per measured Run. Three saved exports had the same SHA-256. |

The Gallery endurance runs cover the direct compatibility origin and use the same 1,536 × 1,024 Chromium viewport and 2× CPU throttle. The B8 run detached 920 frames without page or local HTTP errors. Sampled renderer RSS varied between runs. The data does not establish an improvement in process memory or the memory cost of the surrounding Build entry.

The current local matrix is in `.motionux-v9/evidence/build-b8-ready/` and records every block, mode and engine in `browser.json`. Unit, production-build and whole-repository logs are in the same directory. Earlier native planning and generated-source records are in `.motionux-v9/evidence/build-b8/`.

| Screens | Evidence files |
| --- | --- |
| Studio | `unified-gallery.png`, `creator-edit.png`, `creator-interact.png` |
| Native Composer | `blueprint-en.png`, `blueprint-tr.png`, `composer-ui.json` |
| Website | Per-route screenshots at 1,440 px light and 390 px dark, with filenames ending in `-1440-light.png` and `-390-dark.png` |

## Coverage boundaries

Mobile browser tests use emulation. Manual screen-reader and physical-device results are unmeasured. Loopback samples describe lab performance. The portable CI lane covers independent Chromium export. The local macOS lane covers Gallery, native Run and the wider browser matrix.

Run the portable and local checks using the [quality gates](BUILD-QUALITY-GATES.md).
