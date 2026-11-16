<h1 align="center">MotionUX</h1>

<p align="center"><strong>The motion intelligence layer for AI-built interfaces.</strong></p>

<p align="center">
  Start with real motion. Try a gesture, compare the original, and bring the interaction into your own product.
  Brain helps people and coding agents choose motion by intent, with evidence for each recommendation.
</p>

<p align="center">
  <a href="#get-started">Open Studio</a> ·
  <a href="#try-the-motion">Try the motion</a> ·
  <a href="docs/ROADMAP.md">Product roadmap</a>
</p>

<p align="center">
  <a href="#try-the-motion">
    <img src="docs/readme/studio-cover.webp" width="100%" alt="MotionUX Studio with the Originals Gallery, an interactive time picker, and a cinema seat map">
  </a>
</p>

## Try the motion

[![Two Studio previews showing selected cinema seats and a paper receipt](docs/readme/motion-preview.webp)](docs/readme/receipt-in-motion.gif)

[Watch the receipt print](docs/readme/receipt-in-motion.gif). Open either demo in Studio to try it yourself.

- **Feel the interaction.** Browse live previews in Gallery. Open Playground to try an interaction at phone width, or use Compare to see the pinned upstream example, Studio and a separately installed consumer.
- **Keep what fits.** Save favorites, build a collection for a project and leave yourself a note in My Library.
- **Take it into your app.** Open Code, Usage and Install for the selected original. Export a shortlist with its setup instructions through Project Kit.

## Motion intelligence in Studio and Codex

An animation can clarify where you are, confirm an action, or help you follow a change. Sometimes the clearest interaction is immediate. Brain explains why an original fits, highlights missing evidence and can recommend an immediate state update.

| Product | Status | What it does |
| --- | --- | --- |
| **Studio** | Available locally | Discover, try, compare and collect pinned implementations. |
| **Brain** | Available locally | Search in Turkish and English, review evidence, and choose stillness when it fits. |
| **Agent** | Available locally · read-only | Inspect a selected route and get a source-linked motion plan, risks and proposed tests. |
| **Agent V3** | Local fixtures | Verify a pinned original in independent Next.js and React/Vite fixtures, with a reviewed write set and fresh rollback checks. |
| **Agent V4** | Local fixtures | Review the exact changes, verify a signed fixture decision and rebuild the restored screen. Real project writes remain disabled. |
| **Codex MCP** | Available locally · read-only | Search originals, inspect source evidence and plan motion on an authorized screen from a normal Codex session. |
| **Motion DNA** | Planned | Record how motion should feel and behave in a specific product. |
| **Inspector** | Planned | Find motion and accessibility issues on real routes and compare evidence before and after. |

Run `npm run brain:index` in a prepared workspace to search or ask for a recommendation. [Brain V1 CLI and evidence](docs/BRAIN-V1.md)

**Ask Codex for a motion plan**

> Use MotionUX to review the booking fixture’s confirmation screen. Suggest calm feedback that reflects the real reservation status and explain which checks we should run before integrating it.

[Connect MotionUX to Codex](docs/MCP-V1.md) · [Agent V1 quick start](docs/AGENT-V1.md) · [Agent V2 fixture integration and rollback](docs/AGENT-V2.md) · [Agent V3 fixture integration](docs/AGENT-V3.md) · [Agent V4 change review](docs/AGENT-V4.md) · [Read the product roadmap](docs/ROADMAP.md)

## Get started

Install the workspace dependencies. If this is your first run, prepare the local sources using the setup guide. With the vault prepared, start Studio.

```sh
npm ci
npm run studio
```

[First-run setup and installation](docs/DEVELOPER-GUIDE.md#set-up-studio) · [Open Studio on this computer](http://127.0.0.1:5199/)

The prepared Studio includes pinned React originals and standalone HTML examples in sandboxed React hosts. GitHub contains the Studio, source references and the public registry. Original payloads and previews are prepared locally in the ignored `.motionux-v9/` vault. Each original retains its upstream attribution and applicable notices. The public `v1.0.0` registry has its own four stable MotionUX entries under the MIT license. [Local originals](docs/V14-ORIGINALS.md) · [Public registry](docs/COMPONENTS.md) · [MotionUX license](LICENSE)

[Design principles](docs/DESIGN-PRINCIPLES.md) · [Quality gates](docs/QUALITY-GATES.md) · [Studio scaling evidence](docs/V13-1-PERFORMANCE.md)
