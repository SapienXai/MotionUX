import { expect, test } from "@playwright/test";

test("Spring dropdown selects sort using the keyboard", async ({ page }) => {
  await page.goto("/?item=designbookmark-spring-dropdown");
  const opener = page.getByRole("button", { name: "Sort by" });
  await opener.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Newest" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Oldest", { exact: true })).toBeVisible();
  await expect(opener).toBeFocused();
});

test("Dynamic menu skips disabled commands and Escape returns focus", async ({ page }) => {
  await page.goto("/?item=designbookmark-dynamic-menu");
  const opener = page.getByRole("button", { name: "More actions" });
  await opener.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Pin to project" })).toBeDisabled();
  await expect(page.getByRole("menuitem", { name: "Archive" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("Morph popover opens from sharing and dismisses on outside activation", async ({ page }) => {
  await page.goto("/?item=kokonut-morph-popover");
  await page.getByRole("button", { name: "Sharing options" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("heading", { name: "Morph popover" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("Morph tooltip exposes description on focus and dismisses without moving focus", async ({ page }) => {
  await page.goto("/?item=designbookmark-morph-tooltip");
  const button = page.getByRole("button", { name: "About image quality" });
  await button.focus();
  await expect(page.getByRole("tooltip")).toHaveText(/exported file size/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(button).toBeFocused();
});

test("Rubber dock selects a destination without modifying the Studio URL", async ({ page }) => {
  await page.goto("/?item=designbookmark-rubber-dock");
  await page.getByRole("link", { name: "Capture" }).click();
  await expect(page.getByRole("link", { name: "Capture" })).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveURL(/rubber-dock$/);
});

test("Sidebar collapse retains accessible links after labels retract", async ({ page }) => {
  await page.goto("/?item=designbookmark-sidebar-collapse");
  const toggle = page.getByRole("button", { name: "Toggle labels" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Files", exact: true })).toBeVisible();
});

test("Smooth tab swipe switches the associated panel", async ({ page }) => {
  await page.goto("/?item=kokonut-smooth-tab");
  const panel = page.getByRole("tabpanel");
  await panel.locator(".mx-swipe-surface").evaluate((node) => {
    node.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 120, clientY: 50, bubbles: true }));
    node.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 30, clientY: 54, bubbles: true }));
  });
  await expect(page.getByRole("tab", { name: "Colour" })).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByText("Colour", { exact: true })).toBeVisible();
});

test("Toolbar keeps one tab stop and applies formatting", async ({ page }) => {
  await page.goto("/?item=kokonut-toolbar");
  const toolbar = page.getByRole("toolbar");
  await toolbar.getByRole("button", { name: "Align left" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(toolbar.getByRole("button", { name: "Align center" })).toHaveAttribute("aria-pressed", "true");
  await expect(toolbar.locator("[tabindex='0']")).toHaveCount(1);
  await expect(page.getByTestId("formatted-text")).toHaveCSS("text-align", "center");
});

test("Stack panel closes the previous record when another opens", async ({ page }) => {
  await page.goto("/?item=kokonut-stack-panel");
  await page.getByRole("button", { name: "Release schedule" }).click();
  await expect(page.getByRole("button", { name: "Project brief" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Review takes place on Thursday.")).toBeVisible();
});

test("Action menu escapes a clipped ancestor and stays within the viewport", async ({ page }) => {
  await page.goto("/?item=designbookmark-spring-dropdown");
  const trigger = page.getByRole("button", { name: "Sort by" });
  await trigger.evaluate((element) => {
    const root = element.parentElement!;
    root.style.overflow = "hidden";
  });
  await trigger.press("ArrowDown");
  const layer = page.locator(".mx-menu-layer");
  const supportsTopLayer = await page.evaluate(() => typeof HTMLElement.prototype.showPopover === "function");
  if (supportsTopLayer) {
    await expect(layer).toHaveJSProperty("popover", "manual");
    const bounds = await layer.boundingBox();
    const viewport = page.viewportSize()!;
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  }
  await page.getByRole("menuitem", { name: "Newest" }).press("Enter");
  await expect(trigger).toBeFocused();
});
