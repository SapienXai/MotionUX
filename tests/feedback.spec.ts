import { expect, test } from "@playwright/test";

test("Plan switch updates the billing price with arrow keys", async ({ page }) => {
  await page.goto("/?item=designbookmark-plan-switch");
  await page.getByRole("radio", { name: "Monthly" }).press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Annual" })).toBeChecked();
  await expect(page.getByText("Billed $192 yearly", { exact: true })).toBeVisible();
});

for (const [id, name] of [
  ["designbookmark-hold-to-publish", "Hold to publish"],
  ["kokonut-hold-button", "Hold to arm"],
  ["kokonut-slide-to-confirm", "Slide to confirm"],
]) {
  test(`${name} offers a keyboard confirmation with cancel focused`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    const trigger = page.getByRole("button", { name });
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.press("Space");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByText("Confirmed intents · 1")).toBeVisible();
  });
}

test("Hold waits while pressed and fires once after completing the hold", async ({ page }) => {
  await page.goto("/?item=kokonut-hold-button");
  const button = page.getByRole("button", { name: "Hold to arm" });
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByText("Confirmed intents · 0")).toBeVisible();
  await expect(page.getByText("Confirmed intents · 1")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Confirmed intents · 1")).toBeVisible();
});

test("Slide commits only after the thumb reaches the track threshold", async ({ page }) => {
  await page.goto("/?item=kokonut-slide-to-confirm");
  const thumb = page.getByRole("button", { name: "Slide to confirm" });
  await thumb.scrollIntoViewIfNeeded();
  const start = (await thumb.boundingBox())!;
  const track = (await page.locator(".mx-slide-track").boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width - start.width / 2, start.y + start.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText("Confirmed intents · 1")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Action outcome reflects both caller-provided success and failure", async ({ page }) => {
  await page.goto("/?item=designbookmark-loading-to-success");
  const result = page.getByLabel("Demo result");
  for (const [value, text] of [["pending", "Waiting for response"], ["error", "Demo failed"], ["success", "Demo confirmed"]]) {
    await result.selectOption(value);
    await expect(page.getByTestId("specimen-interaction").getByRole("status")).toHaveText(text);
  }
});

test("Copy announces success following an actual clipboard write request", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async (text: string) => { document.documentElement.dataset.testClipboard = text; } },
  }));
  await page.goto("/?item=designbookmark-copy-button");
  await page.getByRole("button", { name: "Copy access code" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-test-clipboard", "studio-access-2026");
  await expect(page.getByTestId("specimen-interaction").getByRole("status")).toHaveText("Copied");
});

for (const [id, name] of [["designbookmark-like-burst", "Like"], ["kokonut-bell-button", "Alerts"]]) {
  test(`${name} exposes both pressed states`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    const button = page.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await button.press("Space");
    await expect(button).toHaveAttribute("aria-pressed", "false");
  });
}

test("Magnetic button remains keyboard-operable", async ({ page }) => {
  await page.goto("/?item=designbookmark-magnetic-button");
  await page.getByRole("button", { name: "Open collection" }).press("Enter");
  await expect(page.getByText("Opened · 1")).toBeVisible();
});

for (const [id, name, chord] of [
  ["designbookmark-command-button", "Export draft", "Alt+e"],
  ["kokonut-command-button", "Open workspace", "Alt+o"],
]) {
  test(`${name} invokes the action only outside editable fields`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page.keyboard.press(chord);
    await expect(page.getByText("Invocations · 2")).toBeVisible();
    const field = page.locator("input[type=search]").first();
    await field.press(chord);
    await expect(page.getByText("Invocations · 2")).toBeVisible();
  });
}

test("Cart button reflects the caller-owned count", async ({ page }) => {
  await page.goto("/?item=kokonut-cart-button");
  await page.getByRole("button", { name: /Add to bag/ }).click();
  await expect(page.getByTestId("specimen-interaction").getByText("1", { exact: true })).toBeVisible();
});

test("Undo restores the draft and becomes unavailable", async ({ page }) => {
  await page.goto("/?item=kokonut-undo-button");
  const button = page.getByRole("button", { name: "Undo", exact: true });
  await button.click();
  await expect(page.getByText("Item restored", { exact: true })).toBeVisible();
  await expect(button).toBeDisabled();
});

test("Switch exposes checked state through its native input", async ({ page }) => {
  await page.goto("/?item=designbookmark-toggle-switch");
  const control = page.getByRole("switch", { name: "Quiet hours" });
  await control.press("Space");
  await expect(control).toBeChecked();
});

test("Notification dismissal hands focus back to the persistent toggle", async ({ page }) => {
  await page.goto("/?item=kokonut-notification-stack");
  const toggle = page.getByRole("button", { name: /Updates/ });
  await toggle.click();
  await page.getByRole("button", { name: /Dismiss.*Draft ready/ }).click();
  await expect(page.getByText("Draft ready", { exact: true })).toHaveCount(0);
  await expect(toggle).toBeFocused();
});

test("Step progress updates the current step", async ({ page }) => {
  await page.goto("/?item=designbookmark-step-progress");
  await page.getByRole("button", { name: "Advance demo" }).click();
  await expect(page.locator("[aria-current=step]")).toContainText("Review");
});

test("Agent steps expose the triggered detail", async ({ page }) => {
  await page.goto("/?item=kokonut-agent-steps");
  const step = page.getByRole("button", { name: /Collect inputs/ });
  await step.click();
  await expect(step).toHaveAttribute("aria-expanded", "true");
  const detail = await step.getAttribute("aria-controls");
  await expect(page.locator(`[id="${detail}"]`)).toContainText("This is a synthetic run entry.");
  await expect(page.locator(`[id="${detail}"]`)).toBeVisible();
});

test("Tool approval records a denial without executing the demo tool", async ({ page }) => {
  await page.goto("/?item=kokonut-tool-approval");
  await page.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByText("Demo request denied")).toBeVisible();
  await expect(page.getByRole("button", { name: "Allow" })).toHaveCount(0);
});

test("Goo indicator reports pending and settled under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?item=designbookmark-goo-thinking");
  await page.getByRole("button", { name: "Start demo" }).click();
  const status = page.getByTestId("specimen-interaction").getByRole("status");
  await expect(status).toHaveText("Waiting for reply");
  await page.getByRole("button", { name: "Stop demo" }).click();
  await expect(status).toHaveText("Ready");
});

test("Three linear steps fit in one row at the narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/?item=designbookmark-step-progress");
  const steps = page.getByRole("list", { name: "Progress" }).getByRole("listitem");
  await expect(steps).toHaveCount(3);
  const top = await steps.evaluateAll(elements => elements.map(el => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(top).size).toBe(1);
});
