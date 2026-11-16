# Tune a project's Motion DNA

Open a project in [Build](http://127.0.0.1:5200/build) and find **Motion DNA** in the inspector. On a narrow screen, open **Properties** first.

- **Feedback duration** sets the duration of button press feedback. Theme and navigation colors update immediately to keep labels readable during state changes.
- **Transition duration** and **Easing** tune entrances for pages, dialogs and sidebar labels.
- **Page transition** selects an instant entry, a fade or a short vertical slide. Navigation and focus work during the transition.
- **With reduced motion** selects instant changes or an opacity-only fade of up to 80 ms on devices requesting reduced motion. Press scaling is disabled in either case.
- **Project motion → No motion** makes animation and feedback changes immediate. Blocks can also opt out of project motion individually.

The canvas reflects changes immediately. **Save**, **Run**, **Export**, and **Export PWA** use the same project settings. The PWA applies the current device preference even when launched offline. Existing projects use the standard settings until tuned. Motion DNA applies to Build's own shell and blocks. Compatibility adapters for the wider registry belong to the separately planned Motion DNA track.

The export manifest records the configured settings. Runtime chooses the effective motion from the saved settings and the device preference. See the [browser checks](BUILD-QUALITY-GATES.md#b5-gates).
