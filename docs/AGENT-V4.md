# MotionUX Agent V4

Review the exact changes required to install a pinned original in a disposable MotionUX app. V4 verifies the fixture operator’s signature, checks the reviewed target before each write, tests the integrated route, and rebuilds the restored route from the recovered files.

| Capability | Status |
| --- | --- |
| Exact manifest and signed fixture operator | Available locally with the private vault |
| Next.js App Router and React/Vite fixture installers | Available in the checked-in compatibility matrix |
| Codex App Server approvals | Native request and decline observed. Independent human approval of a MotionUX manifest remains unverified. |
| Real project writes | `REAL_PROJECT_WRITES_DISABLED` |
| Codex MCP | Existing five read-only tools |

## Run and inspect

Use Node 24, the prepared private catalog and Brain index, Playwright Chromium, Firefox and WebKit, and the shared offline fixtures cache. The real runner uses the existing macOS process sandbox. Public tests exercise synthetic inputs and the authorization protocol on Linux as well.

```sh
npm run --silent agent:v4:doctor -- --json
npm run --silent agent:v4:review -- --request fixtures/agent/v3/requests/next-disclosure.json --json
npm run agent:v4:dry-run -- --review RUN_ID --full
npm run agent:v4:diff -- --review RUN_ID --file package-lock.json
npm run --silent agent:v4:host-check -- --review RUN_ID --json
npm run --silent agent:v4:fixture-evaluate -- --review RUN_ID --scenario accept --json
npm run --silent agent:v4:status -- --run RUN_ID --json
npm run --silent agent:v4:rollback -- --run RUN_ID --recheck --json
npm run --silent agent:v4:evaluate -- --json
npm run test:agent:v4
```

The review shows the fixture root, route or file, suggested original, upstream commit, pinned registry and notice, create/modify/delete totals, dependency pins and planned checks. Use `--full` to see the exact manifest, or `diff --file` to inspect a single entry’s complete preimage and postimage. An explicit diff displays local fixture and provider bytes in the terminal. Structured reports retain hashes and metadata. `--json` emits one object when invoked with `npm run --silent`.

The proposed consent choices are **Approve exactly these changes**, **Reject** and **Cancel**. Reject is the default. `host-check` reports diagnostic compatibility and always writes zero target files. A named `--scenario accept` runs the scripted fixture operator. `decline`, `cancel` and `timeout` cover the other test outcomes. A fresh review creates its own disposable workspace. Its installation grant applies to that workspace once.

## Verified compatibility

| Fixture | Selected surface | Official source | Source and host constraints |
| --- | --- | --- | --- |
| Next.js App Router | `/details` | [Animate UI Accordion](https://github.com/imskyleen/animate-ui/blob/22a9236ae107328f8564edb7e3299375da3247af/apps/v1/apps/www/registry/components/base/accordion/index.tsx) | MIT + Commons Clause. The server page supplies the content, and the client view owns the disclosure state. The upstream transition prop serves the reduced-motion preference. |
| React/Vite | `src/Screen.tsx` | [Kokonut Wheel Picker](https://github.com/kokonut-labs/kokonutui/blob/d8162dfe2c052a796a74d217b1f06511f213e4e0/components/kokonutui/wheel-picker.tsx) | MIT. The host screen owns the selected time and consumes the original picker’s settled value. |

The compatibility check covers the exact fixture, source pin, source bytes, React versions, local license notice, dependency closure, route and tested adapter. The static checkout request yields `no-motion` with zero target writes. Unverified hard requirements, incompatible React pins, unknown host state, new selectors and unsupported adapters are rejected before target writes. General projects and monorepos have no V4 write entry point.

## Run, recover and verify

The signing key exists in the separate fixture operator process for the duration of the review. The runner checks the issued audience, nonce, operator, scope and lifetime. A signed revocation, cancellation, disconnection or expiration ends the grant. A durable exclusive receipt blocks replay. Each effect checks the run lock, root identity, exact tree, reviewed preimage and pinned source. The [trust model](AGENT-V4-TRUST.md) describes the remaining same-user OS and code integrity limits.

The runner installs with the reviewed lock and offline npm with lifecycle scripts disabled. A single build slot uses one disposable replica with an 850 MiB allocated-block budget. Verification samples Chromium before and after, exercises Firefox and WebKit, checks 320/390 CSS px touch, observes reduced motion, compares host colors and runs axe. It records frame samples for opening and closing the accordion and for advancing and reversing the wheel. The browser data measures local JS bytes, startup, LCP, CLS, heap and renderer CPU. Renderer RSS, physical mobile, manual screen readers, RTL and live backends remain unverified. The fixture surfaces verify disclosure and selection, and leave the checkout error static.

Success and interrupted writes both enter recovery. Recovery restores hashes and mode bits, including the dependency lockfile. An independent target edit forces manual review and remains in place. `rollback --recheck` always runs a fresh build and browser attempt with a new ID, and an unsuccessful attempt exits nonzero. Reports and selective screenshots/traces stay in `.motionux-v9/evidence/agent-v4/`. Build replicas are removed after each attempt. To reproduce adversarial fixture tests on a prepared local vault, run `node scripts/agent/v4/verify-fixtures.mjs`.

## Existing Codex host

The local [Codex App Server protocol](https://learn.chatgpt.com/docs/app-server#approvals) exposes approval requests, item IDs and a resolved notification. The V4 probe opens a new read-only, ephemeral Codex session, declines its single file change and observes the resulting disposition. It records event names and field names without exposing session IDs. The observed event does not independently attest who approved a particular canonical MotionUX manifest. Fixture decisions are explicitly labeled as scripted. The verified fixture outcome is `AGENT_V4_FIXTURE_READY_HOST_UNVERIFIED`.

A real-project bridge needs a host-owned display, an independently authenticated operator and a decision tied to those exact effects. It also needs host-level signer custody, rotation and revocation. The existing [MCP V1](MCP-V1.md) remains read-only.
