import { expect, test } from "@playwright/test";

test("Morph island retains a single compact activity with expandable details", async ({ page }) => {
  await page.goto("/?item=designbookmark-morph-island");
  const trigger = page.getByRole("button", { name: /Export activity/ });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Draft export ready for inspection.")).toBeVisible();
});

test("Expand card returns focus and makes outgoing content inert on Escape", async ({ page }) => {
  await page.goto("/?item=designbookmark-expand-card");
  const trigger = page.getByRole("button", { name: /Winter field guide/ });
  await trigger.press("Enter");
  await expect(page.getByText(/lower trail is sheltered/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("Profile card exposes an actionable profile control", async ({ page }) => {
  await page.goto("/?item=designbookmark-profile-card");
  await page.getByRole("button", { name: /Mira Vale/ }).click();
  await page.getByRole("button", { name: "Save demo contact" }).click();
  await expect(page.getByRole("button", { name: "Demo contact saved" })).toBeVisible();
});

test("Boarding pass reveals flight itinerary details", async ({ page }) => {
  await page.goto("/?item=kokonut-boarding-pass");
  await page.getByRole("button", { name: /Istanbul.*Copenhagen/ }).click();
  await expect(page.getByText("14A", { exact: true })).toBeVisible();
  await expect(page.getByText("B12", { exact: true })).toBeVisible();
});

test("Stat card switches formatted value and readable trend", async ({ page }) => {
  await page.goto("/?item=designbookmark-stat-card");
  await page.getByRole("radio", { name: "Week" }).press("ArrowRight");
  await expect(page.getByText("1,084", { exact: true })).toBeVisible();
  await expect(page.getByText("Up 8% this month")).toBeVisible();
});

test("Swipe deck changes card after a real horizontal drag", async ({ page }) => {
  await page.goto("/?item=designbookmark-swipe-deck");
  const card = page.locator("[data-deck-card]");
  await card.scrollIntoViewIfNeeded();
  const rect = (await card.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * .7, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .25, rect.y + rect.height / 2, { steps: 7 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "A slower river" })).toBeVisible();
  await expect(page.getByText("2 of 3")).toBeVisible();
});

test("Page flip supports keyboard navigation under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?item=kokonut-page-flip");
  const next = page.getByRole("button", { name: "Next note" });
  await next.press("Enter");
  await expect(page.getByRole("heading", { name: "A slower river" })).toBeVisible();
  await next.press("Enter");
  await expect(next).toBeDisabled();
  await expect(page.getByText("3 of 3")).toBeVisible();
});

test("Fan cards gathers around the selected note and restores focus", async ({ page }) => {
  await page.goto("/?item=designbookmark-fan-cards");
  await page.getByRole("button", { name: "Spread notes" }).click();
  await page.getByRole("button", { name: "Valley notes" }).click();
  await expect(page.getByRole("heading", { name: "Valley notes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spread notes" })).toBeFocused();
});

test("Fine-pointer ticket springs back when the pointer exits", async ({ page }) => {
  await page.goto("/?item=designbookmark-parallax-ticket");
  const card = page.locator('[data-mx-surface="ticket"] article');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 12, box.y + 10);
  await expect(card).not.toHaveCSS("transform", "none");
  await page.mouse.move(1, 1);
  await expect(card).toHaveCSS("transform", "none");
});

test("Glass lens moves with arrow keys and closes with Escape", async ({ page }) => {
  await page.goto("/?item=designbookmark-glass-lens");
  const trigger = page.getByRole("button", { name: /Toggle magnification/ });
  await trigger.press("Enter");
  const lens = trigger.locator(".mx-lens-glass");
  await expect(lens).toHaveAttribute("style", /left: 50%/);
  await trigger.press("ArrowRight");
  await expect(lens).toHaveAttribute("style", /left: 57%/);
  await trigger.press("Escape");
  await expect(trigger).toHaveAttribute("aria-pressed", "false");
});

test("Pull refresh commits after distance threshold and offers a button", async ({ page }) => {
  await page.goto("/?item=designbookmark-pull-to-refresh");
  const handle = page.locator(".mx-refresh-handle");
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 88, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText("Demo revision 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh notes" }).press("Enter");
  await expect(page.getByText("Demo revision 2", { exact: true })).toBeVisible();
});

test("Goo morph changes its path and accessible state under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?item=designbookmark-goo-morph");
  const shape = page.locator('[data-mx-goo="morph"] path');
  const first = await shape.getAttribute("d");
  await page.getByRole("button", { name: "Change shape" }).click();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
  await expect(shape).not.toHaveAttribute("d", first!);
});

test("Goo menu navigates through labelled actions and restores focus", async ({ page }) => {
  await page.goto("/?item=designbookmark-goo-menu");
  const origin = page.getByRole("button", { name: "Journal actions" });
  await origin.press("Enter");
  await origin.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Add a note" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(origin).toBeFocused();
  await expect(origin).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Add a note", { exact: true })).toBeVisible();
});

test("Unlock is clearly simulated and completes without authenticating", async ({ page }) => {
  await page.goto("/?item=smoothui-unlock-face-id");
  const stage = page.getByTestId("specimen-interaction");
  await expect(stage.getByText("Visual simulation")).toBeVisible();
  await stage.getByRole("button", { name: "Play simulation" }).click();
  await expect(stage.getByRole("status")).toHaveText("Simulation finished");
});
