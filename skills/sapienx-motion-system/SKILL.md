---
name: sapienx-motion-system
description: Use for React and Next.js UI work in SapienX projects, including navigation, forms, feedback, redesign, mobile PWA and animation. Reuse the MotionUX registry, preserve each product's design, and verify accessible motion. Skip backend-only work.
---

# SapienX Motion System

1. Follow the existing Google modern-web-guidance workflow first for browser work. Read the project's AGENTS, design/tokens, actual routes and versions. Preserve its existing navigation, theme, semantics, ownership boundaries and server/client split.
2. Reuse the project's existing primitives where they already solve the problem. Check [MotionUX](https://github.com/SapienXai/MotionUX) before building a new reusable interaction. Read [catalog](references/component-catalog.md) for exact items, install recipes and provenance. Keep the component's behavior shared and its visual styling in local product tokens.
3. Review exact upstream source and redistribution rights before vendoring. [DesignBookmark Motion](https://designbookmark.com/motion) is discovery: Copy for Codex/Claude is a prompt, Copy code is source, and neither is proof of redistribution rights. Without such rights, build independently and label the adaptation. For Kokonut UI and SmoothUI, record source path, commit, license, dependencies, adaptations and verification; retain required notices in installed files. Do not mirror catalogs.
4. Preview pinned installs with the existing package runner, e.g. `npx shadcn@latest view SapienXai/MotionUX/motion-dock#v1.0.0`, then `add ... --dry-run`. Apply the install and inspect the diff. Check transitive GitHub items are also pinned; refs are not inherited. Install paths follow `components.json`; establish a narrow project config when absent without reinitializing an existing theme. Never overwrite local adaptations automatically.
5. Use CSS for simple transitions and `motion/react` for state, layout or gesture transitions worth the JS. Avoid adding a second animation engine. Keep providers local. Keep essential state readable with no motion, before hydration and when an animation is interrupted. Prefer transforms/opacity; no recurring decoration or forced dwell time. Consult `animate`, `animation-performance`, `mobile-native`, `apple-design`, `review-animations`, `shadcn` or the official `motion` skill when relevant.
6. Preserve native controls, labels, focus and safe areas. Use the app's source of truth for payment, booking and authorization. A status indicator must never manufacture a successful operation from a click, timer, optimistic state or animated completion.
7. Run the applicable [quality gates](references/quality-gates.md) on real product routes, with mobile touch, keyboard, long localized labels, reduced motion and desktop. Document engine/device coverage, actual install, dependencies and failure cases. Never claim physical Safari or real payments from fixture or emulated testing.

BookPlace public hotel styling comes from the hotel theme; do not alter its Core-owned PMS shell. DineWallet staff uses the repository's current DESIGN.md and semantic tokens; keep staff roles, history, amounts and backend-confirmed states intact.

<!-- BEGIN MOTIONUX_CATALOG_AND_RELEASE -->
## MotionUX catalog and contribution

For SapienX React and Next.js UI, start from the product's existing interaction and review the [current MotionUX inventory](https://github.com/SapienXai/MotionUX/blob/main/docs/REFERENCE-INVENTORY.md). Choose a supported item for the user action and justify the fit using the route, input method and product tokens. Use stable tagged items for release work. An inventory entry with status `needs-review` is a Studio preview and can be evaluated in an isolated consumer at its reviewed commit SHA.

When a reusable interaction is missing and the task authorizes a registry change, record the reference and legal provenance, specify timing and interruption, apply semantic tokens, write the API and live demo, test it, validate shadcn installation, and record the result in the inventory and changelog. Run design review and animation performance review independently. The [release checklist](https://github.com/SapienXai/MotionUX/blob/main/docs/RELEASE.md) records their evidence and the release decision.
For changes inside MotionUX, use the same public source, variant, styles and assets in Gallery, Playground and the selected registry package. Give each reference meaningful editors for actual public props and generate copyable usage from the selected values. Verify the exact immutable registry SHA in a clean consumer without Studio CSS. Record paired visual and behavioral evidence, keyboard/touch and reduced-motion checks, performance and provenance before promoting the item. A source hash match alone cannot mark an item ready. Follow the [parity manifest workflow](https://github.com/SapienXai/MotionUX/blob/main/docs/PARITY-MANIFEST.md).
<!-- END MOTIONUX_CATALOG_AND_RELEASE -->
