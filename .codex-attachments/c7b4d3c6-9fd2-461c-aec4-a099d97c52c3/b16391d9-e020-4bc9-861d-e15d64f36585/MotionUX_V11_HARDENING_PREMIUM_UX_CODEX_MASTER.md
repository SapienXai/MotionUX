# MOTIONUX V11 — STUDIO HARDENING & PREMIUM UX
## Direct implementation master prompt for Codex

> **TASK TYPE: IMPLEMENT, TEST, COMMIT, PUSH. NOT A RESEARCH-ONLY TASK.**
>
> Repository: `SapienXai/MotionUX`
>
> Baseline at task creation: `main` = `2d5e031e2e1946045a7ba955914eceaed12f3079` (re-check HEAD first; do not overwrite newer work).
>
> Current user decision: **V10's original components finally meet the required visual/motion quality. Preserve that work.** V11 is a focused hardening and UX release. The component-pool expansion is **the NEXT task, not this task**.

---

## 0. AUTHORITATIVE PRODUCT DECISIONS

1. **Do not rewrite, restyle, replace, convert, or simplify any original component.** Preserve its upstream TSX/JS/HTML, CSS, animation, images, assets, fonts, interaction and dependencies. Fix only a demonstrable integration defect, and verify its source and behavioral parity before accepting it.
2. **Do not add a single new source/provider/component in V11.** Keep the installed original-source catalog at its actual size (currently 140 = 90 React + 50 standalone HTML, six providers); do not hardcode those numbers into product logic. Other 82 V8 previews remain accessible as **Legacy**, never the default.
3. **One premium Studio:** `npm run studio` opens the same default `http://127.0.0.1:5199/` original-first Gallery. No second gallery, hidden live-preview toggle, alternate command or separate component registry needed to use the app.
4. **Monochrome Studio shell, authentic component content.** Studio chrome should remain minimal, quiet, high-contrast and Apple/Linear-grade. Original components retain their own native colors, assets, proportions and motion.
5. **Local-first and private by default.** The original source vault `.motionux-v9/` and any generated preview images, user selections and backup material must never be included in public Git, Vite `dist`, Actions artifacts or a release. Keep the Studio loopback-only by default. Do not silently expose the vault on LAN or add cloud services.
6. **No edits to BookPlace, DineWallet, any product repo or global Codex rules.** Project names may appear as user-created collection names inside MotionUX only.
7. **No production deploy, no `v2.0.0` tag/release, no new accounts/billing/backend SaaS.** The task is one-user, one-Mac experimental tooling.
8. **No counterfeit proof:** distinguish `source-mounted`, `verified-installed`, `sampled-parity`, and `fully-reviewed`. Do not mark 140/140 as fully accepted simply because they mount.

## 1. ESTABLISH A V10 BASELINE, THEN FREEZE THE COMPONENT ENGINE

Inspect the current HEAD and implementation, including:

- `docs/V10-STUDIO.md`, `docs/V9-ORIGINAL-SOURCE-ENGINE.md` and `AGENTS.md`
- `studio/sources/gallery.tsx`, `local.tsx`, `lab.tsx`, `originals.css`, `sources.css`
- `studio/app/studio.tsx`, `shell.tsx`, `catalog-view.ts`, existing Playground and routing
- `scripts/studio/start.mjs`, `catalog.mjs`, `verify.mjs`, `compare.mjs`, `rendering.mjs`
- `scripts/v9/serve.mjs`, source preparation / inspection scripts, `.gitignore`
- `metadata/v9-import-ledger.json`, `metadata/v9-reference.json`, `metadata/v9-provider-candidates.json`
- Current registry and public GitHub CI workflows

Before changing behavior, capture a V10 baseline in the existing Mac environment:

- Gallery desktop 1536×1024 light/dark, tablet 768, phone 390 and 320
- 140 original cards, 140 original Playground deep links, provider/category/format filters
- 16 sampled three-way comparisons; explicitly record which 11 have defined interactions
- Gallery startup + warm and cold load, first visible original, CLS, interaction duration, max mounted frames and root/iframe memory where measurable
- Install/copy/export for one React component and one standalone HTML example
- Route history, search, focus, preview errors, and all current tests

