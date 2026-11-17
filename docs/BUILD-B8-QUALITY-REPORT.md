# B8 creator quality report

**Status: `MOTIONUX_B8_PARTIAL`.** This build delivers an editable marketing site, secured image import, draft interactions and independent export. B8 still requires individual design and behavior acceptance of the full marketing catalog, cross-surface Studio state and deeper comparative performance evidence.

## Baseline and source integrity

The starting revision was `df9b26117672c2fb66c237a786512804bb40f7b5`. Its five GitHub jobs passed. The local vault preflight found 500 ready originals and 500 thumbnail sets. A byte audit matched 5,707 available baseline hashes and measured 9,969 current source hashes. B8 modifies Studio serving, Build and owned compositions. The private source vault stays local. [Starting workflow](https://github.com/SapienXai/MotionUX/actions/runs/43984231464)

## Functional evidence

| Area | Verification |
| --- | --- |
| Discovery | Local Gallery loads through the Studio entry. Existing Gallery URLs and personal data keep their original runtime. |
| Creator | Heading edits appear immediately. Managed media selection, alt and focal edits carry into the saved document. Room navigation, FAQ and keyboard lightbox use the registered runtime. |
| Saved Run | Isolated Next.js rendered the edited heading and uploaded image. Inspector checked the saved home route at 390, 768 and 1,440 CSS pixels. |
| Independent export | Fresh npm install, TypeScript and production build from the generated project. Six routes, hash-checked manifest, local form validation, mobile nav and lightbox in Chromium, WebKit and Firefox. Chromium verified service-worker navigation and an imported image offline. |
| Media | Byte decoding, rights, bounded import, cancellation, deduplication, symlink rejection and cross-project ownership are covered by the platform tests. |
| Composer | Native signed-in English and Turkish proposals each passed review and created a disposable six-route project. The test reopened each saved document and rejected a repeated approval. Deterministic fixture cases check bilingual output, stable plan digests and rejected untrusted fields. |
| Regression | Root verification passed 47 unit tests, 8 usage tests and 461 browser tests with 3 inherited skips. The local hotel and CRM suites exercised Motion DNA, Inspector and offline behavior in Chromium, Firefox and WebKit. |
| Dependency audit | The platform production audit reported zero advisories after moving Zod to 4.6.6 and fflate to 0.8.3. |

Sixteen marketing IDs are registered with owned block provenance. The six-route template exposes 15: MarketingHeader, HeroEditorial, HeroSplit, FeatureBento, StatsStrip, StorySection, GalleryGrid, RoomCollection, AmenityGrid, Testimonials, PricingCards, FAQAccordion, CTASection, ContactForm and MarketingFooter. LogoCloud is registered and available to add. The browser flow exercises the complete site and selected user interactions. It provides site-level evidence for the rendered sections and targeted assertions for the navigation, media, rooms, FAQ, CTA and form.

## Performance and evidence

The run uses local Node 24.20.0 and Apple Silicon macOS. The measurements are loopback observations. The new hotel route has no prior version for a same-page comparison.

| Metric | B7 baseline | B8 observation |
| --- | --- | --- |
| Standalone hotel website LCP at 1,440 px | New route | 40 ms Chromium |
| Layout stability | New route | 0.0113 CLS |
| Initial encoded JavaScript | New route | 168,972 bytes |
| Input to updated preview heading | No comparable Interact path | 9–12 ms across four edits |
| Saved Run to rendered heading | Comparable baseline pending | 6.47 s |
| Studio production build directory | 361 MiB | 386 MiB |
| Local vault after completed B8 browser cleanup | 3.0 GiB | 3.0 GiB at rounded precision |
| Peak RAM and repeat-run latency | Pending | Pending |

Evidence is local in `.motionux-v9/evidence/build-b8/`. The browser report is `browser.json`. Native planning is recorded in `codex-live.json`. Unit, production-build and whole-repository checks generate `unit.log`, `studio-build.log` and `root-verify.log` in the same folder.

| Screens | Evidence files |
| --- | --- |
| Studio | `unified-gallery.png`, `creator-edit.png`, `creator-interact.png` |
| Website | Per-route screenshots at 1,440 px light and 390 px dark, with filenames ending in `-1440-light.png` and `-390-dark.png` |

## Open acceptance areas

- A shared Studio navigation/theme/search and draft-session restore across discovery and editing.
- Per-block accessibility/design reviews, a full visual comparison to a pre-change baseline, and the creator shell's full bilingual coverage.
- A larger controlled performance sample at the same commit, repeated preview/export peak memory and disk measurements, and physical mobile and manual screen-reader verification.
- Full browser automation from the native Composer review to export of the same generated project. The signed-in service test covers reviewed project creation, and the browser test covers manual creation through export.
- Permanent media purge and project-level media backup. The library keeps normalized local files for reuse and recovery.

Run the portable and local checks using the [quality gates](BUILD-QUALITY-GATES.md).
