# Build design system

The Costa di Sera template uses a dedicated editorial system with locally bundled image renditions, paper and olive palettes, responsive section layouts and visible focus. The authored site retains its own palette in the monochrome discovery shell. Its mobile navigation uses one primary landmark, and the room gallery supports focus restoration, directional keys and Escape. [B8 creator workflow](BUILD-B8-CREATOR-UX.md)

Studio uses neutral graphite surfaces and violet editing accents. Hotel Desk uses warm off-white paper, deep green accents and calm plum-free dark surfaces. Both use a 4/8px rhythm, geometric sans text, tabular figures, visible focus and semantic surface, border, text, accent, warning and success tokens.

Use semantic HTML tables, labels and native dialogs. Explain local demo state in context. Provide keyboard alternatives for dragging, responsive navigation and scroll containers. Keep transitions on focus-independent state, opacity and transforms, and remove them when reduced motion is useful or requested. Review light and dark screenshots at mobile, tablet and desktop widths before calling a block ready.

The editor presents editable values and explicit move buttons in the inspector. Its drag surface makes embedded app controls inert while a block is selectable; Run exposes those controls in the separate framework runtime. Hotel Desk sizes from its containing viewport and uses the same semantic table and route model at every supported width. The preview builds the same saved project at desktop, tablet and mobile sizes.

## App Composer and the CRM variant

The entry page prioritizes a single brief field, its explicit Generate action and visible data guidance. Example briefs fill the field without calling Codex. The manual template shelf and saved projects remain below it. The Blueprint Review shows ordered pages, reasons for each block, local data, mobile navigation, motion, rights and unsupported requests. Edits require a validated review revision before Create; focus moves to the review heading or a recoverable error. Keep the native input, checkbox, select and button semantics and announce submission status.

Meridian uses cool white `#f6f7fc`, slate ink `#181c34`, a violet action accent `#4b3bc4` and the corresponding dark surface `#151727`. It shares focus, spacing and native dialogs with Hotel but uses a sales-specific four-metric overview, value by stage, five-section navigation, contact directory and deal board. Use compact but readable 4/8px spacing, inline status next to the effect, and labels as well as color. At narrow widths, the board stacks and the semantic contact table scrolls inside its own keyboard-focusable region. Respect both explicit stillness and the user's OS motion settings. Screen proofs should include actual app actions, desktop, tablet, touch, light and dark.

## B10 project identities

Managed documents can select a versioned visual identity with project-specific semantic palettes, type, spacing and corners. Studio chrome owns its original theme independently. Keep the legacy theme when the document has no identity. [Identity roles, presets and checks](BUILD-B10-DESIGN-SYSTEM.md)
