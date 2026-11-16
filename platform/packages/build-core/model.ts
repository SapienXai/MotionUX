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
    "Switch between fictional hotel properties",
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
    "Occupancy, arrivals and revenue at a glance",
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
} as const;
export type BlockId = keyof typeof registry;
const blockIds = Object.keys(registry) as [BlockId, ...BlockId[]];

const text = (max: number) => z.string().max(max);
export const blockProps = z.strictObject({
  title: text(72),
  description: text(180),
  variant: z.enum(["default", "quiet"]),
  motion: z.enum(["system", "none"]),
  visibility: z.enum(["all", "desktop", "mobile"]),
  accessibleLabel: text(72).default(""),
  dataBinding: z
    .enum(["automatic", "occupancy", "arrivals", "revenue"])
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

const composition = z
  .strictObject({
    name: text(80).min(1),
    template: z.literal("hotel-dashboard"),
    runtime: z.literal("next-16"),
    theme: z.enum(["light", "dark"]),
    sidebar: z.enum(["expanded", "rail"]),
    motionProfile: z.enum(["system", "none"]),
    data: z.literal("hotel-demo-v1"),
    assets: z.tuple([]),
    pages: z.array(pageSchema).min(1).max(12),
  })
  .superRefine(({ pages }, context) => {
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
  document: composition,
  responsivePolicy: z.literal("mobile-navigation"),
  stateOwnership: z.literal("demo-local"),
  motionPolicy: z.enum(["system", "none"]),
  provenance: z.literal("owned-composition"),
  risks: z.array(text(200)).max(8),
  verificationPlan: z.array(text(200)).min(1).max(8),
});
export const projectSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: projectId,
  revision: z.number().int().min(0).max(1_000_000),
  document: composition,
});
export type BuildProject = z.infer<typeof projectSchema>;
export type Document = BuildProject["document"];

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
export function newProject(id: string): BuildProject {
  return projectSchema.parse({
    schemaVersion: 1,
    id,
    revision: 0,
    document: templatePlan().document,
  });
}
