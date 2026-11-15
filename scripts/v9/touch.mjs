import { chromium, devices } from "playwright";
import { expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const origin = "http://127.0.0.1:5199";
const profile = devices["iPhone 13"];
const specs = [
  { group: "kokonut", slug: "smooth-tab", role: "tabpanel", name: "Overview", axis: "x", start: 0.8, end: 0.2,
    result: page => page.getByRole("tab", { name: "Activity", exact: true }), attribute: "aria-selected", expected: "true" },
  { group: "kokonut", slug: "wheel-picker", role: "spinbutton", name: "Hours", axis: "y", start: 0.68, end: 0.26,
    result: page => page.getByRole("spinbutton", { name: "Hours", exact: true }), attribute: "aria-valuetext" },
  { group: "smoothui", slug: "scrubber", role: "slider", name: "Opacity", axis: "x", start: 0.4, end: 0.8,
    result: page => page.getByRole("slider", { name: "Opacity", exact: true }), attribute: "aria-valuenow" },
];
const browser = await chromium.launch();
const diagnostics = [];
await mkdir(".motionux-v9/evidence", { recursive: true });
try {
  for (const spec of specs) {
    const result = [];
    for (const lane of ["original", "installed"]) {
      const page = await browser.newPage(profile);
      try {
        await page.goto(`${origin}/v9/live/${spec.group}/${lane}/?item=${spec.slug}&scheme=dark`);
        const target = page.getByRole(spec.role, { name: spec.name, exact: true });
        await expect(target).toBeVisible();
        const control = spec.result(page);
        const before = await control.getAttribute(spec.attribute);
        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();
        const client = await page.context().newCDPSession(page);
        const touch = (type, touchPoints = []) => client.send("Input.dispatchTouchEvent", { type, touchPoints });
        const point = position => [{
          x: Math.round(box.x + box.width * (spec.axis === "x" ? position : 0.5)),
          y: Math.round(box.y + box.height * (spec.axis === "y" ? position : 0.5)),
        }];
        await touch("touchStart", point(spec.start));
        for (let step = 1; step <= 8; step++) {
          await touch("touchMove", point(spec.start + (spec.end - spec.start) * step / 8));
          await page.waitForTimeout(24);
        }
        await touch("touchEnd");
        if (spec.expected) await expect(control).toHaveAttribute(spec.attribute, spec.expected);
        else await expect(control).not.toHaveAttribute(spec.attribute, before);
        result.push({ lane, before, after: await control.getAttribute(spec.attribute) });
      } catch (error) {
        result.push({ lane, error: error.message });
      } finally { await page.close(); }
    }
    diagnostics.push({ id: spec.group + "-" + spec.slug, input: "Chromium CDP touchscreen", width: profile.viewport.width,
      stateMatched: result.every(row => !row.error) && result[0].after === result[1].after, result });
  }
} finally { await browser.close(); }
await writeFile(".motionux-v9/evidence/touch.json", JSON.stringify(diagnostics, null, 2) + "\n");
console.log(JSON.stringify(diagnostics));
if (diagnostics.some(row => !row.stateMatched)) process.exitCode = 1;
