import { navigationRecipes } from "../components/recipes/navigation";
import { feedbackRecipes } from "../components/recipes/feedback";
import { inputsRecipes } from "../components/recipes/inputs";
import { gesturesRecipes } from "../components/recipes/gestures";
import { signalsRecipes } from "../components/recipes/signals";
import type { RecipeLoaders } from "../components/recipes/specimen";
import "../components/recipes/theme.css";
import inventory from "../metadata/reference-inventory.json";

export const references = inventory.items;
export type Reference = (typeof references)[number];
export const labels: Record<string, string> = {
  navigation: "Navigation", feedback: "Feedback", inputs: "Inputs", gestures: "Gestures & cards",
  text: "Typography", ai: "AI", media: "Media",
};

export type { Specimen } from "../components/recipes/specimen";

export const recipeFamilies = { navigation: navigationRecipes, feedback: feedbackRecipes, inputs: inputsRecipes, gestures: gesturesRecipes, signals: signalsRecipes };
export const previews: RecipeLoaders = { ...navigationRecipes, ...feedbackRecipes, ...inputsRecipes, ...gesturesRecipes, ...signalsRecipes };
