# MOTIONUX BUILD FOUNDATION V1
## Platform Architecture · Premium App Blocks · Live Canvas · Exportable Working Apps

> **TYPE:** DIRECT IMPLEMENTATION ORDER FOR CODEX — not a brainstorm, audit-only report, design-only mockup, or request for a new plan.
>
> **TARGET:** `SapienXai/MotionUX` (`main`), existing local macOS repository, Node 24, React 19, and the local prepared `.motionux-v9/` vault.
>
> **BASELINE KNOWN AT AUTHORING:** GitHub `main` commit `681d2a981b1109531a0e79c0146881009b9db122` (`Recheck the Agent V4 lease at the filesystem boundary`). Verify the actual local and remote HEAD, working tree, and installed versions at runtime; do not assume they stayed unchanged.
>
> **DELIVERY:** Build and integrate a real, usable product vertical slice; verify it end-to-end; update product direction and agent rules; commit and push to `main` if the acceptance gates pass. No production deployment, public release, unrelated repository changes, or fake acceptance.

---

## 0. READ THIS FIRST — THE NEW PRODUCT DECISION

MotionUX must evolve from a local collection of 500 original motion components into **a component-powered, Codex-connected visual application studio**. Its product statement is:

> **Don't generate random interfaces. Build real apps with proven components.**

This is **not** a clone of Google Stitch, not a generic low-code page builder, and not another purely generated UI gallery. MotionUX combines:

1. **Verified Originals** — 500 prepared source-pinned components (existing Studio Gallery, Playground, Compare, My Library and Project Kit).
2. **Premium App Blocks** — interoperable, functional application-level compositions: sidebars, headers, dashboard, data, forms, navigation, feedback and responsive mobile app shells.
3. **Motion Brain + Motion DNA** — explainable choice, appropriate restraint, consistent motion identity, accessible behavior and performance evidence.
4. **MotionUX Build** — a live visual canvas that edits a structured app, actually runs its UI, saves the project and exports clean source code.
5. **Codex App Composer** — a later full agent that interprets user intent, chooses from the verified catalog and composes real working applications, with verified builds and explicit write authority.
6. **Motion Inspector** — a later analyzer for real behavior, accessibility, layout and performance regressions.

**Priority rule:** preserve real behavior and design quality over nominal component count. No screenshot masquerading as a web app, no fake browser preview, no imported boilerplate claiming to be a functioning integration, no blanket "works on mobile" statement derived only from emulation.

### Exact scope of THIS task

Deliver **MotionUX Build Foundation V1** with:

- A Next.js-based Studio product shell, introduced by a safe **incremental** migration, not a destructive rewrite.
- A pnpm workspace/monorepo with clear package boundaries and a preserved working legacy Studio experience.
- A curated **App Blocks V1** catalogue with premium desktop/mobile navigation, dashboard and form components.
- A real **Build** workspace integrated into Studio: left block/page navigator, center working responsive canvas, right selected-block inspector, top project controls.
- A versioned local project document model, safe creation, save, reload, undo/redo, export and deterministic regeneration.
- One genuinely working, independently runnable **Next.js 16 / React 19 / Tailwind 4** premium hotel-management dashboard example, with several pages and native-feeling mobile navigation.
- At least one demonstrated visual edit that modifies the saved project, changes the actual app preview, survives reload, and changes the generated source.
- Real browser, accessibility, performance, persistence, security and rollback evidence.
- Thorough revisions of `PRODUCT.md`, `AGENTS.md`, `docs/ROADMAP.md`, developer guide, design principles, architecture and quality gates. Clearly distinguish **available now** from **future**.

Do **not** pretend that V1 already builds arbitrary full-stack apps from any prompt. Define and validate the **structured App Composition Plan** contract and, if genuinely verifiable, an optional local Codex-based planner for a *new managed project*. The editor, app and export **must work without any AI API, remote model or Codex account**. Full natural-language-to-arbitrary-app execution is a separate named roadmap milestone.

---

## 1. NON-NEGOTIABLE ENGINEERING, UX AND SECURITY PRINCIPLES

