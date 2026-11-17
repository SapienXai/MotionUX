# Creator UX audit

Baseline commit `e29978e26c0c4dce1bb39339810a6cb1545f5d69`. The production Studio ran against a disposable Fieldnotes project. Chromium 159.0.8154.6 captured 1440, 768, 390 and 320 CSS-pixel screens in light and dark, and the 320-pixel properties view. Raw screenshots and observations stay in `.motionux-v9/evidence/build-b10/before/`.

| Observation | User consequence | B10 change | Evidence |
| --- | --- | --- | --- |
| All 55 blocks were counted in the palette even when the adapter showed a smaller subset. Adding a composition meant locating and placing its blocks one at a time. | Authors could not tell which app structures were available. | Searchable Blocks and Sections views. A selected section opens a small live sample of its registered blocks on demand. | Create and insert from each adapter in `b10-browser.mjs`. |
| The Properties pane displayed appearance, visibility, motion and labels in the same column as everyday content fields. At 320 px the second toolbar row crowded the undo controls. | Editing text required wading through settings, and the smallest screen made primary actions compete for space. | Keep content near the selection, collapse secondary style and interaction fields, and allow the toolbar to wrap. | Compare `before/320-properties.png` with the post-change capture. |
| Device buttons resized the frame but displayed no actual width, and the document had no section layout overrides. | Authors could inspect mobile without being able to correct the layout. | Show the measured frame width and let authors set bounded columns, gap and alignment for each section. | Computed grid checks at Edit, Interact, Run and export widths. |
| The template palette was fixed, and Relay task names were hardcoded. | Changing a product's character or authoring a workflow required changing source. | Add project identity and authored, typed guide and task records. | Same saved revision goes into independent Next and PWA installs. |

The original navigation, page pattern dialog, Puck selection, local draft checkpoints and export workflow remain the starting points for the revised editor. The baseline overflow check was zero at the four recorded widths. The audit is a developer walk-through in an isolated browser.
