# MotionUX Agent V1

Agent inspects one explicitly selected React or Next.js screen and proposes what motion would help, why it fits, and how to verify it. It uses the local Brain V1 index for source recommendations. The target stays read-only throughout inspection, planning and report export.

## Run it

Use Node.js 24 and run these commands from MotionUX. Inspection works with a checkout and `npm ci`. To use the real catalog for planning, prepare the local Studio vault, then run `npm run brain:index`. [Studio setup](DEVELOPER-GUIDE.md#set-up-studio) · [Brain V1](BRAIN-V1.md)

```sh
npm run agent:doctor
npm run agent:inspect -- --project ./fixtures/agent/booking-demo --route /bookings/confirmation --json
npm run agent:plan -- --request ./fixtures/agent/requests/booking-confirmation.json
npm run agent:plan -- --project ./fixtures/agent/booking-demo --route /bookings/confirmation --goal "Suggest a calm booking confirmation" --json
npm run agent:plan -- --project ./fixtures/agent/booking-demo --route /checkout --goal "Do not animate form errors." --markdown
npm run agent:plan -- --request ./fixtures/agent/requests/physical-mobile.json --json
npm run agent:evaluate
npm run test:agent
npm run agent:benchmark
```

Use `--route` for an exact URL path and `--file` for a workspace-relative screen file. The project directory can be a MotionUX-relative or absolute canonical path. Dynamic matches expose the route template in output to avoid retaining the supplied identifier. With ambiguous routes, use one reported file explicitly. Vite and ordinary React entry detection covers the root screen. Select a file for application-specific client routing.

Private request JSON belongs in `.motionux-v9/agent/requests/`. The public fixture examples are under [fixtures/agent/requests](../fixtures/agent/requests/). Set `requirements.support` to hard requirements such as `physical-mobile`, `keyboard`, or `screen-reader`. `requirements.platform: "mobile"` affects fit. `maxRecommendations` defaults to three and allows one through five. [Request schema](../schemas/agent/request.v1.json)

Plans default to text. For scripts, combine `npm run --silent` with `--json` to receive one object and `--markdown` emits a reviewable report. To keep the result locally, add `--output .motionux-v9/agent/reports/booking.json` or use a `.md` filename. Repeat the same plan command with `--check .motionux-v9/agent/reports/booking.json` to compare fingerprints without modifying the previous report. The check distinguishes changed project bytes from changed Brain evidence. A stale report exits with code 1.

## Understand a result

1. **Screen evidence.** Resolve the selected App Router or Pages Router route and applicable layouts. Read direct local imports with a depth limit. Cite a relative file, line range and SHA-256 for each observed interaction, render condition, state boundary and theme fact.
2. **State ownership.** The booking fixture links an awaited server result to the client's concrete confirmed, pending, failed and cancelled predicates. A guarded fetch and decoded status can establish an API-originated predicate. A timer-only change cannot establish a completed business outcome. Runtime truth still depends on the application and its backend.
3. **Brain decision.** The same versioned Brain inputs make a shortlist, choose immediate feedback, abstain on missing capability evidence or request clearer intent. If the local catalog is absent or stale, the plan retains the project context and offers setup or reindexing instructions. Incomplete inspection withholds the shortlist.
4. **Implementation proposal.** The plan includes exact source pins, target evidence, declared semver conflicts, iframe boundaries, and suggested integration points. Screen reader, focus, touch, reduced motion, 320/390 px layouts, error/interruption, localization and performance checks are marked `proposed`. Reports also specify how to revert a separately authorized future change.

A source demo’s sampled motion has its own evidence. Project-specific runtime behavior, physical mobile, screen-reader, RTL, reduced-motion behavior, backend correctness and device CPU/GPU cost remain unverified until someone tests the actual interaction. Declared package-range overlap describes a possibility. Lockfile resolution, peer dependencies and installed compatibility require an independent consumer.

## Scope and security

| Boundary | Rule |
| --- | --- |
| Project reads | Explicit root and route or file only. Selected layouts, bounded local source and CSS imports, package metadata, aliases, and limited root guidance. |
| File policy | Text JS/TS, CSS and allowlisted root JSON/Markdown. Symlinks, hard-linked files, binaries, traversal, credential paths, dotfolders, dependencies and build outputs stay outside the reader. Imports are data. |
| Budgets | 96 KiB per file, 48 files, 768 KiB total, import depth 4, 1,200 directory entries, 1,100 filesystem probes, 320-character relative paths, and 12 route segments. The 2.5 s cooperative inspection deadline is checked between bounded operations. A single in-flight filesystem operation or TypeScript parse can finish before the next check. |
| Execution | The TypeScript parser and in-memory binder handle the text. Their host does not resolve packages, invoke loaders or write files. The CLI does not start the project, run its scripts, request URLs or install components. |
| Persistence | Explicit report output only, owner-only file permissions, atomic replacement inside the ignored report directory. The destination cannot be within the target. Authored test fixtures and schema contracts belong in public Git. |
| Fingerprints | Project identity hashes the exact inspected paths and bytes. Reports include the Brain index and source fingerprints, the decision and its source pins. Unrelated files outside the inspected graph do not contribute to project identity. |

The current route resolver covers app/pages root and `src/`, route groups, static and dynamic segments, catch-alls, and local TS paths. Parallel or intercepting routes, middleware rewrites, inherited alias chains, runtime-generated routes, arbitrary reducers and indirect business state are limited or unknown. Keep the selected checkout stable while inspecting it. The reader rechecks file identity around a bounded read. Concurrent filesystem replacement by a separate process is outside the threat model. [Next.js route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) · [Dynamic segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) · [Server/client conventions](https://nextjs.org/docs/app/getting-started/server-and-client-components)

The static fixture is a fictional Next.js 16 / React 19 / Tailwind 4 app. Evaluation parses it, checking exact citations against actual lines. It covers 32 independent Turkish/English expectations and a separate adversarial suite. No customer workspace or physical device participates in these tests. [Fixture app](../fixtures/agent/booking-demo/) · [Evaluation scenarios](../fixtures/agent/scenarios.v1.json) · [Tests](../scripts/agent/agent.test.mjs)

## Codex handoff

> Use MotionUX Agent V1 on this explicitly selected route. Preserve the project’s design. Show the owner of each business state, the source pins and a proposed verification checklist. Return a read-only plan.

The CLI is the local contract. Other consumers can use the static inspection entry point and `createMotionPlanner(index)`. [Inspector entry point](../scripts/agent/inspect.mjs) · [Planner](../src/agent/planner.ts) · [Context and plan schemas](../schemas/agent/)

The separate Agent V2 capability reviews, applies and verifies one pinned integration in an explicitly authorized booking fixture clone. Agent V1 retains its read-only contract. [Agent V2](AGENT-V2.md) · [Roadmap](ROADMAP.md)
