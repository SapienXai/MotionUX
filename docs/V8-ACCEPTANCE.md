# MotionUX Studio V8 acceptance

**Status: preview.** Each catalog entry stays `needs-review` until its individual visual, motion, accessibility, customization, and device criteria have been verified.

## Gallery and reference sweep

The Studio uses a 220 px desktop sidebar, a centered three-column gallery on wide screens, a two-column tablet grid, and one preview per row on narrow phones. The component stage comes first and the caption links to Playground, Usage, and Install. The initial color mode follows the operating system and an explicit choice persists across reloads. The optional BookPlace and DineWallet preview palettes remain available in Playground.

The browser sweep matched the 82 reference titles and providers to MotionUX cards on 1536×1024 Chromium and a 390 px iPhone 13 Chromium profile. The stage screenshots were captured after scrolling each card into view. The reference sweep records observed controls, SVG and canvas nodes for accessible preview DOM. Those counts describe what the browser could inspect. They do not establish interactive, pixel or physics parity with the external reference. [Reference sweep](evidence/studio-v8/reference-sweep.json) · [Own desktop dark](evidence/studio-v8/desktop-dark.jpg) · [Own desktop light](evidence/studio-v8/desktop-light.jpg) · [Own mobile dark](evidence/studio-v8/mobile-dark.jpg)

## Priority components

| Priority | V8 work and verification |
| --- | --- |
| Morph Island | Shared resizing across four activity modes, including arrival, playback, and recording. Configurable layout stiffness. Captured reference and MotionUX transition frames. |
| Goo Menu | SVG connections and separated radial actions. Verified focus, dismiss, reduced motion and alternative layouts. Captured reference and MotionUX transition frames. |
| Goo Morph | Adjustable path duration and interruptible presets. Captured MotionUX interaction frames. |
| Morph Popover | Live clip geometry for open, close, and reversal. Exports stiffness and damping. Verified repeated keyboard focus and paired installed motion samples. |
| Dynamic Menu | Shared inline reveal, keyboard activation, and focus return. Captured MotionUX interaction frames. |
| Rubber Dock | Distance-based magnification, icon and pill layouts, moving active highlight. Captured MotionUX interaction frames. |
| Spring Dropdown | Shared menu presence and keyboard dismissal. Captured MotionUX interaction frames. |
| Glass Lens | Tracks mouse, touch drag, and keyboard. Motion values drive the lens during drag. Verified emulated touch and captured MotionUX frames. |
| Pull to Refresh | Progressive pull resistance. Captured MotionUX interaction frames. |
| Siri Orb | Animated SVG outlines, explicit listening state, reduced-motion fallback, and exported spring tuning. Captured MotionUX interaction frames. |
| Sliding Tab Pill, Loading to Success, Expand Card, Profile Card, Swipe Deck | Preserved their main behavior and applied the neutral installed preset theme. Compared sampled trajectories with installed React and captured MotionUX interaction frames. |
| Smooth Tab, Notification Stack | Captured MotionUX interaction frames with the existing motion implementation. Individual reference comparison and craft revision remain open. |

Plan Switch, Letter Limit, and Pull Cord also received new Gallery compositions and were included in the motion capture. In total, 20 MotionUX scenarios ran on desktop and emulated iPhone with before, early, intermediate, and settled frames. Upstream motion was sampled for Goo Menu and Morph Island. Physics, gestures, and every state across all 82 upstream components remain open.

## Independent React installation

The recorded registry checkpoint is `aa749796f3540c71eee8f9f155788cc6f169e07a`. Registry smoke installed and typechecked all 97 items in a clean consumer. The [parity manifest](../metadata/parity-manifest.json) records the source hashes and the individual scope for each of the 82 previews.

The six dedicated presets passed 72 reduced-motion static comparisons across 390, 768, and 1536 px in light and dark, including activated states and ARIA snapshots. They also passed 36 sampled normal-motion sequences with real activation, interruption or rerun and settling. These timelines measure a selected property with fixture tolerances. The external reference and full animation frames are outside this comparison. [Featured consumer report](evidence/studio-v8/featured-consumer.json)

All 82 base examples and all 82 configured Gallery examples mounted in an isolated production build. The other 76 recipes passed one paired idle screenshot and ARIA comparison and at least one paired active interaction at 1536 px in light Chromium. Three of those interactions require normal motion. They check text reveal through intermediate glyphs or parallax response and settling. The others use reduced motion to isolate behavior. The report combines the full run with targeted reruns at the same registry SHA after correcting the test conditions. It records individual outcome evidence. [Recipe consumer report](evidence/studio-v8/recipe-consumer.json)

## Browser and performance

Local verification passed 340 Playwright checks with two conditional skips across desktop Chromium, touch Chromium, and iPhone-profile WebKit. The five focused V8 checks also passed in Firefox. Browser automation covers emulated viewport and input combinations. It uses no physical phones.

Production builds of V7 and V8 were profiled at 1536×1024 in Chromium on the same Mac, with 4× CPU throttling and no network shaping. The table reports medians from three runs of each build. Initial JavaScript is the sum of the gzip sizes of scripts requested before the first input. The event duration comes from Event Timing in the sampled interactions.

| Measure | Before V8 | V8 |
| --- | ---: | ---: |
| First viewport scripts, gzip | 170,271 B | 211,254 B |
| First viewport script requests | 23 | 26 |
| Initial mounted previews | 6 | 6 |
| LCP | 312 ms | 172 ms |
| CLS | 0.00008 | 0.00928 |
| Longest observed interaction event | 96 ms | 64 ms |
| Theme switch, Playwright elapsed | 138 ms | 108 ms |
| Gallery filter, Playwright elapsed | 108 ms | 72 ms |
| Scroll and mount final preview, Playwright elapsed | 194 ms | 153 ms |

The new first viewport requested 40,983 B more compressed JavaScript in this setup. The LCP and event results apply to these local runs. [Individual measurements](evidence/studio-v8/performance.json)

## Release gate

Exact DesignBookmark visual and motion parity remains open. The recipe lane needs sampled normal-motion trajectories, individual touch comparisons, and complete customization acceptance. Physical iOS and Android were outside this pass. V8 is a Studio development checkpoint. The stable release remains `v1.0.0`. [CI](https://github.com/SapienXai/MotionUX/actions/workflows/ci.yml?query=branch%3Amain)
