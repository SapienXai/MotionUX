# MOTIONUX — AGENT V3
## Authorized General-Project Integration, Evidence-Gated Selection & Verified Rollback

**Type:** Direct execution / Codex master implementation instruction  
**Repository:** `SapienXai/MotionUX`  
**Starting reference:** `503fcae5f33867de30e323e2b0c8a685a63b78b7` (re-read actual `main` before starting)  
**Product:** MotionUX — *The motion intelligence layer for AI-built interfaces.*  
**Main goal:** Turn the proven fixture-only Agent V2 into a reusable, **scope-bounded, approval-gated** integration engine for multiple native React/Next.js interactions; prove it on disposable realistic projects, **not on live customer projects**. Fix Brain negation and retain MCP V1 read-only behavior.  
**Execution:** IMPLEMENT AND TEST, not merely plan. Work directly on `main` in the MotionUX repo if working tree/permissions allow; push only the MotionUX code after actual validation. Never deploy, release, modify external apps, or expose private vault materials.

---

## 0. NON-NEGOTIABLE WORK ORDER

This is an implementation request. Read all instructions, inspect the current source, choose a minimum-sufficient architecture, then implement, exercise and document it. Do not ask me to confirm each internal development step. For **real-project write approval**, the blanket permission to implement V3 **is not approval**: only disposable, generated copies of the checked-in test projects are authorized write targets for this assignment.

**Do not:**
- Change BookPlace, DineWallet, XPOS, PlaceDJ, MailCrew or any other external working repository, even as a "test". Do not modify any actual user's original project root.
- Expose an MCP write tool (`apply`, `install`, `rollback`, arbitrary shell, trust-project) on the existing `motionux` MCP service. Preserve exactly its five read-only tools. Do not broaden Codex's global filesystem privileges or rewrite unrelated `~/.codex/config.toml` settings.
- Use a generated `approve:<runId>:<hash>` string as independent user authorization. V2's `manifestConfirmation` is a **deterministic acknowledgement**, not an authentication or independent authorization primitive.
- Run arbitrary target-supplied scripts, use unbounded codegen patches, execute remote installers, add a new database/server/remote AI API, or depend on a paid embedding/LLM service.
- Re-import 500 originals, alter their physics, overwrite upstream TSX/CSS/assets, broaden provider licenses, add new gallery entries, or change the premium Studio UI.
- Erase, vacuum, delete or rewrite the ignored `.motionux-v9/` source vault or personal Library. **Storage was reduced to ~3.06 GB; do not recreate 59 GB of persistent dependencies.**
- Claim production readiness, proof of physical mobile, manual screen reader or real backend tests without genuine evidence.

**Success declaration:** `AGENT_V3_FIXTURE_READY` only if every fixture, safety, freshness, quality, clean rollback and CI gate passes. `AGENT_V3_GENERAL_WRITE_READY` is **NOT** implied by fixture success; only claim genuine real-target authorization support if an independently enforced host/operator boundary was demonstrably available and tested. Otherwise mark `REAL_PROJECT_WRITES_DISABLED` and explain exactly what is missing. If fixture acceptance fails, report `AGENT_V3_NO_GO` honestly.

## 1. VERIFY BASELINE, PROTECT SOURCE, RECORD CONTEXT

Read and cross-check the real current source and docs, at minimum:

- `README.md`, `AGENTS.md`, `docs/ROADMAP.md`, `docs/AGENT-V1.md`, `docs/AGENT-V2.md`, `docs/BRAIN-V1.md`, `docs/MCP-V1.md`, `docs/V14-ORIGINALS.md`.
- `src/agent/{contracts,planner,validation}.ts`, `scripts/agent/{cli,workspace,inspect,local-brain,report}.mjs`.
- `scripts/agent/v2/{cli,source,review,files,transaction,process,verify,browser,recheck,report,integration.test}.mjs` and `src/agent/integration/*`.
- `src/brain/{contracts,ranker,taxonomy,indexer}.ts`, `metadata/brain/taxonomy.v1.json`, `fixtures/brain/scenarios.v1.json`, `scripts/brain/{evaluate,evidence,index-store}.mjs`.
- `scripts/mcp/{server,projects,verify-codex,protocol.test}.mjs`, `src/mcp/*` and registered Codex MCP configuration; read it safely without altering unrelated entries.
- `scripts/originals/{prepare,consumer-check}.mjs`, `scripts/studio/storage-audit.mjs`, `package.json`, `package-lock.json`, `.gitignore`, existing fixture apps and tests.

