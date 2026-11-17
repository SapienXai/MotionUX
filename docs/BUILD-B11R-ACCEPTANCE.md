# B11R source-first acceptance

Status is **MOTIONUX_B11R_READY** for the five locally accepted source-first applications and the bounded code-project workflow. Delivery requires green CI at the delivered HEAD. Native generation, visual acceptance and public CI have separate evidence.

| Gate | State | Evidence and remaining work |
| --- | --- | --- |
| R1 Inventory | PASS | `inventory.json` records 500 prepared sources, 261 compiler-ready closures and 239 exclusions. Reasons include 80 restricted licenses, 64 unsupported dependencies, 50 unreviewed HTML entries, 40 unverified pins, 3 runtime reviews, 1 source budget and 1 unsafe source. |
| R2 Generic integration | PASS | Six real APIs across Kokonut UI, SmoothUI and Magic UI run through the generic compiler. CardStack, Form, Promise Toast and Lens require no new central renderer case. The separate owned ExpandingNotice fixture covers public CI. |
| R3 Source identity | PASS | Actual pinned Git blobs, prepared and adapted hashes, runtime code, notices, instances and independent exports match. The five `*-next-consumer.json` reports contain 89 visual/accessible comparisons. Maximum pixel difference is 1.794%, within the existing 2.5% tolerance. |
| R4 Code synthesis | PASS | Normal native generation authored 27 TSX/TS/CSS modules across five apps. Music's Editor composes Form and WheelPicker with typed interval validation. Task feedback composes Promise Toast with versioned Undo. These modules are editable and independently exported. |
| R5 App individuality | PASS | A has a weekly program grid and mobile agenda. B has a full-bleed photographic hotel site. C has shared-state board/list operations. Normalized DOM topology and interaction records accompany the screenshots. The shared legacy `mx-*` shell is absent. |
| R6 Visual craft | PASS | Desktop, tablet, 390 and 320 screenshots were inspected. Native repairs corrected music artwork, contrast and accessible names, task input state and observatory labels. All 18 routes passed actual Chromium 200% browser zoom. Physical and assistive-technology coverage remains below. |
| R7 Motion policy | PASS | Normal and reduced-motion paths are checked by the native verifier. Lens hover and fixed magnification, picker keyboard controls, calendar selection and toast Undo work. CardStack drag was observed for 75 frames in each implementation, with 18 ms p95 frame gaps and an identical settled endpoint. |
| R8 Edit and export | PASS | `A-editor.json` verifies live upstream accent, generated layout gap, content, exact Canvas widths, retained source state, Undo/Redo, Save and Run. Final independent archives reproduce the edited props and digest. Native module revision preserved source pins and user edits. |
| R9 Fault and swap | PASS | `selected-source-faults.json` verifies explicit export failure for a deleted real selected entry, byte drift, missing notice and restrictive rights with an updated hash. Restoring the disposable closure reproduces the original tree. |
| R10 Blind domains | PASS | Observatory and ceramics briefs produced new native modules, different compositions and actual sources through the same Create app flow. Tests added no domain renderer or template to production. |
| R11 Safety and independence | PASS | Locked clean installs, typechecks and Next/PWA builds passed for all five apps with Studio stopped. Chromium/Firefox/WebKit passed 432 viewport checks and 474 declared interaction steps. Chromium additionally passed 79 offline steps. Security contracts, origin checks, candidate replay rejection and source-fault probes pass. |
| R12 Regression and measurement | PASS | 43 platform contracts, lint, typecheck/build, Brain/Agent/MCP regressions and 500 Gallery mounts/deep links passed locally. Public CI covers the existing regression suites and owned module fixture. Native source and visual results remain local. The delivery CI receipt records the exact pushed SHA. |

## Accepted applications

| Case | Application | Real sources | Routes / authored files / declared steps |
| --- | --- | --- | --- |
| A | Nota music scheduling | CardStack, Form, WheelPicker | 1 / 6 / 9 |
| B | Lodos Evi hotel | Form, Stay Picker, WheelPicker | 7 / 5 / 12 |
| C | Masaüstü task workspace | Form, Promise Toast | 2 / 6 / 20 |
| E1 | Aster Ridge Observatory | Form, WheelPicker | 1 / 5 / 16 |
| E2 | Fieldwork Gallery ceramics | Lens, Form | 7 / 5 / 22 |

Independent business probes additionally confirm hotel inquiry persistence, task totals and saved statuses, an actually rejected instrument overlap and retained original time, and visit-note persistence after reload. Five accepted snapshots were added as new managed projects. The previous nine project files remain byte-identical.

## Local performance

Chromium loopback, production Next, 1440px, reduced motion, unthrottled. Values are maximum observed route samples from the final standard exports. These are lab measurements.

| App | LCP ms | CLS | Encoded JS KiB | Clean install + typecheck + build s, Next / PWA |
| --- | --- | --- | --- | --- |
| A | 48 | 0 | 213.5 | 13.7 / 13.2 |
| B | 52 | 0.00055 | 211.1 | 15.5 / 13.9 |
| C | 52 | 0.01037 | 208.5 | 12.6 / 14.5 |
| E1 | 60 | 0.000005 | 206.7 | 16.3 / 12.5 |
| E2 | 56 | 0.000033 | 195.2 | 12.4 / 15.0 |

Successful native jobs observed approximately 89–94 MiB preview scratch and 282–474 MiB process-group peak RSS. Model generation latency and independent installation are separate costs. No equivalent pre-B11R performance baseline was recorded, so a speedup is unmeasured.

## Reproduction

- Run **pnpm --dir platform test**, **pnpm --dir platform typecheck**, and **pnpm --dir platform build**.
- Run **node platform/tests/b11r-portable.mjs** for the authored public fixture's actual clean install, build, source interaction and offline worker.
- On the signed-in Mac and a prepared vault, start **node platform/start.mjs --built --fixture=build-browser-b11rnative** on a free port 5200.
- Submit the five native briefs using **node platform/tests/b11r-native.mjs A B C E1 E2**. This uses the normal Create app form.
- Stop the fixture Studio. Run **node platform/tests/b11r-consumer.mjs --source-parity --all-engines --zoom --studio-stopped A B C E1 E2**.
- Run **node platform/tests/b11r-business.mjs** and **node platform/tests/b11r-source-faults.mjs**. Use **node platform/tests/b11r-edit.mjs** with the accepted music fixture before downloading final archives.
- Keep project documents, modules, jobs, screen captures and consumer reports local under the ignored evidence directory. A failed or timed-out native job is not an accepted application.

Evidence lives in `.motionux-v9/evidence/build-b11r/`, including each job, accepted project, ZIP, four-width screenshot, original/adapted comparison, business report, source fault report and canonical-project receipt. Public CI cannot access those originals or signed-in native generation. See [quality commands](BUILD-QUALITY-GATES.md).

Physical iOS/Android, manual screen-reader testing, other engines' real browser zoom and production field performance are unverified. Compiler eligibility covers 261 sources. Per-source native visual acceptance in this task covers six selected APIs. Code projects expose declared controls and native module revisions. Their arbitrary TSX layout has no Puck drag/drop projection. Ceramics imagery is authored CSS illustration and is labeled accordingly. Applications use fictional data and local storage. See the [capability map](BUILD-B11R-ARCHITECTURE.md).
