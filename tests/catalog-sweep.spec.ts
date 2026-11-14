import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const inventory: { items: { id: string; preview: string | null }[] } = JSON.parse(
  readFileSync(new URL("../metadata/reference-inventory.json", import.meta.url), "utf8"),
);


test("every catalog specimen mounts at narrow width with reduced motion", async ({ page }) => {
  test.setTimeout(180_000);
  const issues: string[] = [];
  let item = "";
  page.on("pageerror", (error) => issues.push(`${item}: ${error.message}`));
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const { id, preview } of inventory.items) {
    item = id;
    await page.goto(preview!);
    const specimen = page.getByTestId("specimen-interaction");
    await expect(specimen.locator(".mx-demo"), item).toBeVisible();
    if (await specimen.evaluate((stage) => stage.scrollWidth > stage.clientWidth + 2) ||
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)) issues.push(`${item}: horizontal overflow`);
  }
  expect(issues).toEqual([]);
});

test("representative specimens expose labelled native controls in tablet dark mode", async ({ page }) => {
  test.setTimeout(85_000);
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const id of ["designbookmark-tab-pill", "designbookmark-hold-to-publish", "kokonut-signature-pad", "designbookmark-glass-lens", "designbookmark-prompt-box", "kokonut-glass-player"]) {
    await page.goto(`/?item=${id}`);
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    const stage = page.getByTestId("specimen-interaction");
    await expect(stage.locator(".mx-demo")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).include("[data-testid=specimen-interaction]").analyze();
    expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), id).toEqual([]);
  }
});
