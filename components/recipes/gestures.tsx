"use client";

import { RecipeExample, type RecipeOptions } from "./example";
import type { RecipeLoaders } from "./specimen";

export const gesturesRecipes = {
  "designbookmark-swipe-deck": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("swipe-deck") })),
  "kokonut-page-flip": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("page-flip") })),
  "designbookmark-fan-cards": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("fan-cards") })),
  "designbookmark-parallax-ticket": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("parallax-ticket") })),
  "designbookmark-glass-lens": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("glass-lens") })),
  "designbookmark-pull-to-refresh": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("pull-to-refresh") })),
  "designbookmark-morph-island": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("morph-island") })),
  "designbookmark-expand-card": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("expand-card") })),
  "designbookmark-profile-card": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("profile-card") })),
  "kokonut-boarding-pass": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("boarding-pass") })),
  "designbookmark-stat-card": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("stat-card") })),
  "designbookmark-goo-morph": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("goo-morph") })),
  "designbookmark-goo-menu": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("goo-menu") })),
  "smoothui-unlock-face-id": () => import("./stories/card-studies").then((module) => ({ default: module.cardStory("unlock-face-id") })),
} satisfies RecipeLoaders;

export function GesturesExample({ id, ...options }: RecipeOptions & { id: keyof typeof gesturesRecipes }) {
  return <RecipeExample key={id} load={gesturesRecipes[id]} {...options} />;
}
