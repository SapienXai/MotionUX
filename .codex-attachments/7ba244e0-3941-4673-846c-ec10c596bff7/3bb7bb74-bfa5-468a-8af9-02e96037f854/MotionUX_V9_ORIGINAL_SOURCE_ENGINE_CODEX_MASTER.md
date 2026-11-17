# MOTIONUX V9 — ORIGINAL SOURCE ENGINE
## Source-first integration · 82 original-quality replacements · unlimited premium discovery · private experimentation

**EXECUTION MODE: APPLY, DO NOT STOP AT ANALYSIS.**

**Repository:** `SapienXai/MotionUX`  
**Known baseline at briefing:** `0ec08816285a60a8844403e6ef8eceddbcf734c8` (inspect actual `main` before editing).  
**Primary original reference:** https://designbookmark.com/motion  
**Goal:** Replace approximation-driven development with a source-first experimental motion catalog. The actual upstream component—its rendering, timeline, interactions, structure, styles and assets—is the reference implementation. Expand the catalog substantially using excellent original components. Do not claim fidelity unless verified.

---

## 0 — Non-negotiable change of methodology

We previously tried prompting Codex to recreate animations from screenshots, descriptions and short motion samples. Even hundreds of passing Playwright tests did not make the MotionUX components feel like the originals. **STOP working this way.**

The new order of operations is:

1. **DISCOVER the actual official component and its real source.**
2. **ACQUIRE the existing implementation from the official repository, official registry/CLI, documentation's Copy code function, or another authorized source.** Preserve the exact version, all required files, design assets, animations, fixtures, fonts and dependencies.
3. **RUN the untouched original in an isolated, working React sandbox.** Verify the original actually works before adapting anything.
4. **EMBED/ADAPT only what is essential** for MotionUX (typed interface, import paths, safe asset paths, isolation, accessibility integration when required). Keep the original motion logic, DOM, CSS, colors and physics intact.
5. **COMPARE the original vs. embedded MotionUX vs. independently installed consumer** using the same fixtures and actual input. Detect any differences introduced by integration.
6. **ACCEPT only after proving parity**. If it diverges, repair the adapter; do not replace the original with a generic homemade approximation.

Do not write new animation logic if working original source exists. Do not turn 15 complex upstream motion hooks into a 40-line imitation. Do not label a conceptually similar replacement `source-exact`.

Our priority is **quality and diversity**, not reaching an arbitrary percentage by lowering the quality bar. Do not stop at the existing 82; actively seek hundreds of distinctive, high-quality, source-backed examples.

## 1 — Scope, experimentation and public-repository guard

- Work on the MotionUX project only. Never write to BookPlace or DineWallet repositories.
- Keep the current MotionUX Studio shell and product experience; further refine its monochrome design only where needed. **Monochrome applies to the Studio interface, NOT to an original component's own colors, gradients, illustrations, fonts or visual effects.** Original component demos must look like the real originals.
- Do not deploy to production. Do not create `v2.0.0` until release acceptance is separately met. Preserve `v1.0.0`.
- The user describes this as **private experimentation, without source redistribution**. Verify repo visibility at execution time; it is currently **public**. Importing third-party source into the public `main` branch would make that source available to others and thus is not a private local experiment.
- Therefore create a **non-published local/private source workspace**, outside the public Git tree or covered by `.gitignore`. Never push access-controlled, private-use-only or otherwise non-redistributable upstream code/assets into a public repo. Continue all local development and demos in that workspace. Public `main` may receive original metadata, provenance links, adapters and source-free wiring; source files may be committed only when their publication is authorized, or after the repository is made private by the owner. **Do not change repository visibility automatically.** Explicitly report this one gating dependency, without allowing it to stop independent work.
- Do not spend the project on a long legal audit. Preserve all upstream notices/attributions and source links as supplied; do not remove attribution, circumvent paywalls or restricted access, or pretend source access exists where it doesn't.
- Existing public MotionUX components remain usable. No breaking API migration without a compatibility adapter, migration note and tests.

## 2 — Official source discovery, breadth and priorities

Start with the official sources below, follow their real registries/repos and search for additional high-quality open source catalogs. URLs are discovery starting points, not proof that every entry is free or source-accessible.

**Tier A — must investigate completely**

