import { booleanValue, example, flag, motionNumber, number, numberValue, select, stringValue, text, type Config, type Field } from "./controls";
import type { OutcomeState } from "../../components/showcase/loading-outcome";

const definitions = {
  "designbookmark-tab-pill": { entry: "sliding-tab-pill", name: "SlidingTabPill", fields: [
    text("overview", "Overview label", "Overview"), text("analytics", "Analytics label", "Analytics"), text("members", "Members label", "Members"),
    select("value", "Selected tab", "overview", ["overview", "analytics", "members"]), flag("disableAnalytics", "Disable Analytics"),
  ] },
  "designbookmark-loading-to-success": { entry: "loading-outcome", name: "LoadingOutcome", fields: [
    text("idle", "Idle message", "Ready"), text("pending", "Pending message", "Waiting…"), text("success", "Success message", "Completed"),
    text("error", "Failure message", "Failed. Try again."), select("state", "Simulated state", "idle", ["idle", "pending", "success", "error"]),
  ] },
  "designbookmark-expand-card": { entry: "expandable-room", name: "ExpandableRoom", fields: [
    text("title", "Room title", "Premium Room"), text("subtitle", "Room subtitle", "Sea view · 42 m²"),
    text("amenities", "Amenities (comma separated)", "King bed, Wi-Fi, Breakfast"),
    select("expanded", "Expanded card", "second", ["first", "second", "none"]),
  ] },
  "kokonut-morph-popover": { entry: "morph-dropdown", name: "MorphDropdown", fields: [
    text("label", "Menu label", "New action"), text("create", "Create action", "Create"), text("share", "Share action", "Share"),
    text("duplicate", "Duplicate action", "Duplicate"), flag("open", "Menu open", true),
  ] },
  "designbookmark-profile-card": { entry: "featured-profile", name: "FeaturedProfile", fields: [
    text("title", "Profile name", "Emma Carter"), text("subtitle", "Profile role", "Product Designer"),
    text("detail", "Profile details", "Designs welcoming, usable products for small teams."),
    text("followers", "Follower count", "24K"), flag("expanded", "Show profile details"),
  ] },
  "designbookmark-swipe-deck": { entry: "destination-deck", name: "DestinationDeck", fields: [
    text("label", "Deck label", "Greek destinations"), text("firstTitle", "First destination", "Santorini"),
    motionNumber("dragThreshold", "Drag distance (px)", 52, 24, 140),
    number("index", "Card index", 0, 0, 2),
  ] },
};
export type FeaturedID = keyof typeof definitions;
export function featuredDefinition(id: string): { entry: string; name: string; fields: readonly Field[] } | undefined {
  return definitions[id as FeaturedID];
}

export function tabProps(config: Config, tr = false) {
  return {
    labels: [stringValue(config, "overview") ?? (tr ? "Genel bakış" : "Overview"), stringValue(config, "analytics") ?? (tr ? "Analiz" : "Analytics"), stringValue(config, "members") ?? (tr ? "Üyeler" : "Members")],
    disableAnalytics: booleanValue(config, "disableAnalytics") ?? false,
  };
}
export function outcomeLabels(config: Config, tr = false) {
  return {
    idle: stringValue(config, "idle") ?? (tr ? "Hazır" : "Ready"), pending: stringValue(config, "pending") ?? (tr ? "Bekleniyor…" : "Waiting…"),
    success: stringValue(config, "success") ?? (tr ? "Tamamlandı" : "Completed"), error: stringValue(config, "error") ?? (tr ? "Başarısız. Tekrar deneyin." : "Failed. Try again."),
  };
}
export function roomProps(config: Config, tr = false) {
  return { title: stringValue(config, "title") ?? (tr ? "Premium Oda" : undefined), subtitle: stringValue(config, "subtitle") ?? (tr ? "Deniz manzarası · 42 m²" : undefined),
    amenities: (stringValue(config, "amenities") ?? (tr ? "Büyük yatak, Wi-Fi, Kahvaltı" : undefined))?.split(",").map(value => value.trim()).filter(Boolean).slice(0, 6) };
}
export function menuProps(config: Config, tr = false) {
  return {
    label: stringValue(config, "label") ?? (tr ? "Yeni işlem" : undefined),
    actionLabels: { Create: stringValue(config, "create") ?? (tr ? "Oluştur" : undefined), Share: stringValue(config, "share") ?? (tr ? "Paylaş" : undefined), Duplicate: stringValue(config, "duplicate") ?? (tr ? "Çoğalt" : undefined) },
  };
}
export function profileProps(config: Config, tr = false) {
  return { title: stringValue(config, "title"), subtitle: stringValue(config, "subtitle") ?? (tr ? "Ürün Tasarımcısı" : undefined),
    detailText: stringValue(config, "detail") ?? (tr ? "Küçük ekipler için kullanışlı ürünler tasarlar." : undefined), followerCount: stringValue(config, "followers") };
}
export function deckProps(config: Config, tr = false) {
  return { label: stringValue(config, "label") ?? (tr ? "Yunanistan rotaları" : undefined), dragThreshold: numberValue(config, "dragThreshold"), firstTitle: stringValue(config, "firstTitle") };
}

export function featuredUsage(id: string, config: Config, tr: boolean, reducedMotion: boolean, appearance: { scheme: "light" | "dark"; theme: string } = { scheme: "light", theme: "neutral" }) {
  const selected = featuredDefinition(id);
  if (!selected) return undefined;
  const { name, entry } = selected;
  const module = `presets/showcase/${entry}`;
  const common = { reducedMotion };
  const themed: typeof example = (...args) => {
    const source = example(...args);
    const attributes = `data-theme=${JSON.stringify(appearance.theme)} data-scheme=${JSON.stringify(appearance.scheme)}`;
    return source.replace('"use client";', '"use client";\n\nimport "@fontsource-variable/inter";\nimport "@/components/sapienx-motion/presets/recipes/theme.css";')
      .replace(/  return (<.*\/>);/, `  return <div className="mx-recipe-frame" ${attributes}>$1</div>;`);
  };
  switch (id) {
    case "designbookmark-tab-pill": return themed(name, module, { ...common, ...tabProps(config, tr) }, {
      setup: `const [value, setValue] = useState(${JSON.stringify(stringValue(config, "value") ?? "overview")});`, handlers: { value: "value", onValueChange: "setValue" },
    });
    case "designbookmark-loading-to-success": return themed(name, module, { ...common, labels: outcomeLabels(config, tr), simulation: true }, {
      setup: `const [state, setState] = useState<"idle" | "pending" | "success" | "error">(${JSON.stringify((stringValue(config, "state") ?? "idle") as OutcomeState)});
  useEffect(() => {
    if (state !== "pending") return;
    const reduced = ${reducedMotion} || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setState("success"), reduced ? 0 : 720);
    return () => window.clearTimeout(timer);
  }, [state]);`,
      handlers: { state: "state", onStart: '() => setState("pending")' }, hooks: ["useEffect", "useState"],
    });
    case "designbookmark-expand-card": return themed(name, module, { ...common, ...roomProps(config, tr), defaultExpanded: stringValue(config, "expanded") });
    case "kokonut-morph-popover": return themed(name, module, { ...common, ...menuProps(config, tr), defaultOpen: booleanValue(config, "open") });
    case "designbookmark-profile-card": return themed(name, module, { ...common, ...profileProps(config, tr), defaultExpanded: booleanValue(config, "expanded") });
    case "designbookmark-swipe-deck": return themed(name, module, { ...common, ...deckProps(config, tr), defaultIndex: numberValue(config, "index") });
  }
}
