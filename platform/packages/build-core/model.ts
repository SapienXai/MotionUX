import { z } from "zod";

export const families = [
  "Shell",
  "Dashboard",
  "Forms",
  "Feedback",
  "Content",
] as const;
const define = (
  family: (typeof families)[number],
  title: string,
  detail: string,
  variants = ["default", "quiet"] as const,
) => ({
  family,
  title,
  detail,
  version: 1 as const,
  variants,
  license: "MIT",
  provenance: "owned-composition",
  exportEligible: true,
  responsive: ["desktop", "tablet", "mobile"],
  target: "next-16-react-19",
});
export const registry = {
  AppSidebar: define(
    "Shell",
    "App sidebar",
    "Route navigation and a workspace picker",
  ),
  IconRail: define(
    "Shell",
    "Icon rail",
    "Compact navigation with accessible labels",
  ),
  CollapsibleSidebar: define(
    "Shell",
    "Collapsible sidebar",
    "Switch between navigation densities",
  ),
  SidebarInset: define(
    "Shell",
    "Sidebar inset",
    "A framed section with context and route links",
  ),
  WorkspaceSwitcher: define(
    "Shell",
    "Workspace switcher",
    "Switch between demo workspaces",
  ),
  Topbar: define(
    "Shell",
    "Top bar",
    "Search and notifications in an adaptable header",
  ),
  Breadcrumbs: define(
    "Shell",
    "Breadcrumbs",
    "Show where the current page sits",
  ),
  CommandPalette: define(
    "Shell",
    "Command palette",
    "Find and open an application page",
  ),
  MobileBottomNav: define(
    "Shell",
    "Bottom navigation",
    "Touch-friendly route links",
  ),
  MobileDrawer: define(
    "Shell",
    "Navigation drawer",
    "A modal navigation panel for narrow screens",
  ),
  KpiCard: define(
    "Dashboard",
    "Metric card",
    "A single metric derived from the demo data",
  ),
  KpiGrid: define(
    "Dashboard",
    "Metric grid",
    "Key figures for the selected data adapter",
  ),
  ChartCard: define(
    "Dashboard",
    "Trend chart",
    "Weekly occupancy with an accessible data view",
  ),
  DataTable: define(
    "Dashboard",
    "Reservations table",
    "Filter, sort and page reservations",
  ),
  FilterBar: define(
    "Dashboard",
    "Filter bar",
    "Filter demo reservations by status",
  ),
  RecentActivity: define(
    "Dashboard",
    "Recent activity",
    "Changes across reservations and housekeeping",
  ),
  StatusBadge: define(
    "Dashboard",
    "Status badge",
    "Text and color for the selected status",
  ),
  EmptyState: define(
    "Dashboard",
    "Empty state",
    "Explain an empty result and offer recovery",
  ),
  FormField: define(
    "Forms",
    "Text field",
    "Labeled input with validation and local feedback",
  ),
  SearchField: define(
    "Forms",
    "Search field",
    "Find reservations by name or room",
  ),
  SelectField: define(
    "Forms",
    "Select field",
    "Choose a demo notification preference",
  ),
  DateRangeFilter: define(
    "Forms",
    "Date range",
    "Filter arrivals between two dates",
  ),
  SettingsPanel: define(
    "Forms",
    "Settings panel",
    "Theme and browser-local preferences",
  ),
  Dialog: define(
    "Feedback",
    "Dialog",
    "Show focused details in a native dialog",
  ),
  Sheet: define(
    "Feedback",
    "Side sheet",
    "Open details from the edge of the screen",
  ),
  Toast: define(
    "Feedback",
    "Inline feedback",
    "Announce local feedback after an action",
  ),
  Skeleton: define(
    "Feedback",
    "Loading state",
    "A reversible preview of the pending content layout",
  ),
  ConfirmationFlow: define(
    "Feedback",
    "Confirmation flow",
    "Review and confirm a local reset",
  ),
  PageHeader: define(
    "Content",
    "Page heading",
    "Give the screen a title and description",
  ),
  Hero: define(
    "Content",
    "Welcome panel",
    "A focused overview with a real route action",
  ),
  FeatureGrid: define("Content", "Room grid", "Open individual room details"),
  Contacts: define("Dashboard", "Contact directory", "Find and inspect people and companies"),
  Pipeline: define("Dashboard", "Sales pipeline", "Move opportunities across stages and review value"),
  SalesActivity: define("Dashboard", "Sales activity", "Inspect meetings, notes and follow-ups"),
  SalesBreakdown: define("Dashboard", "Pipeline breakdown", "Compare opportunity counts and values by stage"),
} as const;
export type BlockId = keyof typeof registry;
const blockIds = Object.keys(registry) as [BlockId, ...BlockId[]];

