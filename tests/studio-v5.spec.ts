import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const first = ["Sliding Tab Pill", "Loading to Success", "Expandable Card", "Morph Dropdown", "Profile Card", "Swipe Deck"];
function card(page: Page, name: string) {
  return page.locator(".mx-gallery-card").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

test("gallery uses reference order, preview-first cards and lazy mounts", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Motion", exact: true })).toBeVisible();
  const cards = page.locator(".mx-gallery-card");
  await expect(cards).toHaveCount(82);
  expect(await cards.locator("h2").allTextContents().then(titles => titles.slice(0, 3))).toEqual(["Plan switch", "Letter limit", "Pull cord"]);
  await expect(cards.first().locator(".mx-demo")).toBeVisible();
  expect(await page.locator('[data-preview-mounted="true"]').count()).toBeLessThan(12);
  const boxes = await cards.evaluateAll(els => els.slice(0, 6).map(el => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width };
  }));
  expect(boxes[0].x).toBeCloseTo(312, 0);
  expect(boxes[0].y).toBe(boxes[2].y);
  expect(boxes[0].width).toBeGreaterThan(350);
  expect(boxes[3].x).toBe(boxes[0].x);
  expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
  await expect(page.locator(".mx-sidebar")).toHaveCSS("width", "220px");
  await cards.last().scrollIntoViewIfNeeded();
  await expect(cards.last().locator(".mx-demo")).toBeVisible();
  await expect(cards.first().locator(".mx-demo")).toHaveCount(0);
});

test("search, category counts, URL restoration and empty state work together", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search components" });
  await expect(search).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(search).toBeFocused();
  await search.fill("impossible specimen");
  await expect(page.getByRole("heading", { name: "No components found" })).toBeVisible();
  await search.press("Escape");
  const nav = page.getByRole("navigation", { name: "Categories" });
  await nav.getByRole("link", { name: /^Navigation/ }).click();
  const count = Number(await nav.getByRole("link", { name: /^Navigation/ }).locator(".mx-count").textContent());
  await expect(page.locator(".mx-gallery-card")).toHaveCount(count);
  await page.reload();
  await expect(page.locator(".mx-gallery-card")).toHaveCount(count);
  await search.fill("pagination");
  const link = page.getByRole("link", { name: /Open playground for Pagination dots/ });
  await link.click();
  await expect(page.getByRole("heading", { name: "Pagination dots" })).toBeFocused();
  await page.goBack();
  await expect(search).toHaveValue("pagination");
  await expect(link).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Pagination dots" })).toBeVisible();
});

