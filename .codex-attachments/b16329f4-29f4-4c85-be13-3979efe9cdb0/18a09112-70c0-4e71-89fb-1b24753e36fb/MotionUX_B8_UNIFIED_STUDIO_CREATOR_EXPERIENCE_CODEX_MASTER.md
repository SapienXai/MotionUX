# MOTIONUX B8 — UNIFIED STUDIO & CREATOR EXPERIENCE
## Codex Master Execution Prompt · Product-first · Quality-gated · Real App Builder

**Repository:** `SapienXai/MotionUX`  
**Starting verified upstream:** `df9b26117672c2fb66c237a786512804bb40f7b5` on `main` (recheck HEAD before acting).  
**Operating mode:** Inspect → design boundaries → implement all feasible phases → prove in real browsers and independent exports → commit and push `main`.  
**Target outcome:** `MOTIONUX_B8_READY` only if every required acceptance gate is supported by reproducible evidence. Otherwise `MOTIONUX_B8_PARTIAL` or `MOTIONUX_B8_NO_GO` with honest blockers.

> **This document is an execution specification, not a request for an architectural essay, mockup, or a new plan-only branch.** Deliver functioning code, meaningful end-to-end tests, durable product rules, and a premium UI. Work in the MotionUX repository and explicitly owned, isolated disposable test workspaces only. No production deployment, no real client project edits, no hosted infrastructure and no release/publication.

---

## 0. Product mission and nonnegotiable result

**MotionUX = a component-powered, AI-assisted application studio.**

> **Don't generate random interfaces. Build real apps with proven components.**

Users describe a product, get a credible plan assembled from a governed catalog of real React components, edit an immediately responsive canvas, see a functioning web app, and export **independent, maintainable source**. This must feel like a single, thoughtfully designed premium product—not a collection of developer demos or several disconnected utilities.

**B8 is a creator-experience phase, not another authorization-framework phase.** Its principal deliverables are:

1. A coherent **single user-facing Studio experience** joining Gallery / Originals, Playground, My Library, App Blocks, Build, and Inspector.
2. A **fast, trustworthy two-tier preview**: immediate interactive component feedback for editing and a true isolated Next.js app run for authoritative validation, without requiring a production build on every small change.
3. A safe **Media Library** with real local images, a supported asset pipeline, no external hotlinks, and export parity.
4. A meaningful **Marketing Blocks** collection plus a premium, fully interactive **Hotel Marketing Website** template, alongside the existing Hotel Desk and Meridian CRM.
5. **App Composer 2.0**, which can plan/assemble marketing sites from registered blocks and user intent, not merely choose among the old three templates.
6. A codebase that remains maintainable, secure, accessible, performant and easy for subsequent Codex sessions to extend. Update `PRODUCT.md`, `AGENTS.md`, `docs/ROADMAP.md` and architectural/quality documentation accordingly.

**The definitive acceptance journey:**

> “MotionUX, create a premium boutique hotel website with an expressive but restrained hero, elegant header, rooms, image gallery, amenities, testimonials, FAQ and reservation call-to-action. Use cream, charcoal and warm accents. Make desktop and mobile feel intentionally designed. Produce a working Next.js website I can export.”

A user must be able to create that site (from an allowed manual template or a reviewed Codex blueprint), edit its content and imagery with a responsive canvas, interact with real navigation/FAQ/forms, save and reopen the project, check a real app preview, inspect it, and export a standalone Next.js project that builds and behaves correctly away from MotionUX. **Any booking or contact submission with no real backend must be presented truthfully as a local demonstration, not a completed external business transaction.**

---

## 1. Understand the actual code before touching it

The following is the audited B7 starting picture. **Revalidate against current HEAD**; do not assume it has not moved:

- `main` at `df9b261`; five CI jobs green: `verify`, `registry`, `consumer-parity (featured)`, `consumer-parity (recipes)`, `build-foundation`.
- Legacy Gallery/Playground/Library are still served by the original Vite/local Studio on `127.0.0.1:5199` using the root npm workspace. Build uses a separate Next.js App Router shell at `127.0.0.1:5200`, with a preview on `127.0.0.1:5202`.
- New workspace lives in `platform/`, with `platform/pnpm-lock.yaml`, pnpm 10.30.3, Next.js 16.4.6, React 19.3.1 and Puck 0.24.0; the root npm lock and original source workflows remain authoritative for legacy.
- Current editor: `platform/packages/build-canvas/editor.tsx` (~1,500 lines), Puck with `iframe={{ enabled: false }}`, immediate editable component projection, and separate `Run` mode that starts a bounded real Next.js production preview via `platform/apps/preview-host/host.ts`.
- Current managed project contract: `platform/packages/build-core/model.ts`; document owns the truth; Puck projects into it; exported source is generated one-way. Only one bounded nested slot level exists. Do **not** pretend arbitrary TSX-to-canvas round-trip is available.
- Existing blocks: 31 Foundation blocks + 4 CRM additions; Hotel Desk / Meridian CRM / blank app with local demonstration data. Their keyboard, browser, PWA, export, Motion DNA and Inspector tests already exist.
- App Composer's native Codex bridge is currently **data-only**: it proposes validated JSON from an allowed catalog. Codex cannot issue arbitrary filesystem edits or arbitrary source code through the Composer.
- `B7` Integration Lab tests Ed25519 host signatures against **disposable managed app copies**, and verifies rollback. **It does not authorize edits to BookPlace, DineWallet, or other real apps.**
- Five MCP tools are **read-only**. Local prepared Studio contains **500 upstream originals** and 9,969 locally protected source-file hashes. Original source payloads, collections and traces live in ignored `.motionux-v9/`; they must not enter public Git, export ZIPs or CI artifacts.
- The last WebKit Gallery fix is in `components/navigation/action-menu.tsx`, with a viewport-clamped popover and an offscreen-keyboard regression test in `tests/navigation.spec.ts`. Preserve it.
- Recent B7 CI had **461 Playwright passes, 3 configured skips**, plus portable Build checks; local macOS lanes provide additional coverage not provided by all Linux CI jobs.

