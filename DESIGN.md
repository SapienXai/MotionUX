# MotionUX Studio design

An editorial field guide to interface motion. The reader browses a numbered index, tests one specimen at a time and opens its implementation notes when ready.

- Studio chrome uses parchment, ink and burnt orange. Light mode uses `#f5f1e9` and `#211f1b`; dark uses `#191813` and `#faf1e4`. The accent denotes current selection and primary links.
- Instrument Serif carries the masthead. Inter handles navigation, labels and interaction controls. Use tabular numerals for specimen numbers and measured values.
- The specimen stage has a fixed visual frame and a workspace that can be narrowed independently of the page. The catalog stays searchable when a specimen changes. Avoid tearing down focus or shifting the frame on interaction.
- Stage themes offer neutral, BookPlace and DineWallet examples. These variables belong to Studio and are separate from component defaults. App CSS can style a shared component without global body rules.
- Native controls carry semantics. Connected shapes use a damped spring. Direct manipulation tracks the pointer and settles on release. State labels are present at rest. Reduced motion removes spatial interpolation.