Store V11 baseline evidence in ignored private workspace. Use the same environment and methodology for before/after; do not compare incomparable lab numbers.

Build **safeguard tests for source identity**, comparing source hashes and checking that Gallery, Playground, and installed consumer still load the same upstream revision. Preferably record one snapshot/manifest before this work and fail if a source file changes unexpectedly.

## 2. UX INFORMATION ARCHITECTURE — KEEP ORIGINALS FRONT AND CENTER

Implement a coherent, non-bloated navigation model:

- **Gallery** — default 140 original component previews, untouched.
- **My Library** — saved components and custom collections; this is a first-class view, not a hidden section.
- **Discovery** — upstream candidates **not yet installed**, clearly distinguished from working originals.
- **Legacy** — separate V8 catalog, accessible but never competing visually with Originals.
- **Playground** — opens the exact original with relevant Code, Usage, Install, Compare, evidence and available scenes.

Do not add decorative marketing sections or duplicate navigation for the same action. Avoid a second, nested catalog or too many redundant tabs. Preserve existing route links, `?item=...`, search, browser back/forward and 140 default entries.

**Gallery experience:**

- User sees meaningful content immediately, not a screen of empty previews.
- Clean responsive grid: desktop up to 3 columns at appropriate content widths, tablet 2, mobile 1. Preserve original content ratio/scene size; prevent clipped controls and inaccessible interactions.
- A simple header with collection/filter/search/sort actions; keep navigation stable and usable on narrow phones.
- Display original component title, provider, meaningful category and **React** vs **HTML/iframe** distinction. Source kind must be visually understated but clear.
- Card-level quick actions: Favorite, Add to Collection, Open Playground, and compact secondary actions. The live component should remain interactive; quick actions must not block pointer/keyboard/touch events inside it.
- Use real icons, polished hover/press/focus, restrained transitions, readable line lengths and monochrome chrome. Do not impose a Studio grayscale filter on the original previews.
- Search covers title/provider/tags/notes (where relevant), supports existing Cmd/Ctrl+K, and has a clear no-results state.
- Filters and selected collection survive navigation and back/forward as appropriate; avoid confusing URL state and scroll jumps.
- No fake content, fabricated ratings, placeholder collections or misleading "ready" badges.

## 3. FAVORITES + COLLECTIONS (LOCAL-FIRST, ACTUAL PERSISTENCE)

Implement a useful **My Library** rather than a decorative heart button.

Required user flows:

- One click/tap/keyboard shortcut to favorite/unfavorite an original source.
- **Create, rename, delete collection** with accessible confirmation; add/remove multiple items, no accidental loss when a collection is removed.
- An item may be in multiple collections. No duplicate IDs within a collection.
- Collection detail supports search/filter/sort within it, a fast back link and empty state.
- Per-item short personal note, optional tags, and optional saved scene/theme choices **only if those controls exist** for that source. Never pretend unsupported upstream props can be edited.
- Batch add/remove and select all **only if** it can be implemented without clutter; prioritise an excellent simple workflow over needless controls.
- Optional project-themed collection examples may be documented, but **do not automatically populate a BookPlace/DineWallet selection** or modify their repositories.
- Favorites and collections persist across reloads, restarting the Studio, running a rebuild, and updating the app.
- Stable IDs come from the original source catalog. Source hash/version changes should not silently detach personal records. Missing or unavailable source should appear as a recoverable missing entry; never delete the user's saved selection automatically.

**Storage decision:** A simple versioned JSON document in the ignored local vault (e.g., `.motionux-v9/user/library.v1.json`) is the source of truth. No database, Supabase, cloud or account. Implement a small typed store and private local API using the existing server, not a broad framework migration.

Hardening requirements for local write API:

