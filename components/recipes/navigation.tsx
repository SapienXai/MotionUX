"use client";

import { RecipeExample, type RecipeOptions } from "./example";
import type { RecipeLoaders } from "./specimen";

export const navigationRecipes = {
  "designbookmark-tab-pill": () => import("./stories/tab-pill"),
  "designbookmark-bottom-bar": () => import("./stories/bottom-bar"),
  "designbookmark-segmented-control": () => import("./stories/segmented-control"),
  "designbookmark-pagination-dots": () => import("./stories/pagination-dots"),
  "designbookmark-command-palette": () => import("./stories/command-palette"),
  "designbookmark-pull-cord": () => import("./stories/pull-cord"),
  "designbookmark-morph-tooltip": () => import("./stories/morph-tooltip"),
  "designbookmark-spring-dropdown": () => import("./stories/action-menus").then((module) => ({ default: module.menuStory("dropdown") })),
  "designbookmark-dynamic-menu": () => import("./stories/action-menus").then((module) => ({ default: module.menuStory("dynamic") })),
  "kokonut-morph-popover": () => import("./stories/action-menus").then((module) => ({ default: module.menuStory("morph") })),
  "designbookmark-rubber-dock": () => import("./stories/rubber-dock"),
  "designbookmark-sidebar-collapse": () => import("./stories/sidebar-collapse"),
  "kokonut-smooth-tab": () => import("./stories/swipe-tabs"),
  "kokonut-toolbar": () => import("./stories/motion-toolbar"),
  "kokonut-stack-panel": () => import("./stories/stack-panel"),
} satisfies RecipeLoaders;

export function NavigationExample({ id, ...options }: RecipeOptions & { id: keyof typeof navigationRecipes }) {
  return <RecipeExample key={id} load={navigationRecipes[id]} {...options} />;
}
