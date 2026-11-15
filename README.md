# MotionUX

**Give your interface a sense of touch.**

A tab indicator that follows the selection. A card deck that moves with your drag. A confirmation button that gives you time to change your mind. MotionUX is a shadcn registry of these interactions for React. Try them in Studio, then install the TypeScript and CSS for the one you want to make your own.

[Run Studio](#run-motionux-studio) · [Install a component](#install-your-first-component) · [Browse all 82 previews](docs/REFERENCE-INVENTORY.md) · [Use with Codex](#use-with-codex)

[![MotionUX Studio showing live Plan Switch, Letter Limit, and Pull Cord previews in dark mode](docs/evidence/studio-v8/desktop-dark.jpg)](#run-motionux-studio)

## Original Source Engine · V9 preview

Try the actual upstream implementation in the private Studio. The source lab brings the original demo, the Studio frame, and an independently installed React consumer together. Code and Install use the captured source and its notices. The catalog also links to official upstream records and keeps discovery separate from verified installs. [Run the private Studio](docs/V9-ORIGINAL-SOURCE-ENGINE.md)

## Run MotionUX Studio

Explore **82 interactive previews** across navigation, feedback, forms, gestures, typography, AI interfaces, and media.

```sh
git clone https://github.com/SapienXai/MotionUX.git
cd MotionUX
npm ci
npm run dev
```

Open the local URL printed by Vite. You can also run `pnpm dev` once dependencies are installed.

1. **Try it in Gallery.** Move the pointer across Rubber Dock, pull the cord, or switch the billing period. The Gallery follows your system appearance until you choose a theme in the header.
2. **Make it yours in Playground.** Open a card with its play icon. Change the component through **Props**, **States**, or, where supported, **Motion**. Resize the stage, try reduced motion, and test your settings in neutral, BookPlace, or DineWallet colors. Turn off **Gallery example** to explore the standalone component.
3. **Take the code with you.** Copy the pinned shadcn command from **Install** and the configured React example from **Usage**. **Code** shows the TypeScript and CSS supplied by the selected package. **Source** links the reference and behavior test.

| Try first | What to do |
| --- | --- |
| **Tab Pill** | Use the arrow keys or click a tab. Watch the indicator follow the selected panel. |
| **Swipe Deck** | Drag a card across the stage. The previous and next buttons offer the same navigation. |
| **Signature Pad** | Draw a stroke, undo it, or enter a typed signature. |
| **Glass Player** | Play, pause, and seek a local audio sample. |

[Light Gallery](docs/evidence/studio-v8/desktop-light.jpg) · [Mobile Gallery](docs/evidence/studio-v8/mobile-dark.jpg) · [V8 acceptance report](docs/V8-ACCEPTANCE.md)

## Install your first component

The **stable registry** contains four entries at [`v1.0.0`](https://github.com/SapienXai/MotionUX/tree/v1.0.0). The **Studio catalog** contains 82 installable previews pinned to Git commits. Each preview has a working demo and a behavior test. Per-component visual and device acceptance remains in review, and v2 has yet to be released. [Component catalog](docs/COMPONENTS.md) · [Acceptance status](docs/IMPLEMENTATION-STATUS.md)

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

Open **Install** in the Playground to copy the exact checkpoint for the selected package. The installed preset includes its TypeScript, styles and demonstration assets. Open **Usage** to copy an example with your selected configuration. Your app supplies real application state, content and actions. To match a Studio theme in your app, set the semantic `--mx-*` tokens on the surrounding surface and use the same font and space as the preview. [Theme tokens](docs/MOTION-TOKENS.md) · [Checkpoint guide](docs/PARITY-MANIFEST.md)

## Verification and license

The **97-item registry** includes six dedicated Gallery presets and five recipe families that supply the other 76 Studio examples. Consumer checks install the pinned packages and build generated examples in a separate React project. The acceptance report records the reference sweep, screenshot comparisons, sampled motion and outstanding device and component checks. [V8 acceptance report](docs/V8-ACCEPTANCE.md) · [GitHub Actions](https://github.com/SapienXai/MotionUX/actions/workflows/ci.yml?query=branch%3Amain) · [Registry verification](docs/VERIFICATION.md)

MotionUX is MIT licensed. Adapted components retain their upstream notices. [License](LICENSE) · [Source review](docs/SOURCE-REVIEW.md) · [Changelog](CHANGELOG.md)
