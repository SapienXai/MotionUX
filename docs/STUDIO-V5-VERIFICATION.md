# MotionUX Studio V5 verification

## Reference and visual review

The supplied source is a 1280 × 853 PNG. It is preserved as [reference.png](evidence/studio-v5/reference.png). The 1536 × 1024 [comparison](evidence/studio-v5/reference-comparison.png) uses a resampled reference and a Chromium capture of the production build. [Before](evidence/studio-v5/before-1536x1024.png) · [After](evidence/studio-v5/desktop-1536x1024-light.png) · [Pixel difference](evidence/studio-v5/reference-diff.png)

Three passes corrected grid and sidebar geometry, title weight and spacing, then stage content and controls. Each sheet shows the reference on the left. [Pass 1](evidence/studio-v5/iteration-1.webp) · [Pass 2](evidence/studio-v5/iteration-2.webp) · [Pass 3](evidence/studio-v5/iteration-3.webp)

| Feature | Final desktop measurement |
| --- | --- |
| Sidebar | 270px wide |
| Search | x 305, y 21, 45px high |
| First gallery row | x 289, y 236, two horizontal cards |
| Gallery row heights | 239px, 252px and 259px in the first viewport |
| Featured order | Sliding Tab Pill, Loading to Success, Expandable Card, Morph Dropdown, Profile Card, Swipe Deck |

Optical differences remain in the original fixture photos, font rasterization, corner and shadow treatment, category totals from the live inventory, and adaptive control sizes. The room and portrait photos are original generated fixtures. There is no exact pixel-equivalence claim.

[1440 desktop](evidence/studio-v5/desktop-1440-light.png) · [Dark desktop](evidence/studio-v5/desktop-dark.png) · [Tablet](evidence/studio-v5/tablet-768.png) · [Mobile light](evidence/studio-v5/mobile-390-light.png) · [Mobile dark](evidence/studio-v5/mobile-390-dark.png) · [Mobile drawer](evidence/studio-v5/mobile-375-drawer-open.png) · [Desktop Playground](evidence/studio-v5/playground-desktop.png) · [Mobile Playground](evidence/studio-v5/playground-mobile.png)

[Active Tab Pill](evidence/studio-v5/active-01-tab-pill.png) · [Completed state](evidence/studio-v5/active-02-loading-success.png) · [Expanded room](evidence/studio-v5/active-03-expandable-card.png) · [Open morph menu](evidence/studio-v5/active-04-morph-dropdown.png) · [Profile details](evidence/studio-v5/active-05-profile-card.png) · [Second deck card](evidence/studio-v5/active-06-swipe-deck.png)

## Interaction and release scope

Gallery and Playground share the existing 82 inventory items and the registry sources. Nearby previews are lazy-loaded and unmounted after they leave the viewport, unless focus is inside. The first six use gallery-specific compositions of existing components. The dropdown adds compatible options for an initially open inline specimen and a shape reveal. The default registry behavior continues to use the top-layer menu where supported.

The [Studio interaction tests](../tests/studio-v5.spec.ts) cover desktop geometry, featured sequence, gallery isolation, arrow-key and RTL selection, disabled tab behavior, copy of actual TSX and CSS, search/history, carousel drag, loading/reset, card disclosure, backdrop and focus restoration, dark persistence and 10 supported viewport widths. The previous suite continues to verify all 82 deep links and the v1 examples. Chromium and WebKit runs use browser profiles. Supplementary Firefox smoke exercised Gallery, Tab Pill and the Install pane. Chromium 200% CSS zoom checks exercised Gallery and Turkish Playground without horizontal overflow. Physical iOS Safari, installed PWA and screen-reader hardware checks were outside these runs.

The Code panel loads source from this build. Install uses the catalog’s previously verified published commit pin. The existing 82 reference records, 86 registry items and `v1.0.0` tag were preserved. BookPlace and DineWallet theme adapters run in Studio. There were no edits, releases or deploys to those products.

## Local production profile

`npm run build -- --manifest`, a local static server, and `node scripts/profile-studio-v5.mjs`. Headless Chromium at 1536 × 1024, 4× CPU throttling, localhost with no network shaping. Values represent a lab sample. The event duration is an Event Timing observation, and the action durations are Playwright wall time.

| Measurement | Observed |
| --- | ---: |
| First viewport JavaScript, gzip | 161,140 bytes |
| Previously measured Studio shell + one featured preview, gzip | about 133,300 bytes |
| Script requests | 21 |
| Initial preview mounts / catalog size | 6 / 82 |
| LCP | 264 ms |
| CLS | 0.000076 |
| Longest observed interaction event | 80 ms |
| Long tasks / page errors | 0 / 0 |
| Tab / dropdown / swipe wall time | 116 / 41 / 193 ms |
| Theme / filter / scroll-to-tail wall time | 119 / 117 / 176 ms |

Visuals can be recaptured using `MOTIONUX_V5_URL=http://127.0.0.1:4193 node scripts/capture-studio-v5.mjs <output-directory>`. Checkout verification uses `npm run verify`, and GitHub CI also installs the registry into a clean consumer.
