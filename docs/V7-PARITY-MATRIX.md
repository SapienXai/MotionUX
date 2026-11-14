# V7 consumer parity

| Scope | Consumer comparison | Required evidence |
| --- | --- | --- |
| Six featured presets | Installed component with generated Usage. Three widths, light and dark. | Reduced-motion idle and activated screenshots and ARIA. Normal-motion geometry or opacity samples through activation, interruption or rerun and final state. 72 static cases and 36 sampled sequences passed locally against the immutable candidate. |
| Other 76 Gallery examples | Installed recipe with generated Usage and the same local fixture content as Studio. | Independent production React build, installed file check, configured render, static screenshot and accessibility snapshot. Per-component normal-motion and fine-grained gesture coverage remain open until recorded. |
| Base interfaces | Installed base Usage examples for all 82. | Strict TypeScript and mounted React output. |

`node scripts/fixture-parity.mjs` installs the GitHub commit pinned by `MOTIONUX_REGISTRY_REF` or the current full SHA. `--local` reads the locally built shadcn JSON. The runner saves separate visual, semantic and timeline results to `test-results/consumer-parity/report.json`. A local run does not establish a publishable pin.

The first-screen reference is [V5](design-reference/motionux-studio-v5-reference.png). Comparisons of a recipe use its own installed CSS, a matched parent width, explicitly shared theme tokens and Inter. Each preset and recipe preserves its own fixture dependencies.

## Verified featured preset checkpoint

The preset runner installed SHA `2c9ed3c8a3a6ade876bcfaf00a5a105fc23120c9`. All six presets passed at 390 px touch WebKit and 768/1536 px Chromium in light and dark. Reduced-motion evidence pairs ARIA and screenshots at rest and after input. Normal motion compares sampled x position, disclosure height or opacity. The Loading preset exercises the real pending timer and rerun. Swipe Deck uses a pointer drag. Motion samples do not cover every pixel or every property of each animation. [Featured timeline and static results](evidence/studio-v7/featured-consumer.json)