1. **Real implementation over a demo shell.** Canvas previews render real React components. A separate exported Next.js project must install, typecheck, build, run and respond to interactions independently of the MotionUX Studio.
2. **Component-first generation.** All generated UI elements resolve to a registered, vetted block ID with a typed schema, version, implementation and provenance. A text prompt cannot become arbitrary unreviewed TSX injected into an app.
3. **App state belongs to the app.** Booking/payment/authorization confirmations must never be simulated as real results by a timer or an animation. Demo data is explicitly labeled and local, with deterministic state transitions.
4. **Motion with purpose.** Use subtle transitions on meaningful state changes; preserve keyboard focus, reduced-motion behavior, direct state visibility, interruption and cancellation. Do not animate everything.
5. **Premium design quality.** Aim for Apple/Linear/Vercel-class clarity without copying their branded UI. Consistent grid, typography, spacing, radii, tokens, contrast, density, empty/error/loading states, focus and mobile native-feeling navigation. The app must look intentionally designed, not like a collection of mismatched library samples.
6. **Performance is a feature.** Lazy-load the heavy editor and expensive previews. Bound active iframe count, CPU work, memory, store sizes, development servers and temporary build output. Protect the recently reduced ~3.14 GB private-vault baseline.
7. **No dangerous widening of V4.** V4 real-project writes remain `REAL_PROJECT_WRITES_DISABLED`. Its fixture signer is not a verified human-approval channel. Do not add `apply`, `write`, `install` or `rollback` tools to the existing five read-only MCP tools. New **explicitly user-created, MotionUX-managed** project workspaces may be written by the Build editor, but this is not authority to edit BookPlace, DineWallet, other existing repos, or arbitrary paths.
8. **Source and license fidelity.** Keep 500 originals, 9,969 existing source-file hashes and their notices unchanged; verify the count/identity against the current actual baseline. Never publish private upstream payloads, preview traces or vault data. Disallow export of a component with incompatible or unclear redistribution rights; show a precise reason instead.
9. **Local-first V1.** No new DB, SaaS, auth server, deployment, hosted inference, proprietary API key, payment or tenant management. Use local filesystem project storage and existing Git/code flows.
10. **Tests or it did not happen.** Verify a real feature in Chromium, Firefox and WebKit where applicable. Automated accessibility is not a substitute for manual assistive-tech testing; report coverage honestly.
11. **No cosmetic dead controls.** Every visible button, save control, viewport selector, undo, block palette entry and navigation item must function, or be intentionally absent. No inert "AI Generate" control.
12. **Do not turn `AGENTS.md` into a giant prompt.** Keep it short, enforceable, versioned and linked to the real architecture/quality documents; preserve every existing safety constraint.

---

## 2. BASELINE INSPECTION AND MIGRATION SAFETY (MANDATORY FIRST ACTION)

Inspect the actual repository instead of relying on this prompt's mental model. In particular read:

