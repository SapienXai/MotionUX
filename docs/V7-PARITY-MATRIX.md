# V7 consumer parity

| Scope | Consumer comparison | Required evidence |
| --- | --- | --- |
| Six featured presets | Installed component with generated Usage. Three widths, light and dark. | Reduced-motion idle and activated screenshots and ARIA. Normal-motion geometry or opacity samples through activation, interruption or rerun and final state. |
| Other 76 Gallery examples | Installed recipe with generated Usage and the same local fixture content as Studio. | Independent production React build, installed file check, configured render, static screenshot and accessibility snapshot. Per-component normal-motion and fine-grained gesture coverage remain open until recorded. |
| Base interfaces | Installed base Usage examples for all 82. | Strict TypeScript and mounted React output. |

`node scripts/fixture-parity.mjs` installs the GitHub commit pinned by `MOTIONUX_REGISTRY_REF` or the current full SHA. `--local` reads the locally built shadcn JSON. The runner saves separate visual, semantic and timeline results to `test-results/consumer-parity/report.json`. A local run does not establish a publishable pin.

The first-screen reference is [V5](design-reference/motionux-studio-v5-reference.png). Comparisons of a recipe use its own installed CSS, a matched parent width, explicitly shared theme tokens and Inter. Each preset and recipe preserves its own fixture dependencies.
