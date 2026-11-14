# Studio V7 checkpoints

Baseline `4a99ea250597069b31241b6fb293ac6bcf6fe98a` passed the existing Playwright suite with 319 passes and two duplicate catalog sweeps skipped. V7 retains the six dedicated Gallery presets and the base registry interfaces.

The other 76 cards now open a Gallery example in Playground. Five installable recipe families share the exact compositions and primitive source files used in Studio. Generated Usage captures locale, theme, motion preference and initial settings. Base component examples and legacy installs remain available. [Consumer scope](V7-PARITY-MATRIX.md)

The consumer runner builds Studio and an isolated React app. The React build installs recipe and preset source through shadcn and uses the generated examples. The six presets have a fixed-clock timeline with intermediate property samples and repeated real input. Visual and motion results are tracked separately. [Quality ledger](V7-QUALITY-LEDGER.md)

## Local validation

- `npm run verify` returned 325 passing Playwright tests and two intentional skips. The skipped case is the catalog-wide control sweep, which runs once in desktop Chromium. Lint, TypeScript, registry generation and 322 code examples passed.
- Next.js 16.3.0 with Tailwind 3.4.17 and Next.js 16.4.3 with Tailwind 4.3.3 each installed and prerendered 14 registry items, including the Inputs Gallery recipe.
- Chromium passed the 200% CSS zoom check on five Turkish previews. Firefox 159 passed a targeted smoke check of Gallery tab selection, room disclosure and the jelly slider.
- The 1536 × 1024 light first-screen capture was byte-identical to the V6 baseline at the local comparison checkpoint. The original 1280 × 853 design image, resampled to that viewport, differed by 13.67% of pixels at a 22-level RGB-channel threshold from both screenshots. That comparison tracks existing reference differences; the rest-state images in the consumer comparison use a separate tolerant method.

| First-screen lab measurement | V6 | V7 checkpoint `adf5ee5` |
| --- | ---: | ---: |
| JavaScript over 23 script requests, gzip bytes | 169,857 | 170,022 |
| Main entry stylesheet, gzip kB | 5.57 | 5.68 |
| Initially mounted Gallery cards | 6 | 6 |
| LCP, ms | 260 | 280 |
| CLS | 0.000076 | 0.000076 |
| Longest sampled event, ms | 64 | 64 |
| Long tasks | 0 | 0 |

Each figure is from one local Chromium run at 4× CPU throttling. Network shaping, extended endurance and physical devices remain unverified.

A separate Chromium session visited all 82 cards forward and backward, repeated featured interactions and exercised back/forward history. It recorded zero page errors and six mounted cards at the end. After explicit garbage collection, JavaScript heap was 4.02 MB at the start, 6.80 MB after the first pass, 7.15 MB after the return, and 7.90 MB after interaction and navigation. The short run shows warming and retained memory that need a longer comparison before drawing a leak conclusion.
