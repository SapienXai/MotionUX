# MotionUX product roadmap

MotionUX is **the motion intelligence layer for AI-built interfaces**. Its users are the people and coding agents turning an intent into an interface inside an existing product. A component name or screenshot rarely tells an agent what to do after a booking changes state, which input methods a gesture supports, or how to preserve a product’s pacing. MotionUX will connect that context to pinned implementations, an explanation of fit, and evidence from the resulting screen. Motion quality depends on what the movement communicates, how people can act on it, and what verification shows.

## Product boundaries

- Studio remains a first-class local product. People can discover, compare and collect originals independently of the planned intelligence layer.
- Early versions run on a checkout and the local vault. Hosted inference, vector databases, custom model training, accounts, billing and multi-user infrastructure sit outside the initial phases.
- An integration preserves the application's design, navigation and ownership of state. App changes require explicit user instructions. Caller-owned business results, including bookings and payments, drive feedback.
- Each proposed movement needs a purpose. A recommendation may select an immediate state change, a reduced-motion behavior or an explicit abstention.
- Rights and compatibility travel with the source. The upstream license, asset terms, install format and evidence determine what an agent can offer for that project.

## Working today

V13.1 established the verified 324-original baseline. V14 expands the prepared local Studio to 500 originals from eight providers, including 450 React packages and 50 standalone HTML examples with sandboxed React hosts. Gallery uses measured responsive rows with a bounded live-preview budget. It preserves exact edition order, favorites and collections. Playground links to Code, Usage, Install and Compare. My Library holds notes and saved selections, and Project Kit exports install recipes with dependency conflicts called out. [Developer guide](DEVELOPER-GUIDE.md) · [Studio and library](V11-IMPLEMENTATION.md) · [V13.1 evidence](V13-1-PERFORMANCE.md) · [V14 originals](V14-ORIGINALS.md)