**Open and read before modifying:** `AGENTS.md`, `PRODUCT.md`, `docs/ROADMAP.md`, `docs/BUILD-ARCHITECTURE.md`, `docs/BUILD-DESIGN-SYSTEM.md`, `docs/BUILD-QUALITY-GATES.md`, `docs/BUILD-SECURITY.md`, `docs/BUILD-COMPOSER-B3.md`, `docs/BUILD-PWA.md`, `docs/BUILD-MOTION-DNA.md`, `docs/BUILD-INSPECTOR.md`, `docs/BUILD-INTEGRATION.md`, existing `platform` packages, Studio routing, runtime host, source server, registry, and relevant tests.

Take a read-only baseline: SHA, clean/dirty git state, npm/pnpm versions, package graph, existing routes, source vault verification, current bundle sizes, local preview startup and build timings, memory/disk measurements, and original test counts. Do not override an existing local developer change. If the checkout has uncommitted changes, isolate and preserve them; do not silently reset them.

### Existing code should be **improved**, not gratuitously replaced

Preserve the strong separation already established: UI, validated document, catalog, app rendering, source generation, isolated runtime, authorization, evidence. Keep the old Studio usable during migration and preserve all old deep links and library data. No monorepo rewrite for its own sake, no new database just because one might be useful, no hosted AI or paid runtime, no blanket addition of dependencies, and no needless abstraction.

---

## 2. Execution plan and exact phase gates

**Implement in this dependency order; every phase must be exercised and documented, not simply marked complete:**

- **B8.0 — Baseline, design and migration contract.** Freeze observable behavior, choose migration topology, record failure and rollback paths.
- **B8.1 — Unified Studio Shell.** One coherent user-facing navigation and identity with Gallery/Playground/Library/Build accessible without exposing confusing port boundaries.
- **B8.2 — Immediate Creator Preview.** Fast interactive edits plus independent authoritative Next.js Run; reliable dirty/saved state and preview identity.
- **B8.3 — Managed Media and Creative Content.** Local asset upload, browser library, responsive rendition, asset references, independent ZIP parity.
- **B8.4 — Premium Marketing Blocks & Site.** Own and verify a curated family of production-quality page sections; implement a multi-page hotel marketing fixture.
- **B8.5 — Composer 2.0.** Extend bounded planning and deterministic compiler to the new marketing template, with honest limits and safe review.
- **B8.6 — Refactor, harden, test, document and deliver.** Modularize hot spots, run real visual/functional acceptance, preserve all old contracts and push checked commits.

You may split commits by phase, but **do not claim `READY` on a skeleton**. If a phase fails a mandatory security or fidelity gate, keep the previous safe behavior and mark it blocked instead of weakening the gate.

---

## 3. B8.0 — Architecture decision record and baseline

### Required design artifacts

Write `docs/BUILD-B8-ARCHITECTURE.md` describing:

1. Before/after diagrams of user navigation, routing, preview isolation, edit state, Media Library, app generation, export and protected vault.
2. Source of truth for pages, components, image references, project revision, themes and motion rules. **A single validated project document**, versioned and migratable, continues to be authoritative. Puck remains the editor projection. No duplicate hidden mutable source-of-truth.
3. How one user-facing Studio experience is achieved: direct Next.js routes, a scoped secure reverse-proxy/bridge for the legacy app, or carefully staged migration of legacy UI into the Next shell. Select based on proof, not a blanket rewrite.
4. How historical `5199` deep links, iframe preview assets, Gallery selection/scroll/focus state and existing Library data remain working. If using a proxy, preserve host/origin/CSP/WebSocket assumptions and avoid path/asset clashes. Do not make permissive CORS an easy workaround.
5. Distinct run modes: **Edit**, **Interact/Preview**, **Run verified app**, **Export**. State clearly which is real current unsaved component state and which is a saved Next build.
6. Media identity, import validation, immutable asset digests, reference ownership, retention and output behavior.
7. Creator template and component boundaries; lifecycle of a Codex JSON proposal through trusted compiler into document and independent export.
8. Threat model for untrusted project content, uploads, child processes, localhost APIs and generated artifacts.
9. Measured baseline and regression budget, including Gallery and new Studio.
10. Explicit non-goals and future B9+ work; no phantom capabilities.

Do not add Turborepo, a monolithic backend, Supabase, Neon, Vercel deployment, remote code execution or user-account infrastructure unless the B8 goals demonstrably require them. Prefer existing `pnpm` workspace and version pins. Verify actual dependency compatibility before upgrading anything.

---

## 4. B8.1 — Unified Studio: premium, cohesive and ergonomic

### Product requirement

Users should perceive **one MotionUX Studio**, not two apps connected by raw localhost links. The top-level information architecture is:

- **Discover:** Gallery / Originals, source evidence, Playground, Compare, collections and My Library.
- **Build:** projects, create/new project, Canvas, App Blocks, Media, Inspector and approved integration review.
- **Learn/Tools:** reference documentation, source provenance, components, export help.

Choose an elegant responsive navigation pattern. Do not duplicate sidebars or show a two-stage navigation stack merely to accommodate legacy architecture. New shell should be restrained, Apple/Linear/Vercel-inspired without copying an existing product's proprietary design.

### Functional requirements

