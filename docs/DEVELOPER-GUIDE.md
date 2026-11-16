# MotionUX Studio setup and developer guide

[Back to MotionUX](../README.md) · [V14 originals](V14-ORIGINALS.md) · [Library and recovery](V11-IMPLEMENTATION.md)

## Set up Studio

In a local checkout of MotionUX, install the dependencies and prepare the sources on the first run.

```sh
npm ci
npm run sources:inspect
npm run sources:prepare
npm run sources:prepare:v12
npm run originals:expand:v13
npm run originals:expand:v14
npm run studio
```

Open [MotionUX Studio](http://127.0.0.1:5199/) on the same computer. After preparation the Originals Gallery includes 500 components from eight providers. Once the vault is prepared, `npm run studio` starts it again. Run `npm run studio:thumbnails` in a separate terminal with Studio open to generate missing thumbnails. The public checkout also includes the **Legacy V8** gallery.

Open a component’s **Playground** for its live preview, or use **Compare** to see the upstream example, Studio preview and separately installed consumer. Add favorites, collections and notes in **My Library**. Export a collection with setup instructions through **Project Kit**.

The first-run preparation collects sources locally in the ignored `.motionux-v9/` vault. See [the current edition source list](V14-ORIGINALS.md) for provider revisions and [the Studio manual](V11-IMPLEMENTATION.md) for backup and recovery.

## Install your first component

The public shadcn registry includes four stable entries at [`v1.0.0`](https://github.com/SapienXai/MotionUX/tree/v1.0.0) and additional pinned Legacy V8 previews. Each private original has its own local install command in Studio. [Public registry catalog](COMPONENTS.md)

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

- **Keep your visual identity.** Use your product’s colors and typography. Studio preview components expose CSS custom properties for surfaces, text, borders, accents, and selected states. [Theme and motion tokens](MOTION-TOKENS.md)
- **Keep application state in your app.** Give controls their labels, links, and callbacks. Pass the actual result into feedback components so the user sees whether an operation is pending, succeeded, or failed.
- **Review code like any other change.** shadcn installs source and companion CSS under your configured component alias. Use `view` to inspect the item and `add --dry-run` to see what would change. Update by comparing a newer pin with your local files. [GitHub registry guide](https://ui.shadcn.com/docs/registry/github) · [Update and release workflow](RELEASE.md)

## Use with Codex

Use the [Agent V1 CLI](AGENT-V1.md) for evidence-backed planning on a selected route. It inspects source, produces an integration proposal and keeps the target read-only.

Copy the [`sapienx-motion-system` skill folder](../skills/sapienx-motion-system) into `~/.agents/skills/` and start a new Codex session. Give it a real interaction to work on.

> Use $sapienx-motion-system to add a keyboard-accessible room details disclosure. Keep the hotel’s existing theme. Inspect the pinned MotionUX component before installing it.

For automatic use on SapienX React and Next.js work, merge the [AGENTS.md section](../skills/global-agents-section.md) into your existing rules.

## Install a Gallery preset

Open **Install** in an original’s Playground to copy the local shadcn command. **Usage** shows that package’s demo and **Code** exposes the upstream and installed files. Keep Studio running during the install. Legacy V8 packages use pinned GitHub commands and expose the MotionUX semantic theme tokens. [Theme tokens](MOTION-TOKENS.md) · [Checkpoint guide](PARITY-MANIFEST.md)

## Verification and license

The **97-item public registry** includes six dedicated Gallery presets and five recipe families that supply the other 76 Studio examples. Consumer checks install the pinned packages and build generated examples in a separate React project. The acceptance report records the reference sweep, screenshot comparisons, sampled motion and outstanding device and component checks. [V8 acceptance report](V8-ACCEPTANCE.md) · [GitHub Actions](https://github.com/SapienXai/MotionUX/actions/workflows/ci.yml?query=branch%3Amain) · [Registry verification](VERIFICATION.md)

MotionUX is MIT licensed. Adapted components retain their upstream notices. [License](../LICENSE) · [Source review](SOURCE-REVIEW.md) · [Changelog](../CHANGELOG.md)

## Next Studio and Build

Use Node 24 and pnpm 10.30.3 for the platform. Install with `pnpm --dir platform install --frozen-lockfile --ignore-scripts` and run `npm run studio:build` from the repository root. Native app routes live on `127.0.0.1:5200`. Start the existing private Gallery with `npm run studio` on `127.0.0.1:5199` to use the catalog and library links. Both applications link directly without embedding the legacy shell.

The managed project selector can open or recover a project, and exports apply to the last saved revision. Run uses a separate loopback origin on macOS. Exported projects carry their own npm lockfile and can be run from an independent directory. See [architecture](BUILD-ARCHITECTURE.md) and [quality gates](BUILD-QUALITY-GATES.md).