- Loopback-only host, explicit same-origin checks, strict content type, no permissive CORS, unpredictable session write token required in a custom header, reject cross-site and unauthenticated writes.
- Whitelist operations and stable catalog IDs; enforce schema, max lengths, collection counts and request byte limits; escape user-entered text on render.
- Write atomically with temporary file + rename; do not corrupt old data on failure. Ensure concurrent updates do not overwrite newer data (version/revision or single serialized queue).
- Provide clear UI error and retry when saving fails; never show success without actual persistence.
- Export and import **only personal library JSON** through the UI, with schema validation, optional merge/replace, confirmation before replace, and automatic backup of the previous version.
- Add storage migration path (`schemaVersion`) and tests for invalid JSON, oversized payloads, malformed IDs, duplicate entries, corrupted files and a missing catalog item.
- No private file paths or source contents are returned by the library API.

## 4. PREMIUM PREVIEW EXPERIENCE — FAST, STABLE AND TRUE TO SOURCE

The original implementation, not a recreated animation, remains authoritative.

Implement **real captured preview thumbnails** for components that are not yet mounted:

- Generate thumbnails deterministically from the *actual original rendered source* via the existing Playwright/browser infrastructure; do not handdraw replacement UI, invent generic art, or call an AI image generator.
- Store thumbnail cache only inside ignored local vault. Key/invalidate by source ID, source SHA, relevant scene, render dimensions, and light/dark where necessary. Stale/missing thumbnails are regenerable.
- Thumbnail must have the correct approximate aspect ratio and not imply an animated state that the real component lacks.
- Use a graceful, non-jumping fallback (neutral skeleton/placeholder) when thumbnail unavailable. Never show broken images or trap loading.
- When a card enters the viewport, swap into the **real interactive upstream preview** without an abrupt scale/position jump. When leaving, unmount safely; leave a useful thumbnail behind.
- Honor focus: a focused or actively dragged preview must not be unmounted by scrolling/focus transition. Test for pointer capture, keyboard focus and nested HTML iframes.
- Preserve the existing bounded live-preview approach (V10 `previewLimit = 8`); dynamically optimize only if measured. Do not mount 140 iframe contexts at once.
- Avoid auto-restarting continuous animation each time the user scrolls by unless original implementation requires it; support Replay/Reset when feasible from the actual original.
- Distinguish failing preview vs slow preview; retry must actually remount. Provide source URL fallback.
- Treat `prefers-reduced-motion` correctly in the Studio shell without silently altering an original demonstration's code or asserting reduced-motion compliance that has not been measured.

Do not trigger dozens of screenshot captures at every Studio launch. Make preview generation a one-time/rebuildable cache command (e.g., `npm run studio:thumbnails`) with concurrency limits and progress. A cold Studio with no thumbnail cache must still work immediately.

## 5. PLAYGROUND & "USE IN PROJECT" — ZERO CONFUSION

Preserve the source-based Playground and its native scenes. Improve hierarchy, labels and actions:

- Primary: large, authentic live preview with clear Replay, scene selection where supported and responsive viewport controls.
- Secondary: Code, Usage, Install, Compare, Source and Evidence sections with helpful, readable layout; no fake slider/prop editor for unsupported source behavior.
- Show **Source type: React** or **Standalone HTML (React iframe host)** explicitly before Install.
- Show source provider URL, exact pin/hash and required dependencies/asset requirements without overwhelming the default screen.
- Copy install command, copy usage code, copy source, download local registry JSON, and show accurate success/error feedback. A button must never claim copied when clipboard failed.
- React: exact TSX/CSS/assets and documented consumer integration assumptions. Test a fresh React and representative Next.js/Tailwind consumer.
- HTML: do not call it a native React component. Clearly say that React integration embeds the original standalone HTML in a sandboxed iframe; show limitations for callbacks, accessibility, sizing, CSP and parent-app styling.
- Install command currently depends on `http://127.0.0.1:5199`. Explain it works from a project on the **same Mac while Studio is running**. Do not give the user an unusable remote-device command.
- For portability, enable a **local export bundle** of the selected source (or collection install manifest) containing all required files, source notices, assets and dependency instructions, while keeping it in user-chosen local output/ignored vault. Do not publish the bundle online or auto-write it into external repositories.
- For a multi-item collection, offer a **Project Kit** view that lists compatible components and generates step-by-step local install instructions; separate React-ready and HTML-host entries. Handle conflicting package versions honestly; do not assume every combination runs in one React root without dependency tests.

