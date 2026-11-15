import { expect, test } from "@playwright/test";

test("public original-source catalog loads discovery without requesting a private payload", async ({ page }) => {
  const privateRequests: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/v9/")) privateRequests.push(request.url()); });
  await page.goto("/?view=sources&source=designbookmark-plan-switch");
  await expect(page.getByRole("heading", { name: "Original sources", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Original preview", exact: true })).toHaveAttribute("href", /designbookmark\.com\/motion#db-plan-switch/);
  await expect(page.getByRole("link", { name: "V8 legacy preview", exact: true })).toBeVisible();
  await expect(page.getByText("82 matches", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Browse discovered sources" }).click();
  await page.getByRole("combobox", { name: "Catalog", exact: true }).selectOption("reactbits");
  await page.getByLabel("Find in provider").fill("electric border");
  await expect(page.getByRole("link", { name: /Electric ?Border/ })).toHaveAttribute("href", /reactbits\.dev\/animations\/electric-border/);
  expect(privateRequests).toEqual([]);
});
