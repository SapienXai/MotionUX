"use client";

import { RecipeExample, type RecipeOptions } from "./example";
import type { RecipeLoaders } from "./specimen";

export const inputsRecipes = {
  "designbookmark-letter-limit": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("letter-limit") })),
  "designbookmark-springy-input": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("springy-input") })),
  "designbookmark-otp-code": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("otp-code") })),
  "designbookmark-tag-input": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("tag-input") })),
  "designbookmark-password-strength": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("password-strength") })),
  "designbookmark-jelly-slider": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("jelly-slider") })),
  "smoothui-exposure-slider": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("exposure-slider") })),
  "kokonut-detent-dial": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("detent-dial") })),
  "designbookmark-range-slider": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("range-slider") })),
  "designbookmark-number-stepper": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("number-stepper") })),
  "designbookmark-star-rating": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("star-rating") })),
  "designbookmark-checkbox-list": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("checkbox-list") })),
  "designbookmark-file-drop": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("file-drop") })),
  "kokonut-card-field": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("card-field") })),
  "kokonut-signature-pad": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("signature-pad") })),
  "kokonut-wheel-picker": () => import("./stories/input-studies").then((module) => ({ default: module.inputStory("wheel-picker") })),
} satisfies RecipeLoaders;

export function InputsExample({ id, ...options }: RecipeOptions & { id: keyof typeof inputsRecipes }) {
  return <RecipeExample key={id} load={inputsRecipes[id]} {...options} />;
}
