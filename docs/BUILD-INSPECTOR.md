# Inspect a saved Build page

Open a managed project in [Build](http://127.0.0.1:5200/build), choose **Run**, and wait for the Next.js preview. Select **Inspector** below the preview, choose a saved page, and select **Inspect page**. The report is tied to its route and revision. Run the new revision after editing to check a change.

The Inspector opens the isolated preview in a fresh local Chromium context at 390 × 844, 768 × 1024 and 1440 × 900 CSS pixels. The first two profiles emulate touch. All three use the saved theme and reduced motion, so labels and controls can be checked once the initial animation has settled.

| Check | Evidence |
| --- | --- |
| Layout | Document width and selectors for overflow, plus controls crossing the bounds of a horizontally clipped container. Deliberately scrollable tables keep their own scroll region. |
| Accessibility | Automated axe checks with WCAG 2 through 2.2 A/AA tags. Findings name the rule and matching selectors. Rules requiring human judgment appear under manual review. |
| Interaction | Page search reached by Tab, opened with Enter, filtered through the search field, dismissed with Escape, and reopened with touch or pointer input. The audit checks focus on open and close and reports uncaught browser errors. |

Inspecting uses fresh browser storage in the saved Run app. The report stays in the open Studio editor and closes with the preview. Use a keyboard and a screen reader to verify the rest of the page flow, including controls beyond page search.

The interactive feature uses the macOS Run host and the workspace's installed Playwright Chromium. Install the browser once with `npx playwright install chromium` if Studio reports it missing. The independent browser checks also run on Linux CI. [Quality checks](BUILD-QUALITY-GATES.md#b6-gates)