- `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `README.md`, `docs/ROADMAP.md`, `docs/QUALITY-GATES.md`, `docs/DESIGN-PRINCIPLES.md`.
- `studio/app/{studio.tsx,shell.tsx,catalog-view.ts,entry.ts}`, `studio/sources/local.tsx`, `studio/library/*`, `studio/styles/*`, `studio/main.tsx`.
- `scripts/studio/start.mjs`, `scripts/v9/serve.mjs`, `scripts/studio/v11/{library.mjs,paths.mjs}`, `scripts/studio/storage-audit.mjs`.
- `src/brain/*`, `src/agent/*`, `scripts/mcp/*`, `scripts/agent/v2/*`, `scripts/agent/v3/*`, `scripts/agent/v4/*`, their schemas, existing fixtures and regression tests.
- `package.json`, `package-lock.json`, `vite.config.mjs`, `playwright.config.ts`, `.github/workflows/ci.yml`, `.gitignore`.

Record before changes:

- Git `HEAD`, `origin/main`, uncommitted changes and pending conflicting work. Respect user edits; do not reset/delete them.
- Current Node, npm, pnpm, Next.js and React compatibility; package-manager choice/lockfile strategy; shell and offline cache.
- Baseline Studio pages, catalog count and navigation deep links, 500 Gallery/Playground routes, 21 Library flows and existing public registry/consumer parity; distinguish local-vault evidence from public CI.
- Current `npm run verify`, Brain/Agent/MCP tests, original source hash checks; baseline screenshot and timing at representative 1440px desktop and 390px mobile.
- Current persistent and allocated vault size from `studio:storage:audit`, available disk, generated caches, inodes and peak build footprint.

Create private rollback/checkpoint evidence before changing critical configs or data. Avoid copying the whole 500-original vault. Keep it ignored. On a change conflict, reconcile precisely and safely; never `git reset --hard` a user workspace.

**Decision gate:** If local compatibility of the proposed Next/pnpm/Puck versions cannot be proven, implement a documented side-by-side migration first. Never break Studio to make an architectural diagram look complete.

---

## 3. PRODUCT VISION, ROADMAP AND AGENT CONTRACT — WRITE THESE EARLY

Update product direction before generating components so subsequent steps have a fixed target. Create/update:

1. `PRODUCT.md` — what MotionUX is, audience, differentiation, daily user jobs, quality bar, boundary between managed projects and existing repos; state **component-powered visual app builder** as product direction.
2. `docs/ROADMAP.md` — retain historical V8–V14, Brain, Agent V1–V4 and MCP stages accurately; add a clearly ordered **Build Track** with acceptance gates:
   - **B0: Platform Foundation** — Next Studio + pnpm workspace + preserved catalog.
   - **B1: App Blocks** — premium verified layout/dashboard/mobile blocks and registry.
   - **B2: Build Canvas** — visual editing + project data + preview + saves + exact source export (this task's primary deliverable).
   - **B3: Codex App Composer** — goal/brief -> evidence-backed block selection -> app plan -> managed-project generation -> browser review; no arbitrary code unless a separately reviewed workflow permits it.
   - **B4: Responsive Web/PWA Builder** — mobile shell patterns, PWA installability, correct routing and state, truthful offline behavior.
   - **B5: Motion DNA** — per-product pacing, reduced-motion, animation and design-token policy.
   - **B6: Inspector** — layout/a11y/motion/performance trace and repair feedback.
   - **B7: Real-project integration** — only after V4 host identity/human approval security is independently verified.
   - Public hosting/accounts/collaboration later and explicitly out of V1.
3. `AGENTS.md` — append a concise **MotionUX Build architecture/quality** ruleset, preserving old clauses. Required MUST/NEVER statements: verified blocks only; no fake previews; source pin/license checks; no random repo edits; production writes disabled; preserve Studio 500; run real browser/accessibility/performance acceptance; no design regressions; respect 3 GB storage discipline; read named docs before touching Build.
4. `docs/BUILD-ARCHITECTURE.md` — boundaries, sequence of preview/editor/export, process and data trust zones, file layout, ADRs, source of truth and migration steps.
5. `docs/BUILD-DESIGN-SYSTEM.md` — visual tokens, typography, spacing, motion, breakpoints, content density, accessibility and screenshot review rubrics.
6. `docs/BUILD-QUALITY-GATES.md` and `docs/BUILD-SECURITY.md` — named commands, reproducible tests, filesystem/process boundaries and no-go criteria.

Do not mark future roadmap capabilities as shipped. Include a simple version/status matrix and architecture diagram with provenance links to actual code. Update README when implementation reaches acceptance.

---

## 4. ARCHITECTURE — NEXT.JS PRODUCT SHELL, PNPM WORKSPACE, VITE AS A TOOL

The intended architecture is a **product shell + separate runtimes**, not "replace Vite everywhere":

```text
motionux/
  apps/
    studio/                # Next.js 16 + React 19 user-facing Studio & Build UI
    preview-host/          # Bounded local preview orchestration (implementation may be Node-only)
  packages/
    design-system/         # Tokens, primitives and polished shared UI
    app-blocks/            # Typed registered application compositions
    build-core/            # Project schema, validation, migrations, atomic persistence
    build-canvas/          # Puck adapter and inspector UI; client-only boundaries
    app-export/            # Deterministic Next.js project/code generator
    brain/                 # Existing Brain via source-preserving migration/adapter
    agent/                 # Existing Agent V1–V4 via source-preserving migration/adapter
    mcp/                   # Existing read-only MCP via adapter; same names/contracts
  templates/
    hotel-dashboard/       # Fully working Next.js example
    react-web/             # Later/optional; can serve as second runtime test
    mobile-pwa/            # Planned full PWA track; no false offline claim
  studio/                  # Legacy Vite-era implementation maintained during transition
  src/ scripts/ schemas/   # Current contracts retained until migration verified
  .motionux-v9/           # Ignored private local vault; do not duplicate
```

This tree is a **target organization, not a mandate to create empty packages**. Establish actual import/package boundaries only where code exists. Avoid duplicated Brain/Agent implementations, generic wrappers, empty directory theater and massive one-shot moves. Use temporary compatibility re-exports where necessary, record remaining legacy paths in an ADR, and eliminate only those proven obsolete.

### Package manager

- Prefer pinned **pnpm workspaces** with `pnpm-workspace.yaml`, Corepack-aware installation, `workspace:` imports, one canonical committed lockfile and reproducible `--frozen-lockfile` CI.
- Check the pnpm version supported by the machine/CI and actual Next/Puck/toolchain peers; pin a tested version in `packageManager`, not `latest`.
- Migrate root `npm` scripts and old CI in a **controlled dual-compatibility phase**: legacy tests continue to work, or aliases/bridges documented. Update consumer fixture commands and isolated npm lock installs only where necessary. V3/V4 scripts using npm in independent fixtures can remain npm if required by their locked contracts; do not casually rewrite them.
- Do not copy tens of gigabytes of `node_modules` into packages. Honor the shared pnpm store while retaining isolated reproducible exports.
- Avoid Turborepo until measured performance or dependency ordering demonstrates a need. Document the choice.

### Studio shell

- Use **Next.js App Router** for new `apps/studio` with React 19. Keep the editor behind lazy client-only boundaries; preserve RSC/SSR correctness for public pages.
- Provide accessible routes/links for **Gallery, Playground, My Library, Build, Project Dashboard, and Settings/Docs as appropriate**. Public/legacy routes and deep links must not silently break. An old-site iframe is a valid interim fallback but **not an accepted final replacement** for native migrated navigation.
- Existing 500-original browsing, selection, source comparison, local library, Project Kit and no-user-deployment behavior must stay intact. Migration may be done route by route while keeping the legacy preview service running on a separate loopback port.
- Keep **Vite** for high-speed React preview/legacy original demos and test utilities where it proves useful. Do not use Vite to fake Next.js App Router/SSR execution. For Next templates use a real Next runtime.
- Use `transpilePackages` where needed instead of Babel hacks, fragile deep relative imports or multiple React copies. Prevent hydration and cross-version React problems.
- Preserve public registry and package release paths; do not publish any private catalog accidentally.

**No-go:** An attractive new Next landing page that loses the existing working Studio is not a successful migration.

---

## 5. DESIGN SYSTEM — PREMIUM IS A VERIFIED PROPERTY

Create one coherent MotionUX product design language with design tokens shared by Studio and generated apps. Desired character: **quietly premium, readable, Apple/Linear/Vercel-class precision, efficient on mobile, distinctive without decoration overload**.

Requirements:

- Semantic tokens, not ad-hoc hardcoded component colors: background, panel, surface, elevated, text, muted, border, ring, accent, destructive, success, warning, disabled; light and dark, contrast-tested.
- Modern UI typography with coherent type scale, optical alignment, line heights, numbers, truncation and locale-aware Turkish text. Typefaces must be appropriately licensed and delivered through normal packages, not bundled font files in reports.
- A consistent grid, 4/8px spacing rhythm, controlled radius, sensible content max width, alignments and density. No overlapping or unused giant blank regions at common widths.
- Desktop navigation supports a full sidebar and compact icon rail, nested items, submenu, selection states and workspace switcher. At 320–390 CSS px, use bottom navigation and/or a well-designed drawer; do not just shrink the desktop sidebar.
- Functional feedback: focus-visible, keyboard shortcuts with help, outside click behavior, Escape, live-region announcements, skeletons/empty/error states, no deceptive loading or payment success states.
- Motion tokens (duration, easing, springs) with one-purpose semantics and `prefers-reduced-motion`/no-motion hard override. Avoid blanket page transitions and persistent GPU-heavy effects.
- Design/canvas screenshots at **320, 375/390, 768, 1024, 1440 and 1920 px**; review both schemes, long labels, 200% zoom and keyboard focus. Detect horizontal overflow.
- Exported apps inherit a coherent product-specific theme without requiring the Studio CSS. No uncontrolled global upstream theme resets from original libraries.

Keep a versioned component screenshot gallery and score each representative screen for visual quality, UX, responsiveness, a11y and runtime performance. Record issues, fix them and repeat. Never equate an Axe pass with great UX.

---

## 6. APP BLOCKS V1 — VERIFIED, COMPOSABLE, NOT 32 PLACEHOLDERS

Add an App Blocks layer, separate from the current **500 originals**. Do not confuse the number of blocks with the number of original provider sources. Blocks may compose MIT-compatible shadcn/Radix-like primitives, proven MotionUX originals or our original glue; each block records its actual origin, ownership and redistribution eligibility.

**Required initial inventory: target 32 working block entries (minimum 24 fully verified before claiming readiness), grouped as follows:**

| Family | Required entries |
| --- | --- |
| Shell / navigation | `AppSidebar`, `IconRail`, `CollapsibleSidebar`, `SidebarInset`, `WorkspaceSwitcher`, `Topbar`, `Breadcrumbs`, `CommandPalette`, `MobileBottomNav`, `MobileDrawer` |
| Dashboard / data | `KpiCard`, `KpiGrid`, `ChartCard`, `DataTable`, `FilterBar`, `RecentActivity`, `StatusBadge`, `EmptyState` |
| Forms / control | `FormField`, `SearchField`, `SelectField`, `DateRangeFilter`, `SettingsPanel` |
| Feedback / overlays | `Dialog`, `Sheet`, `Toast`, `Skeleton`, `ConfirmationFlow` |
| Content / media | `PageHeader`, `Hero`, `ImageGallery`, `FeatureGrid` |

Each entry must be independently discoverable in **Blocks** and useable by the Build Canvas. Variants count as one entry, not dozens of invented components. Prefer a modest number of polished, accessible compositions over proliferating classes. Show a clearly labeled, honest implementation count if the minimum is not met; never invent components to pass the number.

### Block contract

Implement a versioned registry and schemas covering at least:

- Stable `blockId`, `version`, family, display title, use cases, default props, typed prop schema and editable fields.
- Real TSX implementation, dependency pins, import closure, peer range and host target constraints.
- Provenance (`owned-composition`, official package name/commit/hash if reused), license and `exportEligibility` with reason.
- Responsive capabilities (`desktop`, `mobile`, `tablet`) and supported layout slots, composition rules and design tokens.
- Interaction contract: keyboard, touch emulation, focus restoration, reduced motion, loading/empty/error states, valid semantics.
- Performance contract: SSR/client boundary, lazy bundle hints, preview cost, known evidence and unknown coverage.
- Generated source mapping and stable per-instance IDs for editor selection and export.

This registry is the shared source of truth for block picker, editor controls, preview, generator, tests and future Codex composer. A component is **not certified** merely because it appears in a palette. All security/licensing claims must be evidenced.

### Mandatory interactions

- Collapsible desktop sidebar actually collapses/expands; active route remains visible; focus remains predictable; responsive/mobile navigation works.
- Header search/command palette actually opens, focuses input, filters commands and handles Escape.
- Table actually sorts/filters/pages client-side demo data with accessible names and empty results.
- Dashboard KPI/chart display real derived demo dataset (clearly demo), not decorative fake numbers disconnected from state.
- Drawer/dialog/sheet actually open/close, trap or restore focus appropriately, and support keyboard/touch.
- Mobile tab/bottom navigation switches the active app screen correctly.
- Reduced-motion makes essential state changes immediately legible with no reliance on animation completion.

### Reuse carefully

Research current official shadcn/ui blocks, Puck, installed primitives and upstream MotionUX originals; choose by actual code quality and license, not popularity alone. Respect Animate UI's **MIT + Commons Clause** and any other nonstandard rights; **do not assume all 500 originals may be redistributed as part of exports**. Use eligible primitives or new original owned compositions if redistribution is unclear. Preserve all upstream attributions and notices.

---

## 7. BUILD CANVAS — EDIT A REAL APP, NOT AN IMAGE

Use the established **Puck React visual editor** as the first candidate, **only after a real proof of compatibility** with Next 16 / React 19 and our type/visual/state constraints. Record its pinned version, MIT license, peer dependencies, config/render/data contract and limitations. Puck is a structured component/data editor, **not** a general two-way arbitrary TSX AST editor. Do not claim otherwise.

If a genuine Puck blocker is discovered, document it in an ADR with a working failing reproduction, evaluate Craft.js or a minimal custom renderer, and select a tested alternative. Do not silently swap tools or build a wholly custom drag-drop engine without evidence.

### UX layout

**Top:** project selector, project name, save/persist status, undo/redo, Preview/Edit mode, viewport presets (Desktop/Tablet/Mobile), light/dark preview, export and tests/status.

**Left:** page tree and selected route, searchable block library with families, recently used blocks, drag/drop composition and visible insertion targets. No excessive nested panels.

**Center:** genuinely interactive app preview with real layout, loading/error boundaries, responsive frame size and keyboard/touch access. In Edit mode, show selection handles and drop targets. In Preview mode, remove editor chrome and interact normally.

**Right:** context-sensitive inspector for the selected block: content, props, variant, appearance, data binding, responsive visibility, motion (including no-motion) and accessibility fields. Use safe typed controls; invalid values cannot break the document.

**Bottom/drawer optional:** diagnostics, accessibility/build errors, exact export diff, source provenance. Keep this hidden until needed rather than forcing four cramped columns at all widths.

### Functional editing acceptance

- Create a new managed app from a template.
- Add an App Block via click and drag/drop, reorder it, select it, change props/variant, duplicate/delete it, and undo/redo.
- Switch pages. Add/rename a valid page and navigate to it in the working app. Prevent duplicate routes and invalid identifiers.
- Save, reload Studio and recover the same project and rendered result. Display unsaved/saving/saved/error states and avoid data loss.
- Switch Desktop/Tablet/Mobile and light/dark **without losing editing selection or application state unexpectedly**.
- Open Preview mode and demonstrate actual interactions, including sidebar, search, table and mobile navigation.
- Support keyboard alternatives to every drag/drop action (add/move/reorder/delete) and usable focus transitions.
- `Edit` vs `Run` may have separate live views, but both must derive from **the same versioned project document** and cannot diverge silently.

Use lazy loading and windowed palettes where appropriate. A block inspector must update immediately without rebuilding the whole world on every keystroke. Debounce only expensive build effects; keep form typing responsive.

---

## 8. DOCUMENT MODEL, PERSISTENCE AND UNDO/REDO

Create `BuildProjectV1`/`AppCompositionPlanV1` schemas with explicit versioning, project ID, pages/routes, route titles, block tree, immutable component IDs+versions, props, design tokens, motion profile references, demo data, target runtime, generated assets and revision/hash.

**Single source of truth:** A safe structured project document. The Puck document is an editing projection, not an unrelated permanent source. The generator reads this same validated document. V1 only supports known **managed blocks**; arbitrary source-code round-trip belongs to a later roadmap gate.

Persistence requirements:

- Only under `.motionux-v9/build/projects/<generated-id>/` (mode 0700), with explicit UI action creating the managed root. No arbitrary caller-provided paths.
- Validate project IDs, route names, filenames and all nested prop values against schemas. Bound depth, nodes/page, project count, bytes and image/file sizes.
- Atomic write with fsync where supported, revision check / optimistic concurrency control, conflict messaging, backup/recovery document and deterministic canonical serialization.
- Prevent traversal, symlink/hardlink redirects, case collisions, injected JSON keys and asset path escapes; refuse absolute or external path references.
- Undo/redo based on bounded document transformations, not a global `localStorage` dump; keyboard shortcuts with OS-appropriate conventions.
- Document migrations and an incompatible-schema fail-closed path; no silent data loss.
- Strictly separate local project assets from private provider payloads, traces, cookies and secrets.
- A real server reload or browser restart must retain the project; provide recovery tests for interrupted saves.

Do not add Supabase, Neon, Vercel DB or cloud storage for this first single-user local product.

---

## 9. PREVIEW RUNTIME — TWO BOUNDARIES, REAL FRAMEWORK BEHAVIOR

Build a **Preview Host** interface with adapters for:

- **Next.js App Router:** required for the V1 generated hotel-dashboard. Run the actual generated project in a bounded local subprocess, not a static PNG or a Vite-only lookalike. Validate SSR/route behavior, real client state and hydration.
- **React/Vite:** supported for legacy original component previews and as a future export target; verify local use remains intact. Full first-class Vite project export may be a later milestone, but document truthful coverage.

Requirements:

1. Separate the Studio admin server, live editor renderer and generated app runtime. An actual app preview uses a distinct loopback origin/port and an appropriately sandboxed iframe.
2. Start **only** explicitly managed, trusted code-generated projects with approved fixed command templates; do not accept arbitrary command strings, user-provided shell scripts, package lifecycle scripts or executables.
3. Bind loopback (`127.0.0.1`) and limit host/origin, CORS, file serving, WebSocket/HMR origin, CSP and frame-ancestors appropriately. **Never** set Vite `server.allowedHosts: true` or unrestricted CORS to make the demo work.
4. Sandbox subprocess filesystem/process/network access with a tested macOS boundary where available; sanitized environment, limited allowed paths, no inherited user secrets, no external network except explicitly reviewed package acquisition outside runtime. Child exit and cancellation must kill whole process groups.
5. Cap active preview processes, iframes and memory. Suspend inactive pages, clear orphaned builds, use per-project mutexes and bounded logs/timeouts. Do not spawn a fresh full Next server for every prop keystroke.
6. Serve explicit ready/failed status, retries, screenshot/trace endpoints only for authorized local project sessions. Do not use unrestricted `postMessage('*')` trust; verify message source, origin and token; no preview-to-Studio arbitrary code bridge.
7. Distinguish actual Next build preview from Puck's instant edit renderer. Show rebuild/update progress honestly, handle syntax/build failures without corrupting saved last-good project and maintain visible error details.
8. A running React app must actually respond to links, controls and state. Where no backend exists, display **demo mode** and use deterministic local fixture data only.

If full OS isolation cannot be proven for user-authored/untrusted code, **keep V1 limited to trusted registered blocks and generated code**. Don't expose opening arbitrary Git repos or arbitrary npm script execution; record this in UI/docs.

---

## 10. DETERMINISTIC EXPORT — A STANDALONE APP IS THE PROOF

Implement the **Next.js export pipeline** as a real generator, not as "download project JSON" labeled source code.

- Input: validated `BuildProjectV1`; output: a standalone directory/package or ZIP with `package.json`, pinned package lock, Next App Router source tree, route files, TSX components, shared tokens/styles, assets and provenance/notices as legally required.
- Generated app must use real modular imports, known registered block implementations, correct client/server boundaries, stable block instance IDs and safe prop serialization. No `eval`, template shell interpolation of untrusted user text or pasted free-form TSX from a model.
- Use the same visual block implementations in preview and export wherever feasible. Avoid hidden Studio-runtime dependencies. Generated source must be readable by an independent developer.
- Support functional navigation for at least `Dashboard`, `Bookings`, `Rooms`, `Settings` in the hotel demo. Use client-side sample data/state and label those as examples; do not imply real PMS/payment capabilities.
- Include a desktop collapsible sidebar, top header, active navigation, sample KPI/trend/activity/data table, content states, settings controls; mobile bottom navigation and/or drawer appropriate to screen size.
- Light/dark themes, responsive tokenized design and reduced-motion behavior must survive export.
- Repeated export with an unchanged document should generate **byte-identical source trees** excluding documented intentionally variable metadata. Ensure stable ordering, no random timestamps in generated code, and a manifest of SHA-256 hashes.
- Export to a new explicit managed output root; disallow overwrite of existing external repos, and never write into BookPlace/DineWallet/etc. Zip must reject zip-slip path issues.
- Verify export independently: copy or extract into a fresh clean directory, install reproducibly, typecheck, `next build`, run the app, open each route with Playwright, interact with sidebar/search/table/mobile nav, screenshot and test accessibility.
- Demonstrate a **source change** resulting from an edit in canvas: before/after export hashes and visually observable preview behavior change. JSON-only export is not enough.
- Do not implement or advertise arbitrary bidirectional round-trip editing of outside TSX projects; managed-block export/re-import is the correct V1 boundary.

---

## 11. FIRST END-TO-END REFERENCE PROJECT — PREMIUM HOTEL DASHBOARD

Ship one reference app showing that the product can genuinely assemble a polished web application using the blocks. Working name: **Hotel Desk** (fictional demo; do not use BookPlace or another existing proprietary app's assets/code without permission).

Reference brief:

> “Create a refined hotel-management dashboard for desktop and mobile. Desktop has a beautiful animated collapsible sidebar, search, notifications, reservations table, rooms, activity and overview. Mobile behaves like a native-feeling PWA-style interface with bottom navigation, touch-friendly controls and context-preserving transitions. Clean premium design, light/dark, accessible and fast.”

### Required flows

- Desktop overview with functioning sidebar collapse/expand, active route and workspace switch.
- Top header with working command/search overlay and notifications with demo state.
- Reservations page with real client-side sorting/filter/search, clear empty and populated states.
- Rooms page with usable cards, detail disclosure, selected-room state and meaningful motion.
- Settings page with working theme / sample preference controls.
- Mobile navigation that matches the same route state; no inaccessible offscreen controls or header/sidebar overlap at 320–390 px.
- Browser back/forward, reload on nested routes and recovery from a bad search/filter.
- A clearly indicated `DEMO DATA` context; no fake successful transaction.
- Canvas edit: add or reorder an activity/KPI block, edit a heading and sidebar variant, save, reload, preview and export, with identical resulting behavior.

Use tasteful original photography/assets only if usage rights are clear and loading is optimized. No giant nonfunctional mock image or unlicensed branding.

---

## 12. CODEX APP COMPOSER — PREPARE THE PATH WITHOUT FAKING AI

The user ultimately wants to type a prompt and have **Codex** compose web apps/mobile PWAs using proven blocks. Do not add another hosted AI stack.

Create a versioned **AppCompositionPlanV1** contract: `userIntent`, `selectedTemplate`, `pages`, `blockPlacements`, `responsivePolicy`, `theme`, `stateOwnership`, `motionPolicy`, `provenance`, `risks`, `verificationPlan`.

- Support deterministic **template → plan → managed project** now, with at least one full hotel-dashboard test.
- Implement a small prompt brief entry UI **only if it actually produces a validated plan and applies to a newly created managed project**; no fake "thinking" progress or hardcoded result presented as AI-generated.
- Optionally provide a Codex CLI planning adapter *only if* real local Codex availability, approved subprocess scope, schema-constrained output and successful end-to-end test are demonstrated. The model may choose existing block IDs and props, **never inject executable code/commands or authorize writing to other repos**.
- On unavailable Codex, provide an honest manual editor and ready template. No background AI processes, no new paid API.
- Keep five existing MCP tools unchanged/read-only. New Build planning tools or broader writes require their own explicit future contract; do not bypass V4.
- Document roadmap for multi-page natural-language editing, design-token adaptation, responsive app/PWA flows and actual backend integration as **future**, not V1 shipped.

---

## 13. TEST MATRIX — FUNCTION, REAL BROWSER, SECURITY, VISUAL AND REGRESSION

No readiness claim without **measured evidence**. Write CI-safe synthetic tests and local prepared-vault end-to-end tests, clearly separating them.

### Unit/contract tests

- 32 block registry entries and schema validity (or explicit partial count), props defaults, IDs, license/export decisions, dependency graph, responsive constraints, no-motion, source pins and version migrations.
- Plan composition, route uniqueness, deterministic generator snapshots/hash, nested block insertion/reorder/delete, undo/redo, schema rejection, project state and source export.
- Persist/reload, write conflict, corrupt JSON, interrupted save, backup recovery, hard/symlinks, traversal, case-collision, malformed assets, excessive sizes and unauthorized paths.
- Renderer/editor parity for all exported block families; external project path always denied.
- Preview process lifecycle, port collision, no network/filesystem escape, timeout and cancellation cleanup.

### Browser matrix

- Desktop Chromium (1440×900), Firefox; touch Chromium and WebKit (320/375/390), tablet (~768), wide desktop (~1920); selected light/dark and reduced-motion combinations.
- Studio shell navigation and legacy Gallery/Playground/Library/Project Kit routes before/after migration.
- Build left palette, drag-drop plus keyboard add, select and edit, right inspector, undo/redo, page routing, save-reload, viewport switch and independent preview.
- Real App Blocks interaction: collapse, keyboard command palette, sort/filter table, drawer, mobile navigation, forms and success/error/empty states.
- Exported Next app served from a fresh clean install: SSR, hydration, nested page reload, keyboard/touch, screenshots, no runtime 404/500, no console errors.
- Axe: zero **serious/critical** accessibility violations on tested screens; review other findings; keyboard-only flow, focus restoration, ARIA names/state, 200% zoom, long Turkish labels, reduced motion. Mark physical device and manual screen reader **unverified** unless actually performed.
- Invalid block/malicious prop input cannot cause code injection, source download, secret disclosure or path escape; no permissive CORS/host shortcuts.

### Performance and resource targets

Capture **before/after** under comparable profiles. Store raw numbers and test method, not only conclusions.

- Preserve previous Gallery lazy previews and bounded iframe behavior. Measure page JS payload, initial render/LCP, CLS, input latency, JS heap, renderer and GPU RSS when available, and active preview/document counts.
- New non-editor routes must not eagerly load Puck, preview runtime, block editor data or every 500-original source.
- Aim for generated demo **LCP ≤2.5 s**, **CLS ≤0.1**, good keyboard responsiveness under documented mobile throttling; treat platform-dependent metrics as profiles, not universal guarantees. Set a defensible bundle/interaction budget with a recorded baseline and investigate >15% regressions.
- Key visible motion must be purposeful, interruptible and not block navigation/focus; collect sample frames/CPU rather than claiming 60fps by eye. Reduced-motion keeps final state immediately visible.
- Keep persistent vault growth small and explain every category. Target **≤1 GB incremental persistent growth** for the foundation after temporary cleanup, unless an explicitly justified and measured exception is necessary; do not recreate 172 copies of `node_modules` or a 13 GB npm cache. Build replicas must clean after success/failure/cancel. Report peak temporary size, not just final storage.
- Track warm editor interactions: immediate selection feedback, responsive inspector typing, no full rebuild for a small prop change; compare cold start and HMR where relevant.

### Regression preservation

At minimum run the repository's existing `verify` or equivalent, Brain/Agent V1–V4 tests, native read-only MCP 5-tool regression, public registry/consumer parity, and prepared Studio 500-original paths. Verify all original source-file hashes and counts. Update `.github/workflows/ci.yml` for pnpm/Next while preserving old verifications; CI must fail on broken new Build tests.

Never report physical mobile, real payments/backends, full security sandbox for arbitrary projects, full source-code round-tripping or arbitrary AI-generated apps as verified unless actually tested.

---

## 14. MIGRATION, INCREMENTAL ACCEPTANCE AND CLEAN GIT HISTORY

Implement in gated phases **within this single assignment**. Do not stop after planning. Use coherent, scoped commits and avoid pulling the user into routine decisions:

- **M0:** baseline, ADR and private checkpoint.
- **M1:** new `PRODUCT.md` vision, additive `AGENTS.md`, versioned Build roadmap and architectural contracts.
- **M2:** pinned pnpm workspace + Next Studio shell, old Studio regression preserved; no premature deletion.
- **M3:** design system + verified App Block registry and real block library.
- **M4:** Puck-compatible Build Canvas, managed project model, persistence and editing UX.
- **M5:** real Next project preview and deterministic export; responsive hotel dashboard and functional interactions.
- **M6:** security hardening, screenshots/browser/performance evidence, CI, docs polish and compatibility fixups.
- **M7:** commit/push `main` and final objective report if gates are met.

At each gate, build/test the relevant section and fix real failures. If a blocker prevents the entire contract, ship safe independent working changes with an explicit `NO_GO`/`PARTIAL`, but **never mark a broken demo or a fake preview READY**. Do not silently replace a missing feature with a screen recording.

### Git constraints

- Work only in `SapienXai/MotionUX` and its ignored managed test workspaces. No changes to BookPlace, DineWallet, Play, XPOS or any other real project.
- The user approves normal repository development, tests, commits and push to `main` for this task. Do not deploy/host/release or touch live customer systems. Preserve any unrelated local edits and work safely with concurrent agents.
- Check `origin/main` and CI before pushing. Keep sensitive vault bytes and generated projects out of Git. Ignore temporary export zips, trace screenshots, build outputs and derived caches.
- Do not commit unlicensed source as a convenience; keep original notices and provenance.
- Record exact versions, commands, tests, CI links and commit SHAs. If a platform-specific test cannot run in public GitHub CI, mark it as local-only evidence and document why.

---

## 15. SPECIFIC ACCEPTANCE GATES — DEFINITION OF DONE

The outcome **`MOTIONUX_BUILD_FOUNDATION_V1_READY`** is allowed only if **all** of the following are true:

- [ ] Existing Studio still exposes/verifies 500 original sources without hash or behavior regression; legacy links and personal library/kit functionality are retained.
- [ ] A real Next.js product shell is usable; pnpm workspace reproducible on a clean checkout; core code boundaries and legacy bridges documented and tested.
- [ ] Vetted App Blocks accessible from Build. Target 32 entries, with **at least 24 complete, real, individually installable/renderable/verified blocks** and no dead placeholder cards. Report exact number and categories.
- [ ] Build Canvas genuinely supports block add/select/reorder/edit/remove, multi-page navigation, responsive preview, keyboard alternatives, undo/redo, save/reopen and valid empty/error states.
- [ ] One premium multi-page hotel dashboard truly runs. Desktop and mobile navigation, sidebar, header command search, dashboard, table/filter and settings respond to input.
- [ ] The same edited document generates independently runnable **clean Next.js TSX**; export is repeatable, typechecked, production-built and browser-tested after fresh install, independent of Studio.
- [ ] Preview runs actual Next.js and respects origin/process limits; no fake iframe render, arbitrary target access or V4/MCP privilege escalation.
- [ ] Meaningful desktop/mobile/light/dark accessibility and visual screenshots examined; no serious/critical Axe findings, focus and reduced-motion behavior checked.
- [ ] Bundle/performance/resource/storage baselines measured; no unexplained major performance regression or tens-of-GB cache re-growth.
- [ ] Brain/Agent/MCP, registry parity and CI regression gates pass (or the task is clearly `NO_GO`).
- [ ] Product vision, roadmap, AGENTS, architecture/design/security/quality docs reflect **actual** verified capabilities and distinguish future plans.
- [ ] Git commits, push and CI state are accurately reported; no deployment or publication.

If any key item above is missing, use `MOTIONUX_BUILD_FOUNDATION_V1_PARTIAL` or `MOTIONUX_BUILD_FOUNDATION_V1_NO_GO` with **concrete evidence and missing gates**. A pretty Studio screenshot alone is a NO-GO.

---

## 16. FINAL RESPONSE FORMAT — TURKISH, EVIDENCE-BASED

Provide a compact but exact Turkish execution report:

1. **Status:** `MOTIONUX_BUILD_FOUNDATION_V1_READY | PARTIAL | NO_GO` (exact token and why).
2. **HEAD / commits / push / CI:** URLs, green/pending/failed jobs, changed file groups.
3. **Architecture:** what moved to Next/pnpm, what remains Vite/legacy, what was deliberately not migrated and why.
4. **App Blocks:** exact count, families, installed/rendered behavior, provenance/license/export exclusions.
5. **Build experience:** Studio URL/route, demonstrated edit -> save -> reload -> real preview -> export workflow; keyboard/mobile behavior.
6. **Generated hotel app:** project location and export path, Next production build, routes, screenshots/trace paths, user interactions verified.
7. **Performance/security:** before/after numbers, vault persistent/temporary bytes, CSP/permissions, negative tests and limitations.
8. **Regression:** original 500 source count/hash, Studio, Brain/Agent V1–V4, existing MCP 5-tool, CI and tests.
9. **Open risks:** genuine unsupported environments/capabilities; no marketing substitutions.
10. **Next milestone:** one precise follow-on phase (preferably Codex App Composer) based on actual Build V1 evidence, not automatic phase inflation.

**Execute now. Make architectural decisions with evidence, implement working code, verify the result end-to-end, and avoid stopping after an analysis or design mockup.**

---

## Reference documentation (read current versions before implementation)

- MotionUX source: `https://github.com/SapienXai/MotionUX`.
- Puck official docs and Next.js recipe: `https://puckeditor.com/docs`, `https://github.com/puckeditor/puck/tree/main/recipes/next`.
- Next `transpilePackages`: `https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages`.
- pnpm workspaces and `workspace:` protocol: `https://pnpm.io/workspaces/`.
- Vite host/CORS/fs security: `https://vite.dev/config/server-options`.
- shadcn/ui blocks: `https://ui.shadcn.com/blocks`.

These are reference starting points, not an instruction to blindly install latest versions. Verify compatibility and licenses against the actual current release and lockfile before using them.
