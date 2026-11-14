import { chromium } from "playwright";

const origin = process.env.MOTIONUX_STUDIO_URL ?? "http://127.0.0.1:4190";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const client = await page.context().newCDPSession(page);
  const resources = new Set();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => resources.add(new URL(request.url()).pathname));
  await client.send("Performance.enable");
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.motionuxPerformance = { layoutShift: 0, longTasks: [] };
    for (const type of ["layout-shift", "longtask"]) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "longtask") window.motionuxPerformance.longTasks.push(entry.duration);
          else if (!entry.hadRecentInput) window.motionuxPerformance.layoutShift += entry.value;
        }
      }).observe({ type, buffered: true });
    }
  });
  const getMetrics = async () => Object.fromEntries((await client.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
  const phase = async (id, action) => {
    resources.clear();
    await page.goto(`${origin}/?item=${id}`);
    const specimen = page.getByTestId("specimen-interaction");
    await specimen.locator(".mx-demo").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await action(specimen);
    const baseline = await getMetrics();
    await page.waitForTimeout(1100);
    const settled = await getMetrics();
    const observations = await page.evaluate(() => window.motionuxPerformance);
    const assets = [...resources].filter((path) => path.endsWith(".js"));
    console.log(JSON.stringify({
      id, scripts: assets.length, layoutShift: Number(observations.layoutShift.toFixed(4)),
      longTasksMs: observations.longTasks.map(Math.round),
      sampledTaskTimeMs: Math.round((settled.TaskDuration - baseline.TaskDuration) * 1000),
    }));
    return [...resources];
  };
  const featured = await phase("designbookmark-tab-pill", async (stage) => {
    await stage.getByRole("tab", { name: "Notes" }).click();
  });
  if (featured.some((asset) => /(?:signal-studies|field-tones|card-studies|input-studies)/.test(asset))) {
    throw new Error("The featured specimen eagerly loaded unrelated assets.");
  }
  await phase("designbookmark-swipe-deck", async (stage) => {
    const next = stage.getByRole("button", { name: "Next note" });
    await next.press("Enter");
    await next.press("Enter");
    await stage.locator(".mx-deck-outgoing").waitFor({ state: "detached" });
  });
  const audio = await phase("kokonut-glass-player", async (stage) => {
    await stage.getByRole("button", { name: "Play sample" }).waitFor();
  });
  if (audio.some((asset) => asset.endsWith(".wav"))) throw new Error("Audio downloaded before explicit activation.");
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
}
