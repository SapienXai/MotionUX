# V13 Originals

MotionUX Studio expands from 152 to **324 prepared originals** with 172 new React implementations. The latest edition appears at the top of Gallery immediately after launch. **New in V13** and **Favorites** are available in the Gallery filters. The other sorts and filters keep their selection in the URL.

| Provider | V13 additions |
| --- | ---: |
| [Kokonut UI](https://github.com/kokonut-labs/kokonutui) | 58 |
| [SmoothUI](https://github.com/educlopez/smoothui) | 39 |
| [Magic UI](https://github.com/magicuidesign/magicui) | 30 |
| [Cult UI](https://github.com/nolly-studio/cult-ui) | 17 |
| [React Bits](https://github.com/DavidHDev/react-bits) | 13 |
| [Animate UI](https://github.com/imskyleen/animate-ui) | 8 |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | 7 |

The [edition manifest](../metadata/editions/v13.json) records the provider pins, stable sequence, selection batches and excluded candidates. The [V13 baseline](V13-BASELINE.md) records the preserved collection, backup and measurement configuration.

## Prepare and run Studio

From a prepared V12 checkout, run these commands.

```sh
npm run originals:expand:v13
npm run studio
```

Open [Studio](http://127.0.0.1:5199/) on the same computer. Run `npm run studio:thumbnails` with Studio running to cache the light and dark captures. Restart Studio after an edition import so its catalog is reloaded. Run `npm run originals:status` to check the local catalog, source identities and thumbnail coverage.

The public checkout contains the engine and manifest. Provider source, assets, registry packages, browser reports and library data are generated or stored locally under the ignored `.motionux-v9/` vault. Originals install from the local shadcn URL on each item's **Install** tab. **Compare** shows the pinned upstream example, the Studio host and the independently installed React consumer.

## Editions and recovery

An edition manifest sets the provider commits and lists selections in their curation order. Use a new ordinal with the same schema for the next edition. The order of entries in a published manifest is stable. Append candidates or add an exclusion when an existing position needs to be withdrawn.

The importer resolves the upstream demo, CSS, license, assets and dependencies, then prepares bounded provider shards. It separately builds the source example and a clean shadcn consumer, checking the installed file bytes before publishing the shard index. It fingerprints source inputs and build configuration and keeps earlier immutable shards available if an import fails. `--retry` reattempts incomplete eligible entries while reusing ready items at the same source hash and sequence. Reported failures stay in the local evidence directory.

`npm run originals:index -- refresh v13` checks whether provider HEADs differ from the pinned revisions. Updating the manifest and source inventory is explicit. `npm run originals:index -- rollback v13 <checkpoint-filename>` restores a saved local index after checking its shard references. Restart Studio once the rollback finishes.

New preview frames use an opaque sandbox, explicitly guarded asset URLs and a narrow message bridge. Gallery caps the live preview load at eight frame units and gives heavier WebGL and Canvas demos a larger weight. The provider styles and motion remain in their own previews. Project Kit reports version conflicts before a mixed set is installed.

## Local verification

```sh
npm run originals:verify:v13
npm run originals:verify-consumers
npm run studio:verify
npm run studio:verify:v12
npm run originals:benchmark -- current
```

The edition browser check exercises Gallery, Playground, Code, Usage and Install and records samples from all three preview lanes. Its dark 390 px checks record overflow inside the demo iframe as well as the Studio shell. The consumer check typechecks the displayed Usage examples and verifies a 15-item mixed Project Kit. Runtime and performance evidence is written to `.motionux-v9/evidence/v13/`. Public CI tests the public Studio and registry. Private originals are verified on the local vault.
