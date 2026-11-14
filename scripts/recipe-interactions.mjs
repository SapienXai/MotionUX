import { expect } from "@playwright/test";

const button = (name, key = "Enter") => ["button", name, "press", key];
const fill = (name, value) => ["textbox", name, "fill", value];
const slider = (name, key) => ["slider", name, "press", key];
const current = (selector, attribute, value) => ({ selector, attribute, value });
const text = (selector, value) => ({ selector, text: value });

export const recipeInteractions = {
  "designbookmark-plan-switch": { actions: [["radio", "Monthly", "press", "ArrowRight"]], result: text(".mx-plan-price .mx-demo-sr", "$16") },
  "designbookmark-letter-limit": { actions: [fill("Caption", "👩‍🎨" + "a".repeat(70))], result: current("textarea", "value", "👩‍🎨" + "a".repeat(63)) },
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
  "designbookmark-morph-tooltip": { actions: [["button", "About image quality", "focus"]], result: text('[role="tooltip"]', /exported file size/) },
  "designbookmark-spring-dropdown": { actions: [button("Sort by", "ArrowDown"), ["menuitem", "Oldest", "press", "Enter"]], result: text('[role="status"]', "Oldest") },
  "designbookmark-dynamic-menu": { actions: [button("More actions", "ArrowUp"), ["menuitem", "Archive", "press", "Enter"]], result: text('[role="status"]', "Archive") },
  "designbookmark-segmented-control": { actions: [["radio", "Week", "press", "ArrowRight"]], result: text(".mx-demo-sample strong", "213") },
  "designbookmark-pagination-dots": { actions: [button("Page 4")], result: current('button[aria-current="true"]', "aria-label", "Page 4") },
  "designbookmark-like-burst": { actions: [button("Like")], result: current("button[aria-pressed]", "aria-pressed", "true") },
  "kokonut-bell-button": { actions: [button("Alerts")], result: current("button[aria-pressed]", "aria-pressed", "true") },
  "designbookmark-magnetic-button": { actions: [button("Open collection")], result: text("p", "Opened · 1") },
  "designbookmark-command-button": { actions: [button(/Export draft/)], result: text("p", "Invocations · 1") },
  "kokonut-command-button": { actions: [button(/Open workspace/)], result: text("p", "Invocations · 1") },
  "kokonut-undo-button": { actions: [button("Undo")], result: text('[role="status"]', "Item restored") },
  "designbookmark-toggle-switch": { actions: [["switch", "Quiet hours", "press", "Space"]], result: current("[data-mx-switch]", "data-active", "true") },
  "designbookmark-step-progress": { actions: [button("Advance demo")], result: text('[aria-current="step"]', /Review/) },
  "kokonut-notification-stack": { actions: [button(/Updates/), button("Dismiss Draft ready")], result: text(".mx-notice-toggle > span", "2") },
  "kokonut-tool-approval": { actions: [button("Deny")], result: current("[data-mx-approval]", "data-mx-approval", "denied") },
  "designbookmark-goo-thinking": { actions: [button("Start demo")], result: text('[role="status"]', "Waiting for reply") },
  "designbookmark-number-stepper": { actions: [button("Remove one guest")], result: current("input", "value", "1") },
  "designbookmark-checkbox-list": { actions: [["checkbox", "Private terrace", "press", "Space"]], result: text('[data-mx-values="checkbox"] p', "1 selected") },
  "kokonut-card-field": { actions: [fill("Card number", "4242424242424242")], result: current('input[autocomplete="cc-number"]', "value", "4242 4242 4242 4242") },
  "kokonut-wheel-picker": { actions: [["radio", "14:00", "press", "ArrowDown"]], result: { role: "radio", name: "15:00", checked: true } },
  "kokonut-signature-pad": { actions: [fill("Type your name", "Studio"), button("Clear signature")], result: { role: "textbox", name: "Type your name", attribute: "value", value: "" } },
  "kokonut-voice-input": { actions: [button("Simulate recording"), button("Stop simulation")], result: text('[role="status"]', "Demo stopped") },
  "smoothui-task-list": { actions: [["checkbox", "Review the map", "press", "Space"]], result: text('[data-mx-async="tasks"] p', "1 of 2 complete") },
  "smoothui-siri-orb": { actions: [button("Toggle signal")], result: text('[role="status"]', "Simulated signal active") },
};

export async function activateRecipes(samples, id) {
  const interaction = recipeInteractions[id];
  const steps = await Promise.all(samples.map(async sample => {
    const { result } = interaction;
    const control = result.role ? sample.getByRole(result.role, { name: result.name, exact: true }) : sample.locator(result.selector);
    for (const [role, name, operation, value] of interaction.actions) {
      await sample.getByRole(role, { name }).first()[operation](value);
    }
    if (interaction.result.inlineStyle) await expect.poll(() => control.evaluate((node, name) => node.style.getPropertyValue(name), interaction.result.inlineStyle)).toBe(interaction.result.value);
    else if (interaction.result.style) await expect(control).toHaveCSS(interaction.result.style, interaction.result.value);
    else if (result.checked) await expect(control).toBeChecked();
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
