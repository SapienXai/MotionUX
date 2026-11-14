import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, webkit, devices } from "playwright";

const url = process.env.MOTIONUX_STUDIO_URL ?? "http://127.0.0.1:4188";
const output = resolve(process.argv[2] ?? "test-results/studio");
const samples = [
  { id: "designbookmark-tab-pill", action: "Notes", width: 1440, theme: "neutral" },
  { id: "designbookmark-hold-to-publish", action: "Hold to publish", width: 390, theme: "dinewallet" },
  { id: "smoothui-exposure-slider", action: null, width: 1440, theme: "neutral" },
  { id: "kokonut-signature-pad", action: null, width: 390, theme: "bookplace" },
  { id: "designbookmark-swipe-deck", action: "Next note", width: 390, theme: "bookplace" },
  { id: "designbookmark-streaming-reply", action: "Start reply", width: 1440, theme: "neutral" },
  { id: "kokonut-glass-player", action: "Play sample", width: 390, theme: "dinewallet" },
];
await mkdir(output, { recursive: true });
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const sample of samples.filter(({ width }) => engine === chromium ? width === 1440 : width === 390)) {
      const page = await browser.newPage(sample.width === 390 ? devices["iPhone 13"] : { viewport: { width: 1440, height: 900 } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const scheme of ["light", "dark"]) {
        await page.goto(`${url}/?item=${sample.id}#specimen`);
        const stage = page.locator(".mx-stage");
        await stage.locator(".mx-demo").waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (scheme === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
        if (sample.theme !== "neutral") {
          await page.getByText("Preview settings", { exact: true }).click();
          await page.getByLabel("Theme", { exact: true }).selectOption(sample.theme);
          await page.getByText("Preview settings", { exact: true }).click();
        }
        if (sample.id === "kokonut-signature-pad") await stage.getByLabel("Type your name").fill("Mira Vale");
        if (sample.action && sample.id !== "designbookmark-hold-to-publish") {
          const visibleLabel = stage.getByText(sample.action, { exact: true });
          if (await visibleLabel.count()) await visibleLabel.first().click();
          else await stage.getByRole("button", { name: sample.action }).click();
          if (sample.id === "designbookmark-streaming-reply") await stage.getByText("Demo finished", { exact: true }).waitFor();
        }
        await stage.screenshot({ path: resolve(output, `${sample.id}-${scheme}-${sample.width}.png`), scale: "css", animations: "disabled" });
        if (sample.id === "designbookmark-hold-to-publish" && scheme === "dark") {
          await stage.getByRole("button", { name: sample.action }).press("Enter");
          await page.getByRole("dialog").screenshot({ path: resolve(output, `${sample.id}-dialog-${sample.width}.png`) });
        }
        if (sample.id === "designbookmark-tab-pill" && scheme === "light") {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: resolve(output, "studio-catalog-desktop.png"), animations: "disabled" });
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