- User-facing main entry on `127.0.0.1:5200`; one coherent brand, keyboard navigation, active state, search/command entry and global theme.
- Legacy `5199` may continue as an **internal compatibility service** and still be directly reachable for old URLs, but clicking Gallery / Playground / Library within the normal Studio must not feel like a separate product. Prefer a verified single-origin bridge when safe; otherwise implement a clear in-shell compatibility layer and report exactly what still transitions.
- Preserve all 500 original entries, their existing deep links, source-detail parameters, gallery search, favorites, collections, note editing, keyboard focus/scroll restoration and live preview limits. Prove with regression cases; do not blindly port or duplicate the 500 payloads.
- The Build landing remains lightweight: **do not ship Puck or all App Blocks into the homepage bundle**. Route-level code splitting, source search lazy loading, bounded preview frames and no eager background build processes.
- Editor layout: purposeful left panel (Pages, Blocks, Media), central Canvas, right Properties/Motion DNA. On mobile, use progressive drawers/sheets; never squash a 3-column desktop editor into 320 px. Large touch targets, safe areas, no accidental drag while scrolling.
- Prefer `system / light / dark` selection for Studio itself and new B8 projects, with an explicit saved preference and sensible migration from old `light/dark` documents. New documents default to **system**. Respect OS preference and never leave iconography or text illegible against nested surfaces.
- All **new** Studio/B8 UI copy should have coherent **English and Turkish** translations; no half-translated screens. Leave unreviewed provider source demos in their original language; do not mutate upstream contents for translation. Test long Turkish strings.
- Focus behavior: skip link, headings, Escape, overlays, scroll restoration, command search, accessible names, keyboard reorder alternatives. `prefers-reduced-motion` and Motion DNA must not remove function or focus visibility.
- No fake features: every visible action must work or be transparently labeled unavailable. Empty/loading/error/dirty/conflict/disconnected states are first-class UI states.

### Interaction design acceptance

Test opening and editing a saved project, switching to Gallery and back, finding a component, returning to the same editor page and selected block, restoring unsaved-change prompts and preserved project revision. Test from desktop and narrow mobile sizes. Existing legacy links must keep their behavior.

---

## 5. B8.2 — Fast Creator Preview: responsiveness without breaking trust

**Known problem:** Today Puck renders immediately inside Edit, but its controls are purposely inert for selection, while **Run** builds a separate Next production app. Users need a fast visual/live interaction loop without a full production build for every edit.

### Required modes and consistency

Implement distinct modes with honest labels:

1. **Edit Canvas:** directly projects current in-memory document, with live text/style/asset edits and Puck drag/drop. Content selection must not accidentally submit forms or navigate routes.
2. **Interact:** an isolated, interactive renderer driven by the **same unsaved document and registered component implementations** where feasible. It should respond to navigation, FAQ, dialog, galleries and demo form validation instantly, without a Next production rebuild. This is *not* labelled as a production Next app.
3. **Run in Next.js:** launches the actual saved, isolated Next.js app, bound to an exact document revision/digest, with existing build, timeout, network, process and disk restrictions. Maintain the authoritative verification path and explicitly show saved revision when differs from unsaved edits.
4. **Export:** uses the identical saved validated document. The exported independent project must behave the same for supported interactions.

When an interaction *requires* server execution (Next-specific route/server behavior), do not simulate success. Route the user to the authoritative Run path or present a clear capability limitation.

### Performance and preview engineering

- Aim for **p95 ≤ 250 ms** from a simple property change to visible Edit Canvas update on the local reference test environment, and **p95 ≤ 500 ms** for supported Interact preview changes; instrument and report actual distributions. This is a target, not a license to lie about hardware conditions or hide failures.
- Avoid recompiling all source or remounting the entire Puck editor on simple property changes; reduce unnecessary rerenders and preserve selection, focus, input caret and scroll.
- Debounce expensive persistence; support explicit **Save**, accurate dirty indicator, undo/redo, crash recovery/snapshot and revision conflicts. Autosave if introduced must be explicit and transactional, not a replacement for revision control.
- Use a constrained hot-preview mechanism: if you run a Next/Vite dev server, it must remain in a bounded, isolated generated-workspace host with fixed commands, localhost binding, no arbitrary request-supplied scripts and a verified security policy. **Do not disable the macOS sandbox or permit arbitrary host writes for HMR.** If safe HMR cannot be demonstrated, use the controlled in-browser Interact renderer plus incremental caching for Run; label that limitation honestly.
- Support preview errors, deliberate retries, cancellation, timeout, stale revision, broken output and last-known-good preview; no silent infinite loading spinners. Avoid flashing the entire app/iframe on every keystroke.
- Confirm functional state parity between Edit/Interact and separately built Next Run on representative blocks and across theme, mobile and reduced-motion settings.
- Startup cost, build latency, JS size, heap and scratch peak must be measured on matched fixtures. Reuse build artifacts only when the full source/document/dependency fingerprint matches; never let cached builds pose as fresh tests.
- Prevent preview instances, processes, port listeners and temp copies from accumulating. Keep at most one costly real build slot, with fair cancellation and forced cleanup after process crashes.

**Mandatory browser demonstration:** Edit a hotel page heading, hero image/crop, room card and FAQ; switch Edit → Interact → Run → Export; verify each supported behavior and content parity, save/reopen and undo/redo.

---

## 6. B8.3 — Managed Media Library with rights and export integrity

A serious marketing-site builder must support images. Current `document.assets` is an empty tuple and B7 intentionally deferred asset ingestion. Extend the model safely; **do not bypass this contract by inserting arbitrary URLs or base64 into user-editable props.**

### User workflows

- **Media** tab in Build: import a local image, browse owned assets in a responsive grid, preview, search/filter by filename/type, choose/reuse in a block, replace, set focal position/alt text, inspect size/dimensions, remove unused assets, and see where an asset is referenced.
- Drag/drop upload and file-picker; keyboard-equivalent workflow; clear progress, errors, duplicates and limits. “Delete” must not break an active reference silently—either prevent removal or offer a transactional replace/remove path.
- Support source-side and canvas-side alt-text editing; flag meaningful images with missing alt in Inspector/validation. Decorative images have explicit empty alt.
- Provide a coherent first-run library and credible, rights-clear seed assets for the Hotel Marketing demo. Never steal images or assume copyrighted photographs can be redistributed. May use approved existing owned assets if proven, locally created graphic assets or permissively licensed images with exact attribution/rights recorded.

