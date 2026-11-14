# MotionUX Studio V6 acceptance

The Gallery keeps the selected V5 shell. Its desktop layout still has a 270 px sidebar, two horizontal cards per row, and first row origins near (289, 236) and (908, 236) at 1536 × 1024. Loading now shows Ready with a Simulation label before activation. The six presets ship their composition, styles, and relevant fixture media through the registry.

[Original V5 reference](design-reference/motionux-studio-v5-reference.png) · [V5 implementation](evidence/studio-v5/desktop-1536x1024-light.png) · [V6 desktop](evidence/studio-v6/desktop-1536x1024-light.png) · [Reference comparison](evidence/studio-v6/reference-comparison.jpg) · [Dark desktop](evidence/studio-v6/desktop-dark.png) · [Tablet](evidence/studio-v6/tablet-768.png) · [Mobile light](evidence/studio-v6/mobile-390-light.png) · [Mobile dark](evidence/studio-v6/mobile-390-dark.png) · [Playground editing](evidence/studio-v6/playground-properties.png)

## Clean React consumer

The [comparison report](evidence/studio-v6/consumer-parity.json) records the candidate SHA. The runner matches installed files byte for byte, builds React 19 in a separate folder, and passes the same neutral theme tokens and specimen width into the fixture. The fixture imports no Studio CSS. It verifies matching ARIA snapshots and allows up to 2.5% differing pixels after a one-pixel neighborhood and a 22/255 per-channel rasterization tolerance. The two saved frames represent the settled starting and activated states. The matrix covers light and dark, 390, 768 and 1536 px, and reduced motion.

| Preset | Installed React screenshot |
| --- | --- |
| Sliding Tab Pill | [Activated](evidence/studio-v6/sliding-tab-pill-installed.png) |
| Loading to Success | [Completed after activation](evidence/studio-v6/loading-outcome-installed.png) |
| Expandable Card | [Expanded](evidence/studio-v6/expandable-room-installed.png) |
| Morph Dropdown | [Action selected](evidence/studio-v6/morph-dropdown-installed.png) |
| Profile Card | [Details visible](evidence/studio-v6/featured-profile-installed.png) |
| Swipe Deck | [Second card](evidence/studio-v6/destination-deck-installed.png) |

## Playground and craft

All 82 base specimens have per-item controls connected to the public component, with at least one non-noop DOM assertion per base specimen. The six Gallery presets have separate controls and an example generated from the selected props. Existing direct links open the base component. Links from the first six Gallery cards carry the edited selection into the corresponding preset. The default text and interaction of each base demo stay available.

The inspector validates configuration links and limits text and overall input length. It keeps the specimen mounted while switching between preview, property, variant and state controls. Code and Install resolve the same package. Native controls keep their labels and keyboard behavior. The new usage tests cover 82 base examples, 82 configured examples and six configured presets.

The Gallery Loading Outcome is driven by explicit caller state. The Studio puts a timer behind a labelled simulation. Swipe Deck rejects pointer cancellation, and its threshold is configurable. The Goo Menu uses connected SVG lobes with plain independent buttons when reduced motion is active. Morph Island changes its width across the same disclosure surface. Pull to Refresh exposes a distance threshold and keeps its existing keyboard alternative.

## Remaining release gates

No inventory item has been promoted to ready. The other 76 Gallery compositions still need paired consumer screenshot and behavior parity. Their installed usage mount test demonstrates that the example compiles and renders, and legacy end-to-end tests verify the Studio behavior. These are narrower than same-configuration visual fidelity.

The 12 priority interactions have 192 normal-motion captures across desktop Chromium and mobile WebKit, in both themes. The contact sheets show starting, first post-trigger, settled and reverse or repeat frames. Morph Island width reversal and Goo Menu interruption were also checked against live computed styles. Individual reference comparisons, additional interrupted gestures, physical device testing, screen reader review, and a full premium craft decision for each of the 82 remain outstanding. The current control sweep verifies at least one meaningful control per item. Some editing fields and preview state combinations have deeper coverage than others, and most base examples depend on caller-owned content and do not bundle every Studio fixture. Keep the release review open. See the [component acceptance ledger](COMPONENT-ACCEPTANCE.md).

[Desktop light motion](evidence/studio-v6/motion-desktop-light.jpg) · [Desktop dark motion](evidence/studio-v6/motion-desktop-dark.jpg) · [Mobile light motion](evidence/studio-v6/motion-mobile-light.jpg) · [Mobile dark motion](evidence/studio-v6/motion-mobile-dark.jpg)

## Lab performance

Built production assets with Vite and served them from localhost. Chromium used 4× CPU throttling and a 1536 × 1024 viewport without network shaping. Two measurements of the final code plus two during the candidate review were captured. Event Timing is the longest observed interaction event during the script. These are local measurements.

| Measurement | V5 | V6 samples |
| --- | ---: | ---: |
| Initial JS, gzip | 161.1 kB | 169.9 kB |
| Initial live specimens | 6 | 6 |
| Initial script requests | 21 | 23 |
| LCP | 264 ms | 244–316 ms |
| CLS | 0.000076 | 0.000076 |
| Longest observed interaction event | 64–80 ms | 64–96 ms |
| Tab / dropdown / swipe wall time | 94–116 / 23–41 / 168–193 ms | 94–131 / 24–38 / 156–180 ms |
| Long tasks | 0–1 | 0–1, longest 53 ms |

The 8.8 kB gzip increase includes the installable fixture assets and the typed implementation shared by Gallery and its new editable previews. The upper LCP sample increased by 20% and the second run matched V5, so the measurements show variability and leave physical-device performance review open. The lazy inspector and source viewer remain off the initial route.

Initial CSS was 12 kB gzip and the Gallery mounted 2, 4 and 6 live previews at 390, 768 and 1536 px. The DevTools post-GC JS heap sample moved from 4.0 MB cold to 6.4 MB after first loading the lazy inspector and eight round trips. This sample includes the loaded inspector and does not establish a memory leak trend.

Both npm and pnpm isolated React 19 runs mounted 82 base examples and six customized preset examples. Next.js 16.3/Tailwind 3.4 and Next.js 16.4/Tailwind 4.3 each built and pre-rendered the six presets plus seven representative base entries. Firefox ran a separate Gallery and tab editor smoke on the production bundle.
