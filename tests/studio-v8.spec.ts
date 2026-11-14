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

test("inline menu retargets its clip and returns keyboard focus after repeated opens", async ({ page }) => {
  await page.goto("/?item=kokonut-morph-popover&preset=gallery");
  const stage = page.getByTestId("specimen-interaction");
  const trigger = stage.getByRole("button", { name: "New action" });
  const action = stage.getByRole("menuitem", { name: "Create" });
  for (let cycle = 0; cycle < 3; cycle++) {
    await trigger.press("ArrowDown");
    await expect(action).toBeFocused();
    await action.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(action).toHaveCount(0);
  }
  await trigger.press("ArrowDown");
  await stage.getByRole("menuitem", { name: "Share" }).press("Enter");
  await expect(stage.getByRole("status")).toHaveText("Share selected");
});

test("goo menu separates its action targets and restores focus under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?item=designbookmark-goo-menu&preset=gallery");
  const trigger = page.getByRole("button", { name: "Journal actions" });
  await trigger.press("ArrowDown");
  const note = page.getByRole("button", { name: "Add a note" });
  await expect(note).toBeFocused();
  const [noteBox, triggerBox] = await Promise.all([note.boundingBox(), trigger.boundingBox()]);
  expect(noteBox!.x + noteBox!.width).toBeLessThan(triggerBox!.x);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("motion tuning reaches the installed preset code", async ({ page }) => {
  await page.goto("/?item=kokonut-morph-popover&preset=gallery");
  await page.getByRole("button", { name: "Motion", exact: true }).click();
  await page.getByLabel("Reveal stiffness").fill("600");
  await page.getByLabel("Reveal damping").fill("48");
  await page.getByRole("button", { name: "Usage", exact: true }).click();
  await expect(page.locator(".mx-inspector code")).toContainText("stiffness={600} damping={48}");
});