Record `git status`, HEAD and origin/main, relevant previous test counts, Brain index readiness, source pins and overall storage baseline. Verify the V14 prepared local catalog contains **500** ready originals, with unchanged hash identities. If the working tree is dirty or current branch advanced, reconcile without destructive reset or overwriting user work. If no prepared vault is available, still build and test the public synthetic fixtures and label private-real-evidence gates blocked; don't fabricate 500-vault test results.

Before touching implementation, run baseline `npm run test:brain`, `npm run test:agent`, `npm run test:agent:v2`, `npm run mcp:test`, and relevant `brain:doctor` / `agent:v2:doctor` / storage audit where available. Never enable real-project writes to compensate for missing input or tests.

**Known findings to address from real prior code:**

1. V2 is hard-coded to `kokonut-promise-toast` on `/bookings/confirmation` with a single fixture adapter (`scripts/agent/v2/source.mjs`). Do not present it as a generic integration engine. Factor reusable, safe pieces from V2 instead of cloning the entire fixture-specific pipeline.
2. V1 plan fingerprints cover *inspected files*, not every file that may be affected by a new integration. V3 needs **separate full write-set preimage checks**, package lock verification, allowed directories and target-drift detection at the moment of writing.
3. V2's `--recheck` was corrected to create a fresh attempt ID and run a fresh browser check. Preserve this and ensure every unsuccessful recheck yields a nonzero CLI exit status.
4. Brain lexical policy currently recognizes `without animation` and `do not animate` but can miss `do not add animation`. This must be fixed semantically and tested before any write workflow can rely on it.
5. Recent `503fcae` removes rebuildable `node_modules` from original runtime shards and moves consumer checks to disposable directories. V3 must retain the storage win and leave no persistent build replicas or duplicate npm dependency forests.
6. The read-only MCP V1 already works in Codex. Its existing five tools are the stable discovery/plan boundary; do not silently expand them.

## 2. FIRST QUALITY GATE — BRAIN NEGATION & INTENT SAFETY

Implement a narrowly designed, testable TR/EN **negation, polarity and scope interpreter**, not a one-off extra phrase in a lookup list. Use deterministic language handling compatible with offline Brain V1 and its existing evidence model. Prefer a small explicit policy parser with tests over installing a bulky NLP engine.

It must distinguish:

- Explicit no-motion requests: `do not add animation`, `don't add any animations`, `never animate this`, `remove the decorative animation`, `no motion please`, `keep it static`, `animasyon ekleme`, `animasyon istemiyorum`, `bu geçiş animasyonsuz olsun`, `hareket eklenmesin`, `animasyonu kaldır`.
- Quoted/reported/negated-negation statements and opposite goals: `Don't forget to animate the button`, `Do not remove the existing animation`, `I don't want a screen without animation`, `Animasyonu kaldırma`, `Hareketi engelleme`, `Animasyonu azaltma, tamamen kaldırma` (context dependent), and ambiguous mixed requests.
- Scope: `Keep form errors static, but animate confirmed bookings`; `Do not animate the payment failure`; `The loading indicator should animate, the submit error must not`; Turkish equivalents. The selected route/interaction must decide whether the no-motion policy applies. Never let the mere presence of `animation` or `do not` trigger a global verdict.
- Safety: `Do not show success before payment` is a **business-state restriction**, not a request to manufacture success or arbitrarily disable unrelated useful motion. No fabricated settled booking or paid state; app-owned success remains authoritative.

**Required behavior:** When an unambiguous user instruction for the *selected interaction* prohibits animation, return `no-motion` and block any installer. When polarity/scope is ambiguous, return `need-more-context` or a structured refusal to apply, not a guessed candidate. A negative constraint must never be defeated by ranking or an Agent V3 convenience fallback.

Keep original 51 Brain gold scenarios and 32 Agent V1 scenarios passing. Add **at least 30 new adversarial, bilingual, withheld-from-tuning polarity/scope scenarios** with positive, negative, double-negative, quoted, mixed and payment/booking examples. Do not merely add the examples above as all the tests; derive fresh variants, manually review expected results and record a confusion matrix. No false positive `candidates` for explicitly static selected interactions; no false `no-motion` for clearly positive animation requests. Version affected taxonomy/contracts if necessary; regenerate the Brain index deterministically without modifying original source bytes, and update docs honestly.

