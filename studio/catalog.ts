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
  "designbookmark-morph-tooltip": () => import("./demos/morph-tooltip"),
  "designbookmark-spring-dropdown": () => import("./demos/action-menus").then((module) => ({ default: module.menuStory("dropdown") })),
  "designbookmark-dynamic-menu": () => import("./demos/action-menus").then((module) => ({ default: module.menuStory("dynamic") })),
  "kokonut-morph-popover": () => import("./demos/action-menus").then((module) => ({ default: module.menuStory("morph") })),
  "designbookmark-rubber-dock": () => import("./demos/rubber-dock"),
  "designbookmark-sidebar-collapse": () => import("./demos/sidebar-collapse"),
  "kokonut-smooth-tab": () => import("./demos/swipe-tabs"),
  "kokonut-toolbar": () => import("./demos/motion-toolbar"),
  "kokonut-stack-panel": () => import("./demos/stack-panel"),
  "designbookmark-plan-switch": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("plan-switch") })),
  "designbookmark-hold-to-publish": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("hold-to-publish") })),
  "kokonut-hold-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("hold-button") })),
  "kokonut-slide-to-confirm": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("slide-to-confirm") })),
  "designbookmark-loading-to-success": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("loading-to-success") })),
  "designbookmark-copy-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("copy-button") })),
  "designbookmark-like-burst": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("like-burst") })),
  "designbookmark-magnetic-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("magnetic-button") })),
  "designbookmark-command-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("designbookmark-command-button") })),
  "kokonut-command-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("kokonut-command-button") })),
  "kokonut-cart-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("cart-button") })),
  "kokonut-bell-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("bell-button") })),
  "kokonut-undo-button": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("undo-button") })),
  "designbookmark-toggle-switch": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("toggle-switch") })),
  "kokonut-notification-stack": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("notification-stack") })),
  "designbookmark-step-progress": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("step-progress") })),
  "kokonut-agent-steps": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("agent-steps") })),
  "kokonut-tool-approval": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("tool-approval") })),
  "designbookmark-goo-thinking": () => import("./demos/feedback-studies").then((module) => ({ default: module.feedbackStory("goo-thinking") })),
  "designbookmark-letter-limit": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("letter-limit") })),
  "designbookmark-springy-input": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("springy-input") })),
  "designbookmark-otp-code": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("otp-code") })),
  "designbookmark-tag-input": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("tag-input") })),
  "designbookmark-password-strength": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("password-strength") })),
  "designbookmark-jelly-slider": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("jelly-slider") })),
  "smoothui-exposure-slider": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("exposure-slider") })),
  "kokonut-detent-dial": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("detent-dial") })),
  "designbookmark-range-slider": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("range-slider") })),
  "designbookmark-number-stepper": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("number-stepper") })),
  "designbookmark-star-rating": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("star-rating") })),
  "designbookmark-checkbox-list": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("checkbox-list") })),
  "designbookmark-file-drop": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("file-drop") })),
  "kokonut-card-field": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("card-field") })),
  "kokonut-signature-pad": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("signature-pad") })),
  "kokonut-wheel-picker": () => import("./demos/input-studies").then((module) => ({ default: module.inputStory("wheel-picker") })),
};