### Security and storage contract

- Initial supported uploads: **JPEG, PNG, WebP**; add AVIF only if the installed tooling and validation genuinely handle it. Do not accept SVG, HTML, scripts, video or arbitrary binary content in B8.
- Enforce streaming bounded upload, canonical project IDs, strict per-file/project quotas (initial guidance: ≤ 8 MiB per source image, ≤ 6,000 pixels per dimension, ≤ 100 assets per project, ≤ 100 MiB original assets total; adjust downward with evidence). Reject oversized/invalid/decompression-bomb payloads before persistent commit.
- Decode and **verify image bytes, not just `Content-Type`, extension or header**. Use a maintained image decoder/optimizer if justified, pinned and security-reviewed. Strip EXIF/geolocation metadata; normalize orientation; preserve a clear image provenance/rights record. Do not introduce an external image CDN or a paid API.
- Content-address immutable source/rendition blobs, validated generated filenames, correct MIME and `nosniff`, per-project reference ownership, no symlink/hardlink traversal and no public directory listing. Never serve private vault paths by concatenating untrusted input.
- Prefer exportable responsive renditions with deterministic sizes/quality, stable hashes and safe built-in Next asset handling. Do not introduce a production dependency on MotionUX's localhost media endpoint.
- Document/asset references must be versioned, validated and backward-compatible. Old Hotel/CRM/blank projects without assets open as before. Deleting/replacing a referenced asset cannot corrupt saved documents or old backups.
- Export ZIP includes only referenced, rights-cleared assets and correctly hashed paths; identical source + options yield reproducible outputs and hashes. The exported app works offline for packaged imagery without Studio running.
- Large image grids must be virtualized/lazy rendered when necessary, with no decode storm or memory leak. Revoke object URLs on unmount and keep storage growth measurable.

**Test:** malformed MIME, oversized and corrupt images, EXIF stripping, path traversal and symlink manipulation, duplicate upload, reference invalidation, cancellation during ingest, startup recovery, live preview rendition, standalone Next export, PWA offline asset behavior, and stale document revision.

---

## 7. B8.4 — Curated Marketing Blocks: premium design without fake functionality

Extend the current owned block registry and versioned renderer using the existing `@motionux/build-core` / `@motionux/app-blocks` boundaries. **These are real, exportable, accessible React components—not images of components.**

### Required B8 catalog

Target **12–16 genuinely distinct, fully verified marketing blocks**, preferably these:

1. `MarketingHeader` — transparent/solid/sticky modes, mobile menu, active links, true anchor/route navigation.
2. `HeroEditorial` — strong image-first premium hero with readable copy and accessible CTA.
3. `HeroSplit` — split media/text layout; different composition from Editorial, not a renamed duplicate.
4. `LogoCloud` — partner/trust logos without pretending fictional endorsements are real.
5. `FeatureBento` — deliberate asymmetric features with responsive ordering.
6. `StatsStrip` — semantic metrics with provided demo numbers, no invented live analytics.
7. `StorySection` — brand/about image and copy block.
8. `GalleryGrid` — responsive image collection with accessible lightbox and real keyboard/focus behavior.
9. `RoomCollection` — distinctive hotel rooms/cards with real navigable detail routes or local demo disclosures.
10. `AmenityGrid` — labeled amenities with simple thoughtful iconography.
11. `Testimonials` — review cards that are explicitly demo content unless supplied with verified rights.
12. `PricingCards` — accessible comparison and honest CTA; no fake checkout.
13. `FAQAccordion` — native semantic disclosure with keyboard and reduced motion.
14. `CTASection` — strong, legible call to action, local route/anchor action with no fabricated booking success.
15. `ContactForm` — real local input validation + clear **demo-only/no backend submission** outcome; no fake email delivery.
16. `MarketingFooter` — navigation, links, copyright and responsive structure.

Choose a smaller set **only when a source/rights/technical gate blocks another**; document what was excluded. Do not manufacture block count by duplicating the same primitive 10 times.

### Design-level requirements

- Premium, quiet-luxury editorial aesthetic for the Hotel Marketing example: generous white space, high-quality typography, elegant image cropping, refined motion; not a purple generic SaaS dashboard and not a montage of random animations.
- The block family must be robust enough to generate other business marketing sites via variant/token/layout changes; do not hardwire every block to hotel data.
- Distinguish desktop/tablet/mobile **compositions** rather than just squeezing desktop cards. Mobile nav, typography, image focal point, column order and tap targets may need different designs.
- Light/dark with system default; semantic text/surface/border/icon/focus colors; accessible contrast at normal/hover/disabled; test overlays on hero photos.
- Motion DNA defaults must suit calm premium interaction: small purposeful transitions, reduced-motion and `none` overrides; zero gratuitous animation on every card in a long list. Preserve interruptibility and focus.
- Asset selection and block property controls must be real: change headings, image, alt, variant, emphasis, CTA destination, items, gallery ordering and per-block motion.
- Version every block schema, declare data compatibility, dependencies, license, provenance, export support and tested behavior. Preserve old block names and migrations where already in use. No arbitrary HTML/JS or unsanitized URLs.
- Do not blindly import all 500 private provider originals into exported source; the B8 marketing blocks may be independent MotionUX-owned compositions. If referencing a provider, respect and verify its pinned source, NOTICE and redistributability; MIT for new code does not confer rights to third-party assets.

### Component QA

