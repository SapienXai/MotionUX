import { expect } from "@playwright/test";

const button = (name, key = "Enter") => ["button", name, "press", key];
const fill = (name, value) => ["textbox", name, "fill", value];
const slider = (name, key) => ["slider", name, "press", key];
const current = (selector, attribute, value) => ({ selector, attribute, value });
const text = (selector, value) => ({ selector, text: value });

export const recipeInteractions = {
  "designbookmark-plan-switch": { actions: [["radio", "Monthly", "press", "ArrowRight"]], result: text(".mx-demo-sample strong", "$120") },
  "designbookmark-letter-limit": { actions: [fill("Caption", "👩‍🎨" + "a".repeat(25))], result: current("textarea", "value", "👩‍🎨" + "a".repeat(19)) },
  "designbookmark-pull-cord": { actions: [button("Studio light", "Space")], result: current("button[aria-pressed]", "aria-pressed", "true") },
  "designbookmark-springy-input": { actions: [fill("Project name", "A project title longer than the limit")], result: current("input", "aria-invalid", "true") },
  "designbookmark-rubber-dock": { actions: [["link", "Capture", "press", "Enter"]], result: text("a[aria-current]", "Capture") },
  "designbookmark-jelly-slider": { actions: [slider("Elasticity", "End")], result: current("input[type=range]", "aria-valuetext", "100%") },
  "designbookmark-morph-island": { actions: [button(/Export activity/)], result: current("button[aria-expanded]", "aria-expanded", "true") },
  "designbookmark-goo-menu": { actions: [button("Journal actions", "ArrowDown"), button("Add a note")], result: text('[role="status"]', "Add a note") },
  "designbookmark-goo-morph": { actions: [button("Change shape")], result: text('[role="status"]', "Current") },
  "designbookmark-glass-lens": { actions: [button(/Toggle magnification/), button(/Toggle magnification/, "ArrowRight")], result: { selector: ".mx-lens-glass", inlineStyle: "left", value: "57%" } },
  "designbookmark-otp-code": { actions: [fill("Verification code", "012-345-678")], result: current("input", "value", "012345") },
  "designbookmark-word-roll": { actions: [button("Next phrase")], result: text("[data-mx-type]", "Canopy") },
  "designbookmark-read-along": { actions: [button("Next line")], result: text("[aria-current]", "Follow the river below the hill.") },
  "designbookmark-tag-input": { actions: [fill("Tags", "Kyoto"), ["textbox", "Tags", "press", "Enter"]], result: current("button[aria-label='Remove Kyoto']", "aria-label", "Remove Kyoto") },
  "kokonut-dynamic-text": { actions: [button("Next phrase")], result: text("[data-mx-type]", "Light crosses the valley") },
  "smoothui-exposure-slider": { actions: [slider("Exposure", "End")], result: { selector: "img", style: "filter", value: "brightness(2)" } },
  "smoothui-scrubber": { actions: [slider("Seek position", "End")], result: current("input[type=range]", "aria-valuetext", "2:00") },
  "smoothui-siri-orb": { actions: [button("Toggle signal")], result: text('[role="status"]', "Simulated signal active") },
};

export async function activateRecipes(samples, id) {
  const interaction = recipeInteractions[id];
  const steps = await Promise.all(samples.map(async sample => {
    const control = sample.locator(interaction.result.selector);
    for (const [role, name, operation, value] of interaction.actions) {
      await sample.getByRole(role, { name }).first()[operation](value);
    }
    if (interaction.result.inlineStyle) await expect.poll(() => control.evaluate((node, name) => node.style.getPropertyValue(name), interaction.result.inlineStyle)).toBe(interaction.result.value);
    else if (interaction.result.style) await expect(control).toHaveCSS(interaction.result.style, interaction.result.value);
    else if (interaction.result.attribute === "value") await expect(control).toHaveValue(interaction.result.value);
    else if (interaction.result.attribute) await expect(control).toHaveAttribute(interaction.result.attribute, interaction.result.value);
    else await expect(control).toHaveText(interaction.result.text);
    return {
      aria: await sample.ariaSnapshot(),
      semantic: await control.evaluate(node => ({
        value: "value" in node ? node.value : null,
        checked: "checked" in node ? node.checked : null,
        expanded: node.getAttribute("aria-expanded"),
        pressed: node.getAttribute("aria-pressed"),
        invalid: node.getAttribute("aria-invalid"),
        role: node.getAttribute("role"),
      })),
    };
  }));
  return { ariaMatch: steps[0].aria === steps[1].aria, semanticMatch: JSON.stringify(steps[0].semantic) === JSON.stringify(steps[1].semantic) };
}
