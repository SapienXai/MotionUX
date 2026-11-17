import assert from "node:assert/strict";
import { chromium } from "playwright";

const { origin, digest, pages } = JSON.parse(process.env.MOTIONUX_SOURCE_VERIFICATION);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 160)));
  for (const definition of pages) {
    const response = await page.goto(origin + definition.route, { waitUntil: "networkidle" });
    assert(response?.ok(), "A planned route returned an error.");
    assert.equal(response.headers()["x-motionux-document"], digest, "The runtime digest changed.");
    for (const item of definition.instances) {
      const region = page.locator('[data-instance="' + item.id + '"]');
      await region.waitFor({ state: "visible" });
      assert.equal(await region.getAttribute("data-kind"), item.kind);
      if (item.kind === "source" || item.kind === "generated") {
        assert(await region.locator("button,input,output,select,[role=tab],span,.mx-source-content").count(), "A source instance produced no usable output at " + definition.route + "#" + item.id + ".");
      }
    }
    const layout = await page.evaluate(() => {
      if (document.documentElement.scrollWidth <= innerWidth + 1) return null;
      return [...document.querySelectorAll(".mx-app, .mx-main, .mx-section, .mx-source-mount, .mx-chrome")]
        .filter((node) => node.getBoundingClientRect().right > innerWidth || node.scrollWidth > node.clientWidth + 2)
        .map((node) => [node.className, node.clientWidth, node.scrollWidth]).slice(0, 5);
    });
    assert.equal(layout, null, "The generated route overflows at 390px: " + JSON.stringify(layout));
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(JSON.stringify({ routes: pages.length, instances: pages.reduce((n, p) => n + p.instances.length, 0), width: 390, engine: browser.version() }));
} finally {
  await browser.close();
}
