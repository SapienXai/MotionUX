# MotionUX Brain V1

Brain is the offline decision layer over the prepared MotionUX catalog. It can find an interaction by intent, explain why a candidate fits and recommend an immediate state update when motion adds no value. Its output is input for a person or an agent. The CLI writes its own index, cache and evidence reports.

## Run locally

Use Node.js 24 with the pinned repo dependencies. Follow the Studio setup guide for a fresh vault. Brain reads prepared sources and existing evidence from disk with network access denied. Preview and install links use the same-Mac Studio when it is running. [Studio setup](DEVELOPER-GUIDE.md#set-up-studio)

```sh
npm ci
npm run brain:index
npm run brain:doctor
npm run brain:search -- --query "Sekme gezinme ve seçim devamlılığı" --json
npm run brain:recommend -- --request ./fixtures/brain/booking-confirmation.json --json
npm run brain:inspect -- --id kokonut-wheel-picker --json
npm run brain:evaluate
npm run brain:benchmark
```

Use `npm run brain:index -- --check --explain-changes` to validate the existing index without writing. It exits nonzero when a prepared catalog requires rebuilding. `--force` rebuilds all profiles and can replace a corrupt index after full validation. An empty vault returns `not-prepared` with setup and offline fixture instructions.

The index lives at `.motionux-v9/brain/index.v1.json`. The `state.v1.json` cache records local file timestamps and SHA-256 digests. The builder rehashes changed files and compares each record's source, schema, rules, annotations and evidence fingerprints. Unchanged profiles skip AST processing. Validated output is atomically replaced. The cache is recoverable independently. Queries recheck freshness before returning records and withhold stale rows.

`--request` takes a regular workspace-relative JSON file of up to 64 KiB. Escaping paths, symlinks and remote URLs are rejected. `--json` emits one JSON value. Decisions include `candidates`, `no-motion`, `no-suitable-component`, `need-more-context`, `not-prepared` and `stale-index`. The pure `createBrain(index)` API is importable by a future agent. [Ranker](../src/brain/ranker.ts)

## Read a recommendation

The ontology defines intent, interaction pattern, motion family, trigger and use case. Schemas validate requests, indexes, results, curation and the ontology. [Ontology](../metadata/brain/taxonomy.v1.json) · [JSON Schemas](../schemas/brain/) · [TypeScript contracts](../src/brain/contracts.ts)

- **Search** understands Turkish and English phrases and selected inflections. Title and category tokens get a low, separate discovery weight.
- **Recommend** requires a supported intent or pattern match. It applies hard format, input, accessibility, dependency and cost requirements before scoring. An explicitly pending or failed state prunes candidates whose evidence lacks the corresponding purpose. Booking and payment results remain application-owned.
- **Scoring** exposes intent, pattern, motion, trigger, use case, evidence, mobile fit, preference, lexical and cost contributions. Equal scores sort by ID. Preferences can improve rank and never clear a hard gate.
- **Evidence** is scoped by field. `curated` records authored source interpretations. `observed` records structural facts such as a spring call or client directive. `verified` names a specific browser action or install check. Unchecked claims remain `unknown`. Known incompatible capabilities are `unsupported`. Positive claims carry a locator and exact source hash. Annotations have their own revision and source anchors. [Source annotations](../metadata/brain/curation/)
- **Performance and accessibility** separate Studio scheduler units from device CPU/GPU measurements. Rendering with reduced motion enabled establishes a viewport result. Reduced-motion behavior requires its own evidence. Emulated touch covers a named action on the emulated profile. Physical devices and assistive technology require separate tests.
- **Abstention** distinguishes an immediate state update from unavailable evidence or an incompatible requirement. Unclear intent asks for more context.

React packages and standalone HTML wrappers share the prepared catalog. HTML originals keep their own scope inside an iframe. Raw sources, generated indexes, personal collections and browser evidence remain in the ignored vault. My Library notes stay outside scoring.

## Observed examples

| Request | Decision and first result |
| --- | --- |
| Rezervasyonun tamamlandığını sakin ve anlaşılır biçimde göstermek istiyorum | `candidates` · `kokonut-promise-toast` |
| Sekme gezinme ve seçim devamlılığı | `candidates` · `animateui-components-base-tabs` via search |
| Wheel picker for time, keyboard verified | `candidates` · `kokonut-wheel-picker`, with the tested ArrowUp action |
| AI tool progress with details for a tool call | `candidates` · `kokonut-agent-steps` |
| Form hatasını animasyonsuz göster | `no-motion` · show the error immediately and preserve focus |
| Swipe carousel, physical mobile required | `no-suitable-component` · `unverified:physical-mobile` |

## V1 measurements

The vault supplied **500** current originals, **114** authored source profiles from eight providers and **186** records with pin-scoped sampled-motion evidence. Three had a verified keyboard action and three had verified touch emulation. Physical mobile, screen readers, RTL, reduction behavior and measured per-component performance remain open. Source and install integrity were checked across 9,969 frozen file hashes. Visual acceptance remains pending for the prepared originals.

The 51 pinned gold scenarios contain 25 Turkish and 26 English requests, with 30 positive, 21 abstention or clarification, and 18 hard-requirement cases. The authored set is a reproducible release gate. Generalization to new workflows and independent human acceptance remain open. [Gold scenarios](../fixtures/brain/scenarios.v1.json)

| Measure | Result |
| --- | ---: |
| Top-1 / top-3 / top-5 hit | 76.7% / 100% / 100% |
| Mean recall of all acceptable IDs in top 5 | 90.6% |
| Mean reciprocal rank | 0.861 |
| Hard requirements | 18/18 correct, zero violations |
| Evidence mismatch | 0 |
| No motion | 8/8, precision and recall 100% |
| No suitable component | 11/11, precision and recall 100% |
| Need more context | 2/2, precision and recall 100% |

On Apple M5 Pro with Node 24.20.0, cold index construction took 1.08 s. A benchmark-only change to one annotation in memory took 347 ms end to end and reused 499 profiles. The index occupied 3,682,349 bytes. Across 255 warm in-process searches with result serialization, p50 was 0.21 ms and p95 was 1.52 ms. Timings exclude Node startup and warm query timing excludes vault I/O. Post-GC heap after the real run was 32.3 MiB and process RSS was 375.5 MiB. Separate synthetic 500 and 1,000 metadata-record runs recorded p95 of 1.34 and 2.37 ms.

Detailed reports live under `.motionux-v9/evidence/brain-v1/`. `npm run test:brain` verifies the engine with public synthetic fixtures, including constraints, stale evidence, deterministic ordering, atomic recovery and an empty vault. This suite runs inside `npm test`.

## Next handoff

**Agent V1** uses Brain to retrieve intent-ranked options and source evidence for a selected route. The local tool emits a reviewable, read-only motion plan. Application edits and installation are Agent V2 milestones. [Agent V1](AGENT-V1.md) · [Roadmap](ROADMAP.md)
