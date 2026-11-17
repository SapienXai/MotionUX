export const marketingBlocks = {
  MarketingHeader: ["Site header", "Navigate between published pages"],
  HeroEditorial: [
    "Editorial hero",
    "Lead with a headline, portrait image and call to action",
  ],
  HeroSplit: [
    "Split hero",
    "Introduce a page with photography and side-by-side copy",
  ],
  LogoCloud: ["Name list", "List named affiliations or fictional examples"],
  FeatureBento: ["Feature grid", "Show a lead feature and supporting benefits"],
  StatsStrip: ["Facts strip", "Present supplied facts as labeled values"],
  StorySection: ["Story section", "Pair an editorial image with brand copy"],
  GalleryGrid: [
    "Image gallery",
    "Open local images in a keyboard-accessible lightbox",
  ],
  RoomCollection: [
    "Room collection",
    "Link each listed room to its own detail page",
  ],
  AmenityGrid: ["Amenities", "List facilities with text and icons"],
  Testimonials: ["Testimonials", "Present clearly labeled fictional quotes"],
  PricingCards: [
    "Rates and packages",
    "Compare sample rates and link to an inquiry",
  ],
  FAQAccordion: [
    "Frequently asked questions",
    "Reveal answers with native disclosures",
  ],
  CTASection: ["Call to action", "Guide readers to a page in the same app"],
  ContactForm: [
    "Inquiry form",
    "Validate a local demo inquiry without transmitting it",
  ],
  MarketingFooter: [
    "Site footer",
    "Navigate to published pages from the footer",
  ],
} as const;
export type MarketingBlock = keyof typeof marketingBlocks;
export const isMarketing = (id: string): id is MarketingBlock =>
  Object.hasOwn(marketingBlocks, id);
export const seedImages = {
  "seed-coast": "Costa di Sera on a rocky Mediterranean coast",
  "seed-room": "Linen-covered bed beside a sea-facing arched terrace",
  "seed-pool": "Stone pool in a sunlit olive grove",
} as const;
export const isSeedImage = (id: string) => Object.hasOwn(seedImages, id);
export const seedImageIds = Object.keys(
  seedImages,
) as (keyof typeof seedImages)[];
