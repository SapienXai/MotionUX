import { references, type Reference } from "../catalog";

export const FEATURED = [
  ["designbookmark-tab-pill", "Sliding Tab Pill", "Animated tab navigation with a smooth sliding indicator.", "Navigation", "Motion"],
  ["designbookmark-loading-to-success", "Loading to Success", "A smooth transition from loading to a success state.", "Feedback", "States"],
  ["designbookmark-expand-card", "Expandable Card", "A card that smoothly expands to reveal more content.", "Cards", "Layout"],
  ["kokonut-morph-popover", "Morph Dropdown", "A dropdown with a smooth morphing transition.", "Overlay", "Motion"],
  ["designbookmark-profile-card", "Profile Card", "An interactive profile card with subtle motion and depth.", "Cards", "Interactive"],
  ["designbookmark-swipe-deck", "Swipe Deck", "A swipeable card deck with natural, physics-based motion.", "Gestures", "Motion"],
] as const;

const buttonItems = new Set(["hold-to-publish", "hold-button", "slide-to-confirm", "copy-button", "like-burst", "magnetic-button", "designbookmark-command-button", "kokonut-command-button", "cart-button", "undo-button", "bell-button"]);
const cardItems = new Set(["expand-card", "profile-card", "stat-card", "boarding-pass", "fan-cards", "parallax-ticket"]);
export const categories = ["Navigation", "Buttons", "Cards", "Inputs", "Gestures", "Feedback", "Typography", "AI", "Media"] as const;
export type Category = (typeof categories)[number];

export function categoryFor(item: Reference): Category {
  if (buttonItems.has(item.registryItem)) return "Buttons";
  if (cardItems.has(item.registryItem)) return "Cards";
  const groups: Record<string, Category> = { navigation: "Navigation", inputs: "Inputs", gestures: "Gestures", feedback: "Feedback", text: "Typography", ai: "AI", media: "Media" };
  return groups[item.category] ?? "Feedback";
}

export const ordered = [...references].sort((a, b) => a.order - b.order);
export const catalogCounts = Object.fromEntries(categories.map(category => [category, references.filter(item => categoryFor(item) === category).length])) as Record<Category, number>;
export function presentation(item: Reference) {
  const feature = FEATURED.find(([id]) => id === item.id);
  return { title: feature?.[1] ?? item.name, description: feature?.[2] ?? item.interaction, tags: feature ? feature.slice(3) : [categoryFor(item), item.provider] };
}
export const repoURL = "https://github.com/SapienXai/MotionUX";

export type Route = { page: "gallery" | "playground" | "components" | "guides" | "examples" | "sources" | "library"; item: string; category: string; query: string; preset?: boolean; configuration?: string; panel?: "usage" | "install"; source?: string; sourcePanel?: "provenance" | "usage" | "install" | "code" | "evidence";
  collection?: "legacy"; provider?: string; kind?: "react" | "html"; sort?: "name" | "provider" | "oldest" | "featured";
  subset?: "new" | "favorites"; compare?: boolean; shelf?: string; kit?: boolean; fromLibrary?: boolean; };
export function readRoute(): Route {
  const params = new URLSearchParams(location.search);
  const page = params.get("view");
  const item = params.get("item") ?? "";
  const panel = params.get("panel");
  const kind = params.get("kind");
  const sort = params.get("sort");
  const subset = params.get("subset");
  return {
    page: item ? "playground" : page === "components" || page === "guides" || page === "examples" || page === "sources" || page === "library" ? page : "gallery",
    item,
    category: params.get("category") ?? "",
    query: params.get("q") ?? "",
    panel: panel === "usage" || panel === "install" ? panel : undefined,
    preset: params.get("preset") === "gallery",
    configuration: params.get("config") ?? undefined,
    source: params.get("source") ?? undefined,
    sourcePanel: panel === "install" || panel === "usage" || panel === "code" || panel === "evidence" ? panel : undefined,
    collection: params.get("collection") === "legacy" || (item && params.get("legacy") === "1") ? "legacy" : undefined,
    provider: params.get("provider") ?? undefined,
    kind: kind === "react" || kind === "html" ? kind : undefined,
    sort: sort === "name" || sort === "provider" || sort === "oldest" || sort === "featured" ? sort : undefined,
    subset: subset === "new" || subset === "favorites" ? subset : undefined,
    compare: params.get("compare") === "1",
    shelf: params.get("shelf") ?? undefined,
    kit: params.get("kit") === "1",
    fromLibrary: params.get("from") === "library",
  };
}
export function hrefFor(route: Route) {
  const params = new URLSearchParams();
  if (route.page === "playground") params.set("item", route.item || FEATURED[0][0]);
  else if (route.page !== "gallery") params.set("view", route.page);
  if (route.category) params.set("category", route.category);
  if (route.query) params.set("q", route.query);
  if (route.collection) params.set("collection", route.collection);
  if (route.provider) params.set("provider", route.provider);
  if (route.kind) params.set("kind", route.kind);
  if (route.sort) params.set("sort", route.sort);
  if (route.subset) params.set("subset", route.subset);
  if (route.compare) params.set("compare", "1");
  if (route.shelf) params.set("shelf", route.shelf);
  if (route.kit) params.set("kit", "1");
  if (route.fromLibrary && route.page === "playground") params.set("from", "library");
  if (route.page === "playground" && route.preset) params.set("preset", "gallery");
  if (route.page === "playground" && (route.sourcePanel || route.panel)) {
    params.set("panel", (route.sourcePanel ?? route.panel)!);
  }
  if (route.page === "playground" && route.configuration) params.set("config", route.configuration);
  if (route.page === "sources" && route.source) {
    params.set("source", route.source);
    if (route.sourcePanel) params.set("panel", route.sourcePanel);
  }
  return params.size ? `?${params}${route.page === "playground" ? "#specimen" : ""}` : "./";
}
export function visibleItems(route: Route) {
  const query = route.query.trim().toLocaleLowerCase();
  return ordered.filter(item => {
    const { title, description, tags } = presentation(item);
    const category = categoryFor(item);
    return (!route.category || category.toLowerCase() === route.category) &&
      [title, item.name, description, item.interaction, item.provider, category, ...tags].join(" ").toLocaleLowerCase().includes(query);
  });
}
