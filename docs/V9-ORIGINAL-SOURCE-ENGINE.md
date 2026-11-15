# MotionUX V9 Original Source Engine

The public Studio contains the source catalog and comparison interface. The private Studio can mount the actual upstream implementations and serve the packages built from those snapshots. V8 registry entries remain available for existing consumers and as labeled legacy previews.

## Run the private Studio

```sh
npm ci
npm run sources:inspect
npm run sources:prepare
npm run build
npm run sources:serve
```

Open [Original sources](http://127.0.0.1:5199/?view=sources). The private server binds to the loopback address. It serves original and installed specimens from the ignored `.motionux-v9/` workspace and serves the public Studio shell from `dist/`. The standard Vite server and the public build have no private payload link.

Gallery cards use the local originals when available and keep the original controls and colors. The comparison opens three interactive frames. The first builds the pinned source with the upstream styles. The second mounts the original in MotionUX. The third renders independently installed source. Use the shared scene selector when provided and **Reset all** to reproduce input in every pane. The Code panel exposes both source variants and the Install panel serves a local shadcn item. The install examples assume a shadcn project with `@/` aliases and Tailwind 4 for React specimens that depend on it.

Enable **Live previews** in Original sources to browse the expanded collection. The Studio only mounts visible or focused frames. **Evidence** shows the normalized pixel overlay and links to the recorded measurements when available.

## Capture and source state

The official DesignBookmark copy action returned **51 first-party payloads**, including 50 complete HTML documents and one TSX component. Its other 31 cards link to providers and offer their install command. The source map records each reference, its observed status, and the available provenance. The HTML packages install the original document as a local static asset and use a React iframe host. The HTML document retains its original script, styles, assets, and notices. It keeps its own theme controls.

Kokonut UI and SmoothUI snapshots use pinned Git revisions. Their original lanes preserve the upstream source. SmoothUI’s installed lane remaps internal monorepo imports to shadcn aliases; the manifest stores the original and installed hashes. The bundled CSS and documented demo are separate files. Each generated consumer is isolated from the V8 Studio dependency graph and has a local package lock.

[Reference map](../metadata/v9-reference.json) · [Provider discovery](../metadata/v9-provider-candidates.json) · [Source review](SOURCE-REVIEW.md)

## Verification and counts

All **140 unique source entries** mounted in both the original and installed environments. These include **all 82 legacy references** and **58 additional specimens**. The component source hashes are distinct. 102 component files retained the same upstream bytes and 38 SmoothUI entries use the import remapping described above. No source is marked fully accepted.

| Provider | Original and installed mounts |
| --- | ---: |
| DesignBookmark | 51 |
| Kokonut UI | 25 |
| SmoothUI | 38 |
| React Bits | 7 |
| Motion Primitives | 10 |
| Magic UI | 9 |

The four-pilot suite matched 36 sampled behaviors and initial ARIA snapshots across Chromium, WebKit and Firefox. It used desktop light, desktop dark with reduced motion, and a 390 px emulated profile. A separate 390 px touchscreen run matched Swipe Tabs drag, Wheel Picker flick and Scrubber drag. The Next 16.4.6 fixtures installed all four pilot packages over the private HTTP registry and prerendered with Tailwind 4.3.0.

The matched 440×440 Chromium comparison gave seven pixel-identical pilot snapshots out of eight. The light Scrubber capture differed by 54 of 193,600 pixels. Original first-party Goo Menu opened the same four actions, Morph Island selected the call state, Swipe Deck moved its cards and Glass Lens tracked the pointer in both source and installed output. The first-party autoplay captures still show pixel differences, most notably Swipe Deck and Glass Lens. The standalone exports ship their own timing and formatting, including the punctuation already present in the Swipe Deck export.

Run `node scripts/v9/verify.mjs`, `node scripts/v9/compare.mjs`, `node scripts/v9/touch.mjs` or `node scripts/v9/next.mjs` against the running private Studio. Browser evidence and screenshots are saved under `.motionux-v9/evidence/`. The import ledger reports each reference’s source and observed verification state. [Import ledger](../metadata/v9-import-ledger.json)

Full per-item visual, motion, accessibility and performance acceptance is still open. The test run did not include physical hardware or manual screen readers. Tailwind 3 compatibility was not asserted for V9’s Tailwind 4 upstream code. The Compare view shares the supported scene and theme and can reset all frames. Input actions and animation timing are exercised independently in the tests.

## Performance

In the desktop 1536 px, 4× CPU local Chrome run, the public Studio requested 214,132 B gzip-equivalent initial JavaScript. V8 requested 211,254 B. The private Studio requested 138,697 B of initial JavaScript, 60,679 B of HTML documents including their inline source, and a 3,896 B catalog summary. Provider discovery loads on demand. The 140-card sweep mounted at most nine frames and returned to six frames at the top. Root-process retained JS heap was about 7.9 MB before and 7.6 MB after the sweep and forced collection. All four viewport widths avoided document-level horizontal overflow. [Measurements](evidence/studio-v9/performance.json)

## Discovery and refresh

The provider discovery script records 1,228 deduplicated listings across nine providers. Motion examples, Aceternity, Animate UI and Cult UI still have discovery records and source links in this pass. Re-run with `node scripts/v9/discover.mjs --check` after restoring the pinned clones and public index snapshots. New DesignBookmark payloads are kept by SHA-256. If a captured source changes, review `inspection.pending.json` and use `npm run sources:inspect -- --adopt-refresh` to adopt it before rebuilding and re-verifying. Update a Git pin explicitly to review a new provider revision.

The public CI checks the original inventory and source metadata contracts, runs the existing browser and registry suite, then inspects the public output for private artifacts. Private source and screenshot evidence remain on the local machine.
