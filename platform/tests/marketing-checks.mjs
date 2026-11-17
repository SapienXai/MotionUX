import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { marketingBlocks } from "../packages/build-core/marketing-spec.ts";

const home = "/";
const rooms = "/rooms";
const suite = "/terrace-suite";
const about = "/about";
const contact = "/contact";
const checks = {
  MarketingHeader: [home, 'nav[aria-label="Primary navigation"]', ""],
  HeroEditorial: [home, "h1", "A quieter bay"],
  HeroSplit: [rooms, "h1", "A room to come back to"],
  LogoCloud: [about, "li", "Fictional Coastal Association"],
  FeatureBento: [about, "article h3", "The olive path"],
  StatsStrip: [about, "dl", "Room types"],
  StorySection: [home, "h2", "A slower kind of stay"],
  GalleryGrid: [suite, 'button[aria-label="View The coast"]', "The coast"],
  RoomCollection: [rooms, 'a[href="/terrace-suite"]', "Terrace Suite"],
  AmenityGrid: [home, "article h3", "Saltwater pool"],
  Testimonials: [home, "blockquote", /\S+/],
  PricingCards: [rooms, "article p", "€320"],
  FAQAccordion: [home, "summary", "What time is check-in?"],
  CTASection: [suite, 'a[href="/contact"]', "Open demo inquiry"],
  ContactForm: [contact, "form input[type=email]", ""],
  MarketingFooter: [
    home,
    'nav[aria-label="Footer navigation"] a[href="/contact"]',
    "Contact",
  ],
};
assert.deepEqual(
  Object.keys(checks).sort(),
  Object.keys(marketingBlocks).sort(),
);

export const marketingRoutes = [
  [home, "Home"],
  [rooms, "Rooms"],
  [suite, "Terrace Suite"],
  ["/olive-room", "Olive Room"],
  [about, "About"],
  [contact, "Contact"],
];
export const widths = [320, 390, 768, 1440];

export async function verifyMarketingBlocks(scope, route, coverage) {
  for (const [type, [path, selector, expected]] of Object.entries(checks)) {
    if (route !== path) continue;
    const block = scope
      .locator(`[data-marketing-block="${type}"]:visible`)
      .first();
    await expect(block, type).toBeVisible();
    const content = block.locator(selector).first();
    await expect(content, type).toBeVisible();
    if (expected) await expect(content, type).toContainText(expected);
    const images = block.locator("img:visible");
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate((node) => node.complete && node.naturalWidth > 0),
        )
        .toBe(true);
    }
    assert(
      await block.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      type + " overflow",
    );
    coverage.add(type);
  }
}

export function allMarketingVerified(coverage) {
  assert.deepEqual([...coverage].sort(), Object.keys(marketingBlocks).sort());
  return [...coverage].sort();
}
