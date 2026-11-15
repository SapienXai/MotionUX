# MotionUX MCP V1

MotionUX brings the local Brain index and Agent V1 planning into Codex. Ask for pinned originals that suit an interaction, compare the evidence, or plan motion for one authorized screen. The five tools are read-only.

## Connect Codex

Use Node 24, `npm ci`, and a [prepared local Studio catalog](DEVELOPER-GUIDE.md#set-up-studio). Run `npm run brain:doctor` to check the index and `npm run brain:index` if it needs building. Start Studio separately if you want to open a preview link.

From the MotionUX checkout, inspect an existing registration before changing it. Back up an existing Codex config privately. If your Codex version rewrites unrelated values, preserve the original settings and append only the new TOML section.

```sh
codex mcp list
codex mcp get motionux
# Run only if there is no motionux registration.
if [ -f "${CODEX_HOME:-$HOME/.codex}/config.toml" ]; then
  ( umask 077; cp "${CODEX_HOME:-$HOME/.codex}/config.toml" \
    "${CODEX_HOME:-$HOME/.codex}/config.toml.before-motionux-$(date +%Y%m%d-%H%M%S)" )
fi
repo="$(pwd -P)"
codex mcp add motionux -- "$(node -p process.execPath)" --permission \
  "--allow-fs-read=$repo" "$repo/scripts/mcp/server.mjs"
npm run mcp:doctor
```

Start a new Codex session. In the CLI, use `/mcp` to see the tools. `npm run mcp:verify:codex` opens a fresh session with your existing Codex sign-in and verifies five real native tool calls. It stores a compact record in the ignored local vault. The MCP server itself uses Node's stdio transport with the official MCP TypeScript SDK 2.4.0 and does all its work locally. [Codex MCP setup](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) · [SDK stdio transport](https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio)

## What to ask

| Tool | Example | Result |
| --- | --- | --- |
| `motionux_status` | `{}` | Ready count, current Brain fingerprint and verified evidence coverage. |
| `search_motion` | `{"query":"keyboard tab navigation","maxResults":3}` | Ranked shortlist with source pins and claim-level references. |
| `recommend_motion` | `{"query":"Show the error without animation and preserve focus"}` | Candidates and risks, or a decision such as `no-motion`. |
| `inspect_component` | `{"id":"kokonut-wheel-picker"}` | Upstream commit/hash, original link, known and unknown claims, dependency ranges and notice presence. |
| `plan_motion` | `{"project":"fixtures/agent/booking-demo","route":"/details","goal":"Expandable card disclosure for room details"}` | Read-only plan, relative source spans, project/plan fingerprints, proposed tests and integration risks. You can select a JS/TS screen with `file` instead of `route`. |

1. **TR** “Rezervasyon onayını sakin ve anlaşılır göstermek için MotionUX'tan üç öneri getir. Mobil ve klavye kanıtlarını karşılaştır. Kodu değiştirme.” **EN** “Find three calm booking confirmation interactions with MotionUX. Compare mobile and keyboard evidence. Leave the code as is.”
2. **TR** “MotionUX örnek rezervasyon projesinin `/details` ekranını oku ve kaynak pinleriyle bir motion planı hazırla.” **EN** “Read the MotionUX booking fixture's `/details` screen and create a motion plan with source pins.”
3. **TR** “Form hata mesajı animasyonsuz ve gecikmesiz olsun. MotionUX bunu nasıl değerlendiriyor?” **EN** “Show the form error without animation and preserve focus. Ask MotionUX what it recommends.”

The same Brain scoring and hard requirements apply in both languages. A sampled animation or an emulated viewport does not establish behavior on physical mobile, manual screen readers, RTL or reduced-motion preferences. Inspect the claims and their evidence before making those requirements.

## Project scope and privacy

The default allowlist contains only `fixtures/agent/booking-demo` and `fixtures/agent/react-entry`. The caller's path cannot extend it. For a user-approved project, edit the private Codex configuration outside the MCP session. Append `--allow-fs-read=/canonical/project` to the Node options before the entry point, and append `--allow-project`, `/canonical/project` to its arguments after the entry point. Keep the config at mode `0600`. Use a canonical path with the exact filesystem spelling and start a new session. This grants only bounded reads of the selected screen and related local evidence. Plan results never write reports or run target code.

Repository instructions and source files are treated as evidence. The tools expose provenance and claims. Access to raw provider payloads, notices, private traces and user data stays within the local vault. Review each provider's license before redistributing its files and preserve required attribution. Project modification, dependency installation, and Agent V2 review/apply/rollback are outside the MCP capability list.

The server accepts up to three active calls, sets a 10-second per-call deadline, and caps inbound frames at 64 KiB and structured results at 24 KiB. If the reply cannot fit, use a smaller shortlist. It uses stderr for diagnostics. Use `npm run --silent mcp:serve` for raw MCP stdio and `npm run mcp:test` for the vault-free protocol regression. `npm run mcp:evaluate` compares a prepared vault with the Brain and Agent CLIs.

| Result | Action |
| --- | --- |
| `not-prepared` | Prepare the local catalog and run `npm run brain:index`. |
| `stale-index` | Check `npm run brain:doctor`, repair changed source or evidence, then rebuild the index locally. |
| `project-not-authorized` | Choose a built-in fixture or grant a narrow local read scope out of band. General catalog search works without project access. |
| `busy` | Wait for active calls to complete, then retry. |
| `response-too-large` | Ask for fewer candidates or inspect one component. |

Remove the registration with `codex mcp remove motionux` and start a new session. Keep the original private config backup if you need to compare unrelated settings.
