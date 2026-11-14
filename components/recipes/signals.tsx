"use client";

import { RecipeExample, type RecipeOptions } from "./example";
import type { RecipeLoaders } from "./specimen";

export const signalsRecipes = {
  "designbookmark-word-roll": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("word-roll") })),
  "designbookmark-weight-wave": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("weight-wave") })),
  "designbookmark-scramble-text": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("scramble-text") })),
  "designbookmark-read-along": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("read-along") })),
  "designbookmark-roll-links": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("roll-links") })),
  "kokonut-marker-text": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("marker-text") })),
  "kokonut-dynamic-text": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("dynamic-text") })),
  "kokonut-typewriter": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("typewriter") })),
  "designbookmark-prompt-box": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("prompt-box") })),
  "designbookmark-ghost-suggestion": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("ghost-suggestion") })),
  "designbookmark-streaming-reply": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("streaming-reply") })),
  "kokonut-voice-input": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("voice-input") })),
  "kokonut-thinking-text": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("thinking-text") })),
  "smoothui-task-list": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("task-list") })),
  "smoothui-siri-orb": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("siri-orb") })),
  "smoothui-scrubber": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("scrubber") })),
  "kokonut-glass-player": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("glass-player") })),
  "smoothui-music-toggle": () => import("./stories/signal-studies").then((module) => ({ default: module.signalStory("music-toggle") })),
} satisfies RecipeLoaders;

export function SignalsExample({ id, ...options }: RecipeOptions & { id: keyof typeof signalsRecipes }) {
  return <RecipeExample key={id} load={signalsRecipes[id]} {...options} />;
}
