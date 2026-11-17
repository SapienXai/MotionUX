# Sections and responsive layout

The section catalog supplies a versioned recipe and owned, compatible default blocks. Each insertion copies data into new concrete blocks with stable IDs. The saved project owns those blocks and can change their layout or content. A later catalog revision cannot reapply a recipe to existing work.

| Recipe | Required adapter capability |
| --- | --- |
| Welcome and next step | Workspace navigation |
| Metrics overview | Hotel or CRM metrics |
| Sales workbench | CRM pipeline and breakdown |
| Contacts and activity | CRM contacts and activities |
| Editorial opening | Marketing imagery and proof row |
| Proof and testimonials | Marketing facts, names and testimonials |
| Story and gallery | Marketing story and managed imagery |
| Rooms and pricing | Marketing room routes and pricing |
| Questions and inquiry | Marketing disclosure and local inquiry |
| Searchable handbook | Knowledge or operations articles |
| Workload and queue | Operations tasks and summary |
| Guides and feedback | Knowledge or operations articles and local validation |

A section has one Puck slot and can contain only leaf content blocks. Page landmarks and shell components stay outside sections. Responsive properties have enumerated values. Grid allows up to four desktop, three tablet, and two mobile columns. A stack stays single-column. Equal split and content-aside use a two-column desktop layout with equal or 2:1 tracks and accept smaller-device overrides. Missing tablet columns use up to two columns and missing mobile columns use one. Gap and alignment without an override use the desktop base. The 640 and 900 CSS-pixel thresholds measure the outer application container. An unconstrained or older browser sees the safe mobile default. Visual arrangement preserves DOM order.

The same section renderer and CSS run in the Puck canvas, Interact and independent Next export. PWA reuses that app with its own offline snapshot. Scope rules prevent nested groups, duplicate IDs, incompatible blocks and cross-project image references. Section thumbs mount only when requested and use the same registered renderers. The compatible project assets or fictional defaults determine the sample content.
