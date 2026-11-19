import assert from "node:assert/strict";
import { chromium, expect, webkit } from "@playwright/test";

const origin = "http://127.0.0.1:5200";
const projects = process.argv.slice(2);
assert(projects.length === 3 && projects.every((id) => /^[a-f0-9]{32}$/.test(id)),
  "Pass the IDs of a managed block project, SourceGraph project, and CodeProject. Run with the prepared Gallery.");

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const width of engine === chromium ? [320, 390, 768, 1024, 1440] : [320, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 }, locale: "en-US", hasTouch: width <= 430,
        reducedMotion: "reduce", colorScheme: width === 390 || width === 1440 ? "dark" : "light",
      });
      const page = await context.newPage();
      await page.goto(origin);
      await expect(page.getByRole("navigation", { name: "Studio navigation" }).getByRole("link")).toHaveCount(2);
      await expect(page.getByRole("heading", { name: "What are we building today?" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create app", exact: true })).toBeDisabled();
      for (const id of projects) {
        await page.goto(origin + "/build?project=" + id);
        const header = page.locator(".unified-workspace-head");
        await expect(header.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(header.getByRole("status")).toHaveText("All changes saved");
        await expect(page.getByRole("region", { name: "Application canvas" })).toBeVisible();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (width < 1100) {
          const properties = page.getByRole("navigation", { name: "Editor panes" }).getByRole("button", { name: "Properties", exact: true });
          await properties.click();
          await expect(page.getByRole("dialog", { name: /Properties|Application controls|Section properties/i })).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(properties).toBeFocused();
        } else {
          await expect(page.getByRole("navigation", { name: "Project pages" })).toBeVisible();
        }
        if (width === 390) {
          const prompt = page.getByRole("textbox", { name: "Revise with Codex" });
          const submit = page.getByRole("button", { name: "Revise saved application" });
          await prompt.fill("Keep the current interactions.");
          await page.setViewportSize({ width, height: 440 });
          await expect(prompt).toBeFocused();
          for (const control of [prompt, submit]) {
            await expect.poll(() => control.evaluate((node) => {
              const rect = node.getBoundingClientRect();
              return node.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
            })).toBe(true);
          }
          await page.setViewportSize({ width, height: 844 });
        }
      }
      await context.close();
      console.log(engine.name(), width, "Projects and all three workspace formats passed.");
    }
  } finally { await browser.close(); }
}