Test each of the final accepted new blocks in **Puck/Edit, Interact, real Next Run and a clean standalone export**, including 320/390/768/1440 widths, at least light/dark, keyboard and reduced motion. New block count is `VERIFIED`, not merely `DEFINED`. No clip, horizontal page overflow, obscured label, fake button, unhandled dialog or broken image.

---

## 8. B8.4B — New flagship template: Hotel Marketing Website

Create a separate template/adapter (suggested internal ID `hotel-marketing-v1`) and do not conflate it with existing `hotel-dashboard` PMS operations. It is a visitor-facing marketing website, not a property-management dashboard.

### Required routes

A meaningful multi-page app with at least:

- `/` — hero, room highlights, brand story, amenities, testimonials, CTA.
- `/rooms` — room listing with filters/selection if supported by declared demo data; responsive cards, meaningful navigation.
- `/rooms/<slug>` or an explicitly bounded typed route alternative — room detail with gallery, amenities, clearly demo pricing and CTA. Extend the current route contract and export tree safely: existing route validation only supports `/` and one static segment; **do not fake dynamic detail pages by linking all cards to an undefined route**. Use known finite static routes when appropriate.
- `/about` — editorial brand story and proof-of-design sections.
- `/contact` — contact and local validation, with explicit demo-only messaging.

If FAQ is on Home, ensure it is actually usable. Add a header, page-aware active nav, functional mobile menu and consistent footer. All links resolve to real declared routes or valid in-page anchors. Show a visible, honest fallback for routes without backend booking capability. No invented availability, payments or reservation confirmation.

### Visual bar

Build **one flagship creative direction**, not three mediocre generic templates: cohesive typography, warm neutrals, premium editorial imagery, considered whitespace, tight rhythm, sophisticated responsive composition, dark and light behavior and restrained motion. Include genuinely intentional breakpoints for 320, 390, 768, 1024 and 1440 px. Produce before/after desktop/mobile screenshot evidence and capture at least one interaction flow. A reviewer should be able to use it as an actual example of what MotionUX can build.

All content must be explicitly fictional or rights-cleared. Include realistic room attributes without claiming real hotel stock, paid pricing, booking connectivity, social proof or ratings.

---

## 9. B8.5 — Composer 2.0: broader composition, still grounded and safe

**Do not turn a read-only structured Codex planner into an untrusted arbitrary code-execution system.** Its best value is understanding user intent and composing verified, compatible, design-coherent App Blocks.

### Upgrade the planning contract

- Add the marketing template and its known routes, blocks, asset references, page patterns, motion defaults and mobile behavior to a **versioned, strictly validated Blueprint schema**.
- Expand from “pick one of three templates” to choosing among **credible layout/page patterns** per project category and request: SaaS dashboard, hotel marketing, simple business landing, CRM and blank managed site. For this B8 milestone, a hotel marketing website is the required non-dashboard generated case; a generic business landing may share the same marketing adapter if fully tested.
- Let Codex propose a purposeful page hierarchy, block order, compatible variants, section emphasis, concise user-visible copy and palette/motion intent from **only the published allowed catalog**. Any unverified block/data/asset/route/action is rejected by the trusted compiler.
- Treat prompts and model outputs as untrusted data. No model-generated executable TSX, shell commands, package names, remote URLs, custom auth, payment integration or filesystem paths. The model must never receive private original source contents or project secrets.
- Keep the existing secure Codex desktop CLI integration on supported macOS. Pin/validate CLI behavior; no API key or hosted billing dependency introduced. Keep manual template creation available and high-quality when Codex is unavailable.
- Improve intent detection for `no animation`, `reduced motion`, unsupported integrations, content-only requests, screen size, industry and language. Do not overclaim a live database, booking engine or contact delivery.
- Blueprint Review must show page hierarchy, real assets, block roles, layout previews, reasons, unsupported features, accessibility/performance hints and clear **Create**. Cancel and edit/revalidate before Create. Show what Codex proposed versus what the trusted compiler actually accepted.
- Deterministic canonical serialization, replay prevention, expiry, single-use creation and project-scoped revisions remain mandatory. Preview and export must bind to the accepted document digest.
- Compare manual template vs Codex-generated marketing site: same renderer, same blocks and same output type; Codex is an aid to composition, not a second shadow implementation.

### Required actual cases

1. English boutique hotel marketing request → multi-page reviewed blueprint → create → edit → save → real Run → export.
2. Turkish hotel marketing request with long navigation labels → correct language/copy → responsive mobile.
3. CRM still works; its contact and pipeline operations aren't lost.
4. `No animation, immediate error feedback` → stillness/reduced motion; no unwanted animated suggestion.
5. Requests for real reservation/payment/email/backend → explicit unsupported capabilities and no fake success.
6. Invalid block ID, route, oversized copy, missing licensed asset, forged review digest, cancellation, timeout and replay → fail closed with zero unintended persistent writes.

Native signed-in Codex tests must remain separately labelled **local**. CI uses fixture proposals and verifies the compiler and created project without credentials. Don't report a native test as green unless a real native Codex call actually ran and returned valid output.

---

## 10. B8.6 — Engineering cleanup and quality of implementation

Now is the time to reduce accidental complexity before the product doubles in scope.

### Highest-value refactors

- `platform/packages/build-canvas/editor.tsx` currently ~1,523 lines: extract cohesive modules for editor state/history/save, page navigation, palette/catalog, canvas viewport modes, assets panel, inspector/properties, runtime preview and keyboard behavior. Avoid split-by-linecount with tangled shared context. Preserve the existing public API where useful.
- `platform/apps/studio/app/build/composer.tsx` ~710 lines: split brief entry, plan review, project listing, asynchronous job state and feedback.
- `platform/apps/studio/app/studio.css` ~1,100 lines: move domain styles into scoped, lazy-loaded, semantic design system modules; avoid global `.button`/`div` style leakage between old Studio, editor, canvas and exported app.
- Registry + schemas must remain typed/versioned and validate imported/migrated v1/v2 docs. Keep the source-of-truth invariant; no new giant `switch` or duplicated page renderer in three different packages.
- Provide small **well-tested extension points** for adding a block, adding a supported asset, and adding a template. Maintain a brief contributor checklist with actual paths and expected tests.

