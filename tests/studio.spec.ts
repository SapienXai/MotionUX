import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const url = (item: string) => `/?item=designbookmark-${item}`;
const stage = "[data-testid=specimen-interaction]";

test("catalog filters, themes, devices, Turkish, reset and comparison remain usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /A field guide/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a component" }).fill("pagination");
  await expect(page.getByRole("list", { name: "Specimens" }).getByRole("link")).toHaveCount(1);
  await page.getByRole("link", { name: /Pagination dots/ }).click();
  await expect(page.getByRole("heading", { name: "Pagination dots" })).toBeFocused();
  await page.getByText("Preview settings", { exact: true }).click();
  await page.getByRole("button", { name: "Mobile" }).click();
  await page.getByLabel("Theme", { exact: true }).selectOption("dinewallet");
  await page.getByLabel("Language", { exact: true }).selectOption("tr");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("checkbox", { name: "Reduced motion" }).check();
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.locator(stage)).toHaveCount(2);
  await page.getByRole("button", { name: "Sayfa 3", exact: true }).first().click();
  await page.getByRole("button", { name: "Reset preview" }).click();
  await expect(page.getByRole("button", { name: "Sayfa 1", exact: true }).first()).toHaveAttribute("aria-current", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("Tab pill moves focus and shows only the associated panel", async ({ page }) => {
  await page.goto(url("tab-pill"));
  const tabs = page.getByRole("tablist", { name: "Project sections" });
  await tabs.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Notes" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Working notes");
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Files" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
});

test("Bottom bar uses native links and presents a single current destination", async ({ page, isMobile }) => {
  await page.goto(url("bottom-bar"));
  const dock = page.getByRole("navigation", { name: "Workspace navigation" });
  const inbox = dock.getByRole("link", { name: "Inbox" });
  if (isMobile) await inbox.tap();
  else await inbox.press("Enter");
  await expect(inbox).toHaveAttribute("aria-current", "page");
  await expect(dock.locator("[aria-current]")).toHaveCount(1);
  await expect(page.getByText("Review new messages from the team.")).toBeVisible();
});

test("Segmented control changes the report using native radio arrows", async ({ page }) => {
  await page.goto(url("segmented-control"));
  await page.getByRole("radio", { name: "Week" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Month" })).toBeChecked();
  await expect(page.getByText("213", { exact: true })).toBeVisible();
});

test("Pagination dots honour boundaries and direct navigation", async ({ page }) => {
  await page.goto(url("pagination-dots"));
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await page.getByRole("button", { name: "Page 4" }).click();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await expect(page.getByText("Save your favourites")).toBeVisible();
});

test("Command palette exposes an empty result, executes a command and restores focus", async ({ page }) => {
  await page.goto(url("command-palette"));
  const trigger = page.getByRole("button", { name: "Search commands" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Commands" });
  const field = dialog.getByRole("searchbox");
  await expect(field).toBeFocused();
  await field.fill("zzz");
  await expect(dialog.getByText("No matching commands")).toBeVisible();
  await field.fill("note");
  await field.press("ArrowDown");
  await expect(dialog.getByRole("button", { name: "Create note" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator(stage).getByRole("status")).toHaveText("Create note");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("Pull cord supports keyboard, pointer detent and cancellation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url("pull-cord"));
  const button = page.getByRole("button", { name: "Studio light" });
  await button.press("Space");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  const x = rect!.x + rect!.width / 2, y = rect!.y + rect!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 16, { steps: 3 });
  await page.mouse.up();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 58, { steps: 6 });
  await page.mouse.up();
  await expect(button).toHaveAttribute("aria-pressed", "false");
});
