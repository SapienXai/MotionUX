import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync("metadata/reference-inventory.json", "utf8")) as { items: { id: string; registryItem: string; order: number }[] };
import { baseFields } from "../studio/playground/base";

test("featured controls carry live props into copied usage and a share link", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async (value: string) => { document.documentElement.dataset.copied = value; } },
  }));
  await page.goto("/?item=designbookmark-tab-pill&preset=gallery");
  await page.getByRole("button", { name: "Props", exact: true }).click();
  await page.getByLabel("Analytics label").fill("Night reports");
  const stage = page.getByTestId("specimen-interaction");
  const tab = stage.getByRole("tab", { name: "Night reports" });
  await expect(tab).toBeVisible();
  await tab.press("Enter");
  await page.getByRole("button", { name: "States", exact: true }).click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Copy share link" }).click();
  const shared = await page.locator("html").getAttribute("data-copied");
  await page.getByRole("button", { name: "Usage", exact: true }).click();
  await page.getByRole("button", { name: "Copy React example" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied", /SlidingTabPill[\s\S]*Night reports/);
  await page.goto(shared!);
  await expect(page.getByRole("tab", { name: "Night reports" })).toHaveAttribute("aria-selected", "true");
});

test("loading preset reports only supplied states and cancels a previous simulation when reset", async ({ page }) => {
  await page.goto("/?item=designbookmark-loading-to-success&preset=gallery");
  const specimen = page.getByTestId("specimen-interaction");
  await expect(specimen.getByRole("status")).toHaveText("Ready");
  await expect(specimen.getByText("Simulation")).toBeVisible();
  await page.getByRole("button", { name: "States", exact: true }).click();
  await page.getByLabel("Simulated state").selectOption("error");
  await expect(specimen.getByRole("status")).toHaveText("Failed. Try again.");
  await specimen.getByRole("button", { name: /start simulation/ }).click();
  await page.getByRole("button", { name: "Reset preview" }).click();
  await expect(specimen.getByRole("status")).toHaveText("Ready");
});

test("OTP and signature controls change the underlying inputs", async ({ page }) => {
  await page.goto("/?item=designbookmark-otp-code");
  await page.getByRole("button", { name: "Props", exact: true }).click();
  await page.getByLabel("Digits").fill("4");
  const otp = page.getByRole("textbox", { name: "Verification code" });
  await otp.fill("123456");
  await expect(otp).toHaveValue("1234");
  await page.goto("/?item=kokonut-signature-pad");
  await page.getByRole("button", { name: "States", exact: true }).click();
  await page.getByLabel("Disabled").check();
  await expect(page.getByRole("textbox", { name: "Type your name" })).toBeDisabled();
});

test("every reference exposes a control that changes its real specimen", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop Chromium", "Run the catalog-wide control sweep once; selected cases run on all browser profiles.");
  test.setTimeout(180_000);
  for (const row of inventory.items) {
    const field = baseFields(row.registryItem).find(field => field.type === "text" && field.section === "Props");
    await page.goto(`/?item=${row.id}`);
    await page.getByRole("button", { name: "Props", exact: true }).click();
    const preview = page.getByTestId("specimen-interaction");
    if (!field) {
      const numeric = baseFields(row.registryItem).find(field => field.type === "number");
      expect(numeric, row.id).toBeDefined();
      await page.getByLabel(numeric!.label).fill("1");
      await expect(preview.locator("[aria-current]")).toHaveText("Follow the river below the hill.");
      continue;
    }
    const value = "Studio control " + row.order;
    await page.getByLabel(field.label, { exact: true }).fill(value);
    await expect.poll(async () => (await preview.innerHTML()).includes(value), { message: row.id, timeout: 3500 }).toBe(true);
  }
});
