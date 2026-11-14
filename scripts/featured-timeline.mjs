import { expect } from "@playwright/test";

const interactions = {
  "designbookmark-tab-pill": {
    target: ".mx-selector-indicator",
    sample: "x",
    actions: [
      [0, ".mx-feature [role=tab]:has-text('Analytics')"],
      [96, ".mx-feature [role=tab]:has-text('Members')"],
      [340, ".mx-feature [role=tab]:has-text('Overview')"],
    ],
    active: '[aria-selected="true"]|Members',
    final: '[aria-selected="true"]|Overview',
  },
  "designbookmark-loading-to-success": {
    target: ".mx-feature-result",
    sample: "opacity",
    actions: [[0, ".mx-feature-process"], [1024, ".mx-feature-process"]],
    active: '.mx-feature-loading[data-outcome="success"]',
    final: '.mx-feature-loading[data-outcome="success"]',
    pending: '.mx-feature-loading[data-outcome="pending"]',
  },
  "designbookmark-expand-card": {
    target: '[data-mx-disclosure-card]:first-child .mx-disclosure-card-detail',
    sample: "height",
    actions: [[0, '.mx-feature button:has-text("Expand room")'], [96, '.mx-feature button:has-text("Collapse room")'], [340, '.mx-feature button:has-text("Expand room")']],
    active: '[data-mx-disclosure-card]:first-child button[aria-expanded=false]',
    final: '[data-mx-disclosure-card]:first-child button[aria-expanded=true]',
  },
  "kokonut-morph-popover": {
    target: ".mx-menu-items",
    sample: "opacity",
    actions: [[0, '.mx-feature [role="menuitem"]:has-text("Share")'], [96, ".mx-menu-trigger"], [340, '.mx-feature [role="menuitem"]:has-text("Create")']],
    active: '[role="status"]|Share selected',
    final: '[role="status"]|Create selected',
  },
  "designbookmark-profile-card": {
    target: ".mx-disclosure-card-detail",
    sample: "height",
    actions: [[0, ".mx-disclosure-card-toggle"], [96, ".mx-disclosure-card-toggle"], [340, ".mx-disclosure-card-toggle"]],
    active: 'button[aria-expanded=false]',
    final: 'button[aria-expanded=true]',
  },
  "designbookmark-swipe-deck": {
    target: "[data-deck-card]",
    sample: "x",
    actions: [[0, "drag-start"], [96, "drag-move"], [160, "drag-end"], [340, '.mx-deck-controls button:has(svg):first-child']],
    active: '[data-active-card="1"]',
    final: '[data-active-card="0"]',
  },
};

const fallback = 0;

export async function featuredTimeline(pages, id) {
  const { actions, active, final, pending, sample, target } = interactions[id];
  const times = [...new Set([0, 16, 32, 64, 96, 128, 160, 192, 224, 288, 340, 372, 420, 500, 640, ...(pending ? [719, 752, 960, 1024, 1088, 1743, 1776, 2000] : [850])])];
  const frames = await Promise.all(pages.map(async ([page, root]) => {
    let elapsed = 0;
    const frames = [];
    const position = id === "designbookmark-swipe-deck" ? await root.locator(target).boundingBox() : null;
    const origin = new Date("2025-01-01T00:00:00.000Z");
    // The clock is installed before navigation so Motion and simulation timers share it.
    await page.clock.pauseAt(new Date(+origin + 60_000));
    for (const timestamp of times) {
      if (timestamp > elapsed) await page.clock.runFor(timestamp - elapsed);
      elapsed = timestamp;
      for (const [, selector] of actions.filter(([time]) => time === timestamp)) {
        if (selector === "drag-start") {
          await page.mouse.move(position.x + position.width * .68, position.y + position.height * .45);
          await page.mouse.down();
        } else if (selector === "drag-move") {
          await page.mouse.move(position.x + position.width * .13, position.y + position.height * .45, { steps: 4 });
        } else if (selector === "drag-end") {
          await page.mouse.up();
        } else {
          const control = await root.locator(selector.replace(/^\.mx-feature /, "")).elementHandle({ timeout: 2500 });
          if (await control.evaluate(node => node.matches(":disabled,[aria-disabled=true]"))) throw new Error(`Cannot trigger ${selector} in ${id} at ${timestamp}ms`);
          await control.focus();
          await page.keyboard.press("Enter");
        }
      }
      const frame = await root.evaluate((node, { target, sample, active, final, pending, fallback }) => {
        const moving = node.querySelector(target);
        const bounds = node.getBoundingClientRect();
        const geometry = moving?.getBoundingClientRect();
        const value = !moving ? fallback : sample === "opacity" ? Number(getComputedStyle(moving).opacity) :
          sample === "height" ? geometry.height : geometry.x - bounds.x;
        function matches(state) {
          const [selector, text] = state.split("|");
          return Array.from(node.querySelectorAll(selector)).some(element => !text || element.textContent.includes(text));
        }
        return { value, active: matches(active), final: matches(final),
          pending: Boolean(pending && node.querySelector(pending)) };
      }, { target, sample, active, final, pending, fallback });
      frames.push({ ms: timestamp, ...frame });
    }
    return frames;
  }));
  const [studio, consumer] = frames;
  const tolerance = sample === "opacity" ? .17 : 18;
  for (const flow of frames) {
    const values = flow.map(frame => frame.value);
    if (Math.max(...values) - Math.min(...values) < (sample === "opacity" ? .13 : 6) ||
      !flow.some(frame => frame.active) || !flow.at(-1).final) throw new Error(`${id} did not animate, activate and settle: ${JSON.stringify(flow)}`);
    if (pending && ([64, 719, 1088, 1743].some(time => !flow.find(frame => frame.ms === time)?.pending) ||
      !flow.find(frame => frame.ms === 960)?.active)) throw new Error(`${id} did not honor its pending and rerun timers`);
  }
  const deltas = studio.map((frame, i) => Math.abs(frame.value - consumer[i].value));
  const compared = studio.filter((frame, i) => deltas[i] <= tolerance).length;
  if (compared < Math.ceil(studio.length * .8)) throw new Error(`${id}: ${compared}/${studio.length} timeline samples matched\n${JSON.stringify(frames)}`);
  return { id, property: sample, tolerance, matchedSamples: compared, studio, consumer };
}

export async function prepareTimelinePage(page) {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00.000Z") });
  await expect(page.locator("html")).toBeAttached();
}
