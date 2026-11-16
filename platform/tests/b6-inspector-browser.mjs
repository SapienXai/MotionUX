import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { resolve } from "node:path";

export function assertInspection(report, route) {
  assert.equal(report.route, route);
  assert.deepEqual(
    report.viewports.map(({ width }) => width),
    [390, 768, 1440],
  );
  assert(report.durationMs > 0 && report.durationMs < 42_000);
  for (const view of report.viewports) {
    assert.deepEqual(
      view.findings.filter(
        (finding) =>
          finding.category !== "accessibility" ||
          ["serious", "critical"].includes(finding.impact),
      ),
      [],
      JSON.stringify({ route, ...view }),
    );
  }
}

export async function inspectInStudio(page, spec, evidence) {
  const trigger = page
    .getByRole("button", { name: "Inspector", exact: true })
    .filter({ visible: true });
  const dialog = page.getByRole("dialog", { name: "Inspector" });
  await trigger.click();
  try {
    const route = dialog.getByLabel("Page to inspect");
    await expect(route).toBeFocused();
    await route.selectOption(spec.secondPath);
    const requested = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/inspect"),
      { timeout: 50_000 },
    );
    await dialog
      .getByRole("button", { name: "Inspect page", exact: true })
      .click();
    const response = await requested;
    const report = await response.json();
    assert.equal(response.status(), 200, JSON.stringify(report));
    assertInspection(report, spec.secondPath);
    await expect(dialog.getByText(/390 × 844/)).toBeVisible();
    await expect(dialog.getByText(/1440 × 900/)).toBeVisible();
    assert.deepEqual(response.request().postDataJSON(), {
      route: spec.secondPath,
      revision: report.revision,
    });

    const rejection = await page.evaluate(
      async ({ url, revision }) => {
        const send = async (body, trusted = true) =>
          (
            await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(trusted ? { "X-MotionUX-Build": "1" } : {}),
              },
              body: JSON.stringify(body),
            })
          ).status;
        return [
          await send({ route: "/unknown", revision }),
          await send({ route: "http://127.0.0.1:5199/", revision }),
          await send({ route: "/", revision: revision - 1 }),
          await send({ route: "/", revision }, false),
        ];
      },
      { url: response.url(), revision: report.revision },
    );
    assert.deepEqual(rejection, [422, 422, 409, 403]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    await page.screenshot({
      path: resolve(evidence, spec.template + "-inspector.png"),
    });
    assert(
      bounds.x >= 0 && bounds.x + bounds.width <= 390,
      JSON.stringify(bounds),
    );
    const axe = await new AxeBuilder({ page })
      .include(".build-runtime-inspector")
      .analyze();
    assert.deepEqual(
      axe.violations.map(({ id, nodes }) => [
        id,
        nodes.map((node) => node.target),
      ]),
      [],
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await route.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    console.log(
      spec.template,
      "Build Inspector audited",
      report.route,
      "in",
      report.durationMs,
      "ms",
    );
    return report;
  } finally {
    await page.setViewportSize({ width: 1440, height: 900 });
    if (await dialog.isVisible()) await page.keyboard.press("Escape");
  }
}
