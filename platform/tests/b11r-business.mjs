import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { chromium, expect } from "@playwright/test";
import { serve, journeys } from "./b11r-consumer.mjs";

const repo = resolve(import.meta.dirname, "../..");
const evidence = resolve(repo, ".motionux-v9/evidence/build-b11r");
const run = promisify(execFile);
const labels = process.argv.slice(2);
const reports = [];
for (const label of labels.length ? labels : ["A", "B", "C", "E1", "E2"]) {
  const work = await mkdtemp(resolve(repo, ".motionux-v9/build-tests/b11r-business-"));
  let server, browser;
  try {
    const project = JSON.parse(await readFile(resolve(evidence, label + "-project.json"), "utf8"));
    await run("unzip", ["-q", resolve(evidence, label + "-next.zip"), "-d", work]);
    for (const args of [["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-remote=all"], ["run", "build"]])
      await run("npm", args, { cwd: work, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, timeout: 150_000, maxBuffer: 1_000_000 });
    server = await serve(work);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
    await page.goto(server.origin, { waitUntil: "networkidle" });
    const body = page.locator("body");
    const checks = [];
    if (label === "A") {
      await expect.poll(() => page.locator(".venue-deck").evaluate((node) => getComputedStyle(node).getPropertyValue("--deck-accent").trim())).toBe("#d9c898");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await expect.poll(() => page.locator(".work-area").evaluate((node) => getComputedStyle(node).columnGap)).toBe("30px");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Kıyı Listening House");
      checks.push("saved source accent, generated spacing and edited content match Studio");
    } else if (label === "B") {
      const flow = project.document.codeProject.journeys.find(({ title }) => title.includes("taslağını kaydet"));
      assert(flow);
      await journeys(page, server.origin, { journeys: [flow] });
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByLabel("Giriş tarihi", { exact: true })).toHaveValue("2099-06-12");
      await expect(page.getByLabel("Çıkış tarihi", { exact: true })).toHaveValue("2099-06-15");
      await expect(body).toContainText("Seçim: 4 misafir", { useInnerText: true });
      checks.push("room, dates and source guest selection survive reload");
    } else if (label === "C") {
      const flow = project.document.codeProject.journeys.find(({ title }) => title === "Panodan görev ekle");
      assert(flow);
      await journeys(page, server.origin, { journeys: [flow] });
      await page.reload({ waitUntil: "networkidle" });
      await expect(body).toContainText("Sunum akışını doğrula", { useInnerText: true });
      await expect(body).toContainText("2 / 10", { useInnerText: true });
      await page.goto(server.origin + "/liste", { waitUntil: "networkidle" });
      await page.getByRole("combobox", { name: "Durum: Lansman metnini sonlandır", exact: true }).selectOption("done");
      await expect(body).toContainText("3 / 10", { useInnerText: true });
      await page.reload({ waitUntil: "networkidle" });
      await expect(body).toContainText("3 / 10", { useInnerText: true });
      await expect(page.getByRole("combobox", { name: "Durum: Lansman metnini sonlandır", exact: true })).toHaveValue("done");
      checks.push("created task, shared totals and changed status survive reload and board/list navigation");
    } else if (label === "E1") {
      await page.getByRole("button", { name: "Edit time for Andromeda Galaxy", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("End time", { exact: true }).fill("23:30");
      await dialog.getByRole("button", { name: "Save time", exact: true }).click();
      await expect(dialog).toContainText("RC-01 is booked for Silver Sliver Galaxy", { useInnerText: true });
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Edit time for Andromeda Galaxy", exact: true }).click();
      await expect(dialog.getByLabel("End time", { exact: true })).toHaveValue("21:55");
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      const flow = project.document.codeProject.journeys.find(({ title }) => title === "Add an observation target");
      assert(flow);
      await journeys(page, server.origin, { journeys: [flow] });
      await page.reload({ waitUntil: "networkidle" });
      await expect(body).toContainText("North America Nebula", { useInnerText: true });
      checks.push("actual overlapping save is rejected and original time remains after reload", "new observation target survives reload");
    } else if (label === "E2") {
      const flow = project.document.codeProject.journeys.find(({ title }) => title === "Save a visit note and compare two works");
      assert(flow);
      await journeys(page, server.origin, { journeys: [flow] });
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByRole("textbox", { name: "Your visit note", exact: true })).toHaveValue("Ask how the Tide Bowl was fired.");
      await expect(body).toContainText("32 / 800 characters", { useInnerText: true });
      checks.push("visit note remains editable after comparison, navigation and reload");
    } else throw new Error("Unknown business acceptance case.");
    await page.screenshot({ path: resolve(evidence, label + "-business.png"), fullPage: true });
    reports.push({ label, project: project.id, revision: project.revision,
      motion: "Initial viewport and direct probes use no-preference. Shared non-pointer journeys use reduce.", checks, passed: true });
    await writeFile(resolve(evidence, "business.json"), JSON.stringify(reports, null, 2), { mode: 0o600 });
    console.log(label, checks);
  } finally {
    await browser?.close();
    await server?.stop();
    await rm(work, { recursive: true, force: true });
  }
}
