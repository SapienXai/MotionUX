# Unified Studio delivery

## Checkpoints

- Baseline commit `b89956e0c0baa7c4e8c8958e65ff9f27b5257d1b`; local `main` matched `origin/main`. The previous Kinetic attachment remained untracked. The supplied Unified Studio contract and six references are under [unified-studio](unified-studio/).
- Projects checkpoint. The root renders the source-first composer. The `/build` alias and project query links retain the same editor. Projects and Discover share global navigation and appearance. Component preview opens when a source is selected. Manual templates and legacy planning are secondary.
- Baseline screenshots are in the local `.motionux-v9/evidence/unified-studio/before/` directory. The first Projects screenshot is `after/projects-1440-light.png`. Local evidence includes workspace content and stays out of Git.

- Shared workspace checkpoint. Puck, SourceGraph and CodeProject use the same project/status header and native dialogs. Source editors have a persistent properties rail on wide screens and bottom actions on compact screens. Puck keeps its typed canvas and compact Page/Properties sheets. Both source editors link the saved application to the runtime Inspector.

## Verification ledger

| Area | State | Evidence |
| --- | --- | --- |
| Projects entry and route compatibility | PASS | Chromium checked the root, two primary links, brief validation, draft recovery after Discover, the `/build` alias and the template disclosure. |
| Existing four-source handoff | PASS | `node platform/tests/discover-build-browser.mjs` passed Chromium and WebKit after the navigation change. |
| Production build after Projects changes | PASS | `pnpm --dir platform build` compiled and emitted the Projects, Build and Discover routes. |
| Shared workspace and responsive foundation | PASS | Reopened three saved document types, checked live CodeProject preview, page and properties panels and Escape focus restoration. Chromium at 1440/1024/768/390/320 and WebKit at 390/320. Screenshots in the local `after/` directory. |
| In-context source selection and integration | Pending | Next implementation checkpoint. |
| End-to-end native create, revision and export in the unified experience | Pending | Requires a fresh run against the delivered workspace. |
