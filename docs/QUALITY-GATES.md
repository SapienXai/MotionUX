# Quality gates

Complete and record these checks for each registry item. Automation covers behavior and common failure modes. A human decides whether the interaction is coherent at speed and at rest.

| Review | Evidence |
| --- | --- |
| Visual | Review composition, type, spacing, icon weight, focus, contrast and activation, including dark/mobile end states. Attach screenshot or recording. |
| Interaction | Exercise keyboard, pointer and touch, interruption, cancel, repeats, empty and failure states. Preserve native cursor, controls and scroll behavior. |
| Accessibility | Axe plus manual checks for semantic state, focus order, announcements, 200% zoom, long Turkish labels, RTL and reduced motion. |
| Runtime | Record initial and lazy assets, movement under CPU load, layout shift, work offscreen, and cleanup after interrupted runs. |
| Adoption | Check source and license, exact commit pin, generated registry, clean consumer install, client boundary, and applicable product integration. |

Score each dimension only after reviewing its evidence. Use 0 for a failing check, 1–2 for specific gaps, 3 for baseline coverage, 4 for a verified high-quality result and 5 when repeatable evidence also demonstrates the requested visual and interaction standard. Leave unassessed dimensions unscored. Follow the [per-reference status](REFERENCE-INVENTORY.md) and [release checklist](RELEASE.md).
