# MotionUX

**Try the motion before it goes into your product.**

Drag a card deck, flick a wheel picker, and feel how a tab releases into its next position. MotionUX brings the original implementations into one interactive Studio. Browse by provider, open the source that drives the preview, and install it in a React project.

[Run Studio](#run-motionux-studio) · [Install a component](#install-your-first-component) · [Use with Codex](#use-with-codex)

## Run MotionUX Studio

```sh
npm run studio
```

Open [MotionUX Studio](http://127.0.0.1:5199/) on the same computer. The prepared source vault contains **140 live originals from six providers**. The main Gallery includes all 82 original reference counterparts and 58 additional specimens. Search for a name, filter by provider or format, and interact with the card directly.

- **Try it live.** Flick Kokonut UI’s Wheel Picker, switch Morph island to Call, or drag SmoothUI’s Scrubber.
- **Open Playground.** Switch the scenes available in that source, replay the demo, and use **Compare** to inspect the captured upstream fixture, the Studio host, and the separately installed consumer.
- **Take the code.** Open **Code** for the actual files, **Usage** for the corresponding example, and **Install** for the local registry package. The 50 standalone HTML sources install with a React iframe host. The other 90 are React sources.
- **Browse more.** Discovery links to provider candidates outside the installed collection. **Legacy V8** opens the 82 earlier MotionUX previews.

On a fresh checkout, run `npm ci`. Prepare the local source workspace with `npm run sources:inspect` and `npm run sources:prepare`. Routine launches reuse that workspace. The public checkout also runs on `npm run dev` with the labeled legacy gallery. [Setup and verification](docs/V10-STUDIO.md)

## Install your first component

The public shadcn registry includes four stable entries at [`v1.0.0`](https://github.com/SapienXai/MotionUX/tree/v1.0.0) and additional pinned Legacy V8 previews. Each private original has its own local install command in Studio. [Public registry catalog](docs/COMPONENTS.md)

### Start with the stable disclosure

In a React 19 project with a shadcn `components.json`, run:

```sh
npx shadcn@4.23.0 add 'SapienXai/MotionUX/motion-disclosure#v1.0.0'
```

```tsx
import { MotionDisclosure } from "@/components/sapienx-motion/motion-disclosure";

export function RoomDetails() {
  return (
    <MotionDisclosure label="What’s included">
      <p>Breakfast, late checkout, and access to the rooftop terrace.</p>
    </MotionDisclosure>
  );
}
```

The disclosure uses native `details` and `summary`. Click it or focus the label and press Enter. The example assumes the component alias is `@/components`. Match the import to your project’s alias. [shadcn configuration](https://ui.shadcn.com/docs/components-json)

### Try the animated Tab Pill preview

```sh
npx shadcn@4.23.0 add 'SapienXai/MotionUX/tab-pill#03173314f6e8ce3c69ff448930d3278a9af90822'
```

```tsx
"use client";

import { TabPill } from "@/components/sapienx-motion/motion-selector";

export function ProjectTabs() {
  return (
    <TabPill
      label="Project sections"
      options={[
        { value: "overview", label: "Overview", panel: <p>Project summary</p> },
        { value: "notes", label: "Notes", panel: <p>Working notes</p> },
      ]}
    />
  );
}
```

## Make it fit your app

- **Keep your visual identity.** Use your product’s colors and typography. Studio preview components expose CSS custom properties for surfaces, text, borders, accents, and selected states. [Theme and motion tokens](docs/MOTION-TOKENS.md)
- **Keep application state in your app.** Give controls their labels, links, and callbacks. Pass the actual result into feedback components so the user sees whether an operation is pending, succeeded, or failed.
- **Review code like any other change.** shadcn installs source and companion CSS under your configured component alias. Use `view` to inspect the item and `add --dry-run` to see what would change. Update by comparing a newer pin with your local files. [GitHub registry guide](https://ui.shadcn.com/docs/registry/github) · [Update and release workflow](docs/RELEASE.md)

## Use with Codex

Copy the [`sapienx-motion-system` skill folder](skills/sapienx-motion-system) into `~/.agents/skills/` and start a new Codex session. Give it a real interaction to work on.

> Use $sapienx-motion-system to add a keyboard-accessible room details disclosure. Keep the hotel’s existing theme. Inspect the pinned MotionUX component before installing it.

For automatic use on SapienX React and Next.js work, merge the [AGENTS.md section](skills/global-agents-section.md) into your existing rules.

## Install a Gallery preset

Open **Install** in an original’s Playground to copy the local shadcn command. **Usage** shows that package’s demo and **Code** exposes the upstream and installed files. Keep Studio running during the install. Legacy V8 packages use pinned GitHub commands and expose the MotionUX semantic theme tokens. [Theme tokens](docs/MOTION-TOKENS.md) · [Checkpoint guide](docs/PARITY-MANIFEST.md)

## Verification and license

The **97-item public registry** includes six dedicated Gallery presets and five recipe families that supply the other 76 Studio examples. Consumer checks install the pinned packages and build generated examples in a separate React project. The acceptance report records the reference sweep, screenshot comparisons, sampled motion and outstanding device and component checks. [V8 acceptance report](docs/V8-ACCEPTANCE.md) · [GitHub Actions](https://github.com/SapienXai/MotionUX/actions/workflows/ci.yml?query=branch%3Amain) · [Registry verification](docs/VERIFICATION.md)

MotionUX is MIT licensed. Adapted components retain their upstream notices. [License](LICENSE) · [Source review](docs/SOURCE-REVIEW.md) · [Changelog](CHANGELOG.md)
