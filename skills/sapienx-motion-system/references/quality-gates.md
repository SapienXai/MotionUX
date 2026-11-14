# Motion UI quality gates

## Prerequisites
- Identify current project design system and brand tokens.
- Identify user task and why motion adds utility. Static is a valid solution.
- Verify license, code provenance, dependencies and version before copying code.

## Per component
- Appropriate semantics, keyboard navigation, focus visibility and restoration.
- Pointer and touch activation, no hover-only critical interactions.
- Reduced Motion variant, no required animation to complete an action.
- Avoid `transition: all` on complex components, layout-thrashing animation and continual large blur effects.
- Sensible durations/springs, no gratuitous bounces on confirmation or money events.
- Handles instant repeat taps, cancellation, reset, concurrent async operation and errors.
- Works with long Turkish labels, 200% zoom, varying data, empties, slow network.
- Check iOS PWA viewport, safe areas, back navigation, fixed overlay stacking.
- Keep RSC/client split narrow; no unexpected hydration warning.
- Test a representative phone width, tablet if relevant, and desktop; prefer screenshot and recorded interaction.
- Record origin, license, version, code and test evidence in registry catalog.

## DineWallet money-specific
- Present money amounts as text, not only animated graphics.
- Authoritative success state must be confirmed by server; failure clearly recoverable.
- Idempotency is backend responsibility; frontend button disable is supplementary.
- No gesture/long-hold as sole way to process, cancel or reconcile payment.

## Release
- Typecheck, lint, tests/E2E relevant to touched flows.
- Compare before/after screenshots and watch for interaction regressions.
- Check bundle/chunk and browser behavior on lower-end devices.
- Commit minimal scoped changes with catalog metadata; report any unverified checks.