export const templates = ["hotel-dashboard", "crm-dashboard", "blank-app"] as const;
export type Template = (typeof templates)[number];
export const adapterFor = {
  "hotel-dashboard": "hotel-demo-v1",
  "crm-dashboard": "crm-demo-v1",
  "blank-app": "local-form-v1",
} as const;
export type Adapter = (typeof adapterFor)[Template];

const hotelOnly: BlockId[] = ["ChartCard", "DataTable", "FilterBar", "RecentActivity", "SearchField", "DateRangeFilter", "FeatureGrid", "StatusBadge"];
const crmOnly: BlockId[] = ["Contacts", "Pipeline", "SalesActivity", "SalesBreakdown"];
const withoutData: BlockId[] = ["WorkspaceSwitcher", "KpiCard", "KpiGrid"];
export type DemoAction = "navigate" | "select-local" | "inspect" | "filter-sort-page" | "filter-sort" |
  "change-demo-stage" | "undo-local" | "validate-local" | "announce" | "reset-local";
const actionsByBlock: Partial<Record<BlockId, readonly DemoAction[]>> = {
  AppSidebar: ["navigate"], IconRail: ["navigate"], CollapsibleSidebar: ["navigate", "select-local"], SidebarInset: ["navigate"],
  WorkspaceSwitcher: ["select-local"], Topbar: ["navigate", "inspect"], CommandPalette: ["navigate"], MobileBottomNav: ["navigate"], MobileDrawer: ["navigate"],
  Hero: ["navigate"], DataTable: ["filter-sort-page", "inspect"], FilterBar: ["filter-sort-page"], SearchField: ["filter-sort-page"], DateRangeFilter: ["filter-sort-page"],
  ChartCard: ["inspect"], RecentActivity: ["inspect"], FeatureGrid: ["inspect"], Contacts: ["filter-sort", "inspect"], Pipeline: ["change-demo-stage", "undo-local"],
  SalesActivity: ["inspect"], FormField: ["validate-local"], SelectField: ["select-local"], SettingsPanel: ["select-local"], Dialog: ["inspect"],
  Sheet: ["inspect"], Toast: ["announce"], Skeleton: ["select-local"], ConfirmationFlow: ["reset-local"], EmptyState: ["reset-local"],
};
export const metricOptions = {
  "hotel-demo-v1": ["automatic", "occupancy", "arrivals", "revenue"],
  "crm-demo-v1": ["automatic", "pipeline-value", "qualified-deals", "contacts", "open-tasks"],
  "local-form-v1": ["automatic"],
} as const;
export const blockSpecVersion = 2 as const;
export function compatibleBlock(type: BlockId, data: Adapter) {
  return hotelOnly.includes(type) ? data === "hotel-demo-v1"
    : crmOnly.includes(type) ? data === "crm-demo-v1"
    : !withoutData.includes(type) || data !== "local-form-v1";
}
export function blockSpec(type: BlockId) {
  const entry = registry[type];
  return {
    ...entry, id: type, blockSpecVersion,
    propsContract: type === "KpiCard" ? "presentation+metric-binding" : type === "SidebarInset" ? "presentation+bounded-slot" : "presentation",
    tags: [entry.family.toLowerCase(), ...entry.title.toLowerCase().split(" ")],
    allowedLayouts: type === "SidebarInset" ? ["page"] : ["page", "section"],
    supportedDataAdapters: Object.values(adapterFor).filter((adapter) => compatibleBlock(type, adapter)),
    actionCapabilities: actionsByBlock[type] ?? [],
    bindings: type === "KpiCard" ? metricOptions : undefined,
    capabilities: [entry.family.toLowerCase(), ...(actionsByBlock[type] ?? [])],
    defaultProps: makeBlock(type, "b-default").props,
    dependencies: ["react", "lucide-react"],
    accessibilityRequirements: ["visible keyboard focus", "accessible names", "reduced motion"],
    motionBehavior: "state feedback only", reducedMotionBehavior: "disable transitions",
    performanceCost: ["ChartCard", "Contacts", "Pipeline"].includes(type) ? "interactive" : "light",
    testEvidence: type === "SidebarInset" || !crmOnly.includes(type) ? "platform/tests/browser.mjs" : "platform/tests/b3-browser.mjs",
  };
}