test("the six featured specimens are live and do not navigate", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/");
  await card(page, first[0]).scrollIntoViewIfNeeded();
  const tabs = card(page, first[0]).getByRole("tablist");
  await tabs.getByRole("tab", { name: "Overview" }).press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Analytics" })).toBeFocused();
  await tabs.getByRole("tab", { name: "Analytics" }).press("End");
  await expect(tabs.getByRole("tab", { name: "Members" })).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("tab", { name: "Members" }).press("Home");
  await expect(tabs.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  const loading = card(page, first[1]);
  await loading.scrollIntoViewIfNeeded();
  await loading.getByRole("button", { name: /start simulation/ }).click();
  await expect(loading.getByRole("status")).toHaveText("Completed");
  await loading.getByRole("button", { name: /Reset Loading/ }).focus();
  await loading.getByRole("button", { name: /Reset Loading/ }).press("Enter");
  await expect(loading.getByRole("button", { name: /start simulation/ })).toBeVisible();
  const room = card(page, first[2]);
  await room.scrollIntoViewIfNeeded();
  await room.getByRole("button", { name: /Expand room/ }).click();
  await expect(room.getByRole("button", { name: /Collapse room/ })).toHaveAttribute("aria-expanded", "true");
  await room.getByRole("button", { name: /Collapse room/ }).press("Escape");
  await expect(room.getByRole("button", { name: /Expand room/ })).toBeFocused();
  const menu = card(page, first[3]);
  await menu.scrollIntoViewIfNeeded();
  await menu.getByRole("button", { name: "New action" }).press("ArrowDown");
  await menu.getByRole("menuitem", { name: "Share" }).click();
  await expect(menu.getByRole("status")).toHaveText("Share selected");
  await menu.getByRole("button", { name: "New action" }).press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Create" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu.getByRole("button", { name: "New action" })).toBeFocused();
  const profile = card(page, first[4]);
  await profile.scrollIntoViewIfNeeded();
  await profile.getByRole("button", { name: /Emma Carter/ }).click();
  await expect(profile.getByText(/welcoming, usable products/)).toBeVisible();
  const deck = card(page, first[5]);
  await deck.scrollIntoViewIfNeeded();
  const face = deck.locator("[data-deck-card]");
  await face.scrollIntoViewIfNeeded();
  const bounds = (await face.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .66, bounds.y + bounds.height * .45);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 5, bounds.y + bounds.height * .45, { steps: 7 });
  await page.mouse.up();
  await expect(deck.getByRole("heading", { name: "Aegean Sea" })).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("mobile drawer handles focus, backdrop, and real navigation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open menu" });
  await opener.click();
  const drawer = page.getByRole("dialog", { name: "Studio navigation" });
  await expect(drawer.getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await page.mouse.click(370, 180);
  await expect(drawer).toHaveCount(0);
  await opener.click();
  await drawer.getByRole("link", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Get started with MotionUX" })).toBeVisible();
  await opener.click();
  await drawer.getByRole("link", { name: "Examples" }).click();
  await expect(page.getByRole("link", { name: /Open the v1 demos/ })).toHaveAttribute("href", "?legacy=1");
  await page.goto("/?item=designbookmark-tab-pill#specimen");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toBeVisible();
  await title.evaluate(heading => heading.scrollIntoView());
  const [heading, header] = await Promise.all([title.boundingBox(), page.locator(".mx-top").boundingBox()]);
  expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
});

test("responsive Gallery fits supported widths and preserves dark preference", async ({ page }) => {
  for (const width of [1536, 1440, 1280, 1024, 768, 430, 390, 375, 360, 320]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    await expect(page.locator(".mx-demo").first()).toBeVisible();
    const dimension = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(dimension.document, `overflow at ${width}`).toBeLessThanOrEqual(dimension.viewport);
    const overlap = await page.locator(".mx-gallery-card").first().evaluate(el => {
      const stage = el.querySelector(".mx-gallery-stage")!.getBoundingClientRect();
      const copy = el.querySelector(".mx-card-copy")!.getBoundingClientRect();
      return stage.bottom - copy.top;
    });
    // Engines round the shared grid edge independently in each DOMRect.
    expect(overlap, `preview precedes caption at ${width}`).toBeLessThanOrEqual(0.01);
  }
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.reload();
  await expect(page.locator(".mx-studio")).toHaveAttribute("data-scheme", "dark");
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([]);
});

test("Playground copies actual TSX and CSS source", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: {
    writeText: async (value: string) => { document.documentElement.dataset.copied = value; },
  } }));
  await page.goto("/?item=designbookmark-tab-pill");
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page.getByRole("button", { name: "Copy source code" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied", /export function TabPill/);
  await page.getByLabel("Registry file").selectOption({ label: "components/navigation/motion-selector.css" });
  await page.getByRole("button", { name: "Copy source code" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied", /\.mx-selector-track/);
});

test("gallery tab reverses arrows in RTL", async ({ page }) => {
  await page.goto("/");
  await card(page, first[0]).scrollIntoViewIfNeeded();
  const tabs = card(page, first[0]).getByRole("tablist");
  await tabs.evaluate(el => { el.setAttribute("dir", "rtl"); });
  await tabs.getByRole("tab", { name: "Overview" }).press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Members" })).toBeFocused();
});

test("Playground changes an actual preview prop and skips the disabled tab", async ({ page }) => {
  await page.goto("/?item=designbookmark-tab-pill");
  await page.getByText("Preview settings", { exact: true }).click();
  await page.getByRole("button", { name: "Gallery example" }).click();
  await page.getByRole("checkbox", { name: "Disable Analytics" }).check();
  const tabs = page.getByTestId("specimen-interaction").getByRole("tablist");
  await expect(tabs.getByRole("tab", { name: "Analytics" })).toBeDisabled();
  await tabs.getByRole("tab", { name: "Overview" }).press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Members" })).toBeFocused();
});
