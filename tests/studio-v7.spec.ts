import { expect, test } from "@playwright/test";

test("a Gallery recipe retains live edits in its exported React usage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("jelly slider");
  await page.getByRole("link", { name: /Open playground for Jelly slider/i }).click();
  await expect(page).toHaveURL(/preset=gallery/);
  await page.getByRole("button", { name: "Motion", exact: true }).click();
  await page.getByLabel("Thumb elasticity").fill(".48");
  await expect(page.getByTestId("specimen-interaction").getByRole("slider", { name: "Elasticity" })).toBeVisible();
  await page.getByRole("button", { name: "Usage", exact: true }).click();
  const usage = page.locator(".mx-inspector code");
  await expect(usage).toContainText("InputsExample");
  await expect(usage).toContainText('initialConfig={{"elasticity":0.48}}');
});

test("reduced motion leaves the jelly thumb static while the range remains operable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?item=designbookmark-jelly-slider");
  const slider = page.getByRole("slider", { name: "Elasticity" });
  const thumb = page.locator(".mx-jelly-guide i");
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  await slider.dispatchEvent("pointerdown");
  await expect(thumb).toHaveCSS("transform", "none");
  await slider.dispatchEvent("pointercancel");
});
