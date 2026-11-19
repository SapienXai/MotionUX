import { openProjectActions } from "./source-editor-ui.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium, firefox, webkit } from "playwright";

const studio = "http://127.0.0.1:5200";
const run = "http://127.0.0.1:5202";
const evidence = resolve(import.meta.dirname, "../../.motionux-v9/evidence/build-composition");
const pins = ["designbookmark-plan-switch", "motionprimitives-animated-number"];
const brief = "Build a premium membership pricing page for Aftertone, a fictional independent music discovery service. Make the billing interaction the focal point. Use both selected components in the real pricing grid: connect the Plan Switch BillingPeriod as the sole billing control, and use the original Motion Primitives AnimatedNumber render component for the actual numeric amount on each tier, driven by the same period state. Starter costs $0 both ways, Pro $12 monthly or $108 paid yearly, and Business $29 monthly or $264 paid yearly. Actual amounts must visibly settle and the CTA summary must reflect the chosen plan and cadence. Use one shared plan and period state. Include keyboard and reduced-motion support and native controls. Do not make a second display-only pricing panel. One screen, no checkout or external services. Give Aftertone a strong listening-culture identity with spacious typography, precise tabular prices, midnight ink and a restrained copper accent. The actual radio labels must be Monthly and Yearly. In the declared journey press Space on Yearly and wait for 108, then press Space on Monthly and wait for 12.";
await mkdir(evidence, { recursive: true, mode: 0o700 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let job;
  if (process.argv.includes("--reuse")) {
    job = JSON.parse(await readFile(resolve(evidence, "job.json"), "utf8"));
    assert.equal(job.status, "ready");
    await page.goto(studio + "/build?project=" + job.project, { waitUntil: "networkidle" });
  } else {
    await page.goto(studio + "/build/local-sources?source=" + pins[0], { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Use in Create app" }).click();
    await expect(page.getByRole("list", { name: "Selected components" })).toContainText("Plan switch");
    await page.getByText("Browse components", { exact: true }).click();
    await page.getByRole("searchbox", { name: "Find components for your app" }).fill("animated number motion primitives");
    await page.getByRole("button", { name: /Animated Number.*Motion Primitives/ }).click();
    await page.getByRole("searchbox", { name: "Find components for your app" }).press("Escape");
    await expect(page.getByRole("button", { name: "Browse components", exact: true })).toBeFocused();
    await expect(page.getByRole("list", { name: "Selected components" }).getByRole("listitem")).toHaveCount(2);
    await page.getByRole("textbox", { name: "Describe your app" }).fill(brief);
    await page.screenshot({ path: resolve(evidence, "compose-desktop.png") });
    await page.setViewportSize({ width: 390, height: 840 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: resolve(evidence, "compose-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const starting = page.waitForResponse((response) => response.url().endsWith("/source-jobs/start") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create app", exact: true }).click();
    const response = await starting;
    assert.deepEqual(response.request().postDataJSON().kit, pins);
    job = await response.json();
    assert(response.ok(), JSON.stringify(job));
    let last;
    for (;;) {
      job = await page.evaluate(async (id) => (await fetch("/api/build/source-jobs/" + id)).json(), job.id);
      if (job.status !== last) console.log(job.status, job.message);
      last = job.status;
      if (["ready", "failed", "cancelled"].includes(last)) break;
      await delay(1750);
    }
    await writeFile(resolve(evidence, "job.json"), JSON.stringify(job, null, 2), { mode: 0o600 });
    assert.equal(job.status, "ready", job.message);
    await page.waitForURL(/project=/);
  }
  const project = await page.evaluate(async (id) => (await fetch("/api/build/" + id)).json(), job.project);
  assert(project.document.codeProject.sources.some(({ id, fidelity }) => id === pins[0] && fidelity === "local-adapter"));
  for (const id of pins) assert(project.document.codeProject.usages.some(({ source }) => source === id));
  assert(!project.document.codeProject.sources.some(({ fidelity }) => fidelity === "local-frame"));
  await writeFile(resolve(evidence, "project.json"), JSON.stringify(project, null, 2), { mode: 0o600 });
  const denials = await page.evaluate(async (id) => Promise.all(["export", "export-pwa"].map(async (action) => {
    const reply = await fetch(`/api/build/${id}/${action}`);
    return [reply.status, reply.headers.get("Content-Disposition")];
  })), job.project);
  assert.deepEqual(denials, [[409, null], [409, null]]);
  const actions = await openProjectActions(page);
  await expect(actions.getByRole("button", { name: "Export", exact: true })).toBeDisabled();
  await actions.getByRole("button", { name: "Close", exact: true }).click();
  const runButton = page.getByRole("button", { name: "Preview", exact: true });
  if (await runButton.isVisible()) await runButton.click();
  await expect(page.locator('iframe[title="Live source application"]')).toBeVisible({ timeout: 45_000 });
  await page.screenshot({ path: resolve(evidence, "editor-desktop.png") });
  const proofs = [];
  for (const engine of [chromium, firefox, webkit]) {
    const consumer = await engine.launch();
    try {
      const context = await consumer.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      const screen = await context.newPage();
      assert((await screen.goto(run, { waitUntil: "networkidle" }))?.ok());
      assert.equal(await screen.locator("iframe").count(), 0);
      const pricing = screen.locator('[data-source="designbookmark-plan-switch"]');
      const amounts = pricing.locator("[data-billing-amount]:visible");
      await expect(amounts).toHaveCount(3);
      await screen.getByRole("radio", { name: "Yearly", exact: true }).press("Space");
      await expect.poll(() => amounts.allTextContents()).toEqual(expect.arrayContaining([expect.stringMatching(/108/), expect.stringMatching(/264/)]));
      await screen.getByRole("radio", { name: "Monthly", exact: true }).press("Space");
      await expect.poll(() => amounts.allTextContents()).toEqual(expect.arrayContaining([expect.stringMatching(/12/), expect.stringMatching(/29/)]));
      assert(await screen.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const findings = (await new AxeBuilder({ page: screen }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations;
      assert.deepEqual(findings.filter(({ impact }) => ["critical", "serious"].includes(impact)).map(({ id }) => id), []);
      if (engine === chromium) for (const width of [390, 1440]) {
        await screen.setViewportSize({ width, height: 960 });
        await screen.screenshot({ path: resolve(evidence, "pricing-" + width + ".png"), fullPage: true });
      }
      proofs.push({ engine: engine.name(), showedActualPrices: true, separateDemoFrames: 0, findings: findings.map(({ id }) => id) });
    } finally { await consumer.close(); }
  }
  await writeFile(resolve(evidence, "browser.json"), JSON.stringify({ project: job.project, pins, proofs, denials }, null, 2), { mode: 0o600 });
  console.log("Verified two composed sources, live price changes, three browsers and local export denial.");
} finally { await browser.close(); }
