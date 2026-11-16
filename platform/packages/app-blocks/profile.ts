import type { Adapter } from "@motionux/build-core";
export const workspaceProfiles = {
  "hotel-demo-v1": {
    label: "Hotel",
    mark: "H",
    descriptor: "Property operations",
    workspaces: ["The Linden", "Maison Verne"],
    user: "Avery Lane",
    initials: "AL",
    role: "Property manager",
    alternatePreference: "Arrivals only",
  },
  "crm-demo-v1": {
    label: "App",
    mark: "↗",
    descriptor: "Sales workspace",
    workspaces: ["Meridian"],
    user: "Morgan Blake",
    initials: "MB",
    role: "Sales operations",
    alternatePreference: "Follow-ups only",
  },
  "local-form-v1": {
    label: "App",
    mark: "M",
    descriptor: "Local workspace",
    workspaces: [],
    user: "Local profile",
    initials: "LP",
    role: "Demo workspace",
    alternatePreference: "Important updates only",
  },
} satisfies Record<
  Adapter,
  {
    label: string;
    mark: string;
    descriptor: string;
    workspaces: string[];
    user: string;
    initials: string;
    role: string;
    alternatePreference: string;
  }
>;
