# ONE-SHOT CODEX GOAL — MOTIONUX UNIFIED STUDIO V1

**MISSION:** Transform the existing `SapienXai/MotionUX` repository into a coherent, production-grade, **unified MotionUX Studio** in ONE uninterrupted autonomous implementation task. Do not stop after audits, planning, wireframes, or one screen. Complete the actual repo changes, tests, screenshots and handoff across all phases below. Do not ask for step-by-step approval or send me back an implementation plan; the product decisions and references are supplied in this package. Be decisive about code-level details after reading the actual codebase.

## The contract you must read before changing code

- `docs/unified-studio/UX_BLUEPRINT_TR.md` — complete product/UX contract, phases, behaviors, acceptance checks, constraints.
- `docs/unified-studio/references/projects.png` — Projects desktop visual hierarchy.
- `docs/unified-studio/references/studio.png` — unified Studio desktop workspace hierarchy.
- `docs/unified-studio/references/discover.png` — unified Discover/catalog hierarchy.
- `docs/unified-studio/references/mobile-studio.png` — mobile Studio layout.
- `docs/unified-studio/references/studio-add-component.png` — in-context desktop Add component drawer.
- `docs/unified-studio/references/mobile-add-sheet.png` — in-context mobile Add component sheet.
- The corresponding `.html` reference screens are optional implementation-inspection aids, **not production code to copy**. Preserve original repository branding where these prototype illustrations differ. The screenshots contain illustrative names/data/availability; never copy them as factual production claims.

If this goal file was supplied outside the repository, locate the package in the attached/extracted work folder and first place it at `docs/unified-studio/` without mutating existing repository data. Read the package in full. **Start from actual current `main` HEAD**; prior known reference revisions include `846e989` (Kinetic creator) and `b89956e` (Discover→Build selection), but do not assume they remain current.

## End-state — what the user should experience

An ordinary person opens MotionUX and sees **Projects**: a single clear brief box and their recent apps. They create or resume an app and work inside **one Studio**, with pages/structure on the left, the real canvas in the center, selected content/style/motion controls on the right, and an AI change prompt in context. They can find/try/select verified components without leaving their current project, then preview, save, inspect and export. **Discover** is a coherent component library with live specimens, eligibility, provenance and one-click project handoff. All three experiences feel like one product on desktop and mobile, in system/light/dark. Internal Brain, Agent, Playground, My Library, Motion DNA, Inspector, Integration Lab, source provenance and revision/export machinery remain accessible in the correct contextual location, not separate high-level products.

## Non-negotiable architecture rules

1. **Unify the UX, not by force the document formats.** Existing typed Puck/block documents, B11 SourceGraph documents and B11R CodeProject documents must all open under the same shared Studio UI shell. Build adapters when needed; keep each type's real editor, persistence, verification, revision and export semantics. Never pretend a CodeProject supports arbitrary Puck drag-and-drop. Prefer the latest source/code project workflow for new natural-language app creation.
2. **Source truth & rights:** preserve pinned original bytes/identity, compatibility profile, licensing notices, sandbox/origin boundaries, local-only vs exportable eligibility, secure Codex bridge, exact build and native generated modules. Do not call compiler-eligible “visually verified” automatically. Export restrictions must be real.
3. **No fake controls:** every displayed CTA, filter, edit control, saved badge, preview or progress status must execute correctly or reflect real state. Remove dummy navigation, misleading status, duplicate buttons and noisy developer jargon from default UI.
4. **No scope inflation:** do not add SaaS accounts, databases, billing, cloud runtime, new auth or unrelated features. No redesign of generated customer apps; redesign the MotionUX authoring interface. Reuse current libraries where possible and avoid large dependencies.
5. **Compatibility and safe code:** maintain deep links for `/`, `/build`, `/discover`, legacy 5199 gallery, saved projects, favorites/collections/notes, draft recovery, actual Next preview/export, PWA, Brain/Agent/MCP contracts. If a redirect is necessary, cover it with tests. Respect worktree changes, do not overwrite unrelated work, do not force-push, and do not delete user data. Prefer direct sequential commits to `main` only when the current working tree and branch state make this safe; otherwise use one coherent delivery branch and report why.
6. **Reference fidelity:** imitate the four screenshots' layout, density, hierarchy, interaction feel and selected-state style, but use the actual app's true data and controls. Maintain practical UI at 320/390/768/1024/1440 px and proper keyboard/accessibility.

## Code you must inspect (extend investigation as needed)

- `platform/apps/studio/app/page.tsx`, `studio-chrome.tsx`, `studio.css`, `layout.tsx`
- `platform/apps/studio/app/build/composer.tsx`, `editor-loader.tsx`, `kinetic-editor.tsx`, `kinetic.css`, `component-picker.tsx`, `component-preview.tsx`, `code-editor.tsx`, `source-editor.tsx`, `source-job*.tsx`, `local-sources/page.tsx`
- `platform/packages/build-canvas/editor.tsx`, `interact-preview.tsx`, `runtime-inspector.tsx`, `integration-lab.tsx`
- `platform/packages/build-core/*`, `app-export/*`, `build-core/source/*` and code-generation security contracts
- `studio/app/shell.tsx`, `studio/app/studio.tsx`, `studio/sources/gallery.tsx`, `studio/sources/lab.tsx`, `studio/sources/build-selection.tsx`, `studio/library/*`, `lib/studio-bridge.ts`
- Existing `platform/tests`, `docs/BUILD-B11R-ACCEPTANCE.md`, `docs/BUILD-B11R-ARCHITECTURE.md`, `docs/BUILD-B8-ARCHITECTURE.md`, `AGENTS.md` and package scripts.

