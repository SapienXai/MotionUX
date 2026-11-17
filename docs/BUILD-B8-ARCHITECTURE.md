# Unified Studio and Creator architecture

B7 used a Vite workspace for originals and a separate Next.js workspace for Build. The B8 entry on `127.0.0.1:5200` serves Build and `/discover`. Discover embeds the existing local Gallery and forwards its initial query parameters for deep links. The existing `5199` URLs remain available, and Gallery's Build action returns to the top-level Build route. Gallery search, collection state and Project Kit still live on their existing origin. Editor state and Gallery state live in their respective runtimes.

The Gallery bridge uses an explicit loopback allowlist. Original sandbox frames keep their opaque origins, short-lived asset paths and existing script policy. The browser still enforces origin isolation between Gallery and Build. [Build security](BUILD-SECURITY.md)

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