## 3. V3 TARGET — REUSABLE INTEGRATION ENGINE, NOT ANOTHER HARDCODED DEMO

Implement modular `review -> dry-run -> authorize -> apply -> verify -> rollback -> recheck/status` over selected **disposable** React and Next.js workspaces with a versioned JSON contract. Suggested architecture; adjust names to repo conventions and document changes:

- `src/agent/integration/v3/{contracts,validation,planner}.ts` — typed schemas, strict validators, decisions, status machine and deterministic manifest. Avoid duplicating V2 types unnecessarily.
- `scripts/agent/v3/{cli,workspace,selection,dependencies,adapters,review,authority,transaction,verify,rollback,report}.mjs` — lean reusable modules, fixed subprocess runner and safe filesystem IO, with honest environment gates.
- `schemas/agent/v3/{request,review,manifest,grant,transaction,report}.json` — versioned contracts with `additionalProperties:false`, canonical representations and explicit `unknown` vs `passed` distinctions.
- `fixtures/agent/v3/` — **realistic source-controlled Next.js and React/Vite fixture projects**, plus independent golden tests; writable tests use generated private scratch copies only.
- `docs/AGENT-V3.md` — quick-start, authority model, diagrams, limitations, compatibility and reproducible acceptance.

The engine must be generic with **typed, explicit, per-pattern adapters** selected from a catalog, **not** `if (sourceId === promiseToast)` plus direct string replaces. The core should support different sources, destinations and project layouts when a reviewed adapter exists. For unsupported patterns, use a transparent `adapter-unavailable` decision. A source being in the top 3 is **not** permission or proof of integration safety.

**At least two DISTINCT installed original components on two DISTINCT framework fixture targets**, not just two runs of Promise Toast. Prefer:

- Next.js 16 / React 19 fixture with verified native React feedback/disclosure matching an actual route and app-owned state.
- Independent React/Vite fixture with a distinct verified keyboard or pointer interaction, for example a pinned picker/tab/disclosure chosen from the available catalog.

Choose sources from **two different providers if compatible and genuinely verified**. Suitable candidates to inspect, not presumed guaranteed installs: `kokonut-wheel-picker`, `kokonut-smooth-tab`, `motionprimitives-disclosure`, `animateui-components-base-tabs`, or another pinned native React original. Do not force a named item if its actual license, usage contract, supported props or dependency graph rejects it. Record the decision and select an alternative with genuine evidence. Third scenario: `no-motion` (form error) **must not write a component**. Include one deliberate `incompatible` source and one source without required device/a11y evidence to prove fail-closed handling.

For each accepted source record source URL, official commit, original and installed SHA-256, license/notice, real dependency pins, installation kind, declared props, CSS/assets, client boundary, usage example and actual behavior evidence. Preserve upstream source bytes and CSS wherever possible. Any necessary import-only adaptation must be minimal, enumerated and independently hashed. No global demo CSS reset/theme import; keep host brand tokens and product visual identity.

## 4. PROJECT INSPECTION & PRECISE CHANGE SET

The workflow starts with an explicit selected project root (canonical path), exact route or file, user intent, Brain result, and a fresh V1 plan. V3 may read only within that selected and authorized root using V1's existing bounded analyzer. Do not silently broaden inspection budgets to avoid partial status. Require exact route + source file when Next App Router resolution is ambiguous; preserve SSR/client boundaries, dynamic route parameters and existing UI events.

**Before mutation:**

