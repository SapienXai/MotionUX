# Component catalog

Installable source at `SapienXai/MotionUX/<item>#v1.0.0`. All items work with React 19 and CSS independent of Tailwind v3/v4. They leave surfaces, spacing, typography and colors to the project. Companion CSS is colocated and imported by the component. See the [interactive examples](../examples/main.tsx) and [browser specs](../tests/interaction.spec.ts).

| Item | API and variants | Provenance and dependencies | Pilots |
| --- | --- | --- | --- |
| `motion-foundations` | Scoped `MotionProvider`, `motionPresets.feedback/settle/instant` | Original starter evolved for scoped LazyMotion; Motion 14.14.0 | DineWallet via status pill |
| `motion-dock` | `<MotionDock aria-label="Quick navigation">…</MotionDock>`; put links and the occasional button directly inside. Set `aria-current` or the trigger’s `aria-expanded` from the app. | Independent adaptation of [DesignBookmark Bottom bar / Tab pill](https://designbookmark.com/motion); no upstream code, no additional package | BookPlace public hotel dock; DineWallet staff dock |
| `motion-disclosure` | `<MotionDisclosure label="More room photos">…</MotionDisclosure>`; native `open`, optional `hideChevron`. | MIT adaptation of [SmoothUI Collapsible](https://github.com/educlopez/smoothui/blob/e4b0b44a5c640ec217800eb664db18879822cd6c/packages/smoothui/components/collapsible/collapsible.base.tsx); Lucide | BookPlace public room photos |
| `motion-status-pill` | `<MotionStatusPill status="pending" label="Bekliyor" announce />`; neutral, loading, pending, success, error. Omit status to keep an empty live region mounted; use one live region for the active result. | Original starter + check path from MIT [Kokonut UI Save Status](https://github.com/kokonut-labs/kokonutui/blob/d8162dfe2c052a796a74d217b1f06511f213e4e0/components/kokonutui/save-status.tsx); Lucide and pinned foundations | DineWallet staff history and transaction result |

The dock uses ordinary navigation semantics (not ARIA tabs or swipe gestures) and does not own routing. Selection is colored by the consumer; the 180 ms animated cue stays decorative. The disclosure opens natively even without JS and closes immediately so hidden content is never left focusable. Its ChevronDown and timing treatment come from SmoothUI; Base UI and height animation were replaced by native details and transform/opacity. The pill’s static label updates without waiting for animation; color and icon supplement the text. Kokonut’s demo editor, timers, simulated save and status logic were excluded. Set `announce` only where a meaningful state changes.

See [machine-readable provenance](../metadata/components.json), [source review](SOURCE-REVIEW.md) and [test evidence](VERIFICATION.md).

## Studio catalog

The source-qualified [reference inventory](REFERENCE-INVENTORY.md) covers the 82 current Studio previews. Each row links to its component test and lists the exact shadcn pin. The Studio Usage view shows the corresponding React API. A preview can share an engine with another entry when its demonstrated behavior and preset differ.
