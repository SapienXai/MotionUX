# B11R source-first acceptance

Current status is **MOTIONUX_B11R_PARTIAL**. The engine emits real TSX/CSS code projects and preserves legacy documents. Native application, visual and source parity checks are recorded separately from CI.

| Gate | State | Evidence and remaining work |
| --- | --- | --- |
| R1 Inventory | PARTIAL | The resolver inspected 500 records. The initial pass found 261 eligible import closures. Every rejected record has a machine-readable reason in the local inventory report. Compiler compatibility does not establish interaction quality. |
| R2 Generic integration | PARTIAL | An owned fixture with the novel ExpandingNotice API compiled, installed and interacted in Next and offline PWA. Native upstream acceptance remains open. |
| R3 Source identity | PARTIAL | The resolver checks pinned registry bytes, entry revision, complete reachable imports, notices and package policy. Native source-to-instance evidence is pending. |
| R4 Code synthesis | PARTIAL | Generated program contract accepts bounded real TSX/CSS modules with generated-from imports. Native module and interaction evidence is pending. |
| R5 App individuality | UNKNOWN | Requires generated A/B/C screenshots, structure and workflow review. |
| R6 Visual craft | UNKNOWN | Requires four widths, real screenshots, focus, contrast and zoom. |
| R7 Motion policy | UNKNOWN | Source internals are retained. Source-specific native behavior needs verification. |
| R8 Edit and export | PARTIAL | Control values compile into the same runtime config. Native editor, Run and ZIP comparison is pending. |
| R9 Fault and swap | PARTIAL | Source/hash faults, unsupported imports and stale modules fail the contract tests. Native change-of-source comparison is pending. |
| R10 Blind domains | UNKNOWN | Requires two new native domain results without a special renderer. |
| R11 Safety and independence | PARTIAL | Static program checks and separate-origin sandbox retained. Owned Next/PWA fixture independently builds and runs. Broader runtime abuse coverage remains open. |
| R12 Regression and measurement | PARTIAL | Legacy platform contract tests and production typecheck/build run locally. The CI lane adds the portable module fixture. Native performance and final CI remain pending. |

## Reproduction

- Run **pnpm --dir platform test**, **pnpm --dir platform typecheck**, and **pnpm --dir platform build**.
- Run **node platform/tests/b11r-portable.mjs** for the authored public fixture's actual clean install, build, source interaction and offline worker.
- On the signed-in Mac and a prepared vault, start **node platform/start.mjs --built --fixture=build-browser-b11rnative** on a free port 5200.
- Submit the five native briefs using **node platform/tests/b11r-native.mjs A B C E1 E2**. This uses the normal Create app form.
- Independently install completed archives with **node platform/tests/b11r-consumer.mjs --all-engines A B C E1 E2**.
- Keep project documents, modules, jobs, screen captures and consumer reports local under the ignored evidence directory. A failed or timed-out native job is not an accepted application.

Physical iOS/Android, real screen-reader and production field performance are separate unverified items.