### Essential engineering discipline

- TypeScript strictness and no casual `any`, hidden `as unknown as`, unsafe `dangerouslySetInnerHTML`, unvalidated JSON or environment variables.
- No race-prone write operations; expected revision on save; atomic writes and consistent backup/recovery; safe file identity checks.
- No silent fallthrough or catch-all “success”; explain errors concisely and provide a working recovery action.
- No user-facing placeholder buttons or simulated data disguised as live data.
- No expensive new dependency without a concrete improvement and a tested compatibility matrix.
- Maintain sensible process and memory ceilings, avoid generated artifact/log growth, and verify cleanup after cancellation and 3 consecutive previews/exports.
- Use source citations and pin/licensing evidence; respect existing shadcn public registry and immutable release contracts.

---

## 11. UI / UX product constitution — applies to the entire repo

Treat MotionUX like a premium shipping product, not an internal engineering prototype. Decisions are evaluated across these axes:

**Visual system**
- Deliberate typographic hierarchy; clear density, 4/8 px rhythm where appropriate; consistent icon stroke and alignment.
- Light and dark both fully designed, especially floating layers, card-on-card surfaces, empty states and complex forms.
- Spacing and border hierarchy, readable labels, high-quality imagery, calm animation and consistent radii.
- No excessive gradients, glowing cards everywhere, forced glassmorphism, random motion or visual noise.
- Studio neutral/graphite identity with subtle violet accent; generated apps may have their own independent brand palette. Don't force Studio accents onto the website being authored.

**Interaction**
- Native-feeling desktop shortcuts, Ctrl/Cmd+K, Escape, tab order, focus restore and non-destructive undo.
- Carefully positioned popovers/menus respecting visual viewport, safe areas, zoom, keyboard and RTL direction; preserve latest WebKit regression.
- No unnecessary page reloads or focus loss while editing text. Canvas stays scrollable and responsive with media panels open.
- At 320/390px, bottom sheets and panels must remain usable with software keyboard. At 200% zoom all core actions remain accessible.
- Touch/pointer and keyboard parity for reorder, insert, delete, asset selection, mobile nav and dialog actions.

**Motion and accessibility**
- Motion must convey context/state; prefer transforms/opacity and avoid unnecessary layout animation and GPU pressure.
- `system`, `reduced` and explicit `none` behavior tested. Focus must not disappear when animation is disabled.
- WCAG 2.2 AA targeted automated rules (axe) plus manual review of screen reader and focus behavior where a real assistive tool is available. Report human/device gaps honestly; do not mark verified if never exercised.
- Use `aria-live` only for real state/outcomes; browser-local demo forms must not falsely announce a submitted reservation.

**Responsiveness and localization**
- Desktop 1440/1024, tablet 768, mobile 390/320; deliberately structured composition at each size.
- New B8 Studio UX supports coherent EN/TR; project copy and alt text support Turkish diacritics and longer headings. RTL audit for controls even if full RTL locale not shipped.

Do **manual screenshot review**, not just green tests. Review at least 12 snapshots across Studio, Canvas, Marketing Home/Rooms/Contact, mobile and desktop, both themes, and at least two interaction end states. If visual quality is not believable, improve it before calling the phase done.

---

## 12. Security, trust, provenance and non-regression

**These are absolute:**

1. Existing `REAL_PROJECT_WRITES_DISABLED` in Agent V3/V4 remains. B7's signed Integration Lab still only edits exact disposable copies. Do not covertly make real application paths writable. Do not touch BookPlace, DineWallet, CRM customer workspaces or live apps.
2. Existing five MCP tools remain read-only; no unsanctioned write tool or expanded path allowlist. A user prompt, JSON field, review digest, Codex's own words or fixture acknowledgement is not host approval.
3. Treat HTML/CSS/assets/user briefs/model output as hostile data. No dynamic module imports or arbitrary code from project documents, no shell invocation derived from user text, no uncontrolled external asset fetch, and no permission weakening to make live preview easier.
4. Preserve all 500 original sources, license notices, upstream pins, 9,969 protected local file hashes, prepared previews, library data and legacy registry behavior. Work only with prepared local vault; never commit the vault into Git.
5. Public CI, ZIPs and screenshots must never contain private raw provider payloads, credentials, user contacts, auth tokens, project paths, or arbitrary files from the host home directory.
6. Media ingestion must defend against malicious files, decompression bombs, corrupted EXIF, TOCTOU, symlink/hardlink escape, Zip Slip, path traversal, unsafe downloads and cross-project references. Test failure atomicity.
7. Preview/editor API host checks, origin policy, existing CSP and sandbox are preserved or demonstrably strengthened. Do not replace them with `Access-Control-Allow-Origin: *` or broad same-user filesystem access.
8. Separate local fictional data from real connected services. No fake live bookings, payments, backend persistence or email delivery.
9. No new hosted account, database, billing infrastructure, telemetry, production deployment, remote AI provider or paid dependency. Existing signed-in local Codex client is allowed under current isolated policy.
10. Do not redesign existing provider originals or violate their upstream animation logic to make them “fit” the app; wrap/compose safely when licensing and compatibility permit.

If a hard security property cannot be proven for optional live HMR or image optimization, keep the secure existing implementation and report the missing feature as partial. **Never exchange the security baseline for a nicer demo.**

---

## 13. Performance budget and acceptance protocol

