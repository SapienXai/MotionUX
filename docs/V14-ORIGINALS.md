# V14 Originals

The prepared local Studio has **500 originals** from eight providers. V14 adds **176 React packages**. The original catalog retains its 324 entries, including 50 standalone HTML examples. Gallery puts all V14 additions first in their immutable edition sequence. The Studio shell and the public stable registry keep their existing design and release contracts.

| Pinned source | Added | License notice |
| --- | ---: | --- |
| [Animate UI](https://github.com/imskyleen/animate-ui/tree/22a9236ae107328f8564edb7e3299375da3247af) | 24 | [Pinned notice](https://github.com/imskyleen/animate-ui/blob/22a9236ae107328f8564edb7e3299375da3247af/LICENSE.md) |
| [Cult UI](https://github.com/nolly-studio/cult-ui/tree/d71b1428b811c2779d46ea41b7ef8c9f9c9991c2) | 39 | [Pinned notice](https://github.com/nolly-studio/cult-ui/blob/d71b1428b811c2779d46ea41b7ef8c9f9c9991c2/LICENSE.md) |
| [Kokonut UI](https://github.com/kokonut-labs/kokonutui/tree/d8162dfe2c052a796a74d217b1f06511f213e4e0) | 19 | [Pinned notice](https://github.com/kokonut-labs/kokonutui/blob/d8162dfe2c052a796a74d217b1f06511f213e4e0/LICENSE) |
| [Magic UI](https://github.com/magicuidesign/magicui/tree/6f7b531e77659855d4bc1bec8e20fdb0c8199b20) | 15 | [Pinned notice](https://github.com/magicuidesign/magicui/blob/6f7b531e77659855d4bc1bec8e20fdb0c8199b20/LICENSE.md) |
| [Motion Primitives](https://github.com/ibelick/motion-primitives/tree/120f64f6ca60348e251f929e9c81f11ccbe45eda) | 6 | [Pinned notice](https://github.com/ibelick/motion-primitives/blob/120f64f6ca60348e251f929e9c81f11ccbe45eda/LICENCE.md) |
| [React Bits](https://github.com/DavidHDev/react-bits/tree/cf2801031f07f53d4684e65b961bde7c2e2a6921) | 28 | [Pinned notice](https://github.com/DavidHDev/react-bits/blob/cf2801031f07f53d4684e65b961bde7c2e2a6921/LICENSE.md) |
| [SmoothUI](https://github.com/educlopez/smoothui/tree/e4b0b44a5c640ec217800eb664db18879822cd6c) | 45 | [Pinned notice](https://github.com/educlopez/smoothui/blob/e4b0b44a5c640ec217800eb664db18879822cd6c/LICENSE) |

The [V14 edition manifest](../metadata/editions/v14.json) records source pins, item identifiers, sequence and candidate exclusions. Each selected package builds from the provider implementation and an official demo or official usage example. The importer records upstream and installed hashes separately where import paths need adaptation. Notices, original payloads, private registry packages and generated evidence stay in the ignored `.motionux-v9/` vault.

## Prepare and use

Start from a prepared V13 vault.

```sh
npm ci
npm run originals:expand:v14
npm run studio
# In a second terminal
npm run studio:thumbnails
```

Open [Studio](http://127.0.0.1:5199/) on the same computer. Use **New in V14** to filter to this edition. The **Install** panel gives the local shadcn command and the **Compare** panel opens the independent consumer. [First-time setup](DEVELOPER-GUIDE.md#set-up-studio)

## Verification

The importer installs each selected package with the pinned shadcn CLI into a clean consumer shard that is separate from the upstream preview. Each lane is typechecked and built. The browser gate checks Gallery, Playground, Code, Usage and Install, three rendered lanes, sampled motion and the 390 px dark/reduced-motion viewport. V14 rechecks the 5,707 frozen source and install/preview hashes for the existing 324 originals. Physical device and full manual design acceptance remain separate coverage.

```sh
npm run studio:doctor
npm run originals:verify:v14
npm run originals:verify-consumers -- v14
npm run studio:verify
npm run studio:endurance
```

Local verification JSON, screenshots and process memory samples are written under `.motionux-v9/evidence/v14/`. The public CI suite verifies the public Studio and registry independently.

The edition check compiled 176 Usage examples and exported a 15-package mixed Project Kit with eight dependency conflicts reported. Five compatible packages from that kit installed and built in a clean Next.js 16 and Tailwind 4 project. The prepared Gallery has four thumbnails per item, with 2,000 files checked.

At 390 px, four upstream demos reported horizontal overflow inside their preview frames. The Studio document fit the viewport. Those frames retain the upstream demo styling.

## Long sessions

The local endurance check used the same Mac, Chromium 159.0.8154.6, a 1536 × 1024 viewport and 2× CPU throttling. Both catalogs took 120 stops across the full scroll range in four passes and waited for a live preview at each stop. These are different catalog sizes and specimen mixes. Renderer and GPU RSS are sampled process totals. Studio JS heap is sampled after collection.

| Measurement | V13.1 · 324 originals | V14 · 500 originals |
| --- | ---: | ---: |
| Highest sampled renderer RSS | 1,037.9 MiB | 1,389.1 MiB |
| Renderer RSS after the final pass | 952.0 MiB | 1,109.0 MiB |
| Studio JS heap after the final pass | 14.94 MiB | 14.52 MiB |
| Highest sampled GPU process RSS | 159.2 MiB | 188.7 MiB |
| Peak preview documents, including nested frames | 8 | 8 |
| Attached preview documents after the final pass | 6 | 6 |
| Browser errors and failed local HTTP responses | 0 | 0 |

V14 uses more renderer and GPU memory in this workflow. It returned six preview documents after each pass, and the Studio heap stayed between 14.29 and 14.52 MiB in the V14 run. The renderer result remains a capacity check for later expansions. Longer soak tests and physical mobile measurements remain open.