1. Reject `no-motion`, `no-suitable-component`, `need-more-context`, `partial-inspection`, unavailable/stale Brain, mismatched source hash, pending license review and incompatible install; no source choice if intent is static.
2. Inspect actual package manager and lockfile (`npm` initially; unsupported `pnpm`/`yarn`/workspaces should fail explicitly until proper adapters exist). Check semver **resolution** and peer deps in a disposable consumer; declared range intersection alone is insufficient.
3. Build exact create/modify/delete manifest with paths, mode, size, preimage hash or absence, postimage hash, dependency/lockfile changes, CSS/asset destinations and adapter version. Identify which edits are presentation glue and why. No deletion of unrelated code, no whole-project rewrite, no broad dependency upgrades.
4. Snapshot and fingerprint **every file eligible for writes**, plus target project state sufficient to notice unrelated drift (including existing untracked files in allowed paths). Preserve `.git` metadata, secrets and user local settings by never touching them. Cleanly handle existing uncommitted user modifications: do not overwrite them without an exact included reviewed preimage.
5. Generate inspectable diff with a summary of visual/behavioral intent, exact upstream pin, why the component is suitable, security/a11y/perf caveats and rollback strategy. `dry-run` must be deterministic, write no target files, and report `0` target writes.
6. Define the allowed process execution separately from editable files. Target `package.json` scripts, arbitrary binaries, user-controlled postinstall, outbound network, arbitrary shell commands and `npx` fetching are prohibited. Use fixed known test tooling with scripts disabled, pinned local artifacts and bounded loopback where needed.

A React component can be mounted with project-owned props/state or as a sandboxed iframe if explicitly supported, but V3's first acceptance limits actual installs to compatible native React to avoid unsafe HTML bridging. Existing V2 fixture test must keep working unchanged.

## 5. REAL AUTHORITY IS A SEPARATE TRUST BOUNDARY

**This is the most important design and acceptance requirement.**

V2's public deterministic manifest acknowledgement (`approve:<run>:<fingerprint>`/`MANIFEST_CONFIRMATION`) is not proof that a person authorized writes. Treat it only as a review checksum. Do not copy it as an authorization token in V3.

Design two deliberately different tracks:

**Track A — Development/acceptance (authorized in this assignment):** a fixture-only local test grant minted by the test harness, accepted **only** for private generated copies of checked-in V3 fixtures with a machine-verifiable fixture identity and run scope. Never permit this test credential to authorize arbitrary absolute paths. Show that a copied or replayed test grant cannot become a real-project grant.

**Track B — Future real projects (build contract, do not activate during this task):** a trusted Codex host approval or independently-operated human approval gateway. The authority must bind a concrete human approval event (not model text), canonical root and inode/device identity where applicable, selected route, file write set, chosen source ID/revision, immutable manifest digest, one-time nonce, expiry, operation category, and requested execution/test permissions. Denial/revocation/timeouts must stop the write. The grant must not be computable from publicly returned dry-run fields and must be single-use; do not print secrets in MCP, public CI, repo, traces or stdout. Revalidate at point of effect.

Inspect the **actual installed Codex host version and supported approval interfaces** before claiming native host integration. If there is no verifiable way to bind a real user/host approval to the local integration process, **do not invent an API or security boundary**. Keep general-project writes disabled and document a future operator integration; complete Track A fully. A self-issued token, a click simulated by Codex, a shell prompt that Codex can answer, or a fake user identity in JSON **does not count**. Same-OS-user shell processes may have broader filesystem permissions; honestly record this limitation and enforce an OS sandbox/isolated process boundary when claiming protection. Never suggest that `readOnlyHint` or Node `--permission` alone makes a write tool safe.

V3 must not add a write tool to the existing MCP V1. No user-facing one-shot command in this task can bypass the human/host gate to modify a real project. V3 read-only review/dry-run may be callable from Codex; actual test fixture writes occur via an explicitly fixture-scoped integration runner.

## 6. TRANSACTION, JOURNAL & ROLLBACK

Reuse and generalize V2's strongest mechanisms: verified source pin; prepared preimages; atomic file writes; complete mutation manifest; private 0700 workspaces; content-addressed 0600 snapshots; durable journal; run-level lock; interrupted/crashed recovery; full tree identity; idempotent rollback; preservation of competing user edits.

Status machine should truthfully distinguish: `reviewed`, `authorization-required`, `authorized-fixture`, `applying`, `applied`, `verifying`, `verified`, `rolled-back`, `blocked`, `failed`, `conflict`, `needs-manual-review` and any explicit `unverified` cases.

