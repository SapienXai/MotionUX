# MotionUX

<!-- impeccable:product-schema 1 -->

MotionUX is a component-powered AI App Studio. Designers and developers use it with Codex to turn a brief into a working web app or installable PWA, inspect it in a browser and take ownership of the Next.js source.

## Platform

web

## Users

React teams evaluating or adopting reusable product interactions. They need to feel the behavior, inspect its implementation and install a fixed version into their own app.

## Capabilities and constraints

MotionUX distributes individual source files through its shadcn GitHub registry. Studio runs the same components as the installed source. Consumers retain their theme, application state and business rules. The v1.0.0 tag is immutable. The v2 release depends on per-reference implementation, provenance, interaction tests and visual review.

## Product principles

- Let visitors try a real interaction before asking them to read its API.
- Use motion to make position, state or action feedback easier to understand.
- Preserve keyboard, touch and reduced-motion controls.
- Show verification status and source rights for each reference.

## Visual application studio

The workflow goes from Discover to Create or Compose, then Edit, Interact, Run, Inspect and Export. Edit and Interact render the current document. Run and Export use the saved revision. A working app has navigable routes, accessible controls and meaningful local behaviors in a clean export built from its own lockfile.

MotionUX helps design engineers and Codex users build managed web apps with proven components. The daily workflow is to discover an interaction, assemble typed blocks, inspect the real app at different sizes and export readable source. The Gallery, Playground, My Library and Project Kit remain useful on their own.

Build uses a versioned document, a local project vault and an owned block registry. The editor, renderer and exporter share that document. The hotel template uses local demo data and has no access to reservations, payments or customer systems. Build exports installable apps that can open their saved pages offline after initial setup. Backend integration and collaboration are future tracks. Real project writes remain disabled.

Build is a component-powered application studio for people who can describe their workflow and for developers who need maintainable source afterward. Start with a local brief or a manual template, review the proposed pages and data, then create an app in the managed workspace. The App Blueprint is a proposal; the validated saved document is the system of record.

Hotel Desk and Meridian CRM demonstrate distinct operations and sales workflows on fictional data. The Composer uses the installed Codex desktop connection for structured planning where the isolated macOS bridge is available. The reviewed output selects owned blocks with known rights, compatibility and behavior. Actual Next.js preview and independent source export carry the same saved document. Accessible focus, usable mobile navigation, reduced motion, quick editing and bounded local resources are product requirements. Online services, account creation, billing, production data and arbitrary project edits are outside this scope.

Build's Inspector audits one saved page in the actual Next.js preview. Findings identify the viewport and checked rule. Automated accessibility results carry manual review items, and the interaction report names the flow it exercised.

Integration Lab lets an independently authorized operator test a reviewed change in a disposable Build export and verify restoration in a fresh browser run. The source application stays read-only throughout the trial.

Costa di Sera demonstrates a six-page boutique hotel website with owned marketing blocks, a managed image library and a local inquiry form. Media is scoped to the managed project. Uploaded images require an export-rights attestation. Inquiry validation runs in the browser and has no reservation, delivery or payment service. Composer proposes a site using registered blocks and the project's image choices remain under the user's control. [Creator workflow](docs/BUILD-B8-CREATOR-UX.md)

Fieldnotes Handbook and Relay Operations add searchable team guides and an operations queue with a live workload summary. Start from either application or add a compatible page pattern to an existing managed project. Studio, Run and export use the same editable blocks and saved page routes. Both starter apps use fictional content and browser-local interactions. [Page patterns and adapters](docs/BUILD-B9-PAGE-PATTERNS.md)
