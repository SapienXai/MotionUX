# Component acceptance review

Numeric values record the observed scope on the [0–5 quality scale](QUALITY-GATES.md). A 3 records baseline evidence and a 2 records partial acceptance. A dash means the dimension lacks a measured result. These ratings leave all 82 entries at `needs-review`.

- **Visual 3** records the desktop and mobile resting views in the [catalog captures](evidence/studio/catalog/index.md). Most active states still need individual reference comparison.
- **Interaction 3** records the linked baseline behavior tests in three browser profiles. Where a concrete gap affects the requested gesture or morph, record 2.
- **Accessibility 3** records the baseline axe scans, reduced-motion mount sweep and associated keyboard or semantic assertions. Manual screen-reader and activated-state review stay open.
- **Performance 3** applies only to the three sampled routes measured at 4× CPU throttling.
- **Production 2** records a shared registry install and TypeScript check. Full product, device and per-item acceptance stays open.

For V6, six Gallery presets also passed clean consumer screenshot and ARIA parity under reduced motion. The evidence does not change individual readiness. [V6 acceptance report](STUDIO-V6-ACCEPTANCE.md) · [Contract manifest](../metadata/parity-manifest.json)

V7 adds three targeted craft changes. The Swipe Deck carries release offset and bounded horizontal velocity into the outgoing card. Rubber Dock uses a smooth distance response at both ends of the pointer influence. Jelly Slider exposes thumb elasticity and keeps the thumb still in reduced motion. These changes retain the existing ratings pending individual design and device acceptance. [V7 quality ledger](V7-QUALITY-LEDGER.md)

| Reference | Visual | Interaction | Accessibility | Performance | Production | Open review |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Plan switch · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Letter limit · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Pull cord · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Morph tooltip · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Spring dropdown · DesignBookmark | 3 | 3 | 3 | — | 2 | Viewport and focus regression passed; legacy-browser edge placement still needs review. |
| File drop · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Command button · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Morph island · DesignBookmark | 3 | 2 | 3 | — | 2 | The compact surface expands; shared-identity width and interrupted transition still need refinement. |
| Goo menu · DesignBookmark | 3 | 2 | 3 | — | 2 | Actions open with staggered springs; continuous lobe merging is still open. |
| Jelly slider · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Hold to publish · DesignBookmark | 3 | 3 | 3 | — | 2 | Tested dialog alternative and focus; physical touch timing and device feedback are unverified. |
| Swipe deck · DesignBookmark | 3 | 3 | 3 | 3 | 2 | Rapid navigation retains one active heading; physical touch and long cards still need review. |
| Springy input · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Rubber dock · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Parallax ticket · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Glass lens · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Pull to refresh · DesignBookmark | 3 | 2 | 3 | — | 2 | The dedicated handle and refresh button are operable; test page scroll in a real PWA. |
| Word roll · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Weight wave · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Goo morph · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Scramble text · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Read along · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Roll links · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Prompt box · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Streaming reply · DesignBookmark | 3 | 3 | 3 | — | 2 | Cancel/finish restore the appropriate keyboard control; verify announces and reviewing prior output with a screen reader. |
| Ghost suggestion · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Goo thinking · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Expand card · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Fan cards · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Stat card · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Profile card · DesignBookmark | 3 | 2 | 3 | — | 2 | Action disclosure works. Expanded state needs its own shared-layout choreography. |
| Magnetic button · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Loading to success · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Copy button · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Like burst · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Tab pill · DesignBookmark | 3 | 3 | 3 | 3 | 2 | Review active states, reference fidelity and physical-device behavior. |
| Bottom bar · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Dynamic menu · DesignBookmark | 3 | 3 | 3 | — | 2 | Keyboard and disabled items passed; cascades and trigger-to-menu morph require a separate review. |
| Segmented control · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Sidebar collapse · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Command palette · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Step progress · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| OTP code · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Toggle switch · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Star rating · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Tag input · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Number stepper · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Range slider · DesignBookmark | 3 | 3 | 3 | — | 2 | Endpoints are distinct native inputs. Review the dual-track design and touch precision against the reference. |
| Password strength · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Checkbox list · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Detent dial · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Siri orb · SmoothUI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Agent steps · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Hold button · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Exposure slider · SmoothUI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Boarding pass · Kokonut UI | 3 | 2 | 3 | — | 2 | Flight details are exposed. Pass-specific fold choreography is an open visual issue. |
| Marker text · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Smooth tab · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Unlock Face ID · SmoothUI | 3 | 3 | 3 | — | 2 | Visual simulation only. Review production boundaries before reusing the effect for a different action. |
| Slide to confirm · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Notification stack · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Wheel picker · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Dynamic text · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Voice input · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Tool approval · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Toolbar · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Scrubber · SmoothUI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Cart button · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Page flip · Kokonut UI | 3 | 3 | 3 | — | 2 | Hinged motion and keyboard paging passed; review interruption and touch expectations on hardware. |
| Signature pad · Kokonut UI | 3 | 3 | 3 | — | 2 | Drawing/undo and the typed alternative passed; review stroke sampling, sustained touch and display scaling on hardware. |
| Undo button · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Card field · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Stack panel · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Typewriter · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Thinking text · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Glass player · Kokonut UI | 3 | 3 | 3 | 3 | 2 | Real local audio play/pause/seek passed; run device, slow-load and media-error checks. |
| Bell button · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Morph popover · Kokonut UI | 3 | 2 | 3 | — | 2 | Position and dismissal passed; variant shares ActionMenu internals and still needs stronger morphology. |
| Task list · SmoothUI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Music toggle · SmoothUI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Command button · Kokonut UI | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
| Pagination dots · DesignBookmark | 3 | 3 | 3 | — | 2 | Review active states, reference fidelity and physical-device behavior. |