- DesignBookmark Motion: https://designbookmark.com/motion — the existing **82-reference** inventory, including its first-party and linked third-party examples. Inspect each actual example, its **Copy code** action and linked original source. A descriptive Claude/Codex prompt is not equivalent to actual component source. First-party source may not be accessible; record that truthfully.
- Kokonut UI: https://kokonutui.com/ · https://github.com/kokonut-labs/kokonutui — use official shadcn registry, exact TSX/CSS and supporting assets for every strong component. Existing MotionUX subset is far from the full official catalog.
- SmoothUI: https://smoothui.dev/ · https://github.com/educlopez/smoothui — use original components/primitives, preserving Motion/GSAP implementations and required dependencies.
- React Bits: https://reactbits.dev/ · https://github.com/DavidHDev/react-bits — seek interactive UI, text, microinteractions, backgrounds and animations; prefer the author's actual TypeScript+CSS/Tailwind variant.
- Motion (official examples): https://motion.dev/examples — use official React example source where available; choose distinct high-quality patterns, not language/markup duplicates.

**Tier B — proactively enumerate and evaluate**

- Motion Primitives: https://motion-primitives.com/docs · https://github.com/ibelick/motion-primitives
- Magic UI: https://magicui.design/docs/components
- Aceternity UI (publicly accessible components): https://ui.aceternity.com/components
- Animate UI: https://animate-ui.com/docs
- Cult UI: https://www.cult-ui.com/docs
- Additional legitimate original-source collections with demonstrably excellent motion and source availability.

**Discovery process**

A. Enumerate through official registry indexes, GitHub trees, documentation catalogs, shadcn CLI/registry JSON, official MCP endpoints or documented install commands. Do not invent slugs, component names or dependencies.  
B. Keep a manifest of every discovered example, including demo URL, official source, upstream commit/tag, framework, install method, category and source-access state.  
C. De-duplicate identical implementations and identical demo variants. Distinct motion behaviors/versions/skins may remain separate entries with an explicit parent source link. Do not inflate item counts with repeated wrappers.  
D. Prioritize functional interactive components, distinctive gesture mechanics, beautiful motion choreography and original presentation. Add backgrounds, text effects, shaders, AI components, scroll effects, dialogs, navigation, advanced cards, loaders, sliders, data visualization, media and motion primitives as separate clearly labeled categories.  
E. Use **no fixed maximum**. Aim to evaluate the complete accessible public catalogs and import hundreds of worthwhile original-source examples if available and feasible. Count only actually running specimens as imported. An external-link entry is discovery, not an imported component.  
F. Prefer official current versions for new imports, pin exact tested revisions; don't upgrade unrelated existing versions behind the user's back.

## 3 — Correct the original 82, not merely the catalog numbers

Treat all 82 original DesignBookmark Motion references as a priority migration set. Categorize each as:

1. `original-source-running`: original official source installed and running, without modifying the core motion mechanics;
2. `original-adapted`: official source adapted minimally; show a diff and verified parity;
3. `original-unavailable`: actual source not available to the workflow; preserve original preview link, explain exact blocker;
4. `legacy-recreation`: previous MotionUX approximation retained temporarily, visibly flagged as not source-exact;
5. `parity-broken`: original acquired but MotionUX integration differs, requires repair;
6. `accepted`: original/adapted source, actual live and installed fidelity, core interactions, reduced motion and performance accepted.

If an original component from DesignBookmark points to Kokonut UI or SmoothUI, follow that original upstream URL and install the real source instead of reverse-engineering the embedded DesignBookmark widget.

For first-party DesignBookmark items, inspect the site's **Copy code** action in the real browser. Distinguish code payload from prompts, labels and generated instructions. When a real implementation is obtainable through provided site functionality, test the actual full source and required files in private local workspace. If source is not obtainable, DO NOT invent a source or claim exactness. Keep it in `original-unavailable` and optionally a clearly labeled prototype. Record a source-request URL/contact option. Do not silently substitute the old homemade component as the original.

First-place quality targets include:
- Morph Island, Goo Menu, Goo Morph, Swipe Deck, Rubber Dock, Glass Lens, Pull to Refresh
- Spring Dropdown, Morph Popover, Dynamic Menu, Tab Pill, Bottom Bar
- Expand Card, Profile Card, Loading to Success, Hold to Publish
- Siri Orb, Smooth Tab, Wheel Picker, Scrubber, Notification Stack, Signature Pad

For each, preserve its actual demo content, visual weight, action count, timing, easing, spring, pointer behavior, feedback and animation topology. In particular, compare the observed V8 mismatches (Goo Menu action count, Swipe Deck composition, Glass Lens placement/activation) against original implementations.

## 4 — Prove the new methodology with a four-component golden pilot

Use the **real official sources** for:

1. Kokonut UI `Smooth Tab` / `Swipe Tabs`;
2. Kokonut UI `Wheel Picker`;
3. SmoothUI `Siri Orb`;
4. SmoothUI `Scrubber`.

For each, place the actual upstream implementation into a sandbox with its original CSS, dependencies, assets and example content. Preserve native spring/drag/wheel/media behavior. Make a MotionUX adapter with a minimal diff. Show **three simultaneous live columns**: `Original upstream` | `MotionUX adapter` | `Installed React consumer`. A separate `legacy MotionUX` toggle is useful for diagnosing previous quality differences; do not let the legacy preview replace the original.

Required proof: keyboard, pointer, real drag where applicable, wheel/touch where applicable, normal-speed motion, reversal/interruption, light/dark, reduced motion, isolated install, source provenance and comparative screenshots/video/trajectory traces. Preserve any original limitations rather than hiding them.

If the pilot reveals a common integration fault, fix the adapter/source-loader architecture before bulk imports. Don't abandon the full task after the pilot; continue in verified batches.

## 5 — Private upstream vault, typed adapters and reproducible catalog

Build a durable **Original Source Engine**, using the existing V8 Vite + React + shadcn infrastructure where appropriate:

- Local-only upstream source vault (outside public tracked tree) organized by provider/slug/pinned revision. Include original source files and all explicitly included necessary supporting assets. Keep snapshots immutable; upgrades create a new revision.
- Metadata may live in tracked files, with: `id`, `provider`, `title`, `category`, `upstreamDemoURL`, `upstreamRepoURL`, `upstreamCommit`, `sourceURL`, `sourceMethod`, `sourceAvailability`, `licenseNoticePath` where supplied, `entry`, `css`, `assets`, `fonts`, `deps`, `installRecipe`, `testedVersion`, `fidelityStatus`, `lastVerified`, `evidenceLinks`, and `upstreamHash`.
- A lightweight typed adapter interface supports original source modules and registry-installed modules. **Do not force every source through a generic `Story` component** that changes animation and CSS. Use per-source mount adapters or isolated iframes if global styles/portal behavior require it. Choose least intrusive embedding, test focus/portals/layout.
- Source provenance is always one click away: `Original demo`, `Original code`, `Original repo`, `MotionUX wrapper diff`, `Playground`, `Install`.
- Distinguish `source-exact`, `source-adapted` and `legacy` in internal status/metadata (not loud colorful decorative badges throughout the UI).
- Preserve framework imports, package versions and React client boundaries. Avoid global CSS collisions, duplicate Motion runtimes and dependency upgrades that alter upstream behavior.
- Make source refresh automated but reviewable: discover new upstream revisions; compare diffs; require re-acceptance on actual source changes; never silently replace pinned builds.
- Maintain deterministic builds. Each accepted entry must be re-runnable from an exact upstream revision and a locked dependency graph.

Use original source code instead of synthetic fixtures in `components/recipes/stories/*` whenever accessible. Keep compatibility adaptors for existing consumers. Do not package all 300+ demo source files in the Studio's initial JavaScript bundle.

## 6 — Gallery and Playground must become an ORIGINAL MOTION LAB

**Studio shell:** Preserve the clean V8 monochrome base, fast filters and mobile usability. Neutral default colors apply to shell/chrome only. The upstream specimen renders with its *own* original palette, gradients, images, typography, dimensions and visual identity. Do not desaturate/color-filter source specimens. Provide an optional neutralized view only as a user-selectable experiment, never as the fidelity reference.

**Gallery cards:** Load original source-backed previews lazily. Keep their original demo proportions and enough stage area for movement; do not crop morph, dialogs or drags. Pause/offload heavy animations outside view. Make per-source loading/error states honest; if a source cannot mount, show the reason and upstream link, not a fake identical thumbnail.

**Playground:** Start in exact-original defaults. Render the real original implementation, not a reduced generic clone. Expose ONLY upstream-supported controls/props; optionally add a clearly separated wrapper/experiment controls area. Changing a control must affect the live original and the generated usage for that pinned source. Use correct prop names and installed CSS/assets. Provide code for upstream original, adapter diff, actual used source and install steps. Keep demo state vs production callbacks clearly separate.

**Compare mode:** Real, live, synchronized side-by-side upstream-source preview, embedded Studio preview and clean consumer installation. Show `Original` and `Installed` with matching viewport/DPR/font/fixtures/theme/context. Allow replay, pause, scrub/timeline when possible, drag, touch emulation, refresh and previous state reset. Show visual diff overlay and motion trajectory comparison. External websites may be inaccessible in an iframe; in that case render the locally pinned *unaltered upstream source* in the original column and retain a direct official source/demo link.

