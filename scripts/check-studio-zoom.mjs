import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 720, height: 880 } });
  const origin = process.env.MOTIONUX_STUDIO_URL ?? "http://127.0.0.1:4190";
  const ids = ["designbookmark-tab-pill", "designbookmark-hold-to-publish", "kokonut-signature-pad", "designbookmark-prompt-box", "designbookmark-swipe-deck"];
  for (const id of ids) {
    await page.goto(`${origin}/?item=${id}`);
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    const stage = page.getByTestId("specimen-interaction");
    await stage.locator(".mx-demo").waitFor();
    await page.getByText("Preview settings", { exact: true }).click();
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await page.getByText("Preview settings", { exact: true }).click();
    const data = await stage.evaluate((element) => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stage: element.scrollWidth - element.clientWidth,
    }));
    if (data.stage > 2 || data.document > 2) throw new Error(`${id} overflows at 200% zoom: ${JSON.stringify(data)}`);
  }
  console.log(`Checked ${ids.length} Turkish specimens at 200% CSS zoom in Chromium.`);
} finally {
  await browser.close();
}
