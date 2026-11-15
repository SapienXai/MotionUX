import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { chromium } from "playwright";
import { loadCatalog, vault } from "../studio/catalog.mjs";
import { visibleSource } from "../studio/rendering.mjs";
import { editionIDs } from "./sources.mjs";

const origin = "http://127.0.0.1:5199";
const evidence = resolve(vault, "evidence/v12");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const catalog = await loadCatalog();
const report = [];
await mkdir(evidence, { recursive: true });

const checks = {
  "kokonut-seat-map": async frame => {
    const seats = frame.getByRole("group", { name: "Seats" });
    const seat = seats.locator('button[aria-pressed="false"][aria-disabled="false"]').first();
    const label = await seat.getAttribute("aria-label");
    const selected = seats.getByRole("button", { name: label, exact: true });
    await selected.click();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
  },
  "kokonut-marking-menu": async frame => {
    const trigger = frame.getByRole("button", { name: "Menu", exact: true });
    await trigger.press("Enter");
    const menu = frame.getByRole("menu", { name: "Go to" });
    await expect(menu).toBeVisible();
    const current = await menu.getAttribute("aria-activedescendant");
    await menu.press("ArrowRight");
    await expect(menu).not.toHaveAttribute("aria-activedescendant", current ?? "");
    await menu.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
  "kokonut-receipt-printer": async frame => {
    // The upstream demo auto-prints once it comes into view.
    await frame.locator("#specimen > div").scrollIntoViewIfNeeded();
    await expect(frame.getByText("Pull down to tear", { exact: true })).toBeVisible();
    await frame.getByRole("button", { name: "Tear off receipt" }).press("Enter");
    await frame.getByRole("button", { name: "Print another" }).click();
    await expect(frame.getByText("Printing…", { exact: true })).toBeVisible();
    await expect(frame.getByText("Pull down to tear", { exact: true })).toBeVisible();
  },
  "kokonut-slot-picker": async frame => {
    const alternatives = frame.locator('button[aria-pressed="false"]').filter({ hasText: /^\d+ (min|hr)$/ });
    const label = await alternatives.first().innerText();
    const duration = frame.getByRole("button", { name: label, exact: true });
    await duration.click();
    await expect(duration).toHaveAttribute("aria-pressed", "true");
  },
  "kokonut-timezone-planner": async frame => {
    const time = frame.getByRole("slider", { name: "Meeting time" });
    const value = await time.getAttribute("aria-valuenow");
    await time.press("ArrowRight");
    await expect(time).not.toHaveAttribute("aria-valuenow", value);
  },
  "smoothui-emoji-reaction": async frame => {
    await frame.getByRole("button", { name: "Like, 24 reactions" }).click();
    await expect(frame.getByRole("button", { name: "Like, 23 reactions" })).toHaveAttribute("aria-pressed", "false");
  },
  "smoothui-pinned-list": async frame => {
    const pin = frame.getByRole("button", { name: /^Unpin / }).first();
    const label = (await pin.getAttribute("aria-label")).replace(/^Unpin /, "Pin ");
    await pin.click();
    await expect(frame.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "false");
  },
  "smoothui-animated-stepper": async frame => {
    const next = frame.getByRole("tab", { name: /^Step 2:/ });
    await next.click();
    await expect(next).toHaveAttribute("aria-selected", "true");
    await expect(frame.getByRole("heading", { name: "Profile Information" })).toBeVisible();
  },
  "magicui-animated-circular-progress-bar": async frame => {
    const progress = frame.locator("[data-current-value]");
    const value = await progress.getAttribute("data-current-value");
    await expect(progress).not.toHaveAttribute("data-current-value", value);
  },
  "magicui-code-comparison": async frame => {
    const code = frame.locator("pre.shiki");
    await expect(code).toHaveCount(2);
    await expect(code.first()).toContainText("middleware");
    await expect(code.last()).toContainText("createMiddleware");
  },
  "magicui-interactive-grid-pattern": async frame => {
    const grid = frame.locator("#specimen > div");
    const index = await grid.evaluate(node => {
      const box = node.getBoundingClientRect();
      const rect = document.elementFromPoint(box.x + box.width / 2, box.y + Math.min(box.height / 2, 150));
      return [...node.querySelectorAll("svg rect")].indexOf(rect);
    });
    assert(index >= 0, "No grid cell at the visible test point");
    const cell = grid.locator("svg rect").nth(index);
    await cell.hover();
    await expect(cell).toHaveClass(/fill-gray-300/);
  },
  "magicui-confetti": async (frame, page) => {
    const canvas = frame.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    await canvas.hover(); // Clear and re-enter the original hover area for a reliable capture.
    const area = await canvas.boundingBox();
    await page.mouse.move(0, 0);
    const snapshot = () => page.screenshot({ clip: { x: area.x + 30, y: area.y + 30, width: 120, height: 120 } });
    await expect.poll(async () => {
      const before = await snapshot();
      await canvas.hover({ position: { x: 95, y: 95 } });
      const after = await snapshot();
      await page.mouse.move(0, 0);
      return !after.equals(before);
    }).toBe(true);
  },
};

async function verifyRegistry(page, item) {
  const details = await page.request.get(origin + "/v9/catalog.json?id=" + item.id).then(response => response.json());
  const upstream = item.sourceURL.split("/blob/" + item.upstreamCommit + "/")[1];
  const pinned = path => execFileSync("git", ["show", item.upstreamCommit + ":" + path], {
    cwd: resolve(vault, "upstream", item.group.slice(4)),
  });
  assert.equal(digest(pinned(upstream)), item.upstreamHash);
  const line = await page.getByRole("link", { name: "Download registry item" }).getAttribute("href");
  assert.equal(line, details.installURL);
  const response = await page.request.get(origin + line);
  assert(response.ok());
  const recipe = await response.json();
  assert.equal(recipe.name, item.id);
  assert.deepEqual(recipe.dependencies.sort(), Object.entries(item.dependencies).map(([key, value]) => key + "@" + value).sort());
  const files = new Map(recipe.files.map(file => [file.target, file.content]));
  assert.equal(files.size, item.codeFiles.length);
  for (const file of item.codeFiles) {
    const request = new URL(origin + "/v9/source");
    request.search = new URLSearchParams({ id: item.id, file: file.path });
    const upstreamResponse = await page.request.get(request.href);
    assert.equal(digest(await upstreamResponse.body()), file.sha256, file.path);
    request.searchParams.set("lane", "installed");
    const installedResponse = await page.request.get(request.href);
    assert.equal(digest(await installedResponse.body()), file.installedSHA256, file.path);
    assert.equal(digest(files.get(file.path)), file.installedSHA256, file.path);
    const installedPath = resolve(vault, "runtime", item.group, "installed", file.path);
    assert.equal(digest(await readFile(installedPath)), file.installedSHA256, file.path);
  }
  assert.equal(files.get(item.licenseNoticePath), pinned(item.group === "v12-magicui" ? "LICENSE.md" : "LICENSE").toString());
}

const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark" });
for (const page of [desktop, mobile]) page.setDefaultTimeout(8000);
const lane = name => '[data-preview-lane="' + name + '"]';
const search = page => page.getByRole("searchbox");
let pageErrors = [];
for (const page of [desktop, mobile]) {
  page.on("pageerror", error => pageErrors.push(error.message));
}
try {
  assert.deepEqual([...editionIDs].sort(), Object.keys(checks).sort());
  for (const id of editionIDs) {
    const row = { id, surfaces: [] };
    report.push(row);
    const item = catalog.get(id);
    assert.equal(item?.availability, "ready", id);
    pageErrors = [];
    try {
      await desktop.goto(origin);
      const card = desktop.locator('[data-original-card="' + id + '"]');
      await search(desktop).fill(id.replaceAll("-", " "));
      const gallery = card.locator(lane("studio"));
      await visibleSource(gallery, item);
      await checks[id](gallery.frameLocator("iframe"), desktop);
      row.surfaces.push("gallery interaction");
      await card.getByRole("link", { name: /^Open playground/ }).click();
      await expect(desktop.getByRole("heading", { name: item.title, exact: true, level: 1 })).toBeVisible();
      await expect(desktop.getByRole("link", { name: "Official demo" })).toHaveAttribute("href", item.demoURL);
      await expect(desktop.getByRole("link", { name: "Original code" })).toHaveAttribute("href", item.sourceURL);
      await desktop.getByRole("button", { name: "Compare", exact: true }).click();
      await expect(desktop.locator("[data-preview-lane]")).toHaveCount(3);
      for (const name of ["original", "studio", "installed"]) {
        const preview = desktop.locator(lane(name));
        await visibleSource(preview, item, name === "installed");
        await checks[id](preview.frameLocator("iframe"), desktop);
        row.surfaces.push(name + " comparison interaction");
      }
      await desktop.getByRole("button", { name: "Code", exact: true }).click();
      await expect(desktop.getByRole("region", { name: "Upstream code" })).not.toBeEmpty();
      await desktop.getByRole("button", { name: "Usage", exact: true }).click();
      await expect(desktop.getByRole("region", { name: "React usage" })).toContainText(item.slug);
      await desktop.getByRole("button", { name: "Install", exact: true }).click();
      await verifyRegistry(desktop, item);
      row.surfaces.push("registry install, pinned source and license bytes");

      await mobile.goto(origin);
      await search(mobile).fill(id.replaceAll("-", " "));
      const mobileCard = mobile.locator('[data-original-card="' + id + '"]');
      const mobileFrame = mobileCard.locator(lane("studio"));
      const mobilePreview = await visibleSource(mobileFrame, item);
      await expect(mobileFrame.frameLocator("iframe").locator("html")).toHaveClass(/dark/);
      assert.equal(mobilePreview.overflow.horizontal, 0, "Mobile provider preview overflows horizontally");
      assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await mobileCard.getByRole("link", { name: /^Open playground/ }).click();
      await visibleSource(mobile.locator(lane("studio")), item);
      row.surfaces.push("390px dark gallery and Playground");
      if (id === "kokonut-receipt-printer" || id === "smoothui-emoji-reaction" || id === "magicui-code-comparison") {
        await mobile.screenshot({ path: resolve(evidence, id + "-mobile.png") });
        await desktop.screenshot({ path: resolve(evidence, id + "-desktop.png") });
      }
      assert.deepEqual(pageErrors, []);
      console.log("✓ " + item.title);
    } catch (error) {
      row.error = error.message;
      console.error(id + ": " + row.error);
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(evidence, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(`${report.filter(row => !row.error).length}/${editionIDs.length} additions verified.`);
if (report.some(row => row.error)) process.exitCode = 1;