**Important scope:** Do NOT automatically install components into BookPlace, DineWallet or any other app. "Use in Project" is export/copy from MotionUX, not a request to modify consumer repos.

## 6. HARDENING — SOURCE VAULT, SERVER, RECOVERY AND BACKUP

Today `scripts/studio/start.mjs` expects a prepared `.motionux-v9/` vault. Add a reliable preflight and recovery workflow:

- `npm run studio` remains the only normal launch command.
- On startup check saved catalog integrity, expected manifests, prepared artifacts, thumbnail cache and local library storage. Show clear actionable messages; do not claim a missing private source can be reconstructed offline when it cannot.
- If some entries are unavailable, render those cards with an actionable error without breaking all good sources; only fail launch when the Studio cannot run at all. Preserve truthful counts.
- Document `npm ci`, source inspect/prepare, source refresh, offline restart and system requirements. Avoid unnecessarily rebuilding expensive source fixtures on every launch.
- Create `npm run studio:doctor` for clear health diagnostics: source readiness, hashes, missing dependencies, private vault size, broken links, saved library integrity and start/port conflicts. It should not modify files by default.
- Create explicit **local backup and restore** commands for private vault assets AND personal-library JSON (separate switches allowed). Include manifest, SHA-256 checks and version notes. No private payload in Git or CI. Use staging directory, validate before replacing and back up any existing destination before restoration.
- Never delete the vault during cleanup/test; use temp directories for test fixtures. Ensure disaster recovery can restore from a user-supplied archive without fetching upstream if backed up.
- Harden routing/static-file path handling, path traversal, URL decoding, content-type/CSP/sandbox policy, oversized query, invalid item IDs and arbitrary file reads. Keep preview iframes isolated. Add security regression tests.
- For local write API, keep strict loopback and host/origin checks. Do not silently bind `0.0.0.0`. A LAN access feature is NOT required for this iteration; preserve privacy instead of broadening access.
- Dynamic totals: derive from actual private catalog. Tests may assert the V10 140-item baseline as a regression, but product navigation must not hardcode 140 or 82 as universal limits.
- Make `npm run studio` idempotent if same Studio is already running and fail clearly if port 5199 belongs to another process. No false assertion of success on a stale process.

## 7. PERFORMANCE, ACCESSIBILITY, REAL UX ACCEPTANCE

Keep existing functionality and tests. Add meaningful checks for:

**Performance**
- Compare V10 before/after in matched local production runs, with multiple repeat samples: first visible real component, CLS, JS, event timing, request volume, number of live iframe documents and aggregate process memory when available.
- V10 reference observations: first live preview ~308 ms, CLS ~0.00029, longest observed interaction ~168 ms, max eight live previews, root heap from 14.0 to 15.8 MiB after scrolling. These are **local observations, not universal targets**.
- Aim for no material regression (target ≤20% median startup/interaction increase at matched settings); if not achievable, show the benefit/tradeoff and fix major offenders.
- Stress repeated 140-card scrolls, filter/search, fast route transitions, theme changes, thumbnail cold/warm cache, open/close dialogs and backing store writes. Check total browser processes/frames memory rather than relying exclusively on root heap.
- No forced full page refresh during normal collection operations. Render state and source status accurately.

**Accessibility and usability**
- Keyboard-first add-to-collection, toggle favorites, open preview, remove, rename, confirm delete, import/export. Visible focus, Escape dismissal, focus return and meaningful ARIA labels.
- Mobile 320/360/390/430, tablet 768, desktop 1280/1440/1536; no horizontal overflow, touch targets typically ≥44px, content not hidden under sticky toolbars.
- Use system theme preference unless explicitly overridden; ensure high contrast in both modes.
- `axe` scans of Gallery, My Library, collection form/dialogs, Playground/Install and empty/error states. Retain limitations for embedded third-party HTML and perform available manual keyboard smoke checks.
- Do not claim physical iPhone/Android or manual screen-reader testing if unavailable. List those release gates explicitly.

