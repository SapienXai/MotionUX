import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("dock preserves links, focus and expanded semantics", async ({ page }, info) => {
  await page.goto("/");
  const dock = page.getByRole("navigation", { name: "Örnek navigasyon" });
  await expect(dock.locator("[aria-current]")).toHaveText("Ana sayfa");
  const rooms = dock.getByRole("link", { name: "Odalar" });
  if (info.project.use.hasTouch) await rooms.tap();
  else {
    await dock.getByRole("link", { name: "Ana sayfa" }).focus();
    await page.keyboard.press("Tab");
    await expect(rooms).toBeFocused();
    expect(await rooms.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
    await page.keyboard.press("Enter");
  }
  await expect(page).toHaveURL(/#oda$/);
  await expect(rooms).toHaveAttribute("aria-current", "location");
  expect((await rooms.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const more = dock.getByRole("button", { name: "Daha fazla" });
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Ek otel bilgileri ve iletişim.")).toBeVisible();
});

test("room disclosure closes immediately and remains usable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const details = page.locator("details");
  const summary = details.locator("summary");
  const link = details.getByRole("link");
  await expect(link).toHaveCount(0);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(link).toBeVisible();
  await expect(details).toHaveJSProperty("open", true);
  expect(await details.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.press("Enter");
  await expect(details).toHaveJSProperty("open", false);
  await expect(link).toHaveCount(0);
});

test("live status stays mounted, contains one current label and supports long Turkish text", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const state = page.getByLabel("Test durumu");
  const status = page.getByRole("status");
  const region = await status.elementHandle();
  for (const tone of ["loading", "success", "error", "neutral"]) {
    await state.selectOption(tone);
    await expect(status.locator("[data-motion-status]")).toHaveAttribute("data-tone", tone);
    await expect(status).toHaveText(await state.locator("option:checked").innerText());
    expect(await region!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await status.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  }
  await expect(page.getByRole("button", { name: "İşleme devam et" })).toBeDisabled();
  await page.getByRole("button", { name: "Hareket örneği" }).click();
  await expect(page.getByRole("button", { name: "Hareket örneği" })).toHaveAttribute("aria-pressed", "true");
  await state.selectOption("error");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("catalog.png"), fullPage: true });
});
