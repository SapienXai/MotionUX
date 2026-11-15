import assert from "node:assert/strict";
import { expect } from "@playwright/test";

const grid = ".mx-originals-grid";

export function expectGalleryCount(page, count) {
  return expect(page.locator(grid)).toHaveAttribute("data-results", String(count));
}

export async function collectGalleryOrder(page, count) {
  await expectGalleryCount(page, count);
  const order = await page.evaluate(async () => {
    const result = new Map();
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.scrollTo({ top: 0, behavior: "instant" });
    for (let turn = 0; turn < 1200; turn++) {
      await settle();
      for (const card of document.querySelectorAll("[data-original-card]")) {
        result.set(Number(card.getAttribute("aria-posinset")), card.dataset.originalCard);
      }
      const bottom = document.documentElement.scrollHeight - innerHeight;
      if (result.size === Number(document.querySelector(".mx-originals-grid").dataset.results)) break;
      if (window.scrollY >= bottom - 1) break;
      window.scrollBy({ top: Math.max(100, innerHeight * .65), behavior: "instant" });
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    await settle();
    return [...result].sort(([a], [b]) => a - b);
  });
  assert.equal(order.length, count, "The scroll window skipped catalog entries");
  assert.deepEqual(order.map(([position]) => position), Array.from({ length: count }, (_, index) => index + 1));
  return order.map(([, id]) => id);
}
