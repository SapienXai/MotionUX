# Page patterns and data adapters

Open **Build** and choose **Knowledge Base** or **Operations Workspace**. From **Pages**, choose **Add page**, enter a name and a unique route, then select a compatible pattern. A new page starts with editable blocks. Changes to one page have no effect on other pages created from the same pattern.

| Pattern | Starter content | Availability |
| --- | --- | --- |
| Blank | Editable page heading | All managed projects |
| Workspace overview | Heading and an introduction with navigation | Workspace apps |
| Intake form | Labeled response input, validation and feedback | Knowledge and operations |
| Reference library | Searchable guides with expandable text | Knowledge and operations |
| Operations queue | Filterable task table with complete and reopen actions | Operations |
| Workload overview | Open, completed and total counts from the queue | Operations |
| Website inquiry | Website navigation, local inquiry form and footer | Hotel marketing |

## The starter apps

**Fieldnotes Handbook** has a homepage, a guide index and a feedback page. Guide content is edited in the block properties and saved as part of the project. The response form validates text without storing or sending it.

**Relay Operations** has a workload overview, a queue and a runbook index. The queue and its overview derive from the same four fictional tasks. Progress in Studio’s Interact view lasts for the current preview session. Run and exported applications store progress in the current browser, scoped to the application and saved revision. A plain Next.js export and an optional installable PWA export are available for each app.

## Document and rendering contract

- The static pattern catalog lives in `platform/packages/build-core/page-patterns.ts`. The registered block definitions and adapter compatibility rules live in `platform/packages/build-core/model.ts`. A pattern can only instantiate compatible, registered block IDs and validated props. It cannot add code, assets from another project, dependencies or external data.
- Adding a page expands the selected pattern into concrete blocks with unique IDs. The project keeps the optional `pattern` origin with its identifier and version alongside the authored blocks. Existing pages without this field still load. The version identifies the starting layout and never reapplies it over later edits.
- Project validation owns route and ID uniqueness, the required home page, the 12-page cap and the overall document limit. Studio renders the current draft. Isolated Run and Export render the saved revision. The generated source contains the authored blocks and the export manifest hashes the document and each file.
- The Composer allowlist accepts both domain adapters and enforces the primary workflow block for each starter route. It only proposes data. Explicit review and managed project creation use the existing boundaries.
- The same native inputs, disclosure elements and status messages render in Studio, Run and export. Responsive queue tables preserve headers and scroll in a labeled, keyboard-focusable region. The new starters follow the system appearance and the existing Motion DNA policy.

## Verification

Run `pnpm --dir platform test`, `pnpm --dir platform typecheck`, `pnpm --dir platform build` and `node platform/tests/b9-browser.mjs` in order. On macOS add `--local` for isolated Run and WebKit and Firefox export coverage. This uses temporary, namespaced projects. The test verifies the saved revision, manifest hashes, independent dependency installs and builds, keyboard interactions, responsive widths, and Chromium accessibility audits in both themes. Relay also exercises task changes offline through the exported service worker. Reports and screenshots remain in the ignored local vault.