- Before **every** change, revalidate project, exact file preimage/mode, source/registry hashes, dependency lock, manifest and grant. Reject symlinks, hard links, special files, path escapes, Unicode/case collisions, forbidden dotfiles, unexpected scripts or high-risk paths.
- Write journal/preimages before the first mutation, and log every completed write before proceeding. Crash/SIGKILL after any step must allow safe inspection and explicit recovery.
- Automatic rollback on fixture build/browser failures, SIGTERM/cancel, stale plan, conflict or partial apply. Never delete or overwrite third-party edits which differ from both reviewed pre/post images; report `needs-manual-review` and preserve evidence instead.
- Restore modified/deleted contents, permissions, newly created files/dirs and original package manifest/lock exactly; verify the same full baseline tree hash and rerun the restored route. Repeat rollback idempotently.
- Every `--recheck` must launch **new** clean build + browser verification, with a unique attempt ID and no reuse of previous `restored-browser.json`. Nonzero process exit code for failed, cancelled, interrupted, stale or blocked checks. Keep last-good proof distinguishable from current failed attempt.
- Include mutation/integrity fault injection at every write position, lost lock / two concurrent calls, corrupted journal/preimage, modified package-lock, source revision drift, stale Brain, changed CSS, unexpected external edits and process termination.

No `git reset --hard`, broad `rm -rf` outside a specially created disposable scratch root, or destructive cleanup of private data.

## 7. REAL FRAMEWORK ACCEPTANCE — TWO INDEPENDENT PRODUCTS

For each accepted integration, use an isolated generated clone with real pinned Next.js or React/Vite tooling (as appropriate), compile from that clone, and run actual browser tests. Preserve before, after and restored snapshots. A CLI report without app-route verification does **not** count as accepted.

**Require real checks appropriate to the selected interaction:**
- TypeScript check and production build of the affected app (do not silently exclude selected route), fixed package resolution, install provenance, no unreviewed new scripts.
- Browser render with no hydration errors or failed required requests; demonstration shows the **actual selected upstream motion**, not a fake CSS clone, screenshot swap or placeholder.
- Keyboard/Tab/Enter/Space/Arrow/Escape as applicable; visible focus, native semantics, pointer/touch emulation at **320px and 390px**, desktop, dark mode where supported and reduced-motion behavior. Distinguish viewport/emulation from physical-device evidence.
- Status-aware feedback: pending, confirmed, failed, cancelled, network failure, retry, rapid duplicate activation, stale asynchronous response, navigate-away. **Only implement/tests for states relevant to the selected fixture**; no fabricated fake payment/booking success.
- Axe automated checks plus manual screen-reader, physical device, RTL clearly marked `unknown` if not tested. Check long Turkish labels.
- Matched before/after CLS, JS payload, LCP or startup, responsive overflow, CPU/frame samples, root heap and renderer RSS where measurement is supported. Show numbers from the same environment. Do not set arbitrary pass thresholds that falsely promise no bundle cost; log regressions and explain acceptance limits.
- At least 12 sampled rendered animation frames or actual interaction state transitions per applicable component; verify visual response and stable end state. Compare original/installed behavior where feasible.
- Restore the full target tree and **rebuild and browser-test the restored route again**, with fresh attempt ID and zero false passes.

At least one **independently installed** Next.js component and one separate React/Vite component must pass. If a cross-provider package cannot pass independent consumer builds or required accessible interaction tests, do not silently select it or change the quality gate; record the incompatibility and select another evidence-backed source.

## 8. SAFETY ADVERSARIAL MATRIX

Create a **minimum 35 scenario acceptance suite**, in addition to old V1/V2 tests, covering the two real fixture applications and at least these classes:

- No approval, invalid/fabricated approval, wrong run, wrong root, wrong pin, wrong manifest, expired/replayed/revoked grant, altered plan, same approval for two writes, permission or identity mismatch.
- Workspace traversal, absolute/relative escaping, `..`, symlink/hardlink, case-only and Unicode normalization aliases, unrelated .env/private files, oversized files, unsafe Git metadata, uncontrolled npm scripts and network access.
- Stale source hash, stale Brain index, dependency/peer conflict, missing license, unknown required mobile/screen-reader/reduced-motion evidence, mixed HTML+React unsupported host.
- Insufficient inspection/ambiguous route, server/client boundary mistake, incorrect booking/payment state ownership, authorization instruction embedded in README/AGENTS/source comment (prompt injection treated as data).
- Partial file application at every fault point, SIGINT/SIGTERM/SIGKILL, concurrent applies, locked run, crash recovery, modified target between review and apply, modified target during verification and after apply.
- Tests that fail in Vite or Next, rollback conflict, corruption of saved blob/journal, failed post-rollback browser check and exit-code propagation.
- Static `no-motion` request **cannot** invoke write path, even if source query still returns a lexical match.
- OS/process sandbox escape attempts, denied subprocess/network, no raw source/secret in structured MCP response, public Git or logs.

