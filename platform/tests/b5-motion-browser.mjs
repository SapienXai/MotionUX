import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export function recordPageTransition() {
  document.addEventListener("animationstart", (event) => {
    if (event.target.matches?.(".hotel-grid")) {
      event.target.dataset.testPageTransition = event.animationName;
    }
  });
}

export async function assertPageTransition(scope, profile) {
  await expect(scope.locator(".hotel-grid")).toHaveAttribute(
    "data-test-page-transition",
    profile.pageTransition === "slide" ? "hotel-page-slide" : "hotel-fade",
  );
}

export function profileFor(template) {
  const shared = { version: 1, mode: "system" };
  return template === "crm-dashboard"
    ? {
        ...shared,
        feedbackMs: 90,
        transitionMs: 310,
        easing: "ease-out",
        pageTransition: "slide",
        reducedMotion: "fade",
      }
    : {
        ...shared,
        feedbackMs: 180,
        transitionMs: 270,
        easing: "ease-in-out",
        pageTransition: "fade",
        reducedMotion: "off",
      };
}

export async function assertMotion(
  scope,
  profile,
  { reduced = false, still = false } = {},
) {
  const duration =
    reduced && profile.reducedMotion === "fade" ? 80 : profile.transitionMs;
  const animated = !still && (!reduced || profile.reducedMotion === "fade");
  const expectedPage =
    animated && profile.pageTransition !== "none"
      ? reduced || profile.pageTransition === "fade"
        ? "hotel-fade"
        : "hotel-page-slide"
      : "none";
  const expectedDialog = animated
    ? reduced
      ? "hotel-fade"
      : "hotel-enter"
    : "none";

  const app = scope.locator(".hotel");
  const grid = app.locator(".hotel-grid");
  await expect(grid).toHaveCSS("animation-name", expectedPage);
  if (expectedPage !== "none") {
    await expect(grid).toHaveCSS("animation-duration", duration / 1000 + "s");
    await expect(grid).toHaveCSS("animation-timing-function", profile.easing);
  }
  const search = app.getByRole("button", { name: /^Find a page/ });
  const timing = await search.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      durations: style.transitionDuration.split(", ").map(parseFloat),
      scale: style.getPropertyValue("--mx-motion-scale").trim(),
    };
  });
  assert.deepEqual(timing.durations, [
    reduced || still ? 0 : profile.feedbackMs / 1000,
  ]);
  assert.equal(Number(timing.scale), reduced || still ? 1 : 0.98);

  const panel = app.locator(".hotel-dialog.search");
  await panel.evaluate((element) => {
    delete element.dataset.testAnimation;
    element.addEventListener(
      "animationstart",
      (event) => {
        element.dataset.testAnimation = event.animationName;
      },
      { once: true },
    );
  });
  await search.click();
  const dialog = app.getByRole("dialog", { name: "Go to a page" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("animation-name", expectedDialog);
  if (animated) {
    await expect(dialog).toHaveAttribute("data-test-animation", expectedDialog);
    await expect(dialog).toHaveCSS("animation-duration", duration / 1000 + "s");
    await expect(dialog).toHaveCSS("animation-timing-function", profile.easing);
  } else {
    assert.equal(
      await dialog.evaluate((element) => element.getAnimations().length),
      0,
    );
  }
  await dialog.getByRole("searchbox").press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(search).toBeFocused();
}

export async function configureMotion(page, spec, local, validateRun) {
  const profile = profileFor(spec.template);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const panel = page.getByRole("region", { name: "Motion DNA" });
  await panel
    .getByRole("slider", { name: "Feedback duration" })
    .fill(String(profile.feedbackMs));
  await panel
    .getByRole("slider", { name: "Transition duration" })
    .fill(String(profile.transitionMs));
  await panel
    .getByRole("combobox", { name: /^Easing/ })
    .selectOption(profile.easing);
  await panel
    .getByLabel("Page transition")
    .selectOption(profile.pageTransition);
  await panel
    .getByLabel("With reduced motion")
    .selectOption(profile.reducedMotion);
  await assertMotion(page, profile);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertMotion(page, profile, { reduced: true });
  const mode = panel.getByLabel("Project motion");
  await mode.selectOption("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await assertMotion(page, profile, { still: true });
  await mode.selectOption("system");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      /\/api\/build\/[a-f0-9]{32}$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const response = await saved;
  assert.equal(response.status(), 200, await response.text());
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    panel.getByRole("slider", { name: "Transition duration" }),
  ).toHaveValue(String(profile.transitionMs));
  await expect(panel.getByLabel("Page transition")).toHaveValue(
    profile.pageTransition,
  );
  await assertMotion(page, profile);

  const visitSecondPage = async (scope) => {
    await scope
      .locator(".hotel-links")
      .getByRole("link", {
        name: spec.second,
        exact: true,
      })
      .click();
    await expect(
      scope.getByRole("heading", { name: spec.second, exact: true }),
    ).toBeVisible();
    await assertPageTransition(scope, profile);
  };

  if (local) {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const frame = page.frameLocator('iframe[title="Live Next.js application"]');
    await expect(
      frame.getByRole("heading", { name: spec.hero, exact: true }),
    ).toBeVisible({ timeout: 120_000 });
    try {
      await assertMotion(frame, profile);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await assertMotion(frame, profile, { reduced: true });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await visitSecondPage(frame);
      await validateRun?.();
    } finally {
      await page.getByRole("button", { name: "Stop", exact: true }).click();
      await page.getByRole("button", { name: "Edit", exact: true }).click();
    }
  }
  await visitSecondPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  console.log(
    spec.template,
    "Motion DNA settings, persistence and Studio" +
      (local ? "/Run" : "") +
      " parity passed",
  );
  return profile;
}
