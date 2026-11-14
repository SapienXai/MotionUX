import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect, webkit, devices } from "@playwright/test";

const origin = process.env.MOTIONUX_STUDIO_URL ?? "http://127.0.0.1:4296";
const evidence = resolve(process.argv[2] ?? "test-results/v6-motion");
const featured = [
  ["designbookmark-tab-pill", "tab", "Analytics", "tab", "Overview"],
  ["designbookmark-loading-to-success", "button", /start simulation/, "button", /run again/i],
  ["designbookmark-expand-card", "button", /Expand room/, "button", /Collapse room/],
  ["kokonut-morph-popover", "menuitem", "Share", "button", "New action"],
  ["designbookmark-profile-card", "button", /Emma Carter/, "button", /Emma Carter/],
  ["designbookmark-swipe-deck", "button", "Next destination", "button", "Previous destination"],
];
const others = [
  ["designbookmark-morph-island", "button", /Export activity/, "button", /Export activity/],
  ["designbookmark-goo-menu", "button", "Journal actions", "button", "Journal actions"],
  ["designbookmark-rubber-dock", "link", "Archive", "link", "Explore"],
  ["designbookmark-pull-to-refresh", "button", "Refresh notes", "button", "Refresh notes"],
  ["kokonut-signature-pad", "textbox", "Type your name", "button", "Clear signature"],
  ["designbookmark-glass-lens", "button", /Toggle magnification/, "button", /Toggle magnification/],
];

await mkdir(evidence, { recursive: true });
const [desktop, mobile] = await Promise.all([chromium.launch(), webkit.launch()]);
try {
  for (const [profile, browser] of [["desktop", desktop], ["mobile", mobile]]) {
    for (const theme of ["light", "dark"]) {
      const isMobile = profile === "mobile";
      const page = await browser.newPage({ ...(isMobile ? devices["iPhone 13"] : {}),
        viewport: isMobile ? { width: 390, height: 844 } : { width: 1536, height: 1024 }, reducedMotion: "no-preference" });
      await page.addInitScript(value => localStorage.setItem("mx-studio-scheme", value), theme);
      for (const [id, role, name, reverseRole, reverseName] of [...featured, ...others]) {
        const isPreset = featured.some(([key]) => key === id);
        await page.goto(`${origin}/?item=${id}${isPreset ? "&preset=gallery" : ""}`);
        const stage = page.getByTestId("specimen-interaction");
        const trigger = stage.getByRole(role, { name });
        await expect(trigger).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const file = state => resolve(evidence, `${id}-${profile}-${theme}-${state}.png`);
        const sample = stage.locator(isPreset ? ".mx-feature" : ".mx-demo");
        await sample.screenshot({ path: file("idle"), scale: "css" });
        if (role === "textbox") await trigger.fill("Studio Test");
        else await trigger.click();
        await sample.screenshot({ path: file("transition"), scale: "css" });
        await page.waitForTimeout(850);
        await sample.screenshot({ path: file("active"), scale: "css" });
        if (id === "designbookmark-loading-to-success") await page.getByRole("button", { name: "Reset preview" }).click();
        else await stage.getByRole(reverseRole, { name: reverseName }).click();
        await page.waitForTimeout(610);
        await sample.screenshot({ path: file("repeat-or-reverse"), scale: "css" });
      }
      await page.close();
    }
  }
  console.log("Captured 192 PNGs across 12 interactions, two themes, two browser profiles and four sampled states.");
} finally {
  await Promise.all([desktop.close(), mobile.close()]);
}