**Search and taxonomy:** Group hundreds by category/provider, quality, motion type, device support, runtime (Motion/GSAP/CSS/Three.js/WebGL), deps, performance cost and `upstream source available`. Saved collections/favorites, provider filter, recently used, and a concise detail panel improve browsing; do not bloat every card with controls.

## 7 — The original is the acceptance oracle, not our self-comparison

Previous V8 CI proved Studio vs installed MotionUX agreement, but that is **not enough**. Build **two independent axes** of verification:

**A. Upstream Fidelity — ORIGINAL vs MOTIONUX**
- Compare the canonical official component with the imported version under identical props, content, fonts, assets, CSS environment and viewport, on the same browser engine and device scale factor.
- Capture initial, first response, middle, settled, reversal, repeated activation, cancel, drag release, focus, pointer exit and touch where meaningful. Use controlled clocks/real timestamps and genuine user-event sequences. Record position, geometry, opacity, SVG/path changes, velocity and state changes as applicable.
- Screenshot comparisons for stable states; motion frame sequences and/or trajectories for animated states. Normalize deterministic context; do not count different photos/fonts/themes as verified parity.
- Track **visual fidelity**, **motion fidelity**, **behavior fidelity**, **accessibility**, **performance**, and **installed fidelity** as distinct outcomes. A single green score cannot substitute for all six.
- Where original source is literally reused unchanged, demonstrate source/hash identity, then still verify integration and rendering. If modified, require a minimal diff and show why.
- Allow rendering tolerances for browser rasterization only. Do NOT declare success by simply increasing the pixel diff threshold. A 0% diff from our own demo to our own installation says nothing about upstream quality.

**B. Consumer Fidelity — MOTIONUX vs independently INSTALLED REACT**
- Install the real pinned registry item into a clean independent React consumer; verify imported source, CSS, assets, deps, usage snippet, input/motion states and output.
- Verify representative Next.js 16 consumers/Tailwind 3 and 4 where the source supports those contexts. Do not let Next-specific setup corrupt a plain React component.
- Preserve existing regression suites and `v1.0.0` compatibility.

**Evidence:** Each item gets a reproducible report with URLs, version IDs, source hash, captured frames, test actions, differences and reasons for any exceptions. `accepted` only with both axes supported by actual evidence. For inaccessible first-party sources, `original-unavailable` is mandatory rather than false 100% parity.

## 8 — Source quality and user experience principles

- Never reduce a full original spring/gesture implementation to simple `onPointerUp` + state toggle if its live animation depends on motion values, inertia, thresholds or gesture continuity.
- Never substitute fade/scale for path morph, blob merge, shared-layout continuity, perspective tilt, liquid displacement or moving shadows.
- Preserve original demo colors and art direction. Keep visual modes isolated from Studio CSS tokens.
- Make external action references explicit; never invent misleading financial success or fake backend actions.
- No forced full-page refresh during Gallery browsing; no layout jank, clipped overlays, stale focus or broken scroll restoration.
- Reduced motion should preserve semantics and end states; don't let it masquerade as full-motion parity.
- Do not install/provision expensive model services or a heavyweight backend just for demo animations. Keep Studio cost near zero; browser work should stay on demand.
- Security: inspect third-party packages before execution, use lockfiles, keep secrets out of browser source and CI logs, and never run arbitrary copied scripts with user credentials.

## 9 — Performance architecture for hundreds of originals

The V8 lab's first-viewport JavaScript is approximately 211 KiB gzip. Increasing the catalog to hundreds must NOT linearly increase first-screen JS or memory usage:

- Do route/code splitting by provider/category/specimen; never eager-import every source module.
- Lazy mount visible demos; prefetch cautiously; unload heavy canvas/video/WebGL when offscreen. Keep stable geometry to limit CLS.
- Isolate costly libraries (GSAP, Three.js, WebGL, SVG filters, shader effects) in lazy chunks. Use per-component runtime budgets and CPU/memory sampling.
- Profile 1536/768/390/320 viewports, light/dark, normal/reduced motion. Test scrolling through at least 100 demos and navigating backward repeatedly.
- Aim for first-viewport JS no higher than V8's verified baseline despite catalog expansion; report any justified increases with measured tradeoffs rather than hiding them.
- Test real-device touch when hardware is available, otherwise explicitly mark hardware tests unavailable. An emulated WebKit profile is NOT a physical iPhone.