## Run these phases end-to-end, in order, without requesting new instructions

### Phase 0 — Baseline and dependencies

Map all routes and existing UX shells, user workflows, source catalogs, source-rights rules and editor capabilities. Record current HEAD, worktree status, valid scripts and test baseline. Identify true duplication vs intentional isolation. Write a compact design/technical decision log within the delivery report. Capture available current screenshots for before/after comparison. Do not stop with an audit.

### Phase 1 — Unified navigation and Projects

Replace the landing-choice labyrinth with the Projects-first surface from the reference. A real `Create app` brief is the sole main CTA; optional sources/templates are secondary. Recent projects resume exact state/revision. Human-readable creation progress, retry/cancel/recover and errors. One global top chrome; route migration/redirects preserve old URLs without dual nested navigation. The project itself remains the primary context.

### Phase 2 — One Studio shell for three document types

Build/refactor a reusable Studio workspace shell with project header (real saved/draft state), page tree, context Add, responsive canvas, device picker, selected properties, AI change prompt, Preview, Export and advanced tools. Make real editor adapters for Puck, SourceGraph and CodeProject; reuse current Kinetic where appropriate. Preserve controls, field validation, real revision/Undo/Redo, media, Run/Export and per-format limitations. Never rewrite valid source-generated applications into generic mock blocks. Avoid persistent mode clutter; make modes contextual and explain saved preview vs live draft truth.

### Phase 3 — One Discover / Add source experience

Consolidate the overlapping Gallery, Playground, Local Sources and picker workflows through one source-backed catalog model and shared interaction components. A user must be able to search, filter, try a real specimen, inspect provenance/rights, save and attach a compatible component in-place from Studio. Keep existing `buildSourceIds`/selection constraints, source pins and dedicated isolated previews; preserve project context and return focus/history. All status labels derive from actual eligibility and verification evidence, never mock values. Old deep links and My Library data must remain reachable.

### Phase 4 — Design system, responsive and interaction quality

Implement a unified token hierarchy and remove contradictory style layers. Match design references in layout, type hierarchy, subtle lilac accent, high readability, spacing and low-noise surfaces. Responsive desktop/tablet/mobile with canvas-first sheets; test 320 and 390 specifically. Dark/light/system accurately follow user and OS. Add consistent hover/pressed/selected/success/error/loading/focus feedback and motion (reduced-motion alternatives). Make touch, keyboard, dialogs and reading order robust. Technical-only controls go into contextual Advanced/Inspector surfaces rather than ordinary navigation.

### Phase 5 — Full real-user vertical slice and regression

Test normal project creation (native generated code when supported), reopen a previously saved Puck project, reopen SourceGraph, reopen CodeProject, edit selected controls, Undo/Redo/Save, AI revise via real job, Preview/Run, Inspect, real source Discover→Add, export and PWA. Exercise no-source, incompatible-source, local-only, permission/license failure, interrupted generation, stale revision and preview failure states. Verify no source security or export regression. Take actual browser screenshots at desktop, tablet, 390, 320 in light/dark and compare to reference hierarchy; make visual passes, not only unit tests.

Use the existing repo test lanes as applicable, including `pnpm --dir platform test`, `pnpm --dir platform typecheck`, `pnpm --dir platform build`, native/portable browser cases and security contracts. Execute only commands valid for the inspected repo/current environment. If native signed-in Codex, source vault, OS sandbox, GUI browser or physical mobile hardware is not available, explicitly mark those cases BLOCKED and demonstrate all non-blocked lanes. Never convert an unavailable test into PASS. Never tamper with license verification, fixtures, snapshots or security conditions to force green.

### Phase 6 — Cleanup and delivery

Delete or deprecate only truly dead duplicate presentation code after checking compatibility. Minimize CSS collision/technical debt. Finalize tests, screenshots, docs, route compatibility. Write `docs/UNIFIED-STUDIO-DELIVERY.md` with actual implementation map, shipped user flows, changed routes, source/capability limits, test receipts and explicit PASS/FAIL/BLOCKED, before/after screenshot paths, environment blockers and commit hashes. A task is NOT done merely because build/typecheck passes; finish all reachable user workflows and the final UX acceptance matrix from `UX_BLUEPRINT_TR.md`.

## Autonomous execution protocol

- **One task, all phases:** do not hand the implementation back after any intermediate checkpoint. Treat each phase as a dependency of the next. Keep a concise internal plan and sequential commits/checkpoints so context-window interruptions can be resumed from the repo, not from my manual instructions.
- **Self-correct:** after each phase run focused tests; if broken, fix before continuing. Reserve a full regression/visual pass for the end. Any design decision needed to complete the goal should be chosen using this blueprint, the references and actual repository constraints.
- **No false certainty:** if an external secret/service/signature/platform permission is genuinely unavailable, work around only where safe, continue all independent phases, mark blocked clearly and stop short of fabricating success. Do not ask questions for ordinary implementation choices.
- **Change files, not just reports:** deliver actual working UI, backward compatible data flow, test code, screenshots and code cleanup. Do not call a mockup or an isolated demo a delivered feature.
- **Final summary only at completion** with exact SHA(s), changed UX, confirmed tests, blocked checks, and paths to report/screenshots. No intermediate request for user confirmation.

**Definition of done:** A first-time user can build an app, an existing user can reopen one, everyone sees one coherent Studio and Discover experience, and verified source / actual generated-app / edit / preview / export behavior remains correct. Polish to match the reference images; the system must be useful, not merely pretty.
