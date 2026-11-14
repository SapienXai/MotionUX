import type { ComponentType } from "react";
import inventory from "../metadata/reference-inventory.json";

export type Specimen = {
  component: ComponentType<{ reduced: boolean; language: "en" | "tr" }>;
  usage: string;
  api: string;
  states: string;
  accessibility: string;
  performance: string;
};

export const references = inventory.items;
export type Reference = (typeof references)[number];
export const labels: Record<string, string> = {
  navigation: "Navigation", feedback: "Feedback", inputs: "Inputs", gestures: "Gestures & cards",
  text: "Typography", ai: "AI", media: "Media",
};

export const previews: Record<string, () => Promise<{ default: Specimen }>> = {
  "designbookmark-tab-pill": () => import("./demos/tab-pill"),
  "designbookmark-bottom-bar": () => import("./demos/bottom-bar"),
  "designbookmark-segmented-control": () => import("./demos/segmented-control"),
  "designbookmark-pagination-dots": () => import("./demos/pagination-dots"),
  "designbookmark-command-palette": () => import("./demos/command-palette"),
  "designbookmark-pull-cord": () => import("./demos/pull-cord"),
};
