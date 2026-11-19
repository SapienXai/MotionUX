// Run against `pnpm --dir platform studio --with-gallery` with the prepared local catalog.
// The test only edits an unsaved brief in its own browser context.
import assert from "node:assert/strict";
import { chromium, expect, webkit } from "@playwright/test";

const studio = "http://127.0.0.1:5200";
const components = [
  ["motionprimitives-animated-number", "Animated Number"],
  ["magicui-animated-circular-progress-bar", "Animated Circular Progress Bar"],
  ["motionprimitives-accordion", "Accordion"],
  ["smoothui-new-morph-toggle", "Morph Toggle"],
];
const brief = "Create an editorial focus tracker from these components.";

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const mobile = engine === webkit;
    const page = await browser.newPage({
      locale: "en-US", isMobile: mobile, hasTouch: mobile,
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      colorScheme: mobile ? "light" : "dark",
      reducedMotion: mobile ? "reduce" : "no-preference",
    });
    await page.goto(studio + "/build");
    const prompt = page.getByRole("textbox", { name: "Describe your app" });
    await prompt.fill(brief);
    await page.getByRole("button", { name: "Browse components", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Browse components" });
    await expect(picker.getByText(/^1–32 \/ /)).toBeVisible({ timeout: 20_000 });
    const nextPage = picker.getByRole("button", { name: "Next results" });
    await nextPage.click();
    await expect(picker.getByText(/^33–64 \/ /)).toBeVisible();
    await picker.getByRole("link", { name: "Choose in Gallery" }).click();

    const gallery = page.frameLocator("iframe.studio-discover");
    if (mobile) await gallery.getByRole("button", { name: "Open menu", exact: true }).click();
    await gallery.getByRole("link", { name: "Discovery", exact: true }).click();
    await gallery.getByRole("link", { name: "Choose components for Build" }).click();
    await gallery.getByRole("button", { name: "Build compatible", exact: true }).click();
    const search = page.getByRole("searchbox", { name: "Search components", exact: true });
    async function pickAction(id, title) {
      if (await search.isHidden()) await page.getByRole("button", { name: "Search components", exact: true }).click();
      await search.fill(id);
      await search.press("Enter");
      return gallery.locator(`[data-original-card="${id}"]`).getByRole("button", { name: `Use in Build: ${title}`, exact: true });
    }
    for (const [id, title] of components) {
      const pick = await pickAction(id, title);
      await pick.click();
      await expect(pick).toHaveAttribute("aria-pressed", "true");
    }
    const tray = gallery.getByRole("complementary", { name: "Build selection" });
    await expect(tray.getByText("4 / 4 selected")).toBeVisible();
    const fifth = await pickAction("smoothui-new-duration-picker", "Duration Picker");
    await expect(fifth).toBeDisabled();
    await tray.getByRole("button", { name: "Morph Toggle, remove from Build selection" }).click();
    await expect(fifth).toBeEnabled();
    await pickAction(...components[3]);
    await gallery.getByRole("link", { name: "Open playground for Morph Toggle" }).click();
    await gallery.getByRole("button", { name: "Use in Build: Morph Toggle", exact: true }).click();
    await tray.getByRole("button", { name: "Continue to Build" }).click();
    await page.waitForURL(/\/build\?fromGallery=1/);
    assert.deepEqual(new URL(page.url()).searchParams.getAll("source"), components.map(([id]) => id));
    await expect(prompt).toBeFocused();
    await expect(prompt).toHaveValue(brief);
    const selected = page.getByRole("list", { name: "Selected components" });
    for (const [, title] of components) await expect(selected.getByText(title, { exact: true })).toBeVisible();
    await expect(page.locator("[data-preview-status=ready]")).toBeVisible({ timeout: 25_000 });

    await selected.getByRole("button", { name: "Remove Morph Toggle", exact: true }).click();
    await page.reload();
    await expect(prompt).toHaveValue(brief);
    await expect(selected.getByRole("listitem")).toHaveCount(3);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    console.log(`${engine.name()}: catalog pagination, selection limit, Gallery handoff, preview and draft recovery passed.`);
  } finally {
    await browser.close();
  }
}