**Behavior regression**
- All 140 original Gallery cards still mount, all 140 Playground deep links still work, at least six providers represented, 90 React + 50 HTML remain correctly classified unless an upstream source truly changes.
- Existing V8 legacy routes and current public registry compatibility preserved.
- Representative original interactive scenarios (Morph Island, Goo Menu, Wheel Picker, Smooth Tab, Siri Orb, Scrubber, Swipe Deck, Glass Lens) must remain functional without code edits to original sources.
- The V10 comparison lane semantics remain truthful: captured source and Studio may share bytes; separately installed consumer is the independent lane. Do not score it as three independent implementations.
- Local private tests AND public CI must be green. Public CI cannot verify the private vault; report the two result streams separately.

## 8. DELIVERABLES AND EXECUTION ORDER

Implement and verify in coherent commits, not just a plan:

1. **Baseline + source freeze + data model and UX architecture.** Make a small `docs/V11-IMPLEMENTATION.md` checklist and then IMPLEMENT it; don't stop there.
2. **My Library** storage/API and UI: favorites, collections, notes, import/export, reliable persistence.
3. **Gallery polish** with original-source thumbnails, stable live swaps, filters, actions, responsive experience.
4. **Playground/Use in Project UX** with accurate React-vs-HTML distinction, clear package instructions and optional portable local export.
5. **Hardening**: doctor, vault backup/restore, startup repair paths, security tests.
6. **Full regression**, measured before/after, fixed issues, docs, README, Playwright evidence, commit and push to `main`.

Respect existing work and the active HEAD; do not discard changes from another agent. Do not ask for approval at each phase. Keep the source files and public privacy boundary intact. If genuinely blocked by external access, complete independent V11 work and record precisely what remains blocked.

### Acceptance gates

Do not report V11 fully complete unless ALL attainable gates below are actually verified:

- [ ] Studio starts with one command and opens Original Gallery by default.
- [ ] All existing 140 original previews and 140 deep links remain accessible and correct.
- [ ] Original source component hashes/behavior preserved; no rewrite or grayscale styling applied to source content.
- [ ] Favorites and collection operations work and persist through reload + restart; notes/save errors handled.
- [ ] Library export/import, malformed-data rejection, missing-source recovery and atomic save covered by tests.
- [ ] Gallery thumbnail cache is based on authentic rendered source, loads reliably, invalidates on changed hash and does not block real interaction.
- [ ] Bounded preview mounts and focus/drag handling pass stress checks.
- [ ] Install/Usage/Code actions are accurate for React and HTML, including local-server limitations.
- [ ] Source vault doctor and backup/restore are tested using a disposable fixture, without destructive overwrite.
- [ ] Local API/security and private-vault leakage guards pass.
- [ ] Responsive/keyboard/axe browser checks pass; existing 457-pass public suite does not regress.
- [ ] Matched local performance before/after and honest unresolved-device report included.
- [ ] GitHub `main` updated, remote HEAD and CI verified green, with **no** public vault files, no production deploy and **no** component pool expansion.

### Final report (no inflated claims)

Provide:

- Commit SHA, GitHub CI links, local V11 verification location.
- Original catalog before/after counts and source hash integrity result.
- Screenshot links/paths: desktop light/dark, tablet, mobile, My Library, single component detail, install and error states.
- Features implemented, exact UI changes and commands to run.
- Personal-data persistence and backup/restore location/instructions.
- Browser test counts, failures/skips, accessibility result and performance table.
- React-vs-HTML installation experience and source restrictions.
- Explicit open items: full 140 motion/visual acceptance, physical devices, screen reader, etc.
- Confirmation that no BookPlace/DineWallet repositories were touched.
- **Do not begin the future component expansion phase.** The NEXT task after accepted V11 is enlarging the upstream source library.

**START NOW. IMPLEMENT THE WORK. PRESERVE THE COMPONENT QUALITY THAT V10 FINALLY ACHIEVED.**
