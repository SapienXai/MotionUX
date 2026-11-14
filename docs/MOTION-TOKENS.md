# Motion and theme tokens

V1 consumers can keep their scoped provider and [existing presets](../components/presets.ts). Studio previews use independent, local springs where the interaction needs a distinct weight or boundary. Start from observable behavior and choose the smallest motion that explains it.

| Behavior | Starting point |
| --- | --- |
| Control feedback | 120–200 ms for a small opacity or transform change |
| Moving selection | Damped spring for the indicator; stable target and immediate accessible selection |
| Disclosure and cards | ~300–450 spring stiffness, ~28–36 damping, mass below 1 for small surfaces; tune with interrupted input |
| Gesture | Track directly and handle cancellation; use the tested threshold for that component |
| Reduced motion | Immediate semantic state; eliminate spatial, replay or parallax interpolation |
| Idle | Suppress decorative loops; keep a static indication available |

These ranges are starting points. Each component owns its spec and integration. Do not set a global animation duration that delays a business state.

The Studio stage demonstrates `--mx-bg`, `--mx-surface`, `--mx-ink`, `--mx-muted`, `--mx-line`, `--mx-accent`, `--mx-on-accent` and `--mx-selected`. Define a product adapter on a containing element. Tab through the branded result and verify contrast in both schemes. V1 keeps its existing variable names.
