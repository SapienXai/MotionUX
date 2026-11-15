# V12 Originals

V12 extends the local Studio catalog from 140 to 152 originals. The 12 additions use pinned official React implementations and provider styles. SmoothUI’s monorepo imports resolve to local paths when installed. Dependencies, official demo links, commit hashes and MIT notices are attached to each item in Studio.

| Provider | Additions | Pinned revision |
| --- | --- | --- |
| Kokonut UI | [Seat Map](https://kokonutui.com/docs/inputs/seat-map), [Marking Menu](https://kokonutui.com/docs/navigation/marking-menu), [Receipt Printer](https://kokonutui.com/docs/cards/receipt-printer), [Slot Picker](https://kokonutui.com/docs/inputs/slot-picker), [Time Zone Planner](https://kokonutui.com/docs/inputs/timezone-planner) | [d8162df](https://github.com/kokonut-labs/kokonutui/tree/d8162dfe2c052a796a74d217b1f06511f213e4e0) |
| SmoothUI | [Animated Stepper](https://smoothui.dev/docs/components/animated-stepper), [Emoji Reaction](https://smoothui.dev/docs/components/emoji-reaction), [Pinned List](https://smoothui.dev/docs/components/pinned-list) | [e4b0b44](https://github.com/educlopez/smoothui/tree/e4b0b44a5c640ec217800eb664db18879822cd6c) |
| Magic UI | [Animated Circular Progress Bar](https://magicui.design/docs/components/animated-circular-progress-bar), [Code Comparison](https://magicui.design/docs/components/code-comparison), [Confetti](https://magicui.design/docs/components/confetti), [Interactive Grid Pattern](https://magicui.design/docs/components/interactive-grid-pattern) | [6f7b531](https://github.com/magicuidesign/magicui/tree/6f7b531e77659855d4bc1bec8e20fdb0c8199b20) |

With [the V11 vault prepared](V11-IMPLEMENTATION.md), run the following commands.

```sh
npm run sources:prepare:v12
npm run studio
```

Open [Studio](http://127.0.0.1:5199/), search by component name, and open **Playground**. **Source** links to the provider and exact revision. **Code** switches between the upstream and installed files. **Usage** shows the example with the provider CSS import. **Install** copies the local shadcn command or downloads its registry item for an initialized React project. **Compare** exposes the pinned demo, Studio's preview, and the separately built registry consumer.

Generated source, registry items, installed fixtures and thumbnails live under the ignored `.motionux-v9/` directory. The public checkout contains the integration code and source references. The V11 library, notes and collections use the same local storage and backup model.

## Verify locally

Keep Studio running in the first terminal.

```sh
npm run studio:thumbnails
npm run studio:verify:v12
npm run studio:verify
```

Preparation builds the pinned upstream demo and a separate React consumer for each provider. The consumer starts with React and the build tools. The shadcn recipes supply the component files and runtime dependencies.

The V12 browser test checks Gallery, the three Playground comparison lanes, the rendered Code and Usage panes, and Install payloads against the pinned source and actual consumer files. It also checks dark mobile layouts at 390 px. The Studio regression suite uses the original workspace's V11 source fingerprint baseline and runs across Chromium, Firefox and WebKit.
