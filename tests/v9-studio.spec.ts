import { expect, test } from "@playwright/test";

test("public shell links to source discovery without requesting private data", async ({ page }) => {
  const privateRequests: string[] = [];
  page.on("request", request => { if (/^\/v(?:9|10)\//.test(new URL(request.url()).pathname)) privateRequests.push(request.url()); });
  await page.goto("/");
  await expect(page.getByText(/Legacy\/public shell/)).toContainText("npm run studio");
  await page.goto("/?view=sources&source=designbookmark-plan-switch");
  await expect(page.getByText(/^Original unavailable/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Original preview", exact: true })).toHaveAttribute("href", /designbookmark\.com\/motion#db-plan-switch/);
  await expect(page.getByRole("link", { name: "V8 legacy preview", exact: true })).toBeVisible();
  await page.goto("/?view=sources");
  await expect(page.getByRole("heading", { name: "Discovery", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption("reactbits");
  await page.getByRole("searchbox", { name: "Search components", exact: true }).fill("electric");
  await expect(page.getByRole("link", { name: /Electric ?Border/ })).toHaveAttribute("href", /reactbits\.dev\/animations\/electric-border/);
  expect(privateRequests).toEqual([]);
});