Security tests that merely inspect returned status while a target was already modified are insufficient. Snapshot exact test target before/after and compare full content-hash inventory, including ignored relevant files where feasible. Test execution under macOS sandbox limits on the real machine, and portable public fixture tests in CI. Do not weaken test exclusions to get a green result.

## 9. RESOURCE EFFICIENCY / CLEANUP

Preserve the 58.97 GB -> 3.06 GB local vault improvement. Treat `node_modules`, Next `.next`, Vite `dist`, Playwright traces/builds, duplicated npm `_cacache`, temporary consumer source copies as **ephemeral** when not required for the current live Studio, index or recovery. Use private scratch roots and `try/finally` plus crash recovery to delete only proven disposable outputs after their hashes/evidence are persisted. Avoid an ever-growing one-run-one-cache strategy.

- Run `npm run studio:storage:audit` before and after. Compare logical, allocated block and, where possible, actual macOS free-space measurements; distinguish APFS clone/snapshot accounting from reclaimable space.
- Establish budgets for per-run temp build material, cache and retained evidence. Measure peak and final sizes; don't delete protected sources, library, newest live builds, active reviews, journals, backed-up preimages or user data.
- Keep only compact evidence reports and selective screenshots/traces needed for acceptance; archive older traces only after documenting preservation intent. If uncertainty, **do not delete**.
- Run 3 repeated independent V3 fixtures back-to-back and verify bounded final disk footprint, no orphaned install dirs, no reused stale source or test state.
- New code must work with V14 runtime shards **without** their persisted `node_modules` folders (post-503fcae).

## 10. CLI & PRODUCT EXPERIENCE

CLI should use discoverable commands, succinct human output and exactly one JSON object with `--json`. Suggested commands (implement sensible equivalents and document real names):

```bash
npm run agent:v3:doctor
npm run agent:v3:review -- --request ./fixtures/agent/v3/requests/next-disclosure.json --json
npm run agent:v3:dry-run -- --review RUN_ID --json
# The next fixture step ONLY with test-harness grant bound to a disposable generated clone:
npm run agent:v3:fixture-evaluate -- --review RUN_ID --json
npm run agent:v3:status -- --run RUN_ID --json
npm run agent:v3:rollback -- --run RUN_ID --recheck --json
npm run agent:v3:evaluate
npm run test:agent:v3
```

**These commands are target interfaces, not a claim they already exist.** The exact command grammar may change for better security. Distinguish `reviewed`, `approved`, `applied`, `verified`, `rolled-back`, `blocked` and `needs-manual-review`; show reason, source pin, changes, evidence paths, user permission scope and next step. Users should not have to hand-edit JSON or understand npm internals to make an informed selection. Do not hide failed checks in a lengthy report.

MCP V1 should still expose **exactly**: `motionux_status`, `search_motion`, `recommend_motion`, `inspect_component`, `plan_motion`; check `npm run mcp:test`, `npm run mcp:evaluate` and the actual Codex session if available. No write ability added to this surface.

## 11. ACCEPTANCE GATES / DEFINITION OF DONE

**Mandatory gates** — fail the task when an applicable gate fails:

1. The 500 ready originals remain 500, and source/registry/preview hashes match the preserved baseline; favorites, collections, Project Kit, Gallery, Playground and public registry unchanged.
2. Brain: existing 51-scenario evaluation passes; >=30 new fresh bilingual polarity cases pass, with zero explicit static -> candidate mistakes and no regression on positive requests. `no-motion` blocks integration.
3. Agent V1 & V2 regression suites pass. V2's fresh rollback recheck remains unique per attempt and returns nonzero status on failure.
4. MCP still has exactly five read-only tools; all previous protocol tests pass, fresh Codex session discovery works when available. No addition of write tool or broad permissions.
5. At least **two different pinned original components**, **two independent framework projects** (one Next, one Vite/React) and one explicit `no-motion` case covered. Real builds and browser checks for each successful install.
6. Every fixture mutation is backed by a versioned reviewed manifest, independent fixture-only authorization, before/after hashes and a complete rollback. Entire tree restored; build and browser recheck use a fresh attempt ID.
7. 35+ safety/adversarial cases with unauthorized/stale/ambiguous inputs, concurrent writes, source/lockfile drift, rollback conflicts and injected crashes. No silent target edits or false success.
8. Honest separation of **fixture** grant and **real user/host** approval; do not claim real-project write security from deterministic approval string or unenforced Codex prompt. With no verified external trusted host gate, real project write API disabled.
9. Storage audit confirms no persistent duplication of old `node_modules`/consumer build trees; final disk footprint remains bounded and reported.
10. CI (lint, typecheck, unit tests, Brain, Agent V1/V2/V3, MCP, public registry, Playwright) passes without test suppression. Private vault/browser claims supported by local evidence paths, not CI alone.

