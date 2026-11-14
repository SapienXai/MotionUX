# V7 consumer parity

| Scope | Consumer comparison | Required evidence |
| --- | --- | --- |
| Six featured presets | Installed component with generated Usage. Three widths, light and dark. | Reduced-motion idle and activated screenshots and ARIA. Normal-motion geometry or opacity samples through activation, interruption or rerun and final state. 72 static cases and 36 sampled sequences passed locally against the immutable candidate. |
| Other 76 Gallery examples | Installed recipe with generated Usage and the same local fixture content as Studio. | Independent production React build, installed file check, configured render, static screenshot and accessibility snapshot. Per-component normal-motion and fine-grained gesture coverage remain open until recorded. |
| Base interfaces | Installed base Usage examples for all 82. | Strict TypeScript and mounted React output. |

`node scripts/fixture-parity.mjs` installs the GitHub commit pinned by `MOTIONUX_REGISTRY_REF` or the current full SHA. `--local` reads the locally built shadcn JSON. The runner saves separate visual, semantic and timeline results to `test-results/consumer-parity/report.json`. A local run does not establish a publishable pin.

The first-screen reference is [V5](design-reference/motionux-studio-v5-reference.png). Comparisons of a recipe use its own installed CSS, a matched parent width, explicitly shared theme tokens and Inter. Each preset and recipe preserves its own fixture dependencies.

## Verified featured preset checkpoint

The preset runner installed SHA `2c9ed3c8a3a6ade876bcfaf00a5a105fc23120c9`. All six presets passed at 390 px touch WebKit and 768/1536 px Chromium in light and dark. Reduced-motion evidence pairs ARIA and screenshots at rest and after input. Normal motion compares sampled x position, disclosure height or opacity. The Loading preset exercises the real pending timer and rerun. Swipe Deck uses a pointer drag. Motion samples do not cover every pixel or every property of each animation. [Featured timeline and static results](evidence/studio-v7/featured-consumer.json)

## Verified recipe checkpoint

