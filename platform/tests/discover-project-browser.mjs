import assert from "node:assert/strict";
import { chromium, expect, webkit } from "@playwright/test";

const origin = "http://127.0.0.1:5200";
const [codeId, blockId, evidence] = process.argv.slice(2);
const projectId = /^[a-f0-9]{32}$/;
assert(projectId.test(codeId) && projectId.test(blockId),
  "Pass the IDs of a saved CodeProject and a block project in the local Studio.");

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const width = engine === webkit ? 320 : 1440;
    const page = await browser.newPage({
      locale: "en-US", viewport: { width, height: 900 }, hasTouch: width === 320,
      reducedMotion: "reduce", colorScheme: width === 320 ? "dark" : "light",
    });
    await page.goto(origin + "/discover");
    const { projects, catalog } = await page.evaluate(async () => {
      async function read(path) {
        const response = await fetch("/api/build" + path, { headers: { "X-MotionUX-Build": "1" } });
        if (!response.ok) throw new Error("The local Studio could not load project compatibility.");
        return response.json();
      }
      const [projects, catalog] = await Promise.all([read(""), read("/source-jobs/components")]);
      return { projects, catalog };
    });
    const project = projects.find(({ id }) => id === codeId);
    const block = projects.find(({ id }) => id === blockId);
    assert(project?.codeSources.length < 6 && block && !block.codeSources);
    const portable = catalog.find(({ id, mode }) => mode === "direct" && !project.codeSources.includes(id));
    const local = catalog.find(({ mode }) => mode === "connected");
    assert(portable && local);
    const gallery = page.frameLocator("iframe.studio-discover");
    const search = page.getByRole("searchbox", { name: "Search components", exact: true });
    async function choose(component) {
      if (await search.isHidden()) await page.getByRole("button", { name: "Search components", exact: true }).click();
      await search.fill(component.id);
      await search.press("Enter");
      await gallery.locator(`[data-original-card="${component.id}"]`)
        .getByRole("button", { name: /^Use in Build:/ }).click();
    }
    const action = gallery.getByRole("button", { name: "Use in project", exact: true });
    const dialog = page.getByRole("dialog", { name: "Use in project" });
    const target = dialog.getByRole("button", { name: "Open " + project.name, exact: true });
    await choose(local);
    await action.click();
    await expect(dialog.getByText("This selection includes a local-only source or design reference.").first()).toBeVisible();
    await expect(target).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(action).toBeFocused();
    await gallery.getByRole("button", { name: local.title + ", remove from Build selection", exact: true }).click();

    await choose(portable);
    await gallery.getByRole("link", { name: "Open playground for " + portable.title, exact: true }).click();
    const detail = gallery.getByRole("dialog", { name: portable.title + " component preview" });
    const detailAction = detail.getByRole("button", { name: "Use in project", exact: true });
    await detailAction.click();
    await expect(dialog.getByText("This project cannot add original sources.").first()).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Open " + block.name, exact: true })).toHaveCount(0);
    await expect(target).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(detailAction).toBeFocused();
    await detailAction.click();
    assert(await dialog.evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth));
    if (evidence) await page.screenshot({ path: evidence + "/discover-use-in-project-" + width + ".png" });
    await target.click();
    await page.waitForURL((url) => url.pathname === "/build" && url.searchParams.get("project") === codeId);
    const attached = page.getByRole("list", { name: "Components attached to revision" });
    await expect(attached.getByRole("button", { name: "Remove " + portable.title, exact: true })).toBeVisible();
    await expect(page.locator(".unified-document-status")).toHaveText("All changes saved");
    await page.goBack();
    await expect(detailAction).toBeVisible();
    await expect(detail.getByRole("complementary", { name: "Build selection" }).getByText(portable.title, { exact: true })).toBeVisible();

    await page.goto(origin + "/build?project=" + codeId + "&attach=" + local.id);
    await expect(page.locator(".kinetic-editor-notice[role=alert]")).toContainText("These components could not be attached.");
    await expect(attached).toHaveCount(0);
    console.log(engine.name(), width, "existing project handoff, saved state, focus, history and rights passed.");
  } finally { await browser.close(); }
}