**If a target can't meet gates:** stop that mutation, retain a valid report and rollback/recovery evidence, and report `AGENT_V3_NO_GO` or `AGENT_V3_FIXTURE_READY / REAL_PROJECT_WRITES_DISABLED` as appropriate. Never label an unverified target production-ready. Distinguish physical touch and screen readers as open unless actually observed.

## 12. SECURITY / LICENSE / RELEASE BOUNDARIES

- Keep `/.motionux-v9/` ignored; no upstream raw sources, installed original code, private license payloads, personal notes, full private project paths, local screenshots/traces or secrets in GitHub or CI artifacts.
- Never redistribute third-party code via MotionUX's public repo by accident. Reference sources/pins in public docs, and preserve full applicable notices in private installations.
- No production deployment, app release, npm publication, global Codex config mutation, payment processing or real project changes.
- No silent auto-fix of business logic, approval flow, auth or network permissions to make an animation work.
- Do not add GPU-heavy decorations to the Studio to demonstrate integration. UI/UX quality means **necessary motion**, with an explicit stillness option.

## 13. REQUIRED ARTIFACTS

Create and commit only safe public implementation, schemas, fixtures, tests and documentation:

- New generic V3 integration modules, typed/JSON schemas and test fixture apps.
- Brain polarity/scope regression changes and tests; updated `docs/BRAIN-V1.md` where semantics genuinely changed.
- `docs/AGENT-V3.md` with actual commands, policy and real examples, integration diagrams, explicit limitations and the next milestone.
- Update `docs/ROADMAP.md` and `README.md` *minimally and factually*: distinguish Agent V3 fixture integration from future authorized real-project writing. No unsupported marketing claims.
- Private local reports under `.motionux-v9/evidence/agent-v3/` for baseline vs integrated vs rollback states, browser traces, complete file hashes, independent consumers and disk tests.
- New versioned package scripts; `npm run verify` and all relevant direct commands demonstrably pass.

**Final report template (fill with real data):**

```text
STATUS: AGENT_V3_FIXTURE_READY | AGENT_V3_NO_GO
REAL PROJECT WRITE CAPABILITY: DISABLED | VERIFIED-HOST-GATED (only if actually proven)
BASE COMMIT / FINAL COMMIT / PUSH / CI:
SOURCE CATALOG: 500; identity hashes checked: ...
BRAIN POLARITY: ... positive/negative/contrast; false policy decisions: ...
AGENT V3 FIXTURE A: route, framework, source ID/pin, created/modified files, install tests, browser proof
AGENT V3 FIXTURE B: route, framework, source ID/pin, created/modified files, install tests, browser proof
NO-MOTION SCENARIO: decision, write count 0
AUTHORITY TESTS: allowed/denied/replay/expired/wrong-root/wrong-pin outcomes
ROLLBACK: baseline hash vs final hash, fresh recheck attempt IDs, negative exit-code assertions
MCP: existing 5 read-only tools, tests and Codex session observations
PERFORMANCE: before/after per fixture, actual bundle and CPU/heap evidence
STORAGE: before/peak/after, cache footprints, cleanup list, no protected data removed
TOTAL TESTS / SKIPS / CI JOBS:
OPEN LIMITS: physical mobile, manual screen reader, RTL, real backend, host grant, other adapters
NEXT RECOMMENDED PHASE:
```

Do **not** merge test-fixture authorization with real-target authorization. Do **not** ask for another approval to implement internal MotionUX code and disposable acceptance runs. Check the repo's actual current HEAD and branch state, work through real blockers, test, commit, push **MotionUX changes only**, and conclude with grounded results. If a genuine high-trust real-project host approval mechanism is unavailable, don't workaround it: deliver excellent fixture-ready engineering and explicitly leave general writes off.

**BEGIN IMPLEMENTATION.**
