import { expect, test } from "@playwright/test";

test("system theme updates the gallery until the visitor explicitly chooses a scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const studio = page.locator(".mx-studio");
  const stage = page.locator(".mx-gallery-stage").first();
  await expect(studio).toHaveAttribute("data-scheme", "dark");
  await expect(stage).toHaveCSS("background-color", "rgb(25, 25, 25)");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(stage).toHaveCSS("background-color", "rgb(237, 237, 237)");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.reload();
  await expect(stage).toHaveCSS("background-color", "rgb(25, 25, 25)");
});

test("gallery filters and card code links load the selected live recipe", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Filter gallery" }).getByRole("link", { name: "Inputs" }).click();
  await expect(page).toHaveURL(/category=inputs/);
  await page.getByRole("link", { name: "React code for Letter limit" }).click();
  await expect(page).toHaveURL(/panel=usage/);
  await expect(page.getByRole("button", { name: "Usage", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".mx-inspector code")).toContainText("InputsExample");
});
