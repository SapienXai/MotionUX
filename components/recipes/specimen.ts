import type { ComponentType } from "react";
import type { Config, Value } from "./values";

export type Specimen = {
  component: ComponentType<{ reduced: boolean; language: "en" | "tr"; comparison?: boolean; config?: Config; update?: (key: string, value: Value) => void }>;
  usage: string;
  api: string;
  states: string;
  accessibility: string;
  performance: string;
};

export type RecipeLoaders = Record<string, () => Promise<{ default: Specimen }>>;
