# Studio rest-state captures

Captured all 82 entries in desktop Chromium at 1440px and iPhone-profile WebKit at 390px. The captures use the production build, light mode and reduced motion. The numbered tiles match the reference inventory. Individual interaction and dark-mode examples are in the parent folder.

| Category | Desktop | Phone | Review notes |
| --- | --- | --- | --- |
| Navigation | [Chromium](desktop-navigation.jpg) | [WebKit](mobile-navigation.jpg) | Top-layer menu positioning works on the tested engines. Narrow older-browser fallback and richer panel-to-trigger morphs still need review. |
| Feedback | [Chromium](desktop-feedback.jpg) | [WebKit](mobile-feedback.jpg) | The three-step lineup now stays in one row at 320px. Several compact action buttons still share the same visual language and need reference-specific craft review. |
| Inputs | [Chromium](desktop-inputs.jpg) | [WebKit](mobile-inputs.jpg) | Grouping and labels were visible at rest. Signature sampling on a physical phone and the linked range’s touch precision remain open. |
| Gestures and cards | [Chromium](desktop-gestures.jpg) | [WebKit](mobile-gestures.jpg) | Swipe now hints at its stack and removes old semantic cards. Boarding and profile variants still need distinct expansion choreography, and pull-to-refresh needs physical scroll testing. |
| Typography | [Chromium](desktop-text.jpg) | [WebKit](mobile-text.jpg) | The final readable phrase stays on screen. The resting specimens share typography, so contrast and choreography must also be reviewed through activated states. |
| Assistant | [Chromium](desktop-ai.jpg) | [WebKit](mobile-ai.jpg) | The resting controls are legible. Verify streamed output with a physical screen reader and review the interaction hierarchy when pending or error states are shown. |
| Media | [Chromium](desktop-media.jpg) | [WebKit](mobile-media.jpg) | Audio uses explicit playback and a static resting control. Review load and seek handling on real hardware and blocked/slow media requests. |