Establish baselines on the same machine/browser/viewport/CPU profile before claiming improvement. Record cold and warm paths separately.

| Experience | Goal / hard floor |
| --- | --- |
| Studio Build landing | Puck and heavy canvas/editor assets excluded from initial bundle; no unsolicited preview process |
| Property change → visible Edit | p95 target ≤ 250 ms on local reference scenario, publish actual p50/p95 |
| Property change → supported Interact | p95 target ≤ 500 ms on local reference scenario, no production rebuild required |
| Exported marketing LCP | Existing matched Chromium lab ceiling **≤ 2.5 s**; target faster without overclaim |
| Exported marketing CLS | **≤ 0.10** on named Chromium lab profile |
| Exported marketing encoded JS | Existing **≤ 512 KiB** reference ceiling; measure route-level JS, lazy chunks and editor-vs-export differential |
| Preview scratch | Preserve current **≤ 850 MiB** allocated-block budget unless a reviewed measured revision is necessary |
| Preview memory | Preserve existing fixed bounded process limits, record peak values and unavailable metrics honestly |
| Media | Responsive optimizations; no 8 MiB original hero loaded into a 320 px page without appropriate derivative |
| Three cycles | No orphan build servers, unbounded browser frames, leftover temporary builds or unexplained rapid disk growth |
| Gallery | No regression against verified preview bound, 500-source catalog and existing scroll/endurance tests |

These targets are not permission to falsify measurements or disable tests. If a target fails, provide a diagnosis and real improvement; if it cannot be met, mark B8 `PARTIAL` and show the evidence. Do not inflate success by comparing different machines or server modes.

---

## 14. Required testing matrix: real behavior, not decorative CI

### Automated portable CI

- Existing full `npm run verify` and separate consumer parity jobs remain green; preserve 461 Playwright pass baseline and 3 previously skipped tests unless a documented deliberate change is justified. Do not silently delete or skip tests to make CI pass.
- `pnpm --dir platform install --frozen-lockfile --ignore-scripts`, platform unit contracts, strict typecheck and Next production build.
- Add B8 tests for unified routing, migration fidelity, media security/rights, generated asset hashes, marketing block contracts and interactions, Composer 2.0 deterministic compile and all denied/negative paths.
- Build a genuinely **independent Next.js hotel marketing export**, `npm ci --ignore-scripts`, typecheck, production build and browser-run routes and interactions. Do it outside Studio's node_modules. Verify export ZIP identity and assets.
- Browser CI: Chromium with representative responsive/contrast/keyboard/FAQ/gallery/contact/route tests; offline behavior for B8 media/PWA when applicable; seeded fault and misconfigured asset checks.
- Test legacy Gallery, library, Playground, existing Hotel Desk, CRM, PWA, Motion DNA, Inspector and B7 contract without losing source privacy.

### Local macOS acceptance (where environment is prepared)

- New Studio navigation with original 500-source catalog loaded.
- Desktop/mobile WebKit + Firefox + Chromium. Test menu flip (including offscreen keyboard trigger), dialogs, lightbox, HTML semantics, focus and touch.
- Actual Next Run and independent browser; verify route content parity against fast Interact preview.
- Media upload and removal with real files; exported renditions and offline image loads after shutting down Studio.
- Native Codex on at least one EN and one TR marketing brief, with **real recorded success or explicit unavailable state**; existing B3 native checks must not be misreported as CI results.
- 3 cold/warm edit→preview→run→export loops and disk measurement; browser heap, renderer/GPU RSS when supported, no orphans.
- Manual screenshot review: intentional premium composition, both color schemes, 320/390/768/1024/1440, body scrolling, footer legibility and interaction end states.

### Critical adversarial cases

- Dirty document vs saved revision on Run/Export; concurrent Save; corrupted snapshot; source and asset drift; stale revocation; interrupted upload; ZIP path traversal; fake manifest; forged asset ID; oversize payload; invalid image; unsupported font/media formats; missing license rights.
- Preview timeout, user cancellation, child crash, port occupied, stale iframe, HMR/process sandbox boundary and incomplete cleanup.
- No-motion request, missing evidence, unsupported backend promise, refused Codex output and unsafe prompt; rejected requests produce no unintended project files.
- Legacy `5199` deep links continue to work even when new shell is running; no CSP/origin regression.

Store evidence only in ignored local `.motionux-v9/evidence/build-b8/` with concise JSON reports and selected screenshots. Public CI may upload sanitized failure artifacts per existing rules but **never** raw private sources/assets with restricted rights, credentials, or user data.

---

## 15. Documentation, AGENTS.md and long-term product alignment

These edits are **part of the implementation**, not optional polish.

### Update `PRODUCT.md`

Set the clear primary identity: **component-powered AI App Studio**. State who uses it, what “real working app” means, why proven components matter, Studio's differentiated workflow, design principles, data/privacy/rights boundaries, and truthful functional limitations. Preserve the prior component distribution history and the existing public registry contract. Define the essential user path: Discover → Create/Compose → Edit → Interact → Run → Inspect → Export. Clarify that real-project integration still has a separate trust gate.

### Update `AGENTS.md`

Add a concise, enforceable **B8 Product Constitution** without duplicating old sections:

- Quality and premium UI/UX/accessible mobile-first behavior are release gates, not optional.
- New features must attach to versioned owned blocks/project models; no arbitrary generated JS or unvalidated data paths.
- The validated document is the sole source of truth; Puck and previews are projections; independent exported Next source is an output.
- Instant editor feedback and authoritative isolated Run have different trust claims; never label one as the other.
- Always test dark/light/system, keyboard/touch, reduced motion, save/reopen, independent export, media ownership and actual user interactions.
- Preserve private vault, 500 originals, upstream rights, old Gallery, read-only MCP, B7 authorization, offline PWA and project recovery.
- Scope of Codex edits is MotionUX and generated local test workspaces, not customer projects or production.
- Require the agent to read product/architecture/design/security/quality docs before broad changes; include exact acceptance commands, evidence paths and failure-status semantics.
- Update only relevant code/docs, avoid huge monoliths and prove size/performance impact.

