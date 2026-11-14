import { expect, test } from "@playwright/test";

test("Letter limit preserves a composed grapheme and truncates overflow", async ({ page }) => {
  await page.goto("/?item=designbookmark-letter-limit");
  const field = page.getByRole("textbox", { name: "Caption" });
  await field.fill("👩‍🎨" + "a".repeat(24));
  await expect(field).toHaveValue("👩‍🎨" + "a".repeat(19));
  await expect(page.getByText("0 remaining")).toBeVisible();
});

test("Spring input reports validation after typing and clears on repair", async ({ page }) => {
  await page.goto("/?item=designbookmark-springy-input");
  const input = page.getByRole("textbox", { name: "Project name" });
  await input.fill("A project title longer than the limit");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription("Use 18 characters or fewer");
  await input.fill("Juniper");
  await expect(input).not.toHaveAttribute("aria-invalid");
});

test("OTP accepts pasted digits, including the leading zero", async ({ page }) => {
  await page.goto("/?item=designbookmark-otp-code");
  const field = page.getByRole("textbox", { name: "Verification code" });
  await field.fill("012-345-678");
  await expect(field).toHaveValue("012345");
  await expect(field).toHaveAttribute("autocomplete", "one-time-code");
});

test("Tag input respects composition and returns focus after removal", async ({ page }) => {
  await page.goto("/?item=designbookmark-tag-input");
  const input = page.getByRole("textbox", { name: "Tags", exact: true });
  await input.fill("京都");
  await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(page.getByRole("button", { name: "Remove 京都" })).toHaveCount(0);
  await input.press("Enter");
  const remove = page.getByRole("button", { name: "Remove 京都" });
  await remove.click();
  await expect(remove).toHaveCount(0);
  await expect(input).toBeFocused();
});

test("Password rule feedback updates while the value remains masked", async ({ page }) => {
  await page.goto("/?item=designbookmark-password-strength");
  const input = page.getByLabel("New password");
  await expect(input).toHaveAttribute("type", "password");
  await input.fill("studio");
  await expect(page.getByText("Unmet", { exact: true })).toHaveCount(2);
  await input.fill("Synthetic-2026");
  await expect(page.getByText("Met", { exact: true })).toHaveCount(2);
});

test("Jelly slider exposes the new formatted value after keyboard input", async ({ page }) => {
  await page.goto("/?item=designbookmark-jelly-slider");
  const control = page.getByRole("slider", { name: "Elasticity" });
  await control.press("ArrowRight");
  await expect(control).toHaveAttribute("aria-valuetext", "36%");
});

test("Exposure control changes the visible local photo", async ({ page }) => {
  await page.goto("/?item=smoothui-exposure-slider");
  const image = page.getByRole("img", { name: "Snowy forest beneath low clouds" });
  await expect(image).toHaveCSS("filter", "brightness(1)");
  await page.getByRole("slider", { name: "Exposure" }).press("End");
  await expect(image).toHaveCSS("filter", "brightness(2)");
});

test("Dial angle snaps through the caller's discrete values", async ({ page }) => {
  await page.goto("/?item=kokonut-detent-dial");
  const range = page.getByRole("slider", { name: "Gain" });
  await range.press("Home");
  await expect(range).toHaveValue("0");
  const dial = page.locator(".mx-value-dial");
  await dial.click({ position: { x: 86, y: 45 } });
  await expect(range).toHaveValue("9");
});

test("Range controls preserve endpoint ordering", async ({ page }) => {
  await page.goto("/?item=designbookmark-range-slider");
  const minimum = page.getByRole("slider", { name: /Minimum/ });
  const maximum = page.getByRole("slider", { name: /Maximum/ });
  await minimum.press("End");
  await expect(minimum).toHaveValue("75");
  await maximum.press("Home");
  await expect(maximum).toHaveValue("75");
});

test("Stepper preserves constraints with text and button entry", async ({ page }) => {
  await page.goto("/?item=designbookmark-number-stepper");
  const field = page.getByRole("spinbutton", { name: "Guests" });
  await field.fill("12");
  await field.blur();
  await expect(field).toHaveValue("2");
  await page.getByRole("button", { name: "Remove one guest" }).click();
  await expect(field).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Remove one guest" })).toBeDisabled();
});

test("Rating updates with native radio navigation", async ({ page }) => {
  await page.goto("/?item=designbookmark-star-rating");
  await page.getByRole("radio", { name: "3 out of 5 stars" }).press("ArrowRight");
  await expect(page.getByRole("radio", { name: "4 out of 5 stars" })).toBeChecked();
});

test("Checkbox list exposes checked state and selection count", async ({ page }) => {
  await page.goto("/?item=designbookmark-checkbox-list");
  const option = page.getByRole("checkbox", { name: "Private terrace" });
  await option.press("Space");
  await expect(option).toBeChecked();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
});

test("File selection validates type and size before passing a file to the caller", async ({ page }) => {
  await page.goto("/?item=designbookmark-file-drop");
  const input = page.getByLabel("Select or drop files");
  await input.setInputFiles({ name: "personal.csv", mimeType: "text/csv", buffer: Buffer.from("data") });
  await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  await input.setInputFiles({ name: "large.txt", mimeType: "text/plain", buffer: Buffer.alloc(16385) });
  await expect(page.getByText(/File too large/)).toBeVisible();
  await input.setInputFiles({ name: "demo.txt", mimeType: "text/plain", buffer: Buffer.from("demo") });
  await expect(page.getByText("demo.txt", { exact: true })).toBeVisible();
});

test("Card field formats digits and preserves field-purpose attributes", async ({ page }) => {
  await page.goto("/?item=kokonut-card-field");
  const number = page.getByRole("textbox", { name: "Card number" });
  await number.fill("4242424242424242");
  await expect(number).toHaveValue("4242 4242 4242 4242");
  const expiry = page.getByRole("textbox", { name: "Expiry" });
  await expiry.fill("0529");
  await expect(expiry).toHaveValue("05/29");
  await expect(page.getByLabel("Security code")).toHaveAttribute("autocomplete", "cc-csc");
});

test("Signature alternative can be cleared independently of drawing", async ({ page }) => {
  await page.goto("/?item=kokonut-signature-pad");
  const alternative = page.getByRole("textbox", { name: "Type your name" });
  await alternative.fill("Studio tester");
  await page.getByRole("button", { name: "Clear signature" }).click();
  await expect(alternative).toHaveValue("");
  const undo = page.getByRole("button", { name: "Undo stroke" });
  await expect(undo).toBeDisabled();
  const canvas = page.locator(".mx-signature-surface > svg:last-child");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 64, box.y + 40, { steps: 7 });
  await page.mouse.up();
  await expect(canvas.locator("polyline")).toHaveCount(1);
  await undo.click();
  await expect(canvas.locator("polyline")).toHaveCount(0);
});

test("Wheel moves to a selected detent and settles a scrolled detent", async ({ page }) => {
  await page.goto("/?item=kokonut-wheel-picker");
  await page.getByRole("radio", { name: "14:00" }).press("ArrowDown");
  await expect(page.getByRole("radio", { name: "15:00" })).toBeChecked();
  await page.locator(".mx-wheel-viewport").evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.getByRole("radio", { name: "18:00" })).toBeChecked();
});