const text = (max: number) => z.string().max(max);
export const blockProps = z.strictObject({
  title: text(72),
  description: text(180),
  variant: z.enum(["default", "quiet"]),
  motion: z.enum(["system", "none"]),
  visibility: z.enum(["all", "desktop", "mobile"]),
  accessibleLabel: text(72).default(""),
  dataBinding: z
    .enum(["automatic", "occupancy", "arrivals", "revenue", "pipeline-value", "qualified-deals", "contacts", "open-tasks"])
    .default("automatic"),
});
const leafSchema = z.strictObject({
  id: z.string().regex(/^(?:b-[a-z0-9-]{3,50}|[A-Za-z]{3,32}-[a-f0-9-]{36})$/),
  type: z.enum(blockIds),
  version: z.literal(1),
  props: blockProps,
});
export const blockSchema = leafSchema
  .extend({ children: z.array(leafSchema).max(12).optional() })
  .superRefine((block, context) => {
    if (
      block.children &&
      (block.type !== "SidebarInset" ||
        block.children.some((item) => item.type === "SidebarInset"))
    )
      context.addIssue({
        code: "custom",
        message: "Only a top-level sidebar inset can hold other blocks.",
        path: ["children"],
      });
  });
export type Block = z.infer<typeof blockSchema>;
export const allBlocks = (blocks: Block[]): Block[] =>
  blocks.flatMap((block) => [block, ...(block.children ?? [])]);
export type BlockProps = z.infer<typeof blockProps>;
export const projectId = z.string().regex(/^[a-f0-9]{32}$/);
export const routeSlug = z
  .string()
  .regex(/^(?:\/|\/[a-z][a-z0-9-]{0,39})$/)
  .refine(
    (route) => !["/api", "/block-review"].includes(route),
    "Reserved route.",
  );
export const pageSchema = z.strictObject({
  id: z.string().regex(/^p-[a-z0-9-]{3,50}$/),
  route: routeSlug,
  title: text(60).min(1),
  blocks: z.array(blockSchema).max(36),
});
export type BuildPage = z.infer<typeof pageSchema>;

const compositionFields = z
  .strictObject({
    name: text(80).min(1),
    template: z.enum(templates),
    runtime: z.literal("next-16"),
    theme: z.enum(["light", "dark"]),
    sidebar: z.enum(["expanded", "rail"]),
    motionProfile: z.enum(["system", "none"]),
    data: z.enum(Object.values(adapterFor)),
    assets: z.tuple([]),
    pages: z.array(pageSchema).min(1).max(12),
  });
