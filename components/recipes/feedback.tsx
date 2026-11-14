"use client";

import { RecipeExample, type RecipeOptions } from "./example";
import type { RecipeLoaders } from "./specimen";

export const feedbackRecipes = {
  "designbookmark-plan-switch": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("plan-switch") })),
  "designbookmark-hold-to-publish": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("hold-to-publish") })),
  "kokonut-hold-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("hold-button") })),
  "kokonut-slide-to-confirm": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("slide-to-confirm") })),
  "designbookmark-loading-to-success": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("loading-to-success") })),
  "designbookmark-copy-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("copy-button") })),
  "designbookmark-like-burst": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("like-burst") })),
  "designbookmark-magnetic-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("magnetic-button") })),
  "designbookmark-command-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("designbookmark-command-button") })),
  "kokonut-command-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("kokonut-command-button") })),
  "kokonut-cart-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("cart-button") })),
  "kokonut-bell-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("bell-button") })),
  "kokonut-undo-button": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("undo-button") })),
  "designbookmark-toggle-switch": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("toggle-switch") })),
  "kokonut-notification-stack": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("notification-stack") })),
  "designbookmark-step-progress": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("step-progress") })),
  "kokonut-agent-steps": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("agent-steps") })),
  "kokonut-tool-approval": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("tool-approval") })),
  "designbookmark-goo-thinking": () => import("./stories/feedback-studies").then((module) => ({ default: module.feedbackStory("goo-thinking") })),
} satisfies RecipeLoaders;

export function FeedbackExample({ id, ...options }: RecipeOptions & { id: keyof typeof feedbackRecipes }) {
  return <RecipeExample key={id} load={feedbackRecipes[id]} {...options} />;
}
