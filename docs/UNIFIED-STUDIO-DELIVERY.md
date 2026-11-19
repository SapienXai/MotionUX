# Unified Studio delivery

## Checkpoints

- Baseline commit `b89956e0c0baa7c4e8c8958e65ff9f27b5257d1b`. Local `main` matched `origin/main`. The previous Kinetic attachment remained untracked. The supplied Unified Studio contract and six references are under [unified-studio](unified-studio/).
- Projects checkpoint. The root renders the source-first composer. The `/build` alias and project query links retain the same editor. Projects and Discover share global navigation and appearance. Component preview opens when a source is selected. Manual templates and legacy planning are secondary.
- Baseline screenshots are in the local `.motionux-v9/evidence/unified-studio/before/` directory. The first Projects screenshot is `after/projects-1440-light.png`. Local evidence includes workspace content and stays out of Git.

- Shared workspace checkpoint. Puck, SourceGraph and CodeProject use the same project/status header and native dialogs. Source editors have a persistent properties rail on wide screens and bottom actions on compact screens. Puck keeps its typed canvas and compact Page/Properties sheets. Both source editors link the saved application to the runtime Inspector.

- Catalog checkpoint. Discover, Projects and source revisions share the live Gallery catalog. The launcher accepts up to four selected originals or design references. Code revisions can add portable pins within the six-source project limit. SourceGraph retains its existing pin set. Block projects retain their owned registry. Restricted originals remain visible with eligibility text.
- Native revision checkpoint. Code revisions validate the new pins and preserve the existing source mounts. Owned block revisions can change page titles, headings, descriptions, and existing action labels. Both modes verify the candidate in the isolated preview host before writing the next saved revision. The model has no filesystem or runtime authority.
- Workspace search matches current project pages in context. The shared header governs navigation and appearance. The Discover details drawer keeps the grid behind it and maintains the old source URLs.

## Verification ledger

| Area | State | Evidence |
| --- | --- | --- |
| Projects entry and route compatibility | PASS | Chromium checked the root, two primary links, brief validation, draft recovery after Discover, the `/build` alias and the template disclosure. |
| Existing four-source handoff | PASS | `node platform/tests/discover-build-browser.mjs` passed Chromium and WebKit after the navigation change. |
| Production build after Projects changes | PASS | `pnpm --dir platform build` compiled and emitted the Projects, Build and Discover routes. |
| Shared workspace and responsive foundation | PASS | Reopened three saved document types, checked live CodeProject preview, page and properties panels and Escape focus restoration. Chromium at 1440/1024/768/390/320 and WebKit at 390/320. Screenshots in the local `after/` directory. |
| In-context source selection and integration | PASS | Chromium desktop, WebKit 390 and 320. Opened a live catalog dialog, checked existing source and local-only eligibility, attached a portable source, and verified focus return. |
| Native create and code revision | PASS | Tally Studio created from Projects. Heading changed through live controls, Undo, Redo and Save. Morph Toggle was attached from inside the project. The native result saved revision 2 with two pinned originals and passed seven runtime steps. |
| Native owned block revision | PASS | A managed blank workspace kept every non-target field. The PageHeader title changed to Workshop notes, and the saved revision opened in isolated Next. |
| Independent code exports | PASS | Exact document and file hashes verified in both archives. Clean Next and PWA builds passed seven journeys each in Chromium, Firefox, and WebKit. Chromium PWA worked offline, including the attached switch. |
| Registry and platform regressions | PASS | Production preview lane passed 461 Playwright cases with three skips. The platform suite passed 48 contracts. |
| Physical mobile | BLOCKED | The host reports simulators only. Browser responsive evidence is recorded separately. |
| Final verification matrix | Pending | Final screenshots and error/recovery probes are still being gathered. |