export const documentSchema = compositionFields.extend({
  locale: z.enum(["en", "tr"]).default("en"),
}).superRefine(({ pages, data, template }, context) => {
    if (adapterFor[template] !== data)
      context.addIssue({ code: "custom", message: "Template and adapter are incompatible.", path: ["data"] });
    for (const page of pages) for (const block of allBlocks(page.blocks)) {
      if (!compatibleBlock(block.type, data) || !(metricOptions[data] as readonly string[]).includes(block.props.dataBinding)
        || (block.type !== "KpiCard" && block.props.dataBinding !== "automatic"))
        context.addIssue({ code: "custom", message: "Block or binding is incompatible with this data adapter.", path: ["pages", page.id, block.id] });
    }
    const ids = pages.flatMap((page) => [
      page.id,
      ...allBlocks(page.blocks).map((block) => block.id),
    ]);
    const routes = pages.map((page) => page.route);
    if (
      ids.length !== new Set(ids).size ||
      routes.length !== new Set(routes).size ||
      !routes.includes("/")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Use unique page and block IDs, unique routes and one home page.",
        path: ["pages"],
      });
    }
    if (ids.length > 180)
      context.addIssue({
        code: "custom",
        message: "Project exceeds the block limit.",
        path: ["pages"],
      });
  });
export const compositionPlan = z.strictObject({
  schemaVersion: z.literal(1),
  userIntent: text(500).min(1),
  selectedTemplate: z.literal("hotel-dashboard"),
  document: documentSchema,
  responsivePolicy: z.literal("mobile-navigation"),
  stateOwnership: z.literal("demo-local"),
  motionPolicy: z.enum(["system", "none"]),
  provenance: z.literal("owned-composition"),
  risks: z.array(text(200)).max(8),
  verificationPlan: z.array(text(200)).min(1).max(8),
});
const projectFields = {
  id: projectId,
  revision: z.number().int().min(0).max(1_000_000),
};
const v1 = z.strictObject({
  ...projectFields, schemaVersion: z.literal(1),
  document: compositionFields.extend({ template: z.literal("hotel-dashboard"), data: z.literal("hotel-demo-v1") }),
});
export const blueprintProvenance = z.strictObject({
  source: z.literal("codex"),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  blockSpecVersion: z.literal(blockSpecVersion),
  summary: text(200),
  limitations: z.array(text(160)).max(8),
});
const v2 = z.strictObject({
  ...projectFields, schemaVersion: z.literal(2),
  document: documentSchema, blueprint: blueprintProvenance.optional(),
});
export const projectSchema = z.union([v2, v1.transform((old): z.input<typeof v2> => ({
  ...old, schemaVersion: 2 as const, document: { ...old.document, locale: "en" as const },
})).pipe(v2)]);
export type BuildProject = z.infer<typeof v2>;
export type Document = z.infer<typeof documentSchema>;

