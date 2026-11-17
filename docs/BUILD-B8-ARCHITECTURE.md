# Unified Studio and Creator architecture

B7 used a Vite workspace for originals and a separate Next.js workspace for Build. The B8 entry on `127.0.0.1:5200` serves Build and `/discover` under one persistent header for Gallery, My Library, Build, search and system/light/dark. Discover embeds the existing local Gallery and forwards deep links. The same-tab Build link resumes the last open managed project. Legacy direct URLs on port 5199 retain their controls and local preferences.

The Gallery bridge checks the exact loopback origin and the specific frame or parent window for appearance, query, route and focus messages. It leaves favorites, collections, Project Kit and source rendering on the Gallery origin. Build and Discover support client-side transitions under a policy with explicit frame sources for Gallery and isolated Next Run. Original sandbox frames keep their opaque origins, short-lived asset paths and existing script policy. [Build security](BUILD-SECURITY.md)

## From document to application

| Mode | Source | Runtime |
| --- | --- | --- |
| Edit | Current draft, selected page and viewport | Puck projection of registered components. The dragged or selected block's controls are inert. |
| Interact | Same current draft and selected viewport | Registered React renderer. Navigation, disclosures, lightbox and local form validation run inside the canvas. |
| Run and Inspector | Saved project ID, revision and digest | Generated Next.js production build in the existing isolated host. Inspector checks the rendered page. |
| Export | Saved project, source pins, media hashes and lockfile | Deterministic Next.js tree. PWA is an optional variant with its own precache. |

`build-core` defines the typed model, marketing registry and demo document. `build-canvas` owns the editor shell, Puck projection, Interact renderer and media controls. `app-blocks` owns the React markup and CSS shared by the canvas and independent projects. `app-export` handles media byte verification and generated artifact assembly. Saved CRM, Hotel Desk and blank documents retain their existing schema and runtime. New fields have additive validation.

Composer uses the existing structured native Codex bridge. A proposed marketing plan is compiled against the published template's approved routes, block IDs, text bounds and asset bindings. The Blueprint narrows the user's intent to a known site structure. Media selection and editing remain explicit controls in Build. [Creator workflow](BUILD-B8-CREATOR-UX.md) · [Media](BUILD-B8-MEDIA.md)

The canvas provides immediate draft updates without spawning a development server. Run retains isolated process, network and filesystem rules. Its production build remains the runtime authority for Inspector.

## Recovery and ownership

The editor checkpoints the document and page, selected block, viewport, pane and editing mode in the browser. Dirty drafts receive a delayed vault checkpoint bound to the base saved revision. Reopening the matching revision restores the draft and selection. A stale draft is shown for an explicit restore or discard decision. Save remains revision-checked, and recovery keeps a distinct file with its own validated envelope. The current, previous and draft documents share the lock used for permanent media deletion. [Managed media](BUILD-B8-MEDIA.md)