### Update `docs/ROADMAP.md`

Preserve B0–B7 as historical, evidence-gated milestones. Add **B8** stages and status precisely matching implemented results, then outline **B9+** without falsely marking future ideas as built:

- B9 — Generalized page patterns / additional project adapters (content, marketing, CRM, operations) with a trusted block grammar.
- B10 — First-party design system / advanced asset workflows, reusable sections and responsive overrides.
- B11 — Motion DNA compatibility with wider pinned original catalog, beyond only owned app blocks.
- B12 — Site/workflow inspector and guided, user-reviewed improvements.
- B13 — Safe real-project integrations **only after an independently authenticated host approval channel**; no bypass through editor or Composer.
- Later: collaboration, remote preview, hosting, commerce, external backends, app marketplace, release-grade distribution—explicitly future/optional.

Create or extend `docs/BUILD-B8-ARCHITECTURE.md`, `docs/BUILD-B8-CREATOR-UX.md`, `docs/BUILD-B8-MEDIA.md`, `docs/BUILD-B8-QUALITY-REPORT.md`, plus update existing security/design/quality docs only where implemented truth changes. Update README with **one simple entry command** to open the unified product and the new flagship user workflow. Do not claim a full Stitch competitor or general code import when not implemented.

---

## 16. Commit, CI, evidence and final report

### Git protocol

- Operate directly on `main` per this owner's existing solo-dev workflow, after confirming current remote and local state. No unnecessary branches/PRs; do not force push or rewrite history.
- Commit by coherent vertical slices: (1) shell/routing, (2) live interaction runtime, (3) media pipeline, (4) marketing blocks/template, (5) Composer and independent export, (6) QA and docs. Actual grouping may differ where dependencies demand.
- Rebase/pull safely if `origin/main` advances; preserve unrelated changes and never overwrite conflicts blindly.
- Run required focused checks during implementation and the full verification matrix before the final push. Check GitHub CI for the pushed HEAD and resolve failures; do not equate local green with remote green.
- Do not deploy or publish a package/release. Do not modify BookPlace, DineWallet or any other external project.

### Definition of `READY`

Use `MOTIONUX_B8_READY` **only** when all of these are genuinely demonstrated:

- A coherent user-facing Studio with working preserved Gallery/Library/Build discovery, including legacy deep links.
- Instant responsive editing **and** distinct interactive preview, without a production rebuild for each simple property change.
- Real local media upload/selection plus secured validated exportable asset references.
- At least **12 verified** distinct marketing blocks and a polished multi-page hotel marketing template that actually works in desktop and mobile.
- Composer 2.0 supports real reviewed marketing blueprints from the allowed block registry, with functioning fallback and no invented backend claims.
- Clean standalone Next.js export includes media, all required routes and actions, builds from its own lockfile, and works without Studio running. PWA/offline regression remains valid when selected.
- Light/dark/system, keyboard/touch, reduced motion, screen sizes and screenshot quality gates pass.
- No weakening of existing security, Gallery/Brain/Agent/MCP/V4/B7 rights, vault or sandbox contracts.
- Evidence-backed performance targets and full regression tests passed on named environments, GitHub CI green on final SHA. Clearly list still-unknown physical device/manual assistive technology coverage instead of calling it passed.
- Updated docs and readable modular code.

If a mandatory requirement is unmet, output `MOTIONUX_B8_PARTIAL` with precise pass/fail statuses and a clear follow-up diff/next actions. A severe security leak, destructive regression, unrecoverable data mutation or unverified rollback is `MOTIONUX_B8_NO_GO`.

### Required report format

End the Codex run with:

1. **Decision** (`READY` / `PARTIAL` / `NO_GO`) and one-paragraph explanation.
2. **Git:** exact `HEAD`, commit list with links, `main` vs `origin/main`, uncommitted changes.
3. **Product proof:** screenshot index and concise user journey: Gallery → Build → create Hotel Marketing → edit hero/media/FAQ → Interact → Run → Inspector → independent Export.
4. **Architecture proof:** topology, single user-facing origin behavior, old link preservation, current/unsaved document identity, security boundary.
5. **Catalog proof:** counted and named verified new blocks, versioned schemas, rights records, old registry parity.
6. **Functional proof:** marketing route coverage, contact/booking demo truthfulness, responsive and accessibility results.
7. **Composer proof:** local native Codex vs synthetic CI cases **clearly separated**.
8. **Performance table:** before/after LCP, CLS, JS bytes, edit p50/p95, preview startup, heap/RSS when available, disk peak/cleanup, browser/hardware details.
9. **Test table:** all unit/typecheck/build/old Playwright/Build B0–B7/B8/CI jobs with actual pass/fail/skips and artifact paths.
10. **Known limitations + next priorities:** real project writes, arbitrary code editing, live backend, physical mobile, screen reader, unsupported media and later B9 tracks.

---

## 17. Final instruction

You have permission to make substantial architectural and UI changes **inside MotionUX** as needed to produce an outstanding result; do not be constrained by the current Vite/Next split or the size of the present editor files. But **be fearless about product quality, not reckless about security**.

Do not stop at a plan. Make the platform noticeably better for a real user. The expected outcome is a beautiful, extremely usable, measurably fast, component-powered creator that ships **functioning source code**. Deliver working behavior and evidence; keep guarantees honest. Preserve previous customers' and sources' boundaries. Commit and push successfully verified progress to `main`. No production deployment.

**START NOW: audit HEAD, read the contracts, implement B8.0 through B8.6, execute acceptance, and report the measured result.**