export function makeBlock(
  type: BlockId,
  id: string,
  overrides: Partial<BlockProps> = {},
): Block {
  return {
    id,
    type,
    version: 1,
    props: {
      title: registry[type].title,
      description: "",
      variant: "default",
      motion: "system",
      visibility: "all",
      accessibleLabel: "",
      dataBinding: "automatic",
      ...overrides,
    },
  };
}
export function templatePlan() {
  const block = (type: BlockId, title: string, description = "") =>
    makeBlock(type, "b-" + type.toLowerCase(), { title, description });
  return compositionPlan.parse({
    schemaVersion: 1,
    userIntent:
      "Review arrivals, occupancy and room readiness across the hotel.",
    selectedTemplate: "hotel-dashboard",
    responsivePolicy: "mobile-navigation",
    stateOwnership: "demo-local",
    motionPolicy: "system",
    provenance: "owned-composition",
    risks: [
      "Uses fictional data. No external booking or payment integrations.",
    ],
    verificationPlan: [
      "Test navigation and route reload",
      "Run keyboard, touch and reduced-motion checks",
      "Build clean exported source",
    ],
    document: {
      name: "Hotel Desk",
      template: "hotel-dashboard",
      runtime: "next-16",
      theme: "light",
      sidebar: "expanded",
      motionProfile: "system",
      data: "hotel-demo-v1",
      assets: [],
      pages: [
        {
          id: "p-overview",
          route: "/",
          title: "Overview",
          blocks: [
            block(
              "PageHeader",
              "Property overview",
              "A look at what’s happening at The Linden today.",
            ),
            block("KpiGrid", "Property metrics"),
            block(
              "ChartCard",
              "Occupancy trend",
              "Room occupancy over the last seven days.",
            ),
            block("RecentActivity", "Recent activity"),
          ],
        },
        {
          id: "p-bookings",
          route: "/bookings",
          title: "Bookings",
          blocks: [
            makeBlock("PageHeader", "b-booking-title", {
              title: "Bookings",
              description: "Find arrivals, departures and upcoming stays.",
            }),
            block("DataTable", "Reservations"),
          ],
        },
        {
          id: "p-rooms",
          route: "/rooms",
          title: "Rooms",
          blocks: [
            makeBlock("PageHeader", "b-room-title", {
              title: "Rooms",
              description:
                "Check room readiness and see the details of each space.",
            }),
            block("FeatureGrid", "Room inventory"),
          ],
        },
        {
          id: "p-settings",
          route: "/settings",
          title: "Settings",
          blocks: [
            makeBlock("PageHeader", "b-settings-title", {
              title: "Settings",
              description: "Personalize this demo workspace.",
            }),
            block("SettingsPanel", "Workspace preferences"),
          ],
        },
      ],
    },
  });
}
export function manualDocument(template: Template): Document {
  if (template === "hotel-dashboard") return templatePlan().document;
  if (template === "blank-app") return documentSchema.parse({
    name: "Untitled workspace", locale: "en", template, runtime: "next-16", theme: "light", sidebar: "expanded",
    motionProfile: "none", data: adapterFor[template], assets: [],
    pages: [{ id: "p-overview", route: "/", title: "Overview", blocks: [makeBlock("PageHeader", "b-blank-title", { title: "Your workspace" })] }],
  });
  const page = (slug: string, title: string, description: string, content: [BlockId, string][]) => ({
    id: "p-" + slug, route: slug === "overview" ? "/" : "/" + slug, title,
    blocks: [makeBlock("PageHeader", "b-title-" + slug, { title, description }),
      ...content.map(([id, heading], index) => makeBlock(id, "b-" + slug + "-" + index, { title: heading }))],
  });
  return documentSchema.parse({
    name: "Meridian CRM", locale: "en", template, runtime: "next-16", theme: "light", sidebar: "expanded",
    motionProfile: "system", data: adapterFor[template], assets: [],
    pages: [
      page("overview", "Sales overview", "See what’s moving and where your team should focus next.", [["KpiGrid", "Sales metrics"], ["SalesBreakdown", "Pipeline at a glance"], ["SalesActivity", "Next actions"]]),
      page("contacts", "Contacts", "Find people, accounts and their current relationship with your team.", [["Contacts", "Contact directory"]]),
      page("pipeline", "Pipeline", "Review deals and move opportunities through each stage.", [["Pipeline", "Active opportunities"]]),
      page("activities", "Activities", "Follow meetings, notes and upcoming tasks in one place.", [["SalesActivity", "Activity log"]]),
      page("settings", "Settings", "Manage display and local preferences for this demo workspace.", [["SettingsPanel", "Workspace preferences"]]),
    ],
  });
}

export function newProject(id: string, document = manualDocument("hotel-dashboard"), blueprint?: BuildProject["blueprint"]): BuildProject {
  return v2.parse({ schemaVersion: 2, id, revision: 0, document, ...(blueprint ? { blueprint } : {}) });
}
