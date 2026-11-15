# MotionUX V13.1 performance

Studio keeps the same 324 pinned originals as V13. The Gallery renders measured rows around the viewport, keeps the full catalog searchable, and preserves the selected card and its position on return from Playground. The 172 V13 additions still appear first in their recorded edition order. Original source files, assets, dependency pins, install recipes and compiled previews matched 5,707 SHA-256 fingerprints before and after the change.

## Matched 324-original run

Five cold navigations per condition on the same Apple M5 Pro Mac and Chromium 159.0.8154.6. The viewport was 1536 × 1024, the CPU was throttled 2×, and all traffic used loopback without network emulation. The cold run started with a fresh browser context and 1,296 thumbnails already generated on disk. The warm run reloaded in that same context. The baseline build was `03f1377f3176395dcebd` at `2bfd2fd`. The updated build was `02534614e14292b7d0b3`.

| Metric | V13 | V13.1 |
| --- | ---: | ---: |
| First visible live preview, cold median | 358 ms | 209 ms |
| First preview document request, cold median | 262 ms | 144 ms |
| LCP, cold median | 300 ms | 144 ms |
| Search to rendered result, median / p95 | 46 / 76 ms | 20 / 24 ms |
| CLS, cold median | 0.00073 | 0.00112 |
| Initial JavaScript requests | 42 | 42 |
| Initial reported script bytes | 2,605,684 | 2,614,651 |
| Initial thumbnail requests | 6 | 9 |
| Cards in DOM during the cold run | 324 | 9 |
| Renderer RSS after three scroll sweeps | 1,010.6 MiB | 280.0 MiB |
| Studio root JS heap after three sweeps | 21.94 MiB | 14.08 MiB |
| Detached frame events by the third sweep | 928 | 24 |
| Peak preview documents including nested, matched sweep | 7 | 6 |

The three sweeps each used 108 frame-paced scroll updates and paused at the top before sampling. Each memory snapshot used Chromium CDP garbage collection followed by renderer process RSS from `ps` and the Studio document’s JS heap from CDP. RSS includes browser-managed renderer memory and caches. It cannot identify what the JavaScript runtime retains. Updated RSS moved from 251.7 to 269.5 to 280.0 MiB across the sweeps. The page heap moved from 14.00 to 14.04 to 14.08 MiB. The updated build kept six attached preview documents after another 105 jumps and after ten seconds idle. Renderer RSS after the jumps and idle was 305.5 MiB. GPU process RSS at the end of the three matched sweeps was 113.5 → 116.4 MiB.

| Independent startup condition | First live preview, V13 / V13.1 | LCP, V13 / V13.1 |
| --- | ---: | ---: |
| Warm browser reload | 330 / 108 ms | 300 / 60 ms |
| Cold load with no thumbnails | 361 / 207 ms | 88 / 80 ms |
| Cold load with reduced motion | 357 / 189 ms | 284 / 128 ms |

Warm and reduced-motion median CLS reached 0.00495, within the 0.005 target. The no-thumbnail LCP reflects the shell because the cached thumbnail candidate is absent.

## What changed

- Gallery mounts variable-height rows using the component’s existing preview height and measures actual card chrome with `ResizeObserver`. Overscan is bounded. Keyboard traversal crosses unloaded rows, and resize and history navigation preserve the visible card anchor.
- Studio preloads the compact local catalog and thumbnail index. Search reuses a normalized index and an independently sorted catalog. Thumbnails remain tied to the source fingerprint. Studio delays starting new thumbnail decodes during large scroll jumps.
- The first visible frame starts before the other eligible frames. The scheduler enforces eight weighted preview units and waits for scrolling to settle before admitting new work. Verification counts nested browsing contexts separately. Focused frames and active gestures stay mounted until release. A failed Gallery preview retains its cached thumbnail and retries through the scheduler.
- A full Gallery sweep rendered all 324 originals and opened all 324 Playground links. The updated run peaked at 18 Gallery cards and six weighted units during the matched desktop sweeps. The 105 rapid-jump test peaked at eight actual preview documents.

## Repeat the checks

```sh
npm ci
npm run studio
# In a second terminal
npm run studio:doctor
npm run studio:verify
npm run studio:verify:v12
npm run originals:verify:v13
npm run originals:verify-consumers
npm run originals:benchmark -- v13-1-after
npm run studio:scale
```

The scale suite supplies test-only catalogs of 500 and 1,000 synthetic metadata records and verifies every ordinal during scrolling. It exercises sorting, search, reload and long jumps with zero source iframes. It passed with 18 cards at peak in both cases. These fixtures cover rendering and discovery capacity. A 500-source run should measure live provider cost and prolonged GPU and renderer memory on physical devices before making additional capacity claims.

To compare with a V13 checkout running the same vault, point `MOTIONUX_BENCH_ORIGIN` to that local server and pass `v13-1-before`. Keep both raw reports from the same machine and conditions. `node scripts/studio/v11/benchmark.mjs capture-after` saves light, dark and mobile screens and a Chromium scroll trace. Use `timelines-after` for seven representatives, including HTML, Canvas, WebGL, autoplay, swipe and dialog specimens, through Original, Studio and Installed lanes. All evidence is written to the ignored `.motionux-v9/evidence/v13-1/` directory.

V13.1 verified a private archive of 9,365 files and restored it to a disposable vault. The 15-item mixed-provider kit exported successfully and reported nine dependency conflicts. Five compatible components from that kit installed and built in a clean Next.js 16 and Tailwind 4 app. Physical mobile hardware, screen readers and full-catalog animation frame-by-frame equivalence were outside the measured coverage.
