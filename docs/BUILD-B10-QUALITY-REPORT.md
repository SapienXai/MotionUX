# B10 verification

Baseline `e29978e26c0c4dce1bb39339810a6cb1545f5d69`. No version release or deploy. All browser workflows use disposable Studio projects and independently built local Next.js consumers. Local evidence stays under `.motionux-v9/evidence/build-b10/`.

## Compatibility

| Surface | Evidence |
| --- | --- |
| Costa di Sera | Owned marketing starter, media replacement crop, Editorial Calm, five section recipes, verified saved Run and normal Next/PWA. |
| Meridian CRM | Product Precision, four recipes, contact route and table, responsive metrics, normal Next and saved Run. B3 covers pipeline and derived metrics. |
| Fieldnotes | Warm Operations, versioned guides, two reference-pattern page instances, per-page independence, keyboard disclosure, search, normal Next and saved Run. |
| Relay | Authored task records, consistent queue and totals, both operations recipe families, saved Run and offline PWA browser state. |
| Hotel Desk | Inherited Foundation and offline PWA regression lanes, including all 31 previously compatible owned blocks. |
| Blank | v1/v2 compatibility and adapter boundaries in platform tests. |
| Seven B9 patterns | Existing schema and contract tests, legacy browser pages, keyboard access through the Patterns library. |
| Source originals and legacy Build blocks | 500 ready originals and 9,969 current source/package/preview hashes. All 5,707 matching historical hashes were unchanged. The 55 inherited owned blocks remain registered alongside the section container. |

## Local test profiles and boundaries

The B10 Playwright harness creates four managed applications. It checks visible template sections in both draft modes, exact revision and document header pins in Run, and each archive's manifest, constituent hashes and independent npm lockfile. It builds three normal Next and two PWA consumers and checks Chromium, WebKit and Firefox locally. The Chromium lane audits representative routes for serious and critical axe violations and checks local LCP, CLS and encoded script ceilings.

The stress harness records 60 edits, 30 device switches, 20 keyboard-closed dialogs, and recovery of a vault draft after clearing the browser checkpoint. It compares active page links at rest and hover and checks whether Save and Run are reachable at nine viewport widths in both light and dark. Use `stress/metrics.json` and `before/metrics.json` to distinguish directly comparable measurements. The recorded longer session is a bounded experiment rather than field telemetry.

The browser report lists per-recipe checks, archive/source/document digests, Run time and peak scratch bytes. Browser screenshots include desktop sections, 320 px properties and standalone light/dark apps. [Audit](BUILD-B10-UX-AUDIT.md) · [Security and ownership](BUILD-SECURITY.md) · [Quality gates](BUILD-QUALITY-GATES.md)

## Remaining acceptance evidence

Physical iOS/Android installation, manual screen-reader review and RTL in the new Creator fields require dedicated evidence. A complete independent export matrix for every preset/recipe pair, measured browser zoom at 200%, and the full computed focus/disabled/control contrast matrix remain open. Native signed-in evidence is local and separate from portable CI.

## Performance comparison

Same local production build, Chromium 159.0.8154.6, 1440×900 CSS pixels, reduced motion. For the like-for-like 20-edit Fieldnotes loop, p50 went from 9 to 8 ms and p95 from 15 to 16 ms. This is a one-millisecond p95 difference in a short local sample. The 60-edit stress sample separately recorded 7 ms p50 and 13 ms p95.

| Encoded script bytes | B9 | B10 |
| --- | ---: | ---: |
| Studio Discover entry | 140,684 | 140,700 |
| Build entry | 148,685 | 149,656 |
| Fieldnotes editor | 388,444 | 400,004 |

The lazy Creator boundary remains intact. The initial Build page receives only the small public label catalog; the editor and validation imports load when opening a project. Reviewer feedback caught a Puck configuration that made section content transparent in Edit and a narrow CRM card that wrapped currency. The section now uses Puck's normal slot wrapper, and the CRM amount uses container-bound tabular sizing. Both have browser assertions.

The signed-in native Composer test generated an approved preset, section and mobile layout for a fictional CRM. Explicit review changed the preset and digest, the prior digest was rejected, and only the revised digest created the disposable project. The portable compiler and security tests also exercise untrusted schema input.

The five standalone exports measured 36–56 ms LCP on desktop loopback, with 168,776–181,474 encoded script bytes. The separate 390×844 Chromium test used 4× CPU throttling, 60 ms latency, and 200,000/75,000-byte-per-second throughput. LCP ranged from 688 to 2,156 ms, highest CLS was 0.0211, and an actual menu tap took 46–48 ms to the second animation frame. This last value is a local interaction proxy, not field INP. Run started in 5.5–6.6 seconds with 78.1–81.3 MiB peak scratch. The five clean export build lanes took 12–14.1 seconds for install, typecheck and build.

A Linux CI run recorded 2,592 ms LCP for the 390 px editorial Next export. The identity-enabled hero now insets its photograph on narrow screens and declares the width of that slot in `sizes`. The browser gate checks the selected 360 px rendition at DPR 1 while preserving the existing larger candidate and the 2.5-second LCP threshold.