## 10 — Bulk migration strategy that avoids hundreds of low-grade clones

Execute in concrete increments; do not halt after writing a roadmap:

**Wave 0:** Inspect main, source vault and registry baseline. Verify public visibility. Create a complete inventory, provenance/status schema and private experiment workspace. Preserve existing V8 functionality and CI.  
**Wave 1:** Four source-exact golden pilot components, with side-by-side lab and installation parity. Diagnose any source-loading/theme conflicts.  
**Wave 2:** Replace or source-anchor the existing 82 DesignBookmark inventory entries. Prioritize linked official Kokonut/SmoothUI, then available first-party Copy code source. Do not claim exactness for inaccessible originals. Fix 17 already-noted highest-impact components first.  
**Wave 3:** Proactively import all suitable source-accessible high-quality public components from Kokonut UI, SmoothUI, React Bits, Motion Primitives, official Motion examples, Magic UI, Aceternity, Animate UI and Cult UI. Process disjoint batches of 20–40 items by provider/category; use parallel workers only if supported and ensure they do not touch the same files. Keep going beyond 100/200/300 if useful quality examples exist.  
**Wave 4:** Complete independent original/adapted/installed parity for imported entries, resolve real fidelity regressions, eliminate duplicates and reject weak examples. Bring Gallery search/categories and Playground controls up to speed for a large catalog.  
**Wave 5:** Performance, accessibility, browser/device acceptance, documentation, source index, CI, changelog and final report.

A batch is not done merely because `tsc` passes. Each imported source must render its live demo and perform its principal signature interaction. Keep a durable `imported / accepted / needs-work / unavailable` ledger. Do not use generated dummy variations just to reach a target count.

## 11 — Success definition and honest limits

**Desired end state:** A vast, exceptional, faithful source-based experimental motion library containing the original 82 and hundreds of excellent additional components, with original visual/motion DNA intact, working Gallery and Playground, and reproducible source-provenance links. Source-backed imports should be visually and behaviorally the same as their originals at corresponding tested settings.

**Cannot claim as success:** an inaccessible original replaced with a generic visual approximation; screenshots of a working site used in place of live components; a green self-parity test only; a 300-entry database with 30 live examples; a pile of demo wrappers copying the same primitive; UI monochrome filters destroying native component palettes; code copied from a source but CSS/assets/behavior omitted.

If an original source cannot be obtained, display an official external link and `original-unavailable`. Make substantive independent progress elsewhere rather than asking to stop the whole project. No invented parity scores. Do not claim all 82 source-exact if some remain unavailable. The user should be able to open a table and see exactly which originals match, which are adapted, and which are still blocked.

## 12 — Verification / commits / delivery report

- `npm/pnpm` install, typecheck, lint, registry build, clean React install and run, browser E2E, performance, source-authenticity and original-vs-consumer fidelity checks.
- Commit and push changes that are safe to publish in the existing public MotionUX repo; keep private-use original source in the local/private vault. If pushing the full experiment requires switching the repo to private, state this as the exact remaining blocker; do not silently make it public.
- Produce `docs/V9-ORIGINAL-SOURCE-ENGINE.md`, a component inventory, original-source map, import ledger and evidence index. Update `README.md`, skill/AGENTS instructions and CI.
- No production deployment; no automatic public release or v2 tag. Protect BookPlace/DineWallet and unrelated projects.

End with:
1. Current main SHA and CI links, what was committed/pushed and what remains private/local.
2. All discovered candidates by provider; unique source-backed imported count; exact originals count; adapted count; legacy recreations count; unavailable count; broken count; accepted count.
3. Status and reason for EACH of the original 82.
4. How many **additional** excellent unique components were really imported and which categories/providers they cover. No inflated totals.
5. Original code/source links, pinned SHAs and any adapter differences.
6. Four-pilot original vs Studio vs consumer evidence.
7. Real frame/gesture/ARIA comparisons and unresolved quality gaps.
8. Browser, mobile, device and screen-reader test reality, performance versus V8.
9. Any public/private repository publishing blocker and exact next action.
10. Clear distinction: complete, partially complete, blocked; never announce perfection without evidence.

**FINAL COMMAND:** STOP RECREATING THE ORIGINALS. ACQUIRE AND RUN THE ORIGINALS, INTEGRATE THEM WITH MINIMAL DIFF, VERIFY THE REAL MOTION, THEN SCALE TO HUNDREDS. QUALITY FIRST, SOURCE FIRST, REAL LIVE EXAMPLES, NO FAKE COMPLETION. START IMPLEMENTING NOW.