| Boundary | Existing path | Responsibility |
| --- | --- | --- |
| Public Studio and registry | [Studio](../studio/) and [registry manifest](../registry.json) | Public shell, stable `v1.0.0` items and labeled Legacy V8 previews. |
| Edition import | [Edition manifests](../metadata/editions/) and [preparer](../scripts/originals/prepare.mjs) | Pinned source references, edition sequence, build shards and an incremental index. |
| Local originals | [Catalog loader](../scripts/studio/catalog.mjs) and [loopback server](../scripts/v9/serve.mjs) | Resolve prepared source, compare lanes, local shadcn install artifacts and previews from the ignored vault. |
| Personal workspace | [Library storage](../scripts/studio/v11/library.mjs), [kits](../scripts/studio/v11/kits.mjs) and [recovery](V11-IMPLEMENTATION.md#library-and-recovery) | Locally versioned library edits, portable kit manifests, backups and restore checks. |
| Verification | [Original verification](../scripts/originals/verify.mjs), [consumer checks](../scripts/originals/consumer-check.mjs), [quality gates](QUALITY-GATES.md) | Separate source identity, actual mount, install build, sampled motion and human acceptance evidence. |

Raw provider files, generated private registries, user collections and local browser reports remain under `.motionux-v9/`. The public registry has its own release and review history. Synthetic 500- and 1,000-record tests establish Gallery capacity under metadata load. Long sessions with many live previews remain a distinct runtime gate. [Public registry catalog](COMPONENTS.md)

The planned workflow moves from discovery to intent, recommendation or abstention, integration and verified outcomes. Studio provides discovery, manual selection and comparison today. Brain, Agent, MCP, Motion DNA and Inspector are planned.

## Delivery phases

Each phase has an evidence gate before its interfaces become dependencies for later phases.

| Phase | User capability | Key deliverable | Dependencies | Acceptance gate | Status |
| --- | --- | --- | --- | --- | --- |
| P0 · Studio and source foundation | Try and export pinned motion | Edition manifests, loopback Gallery, Playground, Compare, Library, Project Kit and vault restore | Official source, notices and fixture builds | Prepared catalog, independent consumer, sampled parity, responsive browsing, bounded frames and backup restore | Available. V13.1 hardening verified. |
| P1 · MotionUX Brain V1 | Find motion by interaction intent and get a reasoned answer | Versioned evidence schema, local index builder, deterministic ranking CLI and benchmark scenarios | P0 catalog, pins, install and evidence contracts | Relevant top results in controlled scenarios, structured abstentions and reviewable reasons. Missing evidence never promotes readiness. | Next strategic milestone |
| P2 · MotionUX Agent V1 | Ask Codex for a reviewable integration | Local inspect/plan/export CLI and skill, using Brain and Project Kit | P1 stable results and P0 install/verification | One real test-app workflow preserves the existing design, state, keyboard and touch behavior, and produces rollback instructions plus browser evidence | Planned |
| P3 · MCP and project context | Invoke stable local tools from a fresh Codex session | Local MCP schemas and repo context adapter | P2 proven CLI, explicit write authorization and repeatable verification | A fresh session discovers tools, reads the context, recommends a component, applies only the authorized patch and returns evidence | Planned |
| P4 · Motion DNA | Give projects a consistent motion language | Versioned JSON profiles, optional tokens and compatibility-aware adapters | Brain metadata and Agent project context | Sample app demonstrates profile fit, accessibility overrides and deliberate stillness. Provider physics remain intact. | Planned |
| P5 · MotionUX Inspector | Find and validate real motion problems | Static/rule audit, browser trace collector and before/after reports | Reliable source evidence, project context and motion profiles | Seeded faults are detected and prioritized. Good and intentionally static controls pass. Repairs are demonstrated with reproducible browser evidence. | Planned |
| V14+ · Source expansion | Browse more useful official originals | Incremental editions toward 750 and 1,000+ prepared sources after V14's local 500 | P0 source, install, preview and memory checks | Unique pinned sources, notices, compatible installs, real browser evidence and newest-first ordering. Peak documents and long-session memory measured. | V14 available locally. Later editions continue in parallel. |
| Exploration | Explore shared libraries, hosting or ecosystem integrations | Rights review and evidence from real use | Product demand, suitable agreements and sustained quality | Establish an explicit product and distribution decision before implementation | Exploratory |

## Brain data and decisions

This example records the shape of a future index entry. Values without evidence remain `unknown`. Each observation should name its collection method and exact source pin.

```json
{
  "schemaVersion": 1,
  "id": "example-inline-disclosure",
  "motionIntent": ["maintain-context", "reveal-detail"],
  "interactionPattern": "inline-disclosure",
  "useCase": ["show-booking-policy"],
  "motionBehavior": { "trigger": "user-activation", "interruption": "unknown" },
  "inputMethods": ["keyboard", "pointer"],
  "supportedDevices": { "desktop": "verified", "physicalMobile": "unknown" },
  "a11y": { "keyboard": "verified", "screenReader": "unknown" },
  "reducedMotion": "unknown",
  "performanceClass": "unknown",
  "integrationKind": "react",
  "dependencies": {},
  "sourceRef": { "revision": "example-pin", "entryHash": "example-hash" },
  "evidence": [{ "method": "browser-test", "reference": "example-disclosure-keyboard", "pin": "example-pin" }],
  "readiness": "verified",
  "confidence": { "interactionPattern": "observed", "reducedMotion": "unknown" },
  "avoidWhen": ["information-must-be-visible"]
}
```

Use the source and props for structural facts. Use captured interactions and the provider demo for behavioral observations. Attach browser accessibility and performance evidence at its measured coverage. Require human review for fit and visual craft. Store human-curated annotations separately from generated evidence so stale evidence can be invalidated when source hashes change. An overall readiness state never substitutes for the per-claim evidence.

Retrieval begins with hard requirements for device, input, accessibility, performance budget, integration format, dependency compatibility and distribution. An unknown fails a required verified filter. Rank surviving entries by intent and pattern, then evidence strength, fit and cost. Use a stable tie-breaker and explain distinctions among the shortlist. Version the rules and the index together. Add an assisted ranking step only after a reproducible evaluation shows a gain.

A **no-motion** result explains what the user needs, why an immediate or existing state change serves it and how to verify that outcome. A **no-suitable-component** result explains which constraint blocked the shortlist and which evidence could change the decision. Both are valid answers.

## Agent workflow and safety

**Future example.** “Make it easier to understand what happens after I submit a booking. Keep our existing design and check the flow on touch and keyboard.”

1. Read the app's route, design system, local instructions and authoritative state transitions.
2. Identify the interaction intent and budget. Offer a small source-linked shortlist or recommend stillness. State the tradeoffs and evidence gaps.
3. Obtain a selection and an explicit edit scope. Inspect install paths, assets, dependency conflicts and the revert path before modifying the target.
4. Install the selected pin using the appropriate local registry/Project Kit. Adapt only project-owned glue and supported options. A React consumer, sandboxed HTML wrapper and Next-specific component can have different prerequisites.
5. Exercise pending, success, failure and cancellation on the real screen. A simulated timer, animation completion or optimistic state cannot authorize a booking or imply a settled payment.
6. Report the diff, actual tests, unresolved checks and exact rollback.

P2 starts with read-only analysis. Its first write-capable acceptance run targets a disposable fixture explicitly authorized for integration. P3 can expose proposed local tool names such as `search_motion`, `inspect_component`, `recommend_motion`, `get_install_recipe`, `audit_motion` and `verify_integration` after the underlying CLI contracts exist. Read-only tools must not write project state. Source export and edits respect explicit scope and the private/public boundary.

## Decisions and guardrails

| Decision | Rationale and guardrail |
| --- | --- |
| Local-first | Keep private project context and restricted source in the workspace. Maintain loopback binding, sandbox isolation and path checks. Verify any new data boundary before exposing it. |
| Pinned official source | Preserve upstream behavior, assets, notices and provider-specific installation requirements. Record original and consumer hashes separately when import paths are adapted. |
| Deterministic Brain first | Make ranking, abstentions and missing evidence inspectable and regression-testable. Set a measured baseline before considering remote models or vector search. |
| Project-specific motion | Motion DNA can constrain tempo, easing, springs, interruption, continuity, reduced motion and device budgets for compatible adapters. A profile must preserve upstream physics and allow stillness. |
| Evidence by claim | Validate input and assistive technology coverage explicitly. Record runtime budgets and isolation for expensive Canvas, WebGL and iframe workloads. Use manual review to decide visual and interaction fit. |
| Edition-based expansion | Pin source and stable sequence, detect duplicates, build independently, report dependency and rights conflicts, verify live code and only then count a source in a prepared edition. |

Keep access to provider payloads distinct from distribution rights. Preserve original code and notices in the vault. Validate cross-provider kits inside a clean consumer. Track browser memory, main-document heap, graphics pressure and iframe counts independently as catalogs grow. [Source engine](V9-ORIGINAL-SOURCE-ENGINE.md) · [Design principles](DESIGN-PRINCIPLES.md)

## Definition of done

| State | Evidence required |
| --- | --- |
| Planned | Problem, scope and acceptance checks are documented. |
| In progress | An implementation and its remaining blockers are tracked. |
| Built | The artifact exists and can run through its intended entry point. |
| Verified | Named tests pass with pinned inputs and reproducible outputs. Untested environments stay visible. |
| Accepted | A reviewer has evaluated the result in the target context against the relevant visual, motion, accessibility and performance gates. |

Track reviewed scenario success and abstention quality, time from request to a usable integration, source/visual/interaction fidelity, failed installs, mobile and accessibility regressions, performance regressions, review acceptance and library use. Each metric needs a protocol and a repeatable baseline before setting targets. Start with local test and review artifacts. [Quality gates](QUALITY-GATES.md)

## Next execution milestone · Brain V1

**Goal.** Build a semantic index and local search for the prepared catalog. The result must be intelligible to a person using the CLI and machine-readable for future Codex tooling.

1. Add a versioned schema under `schemas/` and a Brain index builder under `scripts/brain/`. Use the current catalog loader for identity, format, pins and verified availability. Read local evidence where available. Record per-field provenance, confidence and unknowns. Write generated indexes to the ignored vault.
2. Add a deterministic ranker with explicit required constraints, an inspectable score breakdown and structured `no-motion` and `no-suitable-component` results. Accept structured CLI input first. Support readable output and JSON, with stable field and result ordering.
3. Build small, reviewable fixtures covering disclosure, navigation continuity, feedback, gestures and cases where stillness is preferable. Include contradictory requirements, stale pins, unsupported mobile/accessibility coverage and incompatible dependencies.
4. Test schema rejection, incremental rebuilds, reproducibility, duplicate sources, empty vault behavior, hard filters, tie-breaking, abstention, and the exact link from a recommendation back to its install and evidence. Run offline on the prepared catalog and measure index time and search latency. Keep existing Studio tests passing.
5. Deliver the schema, builder, CLI, fixtures, tests, example transcripts and a human-reviewed scenario report. Require every ready record to be indexed with provenance or an explicit unknown. Require deterministic re-runs and actionable explanations for the reviewed scenarios before accepting Brain V1.

This milestone has no application-writing tools, no MCP service and no AI inference dependency. Compare the index against the Studio catalog and keep all proposed product APIs behind the next phase’s acceptance gate.
