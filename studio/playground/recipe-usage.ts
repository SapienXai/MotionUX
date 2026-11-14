import { recipeFamilies } from "../catalog";
import type { Config } from "./controls";

export function recipeFamily(id: string) {
  const family = Object.entries(recipeFamilies).find(([, stories]) => Object.hasOwn(stories, id))?.[0];
  if (!family) throw new Error(`Missing Gallery recipe: ${id}`);
  return family;
}

export function recipeUsage(id: string, config: Config, options: {
  language: "en" | "tr"; reducedMotion: boolean; theme: string; scheme: "light" | "dark";
}) {
  const family = recipeFamily(id);
  const component = family[0].toUpperCase() + family.slice(1) + "Example";
  const settings = {
    id,
    initialConfig: Object.keys(config).length ? config : undefined,
    language: options.language === "tr" ? "tr" : undefined,
    reducedMotion: options.reducedMotion || undefined,
    compact: true,
    theme: options.theme === "neutral" ? undefined : options.theme,
    scheme: options.scheme === "dark" ? "dark" : undefined,
  };
  const attributes = Object.entries(settings).filter(([, value]) => value !== undefined)
    .map(([name, value]) => `     ${name}={${JSON.stringify(value).replaceAll("<", "\\u003c")}}`).join("\n");
  return `"use client";

import "@fontsource-variable/inter";
import { ${component} } from "@/components/sapienx-motion/recipes/${family}";

export function Example() {
  return (
    <${component}
${attributes}
    />
  );
}
`;
}
