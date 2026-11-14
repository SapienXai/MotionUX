import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, webkit, devices, expect } from "@playwright/test";

const target = process.env.MOTIONUX_V5_URL ?? "http://127.0.0.1:4188";
const output = resolve(process.argv[2] ?? "docs/evidence/studio-v5");
const setups = [
  ["desktop-1536x1024-light", 1536, 1024, "", false, false],
  ["desktop-1440-light", 1440, 900, "", false, false],
  ["desktop-dark", 1536, 1024, "", true, false],
  ["tablet-768", 768, 1024, "", false, false],
  ["mobile-390-light", 390, 844, "", false, false],
  ["mobile-390-dark", 390, 844, "", true, false],
  ["mobile-375-drawer-open", 375, 812, "", false, true],
  ["playground-desktop", 1536, 1024, "?item=designbookmark-tab-pill", false, false],
  ["playground-mobile", 390, 844, "?item=designbookmark-tab-pill", false, false],
];
await mkdir(output, { recursive: true });
const desktop = await chromium.launch();
const mobile = await webkit.launch();
async function ready(page) {
  await page.locator(".mx-studio").waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator(".mx-gallery").count()) await page.locator(".mx-feature").first().waitFor();
  else await page.getByTestId("specimen-interaction").locator(".mx-demo").waitFor();
}
async function take(page, name, locator) {
  const options = { path: resolve(output, name + ".png"), scale: "css" };
  if (locator) await locator.screenshot(options);
  else await page.screenshot(options);
}
try {
  for (const [name, width, height, route, dark, drawer] of setups) {
    const engine = width < 768 ? mobile : desktop;
    const page = await engine.newPage({ ...(width < 768 ? devices["iPhone 13"] : {}), viewport: { width, height } });
    try {
      await page.goto(`${target}/${route}`);
      await ready(page);
      if (dark) await page.getByRole("button", { name: "Switch to dark mode" }).click();
      if (drawer) { await page.getByRole("button", { name: "Open menu" }).click(); await expect(page.getByRole("dialog")).toBeVisible(); }
      if (width >= 1400 && !route) await expect(page.locator(".mx-feature")).toHaveCount(6);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(260);
      await take(page, name);
    } finally { await page.close(); }
  }
  const page = await desktop.newPage({ viewport: { width: 1536, height: 1024 } });
  await page.goto(target);
  await ready(page);
  await expect(page.locator(".mx-feature")).toHaveCount(6);
  const stage = name => page.locator(`[data-card="${name}"] .mx-gallery-stage`);
  const tab = stage("designbookmark-tab-pill");
  await tab.getByRole("tab", { name: "Analytics" }).click();
  await expect(tab.getByRole("tab", { name: "Analytics" })).toHaveAttribute("aria-selected", "true");
  await take(page, "active-01-tab-pill", tab);
  const loading = stage("designbookmark-loading-to-success");
  await loading.getByRole("button", { name: /start simulation/ }).click();
  await expect(loading.getByRole("status")).toHaveText("Completed");
  await take(page, "active-02-loading-success", loading);
  const room = stage("designbookmark-expand-card");
  await room.getByRole("button", { name: /Expand room/ }).click();
  await expect(room.getByRole("button", { name: /Collapse room/ })).toHaveAttribute("aria-expanded", "true");
  await take(page, "active-03-expandable-card", room);
  const menu = stage("kokonut-morph-popover");
  await menu.getByRole("button", { name: "New action" }).press("ArrowDown");
  await menu.getByRole("menuitem", { name: "Create" }).click();
  await menu.getByRole("button", { name: "New action" }).press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Create" })).toBeFocused();
  await take(page, "active-04-morph-dropdown", menu);
  const profile = stage("designbookmark-profile-card");
  await profile.getByRole("button", { name: /Emma Carter/ }).click();
  await expect(profile.getByText(/welcoming, usable products/)).toBeVisible();
  await take(page, "active-05-profile-card", profile);
  const deck = stage("designbookmark-swipe-deck");
  await deck.getByRole("button", { name: "Next destination" }).press("Enter");
  await expect(deck.getByRole("heading", { name: "Aegean Sea" })).toBeVisible();
  await take(page, "active-06-swipe-deck", deck);
} finally { await Promise.all([desktop.close(), mobile.close()]); }
