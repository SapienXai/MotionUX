import { defaultSectionLayout, sectionRecipeNames, type RecipeId, type SectionLayout } from "./creator-design.ts";
import { compatibleBlock, makeBlock, manualDocument, type Block, type BlockId, type Document } from "./model.ts";

type Recipe = {
  name: readonly [string, string];
  purpose: string;
  blocks: readonly BlockId[];
  mode: SectionLayout["mode"];
  columns?: number;
};
export const sectionRecipes = {
  welcome: { name: sectionRecipeNames["welcome"], purpose: "Introduce the workspace and link to the next page.", blocks: ["Hero"], mode: "stack" },
  metrics: { name: sectionRecipeNames["metrics"], purpose: "Put key figures next to an explanation or follow-up action.", blocks: ["KpiGrid", "Hero"], mode: "content-aside", columns: 2 },
  "sales-workbench": { name: sectionRecipeNames["sales-workbench"], purpose: "Review the deal board beside the pipeline breakdown.", blocks: ["Pipeline", "SalesBreakdown"], mode: "content-aside", columns: 2 },
  "contact-directory": { name: sectionRecipeNames["contact-directory"], purpose: "Find customer records and see recent follow-ups.", blocks: ["Contacts", "SalesActivity"], mode: "stack" },
  "editorial-hero": { name: sectionRecipeNames["editorial-hero"], purpose: "Lead with a photograph and a concise introduction.", blocks: ["HeroSplit", "LogoCloud"], mode: "stack" },
  "social-proof": { name: sectionRecipeNames["social-proof"], purpose: "Group figures, a name list and guest comments.", blocks: ["StatsStrip", "LogoCloud", "Testimonials"], mode: "grid", columns: 3 },
  "media-story": { name: sectionRecipeNames["media-story"], purpose: "Combine editorial copy with an interactive photo gallery.", blocks: ["StorySection", "GalleryGrid"], mode: "stack" },
  "stay-options": { name: sectionRecipeNames["stay-options"], purpose: "Help visitors compare rooms, amenities and offers.", blocks: ["RoomCollection", "AmenityGrid", "PricingCards"], mode: "stack" },
  questions: { name: sectionRecipeNames["questions"], purpose: "Answer recurring questions and offer a locally validated form.", blocks: ["FAQAccordion", "ContactForm"], mode: "split", columns: 2 },
  reference: { name: sectionRecipeNames["reference"], purpose: "Add guides with searchable titles, tags and text.", blocks: ["ArticleLibrary"], mode: "stack" },
  "work-queue": { name: sectionRecipeNames["work-queue"], purpose: "Pair live totals with the same set of actionable tasks.", blocks: ["OperationsSummary", "OperationsQueue"], mode: "stack" },
  "team-response": { name: sectionRecipeNames["team-response"], purpose: "Explain a process and let readers validate a local response.", blocks: ["ArticleLibrary", "WorkspaceResponse"], mode: "split", columns: 2 },
} as const satisfies Record<RecipeId, Recipe>;

export function availableSections(adapter: Document["data"]) {
  return (Object.entries(sectionRecipes) as [RecipeId, Recipe][])
    .filter(([, recipe]) => recipe.blocks.every((type) => compatibleBlock(type, adapter)));
}

export function sectionFromRecipe(document: Document, key: RecipeId, nextId: () => string): Block {
  const selected = availableSections(document.data).find(([id]) => id === key)?.[1];
  if (!selected) throw new Error("Choose a section compatible with this project.");
  const seed = manualDocument(document.template, document.locale).pages.flatMap(({ blocks }) => blocks);
  const owns = (asset?: string) => asset && document.assets.includes(asset);
  const hasRoute = (route?: string) => document.pages.some((page) => page.route === route);
  const children = selected.blocks.map((type) => {
    const authored = seed.find((block) => block.type === type)?.props;
    if (!authored) {
      if (type === "LogoCloud") return makeBlock(type, nextId(), {
        title: document.locale === "tr" ? "Örnek yerel ortaklar" : "Fictional local partners",
        items: [
          { title: "Coastal Makers", text: "" },
          { title: "Olive Grove Society", text: "" },
          { title: "Cove Guides", text: "" },
        ],
      });
      return makeBlock(type, nextId());
    }
    return makeBlock(type, nextId(), {
      ...authored,
      image: owns(authored.image?.asset) ? authored.image : undefined,
      destination: hasRoute(authored.destination) ? authored.destination : undefined,
      items: authored.items?.map((item) => ({
        ...item,
        asset: owns(item.asset) ? item.asset : undefined,
        destination: hasRoute(item.destination) ? item.destination : undefined,
      })),
    });
  });
  return {
    ...makeBlock("CreatorSection", nextId(), {
      title: selected.name[document.locale === "tr" ? 1 : 0],
      sectionRecipe: { id: key, version: 1 },
      layout: {
        ...defaultSectionLayout, mode: selected.mode,
        base: { ...defaultSectionLayout.base, columns: selected.columns ?? 1 },
      },
    }),
    children,
  };
}
