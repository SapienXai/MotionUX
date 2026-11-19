# MotionUX Unified Studio V1

Start the local Studio with `pnpm --dir platform studio --with-gallery`. Open [Projects](http://127.0.0.1:5200/) or [Discover](http://127.0.0.1:5200/discover). The original Gallery remains available at [port 5199](http://127.0.0.1:5199/).

## Implementation

| Phase | Delivered behavior | Checkpoint |
| --- | --- | --- |
| 0 · Baseline | Local `main` matched `origin/main`. Captured the landing, Build, Studio desktop/mobile and Discover. The product contract, six reference images and their optional HTML are in [unified-studio](unified-studio/). | `b89956e0c0baa7c4e8c8958e65ff9f27b5257d1b` |
| 1 · Projects | The root opens the source-first brief. Recent and full project lists distinguish saved, recoverable draft, recoverable saved revision and unavailable states. Sources and templates are optional. Legacy planning remains available in a disclosure. `/build` and existing project URLs open the same workspace. | `378aeda5b7a476b7e35b6af7c2cc05b5d4f8af15`, `9a1cbde423aa5431c27d3e130e473a1fcedc7c38` |
| 2 · Studio | Puck, SourceGraph and CodeProject share the workspace header, saved and draft status, named canvas, responsive panes and contextual export actions. Page selection remains available in Preview. The editor loader dispatches by saved document type. | `36369fc9bf549b74b4a22b56a5cdc53ac8a9a50c`, `3538a9a7474cff53bcb516921fe593c46dce7ee1` |
| 3 · Discover | The launcher and source projects share the live Gallery catalog. Discover opens original specimens with provenance in a drawer. Up to four sources can be carried into a new brief or attached to the next revision of an existing compatible code project. | `1da348de5c646efbac04f97cccb28250a9bee3a7`, `6ce2f8dbb02a29b382e9348d80783200d7c249bf` |
| 4 · Design | Shared lilac tokens and compact controls cover system, light and dark. Small viewports use native sheets. Workspace search exposes page matches and opens the catalog for component queries. The focused revision controls stay above the bottom bar when the visible viewport shrinks. | `81df7c35dba2f713c159ff0b0f3b6064d0c99e0c`, `02a000bb5a3337a7f460e5d53ebc92f1558dd8d4` |
| 5–6 · Verification and cleanup | Checked the real local Codex workflows, independent exports, security gates and browser matrix. Removed the old landing screen and its unused CSS. Private captures and app archives remain in the ignored vault. | This report and the receipts below |

Puck retains its typed blocks, media and drag and drop. Its Codex revision can update an existing page heading, block title, description or action label. CodeProject uses application-declared controls, and its next revision can add compatible portable sources within the six-source project limit. The SourceGraph adapter uses its saved sources and controls. Its catalog shows why direct additions require a CodeProject. The local host validates every model result and checks it in the separate-origin sandbox before saving.

Local and reference eligibility comes from the prepared inventory. Discover separates recorded visual acceptance from compiler compatibility. The local Gallery preflight found 500 prepared originals and 500 thumbnail sets. Restricted sources keep their existing local Run and export restrictions. The isolated application on port 5202 and the Gallery on port 5199 retain their own origins. Studio checks both the sender origin and frame before accepting catalog messages.

## Acceptance

| Criterion | Result | Observed evidence |
| --- | --- | --- |
| Create a working app from Projects | PASS | Tally Studio used an explicit original. Session Ledger started with an empty component selection, resumed its job after reload, chose Animated Number and produced a working count and reset. Four runtime steps passed in both motion modes. |
| Reopen all three document types | PASS | Chromium and WebKit reopened saved Puck, SourceGraph and CodeProject projects in the shared workspace. The Foundation suite also rendered all 31 blocks in Puck and in an independent production build. |
| Keep the primary navigation simple | PASS | Projects and Discover are the two top-level links. The Studio workspace appears in project context. Project search navigated to a matching CRM page. |
| Find, try and attach sources | PASS | The live catalog opened from a project, displayed the original specimen and accepted Morph Toggle for revision. The standalone Discover chooser surfaced compatible saved projects and retained the open detail and selection on browser Back. The four-source Create app handoff, pagination and preserved brief passed in Chromium and WebKit. |
| Verify a saved AI revision | PASS | Updated Tally Studio's heading with the editor, Undo, Redo and Save. A real Codex job added SmoothUI Morph Toggle to revision 2. The switch changed focus mode in preview. The exact saved revision also passed the Inspector. A separate Puck job changed the requested heading, preserved every other field and opened the result in isolated Next. |
| Truthful states and recovery | PASS | Chromium and WebKit distinguished saved, draft and damaged documents in Projects. A draft reopened without advancing the saved revision. A recoverable damaged document opened its last usable revision from the project card. A damaged document with no backup had a disabled card. Generation reload and cancellation, stale revision rejection and preview retry also passed. |
| Rights, source pins and integrity | PASS | Six fault probes exercised unavailable source files, byte drift, missing notices, restricted rights and exact restoration. Local-only attachment was rejected. The public specimen audit passed. |
| Next.js and PWA export | PASS | Verified both archives against the saved document digest and every file hash, ran a clean offline dependency install and production build, then exercised seven application steps in Chromium, Firefox and WebKit on each export. Chromium also ran the PWA with the network offline. The UI and server rejected both export formats for a local-only project. |
| Saved library and deep links | PASS | Opened the Saved library, ran the original detail in place, verified a direct source URL and returned to the catalog. Legacy 5199 Gallery and old Build project links resolved. Root browser regressions exercised the existing library and registry routes. |
| Themes, motion and accessibility | PASS | Light and dark passed at seven widths. System followed an OS-scheme change. Scoped axe checks on the editor chrome and controls at 390 and 1440 px found zero violations. Checked landmarks and names in the browser accessibility tree, Escape/focus return and reduced-motion paths. Also checked 200% native browser zoom and 125% font scaling. |
| Responsive editor and catalog | PASS | Checked 320, 375, 390, 430, 768, 1024 and 1440 px with no page overflow. Compact sheet controls worked in Chromium and WebKit. A fresh 390 px context verified the actual 390 px embedded canvas. Focus and hit testing stayed usable after shrinking 390×844 to 390×440 in both engines. |
| Physical mobile device | BLOCKED | Xcode found two simulators and no connected iPhone. ADB reported no attached Android devices. Browser testing used WebKit and Chromium. The accessibility-tree check covered browser semantics. A standalone VoiceOver run was outside that evidence. |
| Repository and consumer regressions | PASS | See command receipts below. |
| GitHub Actions for Unified Studio | BLOCKED | Unified Studio is committed on local `main`. The remote revision is `b89956e0c0baa7c4e8c8958e65ff9f27b5257d1b`, which already includes the original Discover-to-Build handoff. GitHub Actions has no run for these local checkpoints. |

## Command receipts

| Command | Observed result |
| --- | --- |
| `pnpm --dir platform typecheck`, `pnpm --dir platform build` | TypeScript and the production Next.js build passed. |
| `pnpm --dir platform test` | 48 passed. |
| `MOTIONUX_TEST_PREVIEW=1 npm run verify` | Registry build, lint, types, Brain, Agent and MCP lanes passed. The root production Playwright suite reported 461 passed and 3 skipped. |
| `node platform/tests/browser.mjs --local` | Clean Next.js install, 31 blocks, dashboards, Chromium/Firefox/WebKit, 320–1920 px. |
| `node platform/tests/b8-browser.mjs --local` | Marketing template passed all 16 blocks across Edit, Interact, Run and standalone export, including drafts, media recovery and offline PWA. |
| `node platform/tests/b9-browser.mjs --local` | Four routes each for Fieldnotes Handbook and Relay Operations passed Edit, Run and independent export in Chromium, Firefox and WebKit. Chromium exercised Relay offline and checked all eight exported routes in light and dark. |
| `node platform/tests/b10-browser.mjs --local` | Four template families, 12 section recipes and five independent exports passed. Chromium, Firefox and WebKit exercised the exports. Both PWA outputs passed offline. |
| `node platform/tests/b11r-portable.mjs --controls --extended` | Portable sources installed, built and ran as independent Next.js and offline PWA. The controls envelope rejected stale hashes, forged senders, invalid values and unknown keys. A valid edit preserved interactive source state. |
| `node platform/tests/b11r-source-faults.mjs`, `node scripts/v9/check-public.mjs` | Six source integrity/rights probes passed. Public output contains provenance and public Studio wiring. |
| `node platform/tests/unified-studio-browser.mjs <block> <source-graph> <code-project>` | All three formats passed at five Chromium and two WebKit sizes. |
| `node platform/tests/discover-build-browser.mjs` | Four original selections, fifth-choice suppression, selection removal, preview and draft carryover passed in Chromium and WebKit. |
| `node platform/tests/discover-project-browser.mjs <code-project> <block> [evidence-directory]` | Chromium at 1440 px and WebKit at 320 px passed compatibility, local-only rejection, Escape, saved state and browser history. |

## Local performance

The Projects benchmark used the same loopback host, a 1440×900 Chromium viewport and an empty managed vault. It compared the baseline Build launcher with the root at `9a1cbde` using seven cold browser contexts per route and one discarded warm-up. Median first contentful paint went from 40 to 32 ms. The first project-list response completed at 72.9 and 56.8 ms after navigation, respectively. Median script transfer went from 187,887 to 191,833 bytes. These figures describe the local launcher sample. Raw values are in `projects-benchmark.json`.

The B8 fixture reported first Run ready in 5.47 s. Its three repeated starts took 5.44–5.45 s and peaked around 82 MB. The local export probe recorded LCP of 48 ms and CLS of 0.011 for that fixture. Tally's independent cold production builds took 12.57 s for Next and 13.31 s for PWA. Tally's validated two-source Codex revision peaked at 351 MB RSS and 90 MB scratch.

## Screenshots and evidence

Paths in this section are relative to the ignored `.motionux-v9/evidence/unified-studio/` directory.

| Surface | Before | After |
| --- | --- | --- |
| Projects | `before/projects.png` | `after/projects-1440-light.png` |
| Studio | `before/studio.png` | `after/studio-1440-dark.png` |
| Discover | `before/discover.png` | `after/discover-1440-light.png`, `after/discover-detail-1440.png` |
| Mobile Studio | `before/studio-mobile.png` | `after/studio-390-mobile-canvas-dark.png` |
| Desktop Add | Legacy list picker | `after/add-component-1440-dark.png` |
| Mobile Add | Legacy list picker | `after/add-component-390-final-dark.png` |
| Existing project handoff | Discovery carried sources into a new brief | `after/discover-use-in-project-1440.png`, `after/discover-use-in-project-320.png` |
| Project recovery | A generic recovery item | `after/projects-recovery-1440.png`, `after/projects-recovery-390.png` |

The responsive Studio set uses `after/studio-{width}-{scheme}.png`. The native receipts are `native-create.json`, `native-automatic.json`, `native-revision.json` and `native-owned-revision.json`. The export and Inspector receipts are `exports.json` and `tally-inspector.json`. The accessibility receipts are `zoom-and-semantics.json` and `mobile-revision-controls.json`. `final-workflows.json` records rights, cancel and responsive browser observations. Browser lane output is in `root-verify-delivery.log`, `build-b8-local-retake.log`, `b9-local-final.log`, `b10-local-final.log`, `discover-build.log`, `discover-project.log`, `workspace-delivery.log`, `projects-recovery.log` and `portable-code-final.log`. The test projects use local demonstration data.
