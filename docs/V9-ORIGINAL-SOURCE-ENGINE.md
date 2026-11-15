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

## Capture and source state

The official DesignBookmark copy action returned **51 first-party payloads**, including 50 complete HTML documents and one TSX component. Its other 31 cards link to providers and offer their install command. The source map records each reference, its observed status, and the available provenance. The HTML packages install the original document as a local static asset and use a React iframe host. The HTML document retains its original script, styles, assets, and notices. It keeps its own theme controls.

Kokonut UI and SmoothUI snapshots use pinned Git revisions. Their original lanes preserve the upstream source. SmoothUI’s installed lane remaps internal monorepo imports to shadcn aliases; the manifest stores the original and installed hashes. The bundled CSS and documented demo are separate files. Each generated consumer is isolated from the V8 Studio dependency graph and has a local package lock.

[Reference map](../metadata/v9-reference.json) · [Provider discovery](../metadata/v9-provider-candidates.json) · [Source review](SOURCE-REVIEW.md)

## Verification and counts

`node scripts/v9/verify.mjs` runs the local browser harness against the private Studio and writes its result and screenshots under `.motionux-v9/evidence/`. Use `--quick` for a shorter Chromium pass. The harness checks original and installed mounts, captures the pilot comparison and records the sampled behavior and ARIA separately. Discovery and mount evidence are separate. A sample from the official download does not by itself establish pixel or motion equivalence to the live provider site.

The provider discovery script reads official repositories and registries. Re-run with `node scripts/v9/discover.mjs --check` after restoring the pinned clones and public index snapshots. Reviewing a new provider revision and re-running its installation and comparisons are explicit steps.

The public CI checks the original inventory and source metadata contracts, runs the existing browser and registry suite, then inspects the public output for private artifacts. Private source and screenshot evidence remain on the local machine.