The [GitHub Actions recipe job](https://github.com/SapienXai/MotionUX/actions/runs/43639634986/job/132584074384) installed the same published SHA. All 82 base examples and 82 configured Gallery examples mounted. All 76 remaining recipes passed the 1536 px light Chromium reduced-motion idle screenshot and ARIA comparison. Eighteen paired interaction cases also passed after keyboard activation or edited form input. The checks inspect outcomes in the rendered controls and matched ARIA snapshots.

On macOS Chromium, 75 of the 76 idle comparisons passed. Dynamic Text measured 2.5018% different pixels against the 2.5% tolerance, with matching ARIA and activated behavior. The Linux Chromium comparison measured 0% on that case. The evidence includes both runs. [Linux Chromium](evidence/studio-v7/recipe-consumer.json) · [macOS Chromium](evidence/studio-v7/recipe-consumer-macos.json)

The other 58 recipes still need a paired interaction check. All 76 still need individual normal-motion and touch parity. Static evidence and activated behavior do not establish premium acceptance.

## Catalog coverage at the recorded pin

| Component | Gallery install | Static | Paired active behavior | Sampled motion |
| --- | --- | --- | --- | --- |
| Plan switch · DesignBookmark | `gallery-recipes-feedback` | Pass | Pass | Open |
| Letter limit · DesignBookmark | `gallery-recipes-inputs` | Pass | Pass | Open |
| Pull cord · DesignBookmark | `gallery-recipes-navigation` | Pass | Pass | Open |
| Morph tooltip · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| Spring dropdown · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| File drop · DesignBookmark | `gallery-recipes-inputs` | Pass | Open | Open |
| Command button · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Morph island · DesignBookmark | `gallery-recipes-gestures` | Pass | Pass | Open |
| Goo menu · DesignBookmark | `gallery-recipes-gestures` | Pass | Pass | Open |
| Jelly slider · DesignBookmark | `gallery-recipes-inputs` | Pass | Pass | Open |
| Hold to publish · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Swipe deck · DesignBookmark | `destination-deck-gallery` | Pass | Pass | Pass |
| Springy input · DesignBookmark | `gallery-recipes-inputs` | Pass | Pass | Open |
| Rubber dock · DesignBookmark | `gallery-recipes-navigation` | Pass | Pass | Open |
| Parallax ticket · DesignBookmark | `gallery-recipes-gestures` | Pass | Open | Open |
| Glass lens · DesignBookmark | `gallery-recipes-gestures` | Pass | Pass | Open |
| Pull to refresh · DesignBookmark | `gallery-recipes-gestures` | Pass | Open | Open |
| Word roll · DesignBookmark | `gallery-recipes-signals` | Pass | Pass | Open |
| Weight wave · DesignBookmark | `gallery-recipes-signals` | Pass | Open | Open |
| Goo morph · DesignBookmark | `gallery-recipes-gestures` | Pass | Pass | Open |
| Scramble text · DesignBookmark | `gallery-recipes-signals` | Pass | Open | Open |
| Read along · DesignBookmark | `gallery-recipes-signals` | Pass | Pass | Open |
| Roll links · DesignBookmark | `gallery-recipes-signals` | Pass | Open | Open |
| Prompt box · DesignBookmark | `gallery-recipes-signals` | Pass | Open | Open |
| Streaming reply · DesignBookmark | `gallery-recipes-signals` | Pass | Open | Open |
| Ghost suggestion · DesignBookmark | `gallery-recipes-signals` | Pass | Open | Open |
| Goo thinking · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Expand card · DesignBookmark | `expandable-room-gallery` | Pass | Pass | Pass |
| Fan cards · DesignBookmark | `gallery-recipes-gestures` | Pass | Open | Open |
| Stat card · DesignBookmark | `gallery-recipes-gestures` | Pass | Open | Open |
| Profile card · DesignBookmark | `featured-profile-gallery` | Pass | Pass | Pass |
| Magnetic button · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Loading to success · DesignBookmark | `loading-outcome-gallery` | Pass | Pass | Pass |
| Copy button · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Like burst · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Tab pill · DesignBookmark | `sliding-tab-pill-gallery` | Pass | Pass | Pass |
| Bottom bar · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| Dynamic menu · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| Segmented control · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| Sidebar collapse · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| Command palette · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
| Step progress · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| OTP code · DesignBookmark | `gallery-recipes-inputs` | Pass | Pass | Open |
| Toggle switch · DesignBookmark | `gallery-recipes-feedback` | Pass | Open | Open |
| Star rating · DesignBookmark | `gallery-recipes-inputs` | Pass | Open | Open |
| Tag input · DesignBookmark | `gallery-recipes-inputs` | Pass | Pass | Open |
| Number stepper · DesignBookmark | `gallery-recipes-inputs` | Pass | Open | Open |
| Range slider · DesignBookmark | `gallery-recipes-inputs` | Pass | Open | Open |
| Password strength · DesignBookmark | `gallery-recipes-inputs` | Pass | Open | Open |
| Checkbox list · DesignBookmark | `gallery-recipes-inputs` | Pass | Open | Open |
| Detent dial · Kokonut UI | `gallery-recipes-inputs` | Pass | Open | Open |
| Siri orb · SmoothUI | `gallery-recipes-signals` | Pass | Pass | Open |
| Agent steps · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Hold button · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Exposure slider · SmoothUI | `gallery-recipes-inputs` | Pass | Pass | Open |
| Boarding pass · Kokonut UI | `gallery-recipes-gestures` | Pass | Open | Open |
| Marker text · Kokonut UI | `gallery-recipes-signals` | Pass | Open | Open |
| Smooth tab · Kokonut UI | `gallery-recipes-navigation` | Pass | Open | Open |
| Unlock Face ID · SmoothUI | `gallery-recipes-gestures` | Pass | Open | Open |
| Slide to confirm · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Notification stack · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Wheel picker · Kokonut UI | `gallery-recipes-inputs` | Pass | Open | Open |
| Dynamic text · Kokonut UI | `gallery-recipes-signals` | Linux pass, macOS mismatch | Pass | Open |
| Voice input · Kokonut UI | `gallery-recipes-signals` | Pass | Open | Open |
| Tool approval · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Toolbar · Kokonut UI | `gallery-recipes-navigation` | Pass | Open | Open |
| Scrubber · SmoothUI | `gallery-recipes-signals` | Pass | Pass | Open |
| Cart button · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Page flip · Kokonut UI | `gallery-recipes-gestures` | Pass | Open | Open |
| Signature pad · Kokonut UI | `gallery-recipes-inputs` | Pass | Open | Open |
| Undo button · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Card field · Kokonut UI | `gallery-recipes-inputs` | Pass | Open | Open |
| Stack panel · Kokonut UI | `gallery-recipes-navigation` | Pass | Open | Open |
| Typewriter · Kokonut UI | `gallery-recipes-signals` | Pass | Open | Open |
| Thinking text · Kokonut UI | `gallery-recipes-signals` | Pass | Open | Open |
| Glass player · Kokonut UI | `gallery-recipes-signals` | Pass | Open | Open |
| Bell button · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Morph popover · Kokonut UI | `morph-dropdown-gallery` | Pass | Pass | Pass |
| Task list · SmoothUI | `gallery-recipes-signals` | Pass | Open | Open |
| Music toggle · SmoothUI | `gallery-recipes-signals` | Pass | Open | Open |
| Command button · Kokonut UI | `gallery-recipes-feedback` | Pass | Open | Open |
| Pagination dots · DesignBookmark | `gallery-recipes-navigation` | Pass | Open | Open |
