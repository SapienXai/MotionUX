import { expect } from "@playwright/test";

const button = (name, key = "Enter") => ["button", name, "press", key];
const fill = (name, value) => ["textbox", name, "fill", value];
const slider = (name, key) => ["slider", name, "press", key];
const current = (selector, attribute, value) => ({ selector, attribute, value });
const text = (selector, value) => ({ selector, text: value });
const status = value => text('[role="status"]', value);
const confirmation = name => ({ actions: [button(name), ["button", /^Confirm$/, "click"]], result: status("Confirmed intents · 1") });
const audioPlayback = {
  actions: [["button", "Play sample", "click"]],
  result: { selector: "audio", verify: async audio => {
    await expect.poll(() => audio.evaluate(node => !node.paused && node.currentTime > 0)).toBe(true);
    await audio.locator("..").getByRole("button", { name: "Pause sample" }).click();
    await expect.poll(() => audio.evaluate(node => node.paused)).toBe(true);
    const seek = audio.locator("..").getByRole("slider", { name: "Sample position" });
    if (await seek.count()) {
      await seek.press("End");
      await expect.poll(() => audio.evaluate(node => node.currentTime)).toBeGreaterThan(0);
      await seek.press("Home");
      await expect(seek).toHaveValue("0");
      await expect.poll(() => audio.evaluate(node => node.currentTime)).toBe(0);
    }
  } },
};
const emphasis = (name, phrase) => ({
  before: sample => sample.locator('[data-mx-type] > [aria-hidden="true"]').elementHandle(),
  actions: [button(name)],
  result: { selector: ".mx-type-assist", verify: async (output, previous) => {
    await expect(output).toHaveText(phrase);
    await expect.poll(() => previous.evaluate(node => node.isConnected)).toBe(false);
  } },
});
const reveal = phrase => ({
  normalMotion: true,
  actions: [button("Replay reveal")],
  result: { selector: ".mx-type-display", verify: async output => {
    await expect(output).not.toHaveText(phrase);
    await expect(output).toHaveAttribute("aria-hidden", "true");
    await expect(output).toHaveText(phrase);
  } },
});

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
  "designbookmark-bottom-bar": {
    actions: [["link", "Schedule", "press", "Enter"]],
    result: current("a:has-text('Schedule')", "aria-current", "page"),
  },
  "designbookmark-command-palette": { actions: [button("Search commands"), button("Create note")], result: status("Create note") },
  "designbookmark-copy-button": {
    before: sample => sample.page().evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async value => { document.body.dataset.clipboardFixture = value; } } });
    }),
    actions: [button("Copy access code")],
    result: { selector: '[role="status"]', verify: async output => {
      await expect(output).toHaveText("Copied");
      await expect(output.page().locator("body")).toHaveAttribute("data-clipboard-fixture", "studio-access-2026");
    } },
  },
  "designbookmark-fan-cards": { actions: [button("Spread notes"), button("Valley notes")], result: text("h3", "Valley notes") },
  "designbookmark-file-drop": {
    actions: [async sample => {
      const input = sample.getByLabel("Select or drop files");
      await input.setInputFiles({ name: "demo.csv", mimeType: "text/csv", buffer: Buffer.from("test") });
      await expect(sample.getByText(/Unsupported file type/)).toBeVisible();
      await input.setInputFiles({ name: "demo.txt", mimeType: "text/plain", buffer: Buffer.from("test") });
    }],
    result: { selector: "li", text: "demo.txt" },
  },
  "designbookmark-ghost-suggestion": {
    actions: [fill(/Try typing/, "fo"), button("Accept suggestion")],
    result: current("input", "value", "forest trail"),
  },
  "designbookmark-hold-to-publish": confirmation("Hold to publish"),
  "designbookmark-parallax-ticket": {
    normalMotion: true,
    actions: [async sample => {
      const page = sample.page();
      const card = sample.locator("article");
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      await page.mouse.move(box.x + 12, box.y + 10);
      await expect(card).not.toHaveCSS("transform", "none");
      await page.mouse.move(1, 1);
    }],
    result: { selector: "article", style: "transform", value: "none" },
  },
  "designbookmark-password-strength": {
    actions: [["password", "New password", "fill", "Synthetic-2026"]],
    result: { selector: ".mx-password-rules", verify: async rules => {
      await expect(rules.locator('[data-met="true"]')).toHaveCount(2);
    } },
  },
  "designbookmark-prompt-box": {
    actions: [fill("Demo prompt", "Describe a quieter route"), button("Send demo"), button("Stop demo")],
    result: status("Demo stopped · Describe a quieter route"),
  },
  "designbookmark-pull-to-refresh": { actions: [button("Refresh notes")], result: status("Demo revision 1") },
  "designbookmark-range-slider": {
    actions: [slider(/Minimum/, "End"), slider(/Maximum/, "Home")],
    result: { role: "slider", name: "Maximum", attribute: "value", value: "75" },
  },
  "designbookmark-roll-links": { actions: [["link", "Open journal note", "press", "Enter"]], result: status("A note from the valley.") },
  "designbookmark-scramble-text": reveal("Signal through mist"),
  "designbookmark-sidebar-collapse": {
    actions: [button("Toggle labels")],
    result: { role: "button", name: "Toggle labels", attribute: "aria-expanded", value: "false" },
  },
  "designbookmark-star-rating": {
    actions: [["radio", "3 out of 5 stars", "press", "ArrowRight"]],
    result: { role: "radio", name: "4 out of 5 stars", checked: true },
  },
  "designbookmark-stat-card": {
    actions: [["radio", "Week", "press", "ArrowRight"]],
    result: text(".mx-stat-heading small", "Up 8% this month"),
  },
  "designbookmark-streaming-reply": {
    actions: [button("Start reply")],
    result: { selector: ".mx-reply-copy", verify: async output => {
      await expect(output).toContainText("Stop beside the river.");
    } },
  },
  "designbookmark-weight-wave": emphasis("Replay emphasis", "A slower journey"),
  "kokonut-agent-steps": {
    actions: [button(/Collect inputs/)],
    result: current('button[aria-expanded="true"]', "aria-expanded", "true"),
  },
  "kokonut-boarding-pass": { actions: [button(/Istanbul.*Copenhagen/)], result: text('dd:has-text("14A")', "14A") },
  "kokonut-cart-button": { actions: [button(/Add to bag/)], result: text(".mx-action-count", "1") },
  "kokonut-detent-dial": { actions: [slider("Gain", "Home")], result: current("input[type=range]", "value", "0") },
  "kokonut-glass-player": audioPlayback,
  "kokonut-hold-button": confirmation("Hold to arm"),
  "kokonut-marker-text": emphasis("Replay emphasis", "On the ridge"),
  "kokonut-page-flip": { actions: [button("Next note")], result: text("h3", "A slower river") },
  "kokonut-slide-to-confirm": confirmation("Slide to confirm"),
  "kokonut-smooth-tab": {
    actions: [["tab", "Colour", "press", "Enter"]],
    result: { role: "tab", name: "Colour", attribute: "aria-selected", value: "true" },
  },
  "kokonut-stack-panel": {
    actions: [button("Release schedule")],
    result: { role: "button", name: "Release schedule", attribute: "aria-expanded", value: "true" },
  },
  "kokonut-thinking-text": { actions: [button("Try phases")], result: status("Demo finished") },
  "kokonut-toolbar": {
    actions: [button("Align center")],
    result: { selector: '[data-testid="formatted-text"]', style: "text-align", value: "center" },
  },
  "kokonut-typewriter": reveal("The trail runs east"),
  "smoothui-music-toggle": audioPlayback,
  "smoothui-unlock-face-id": { actions: [button("Play simulation")], result: status("Simulation finished") },
};

// React fragment IDs differ in the two app trees. Keep route order and selection in the comparison.
export function normalizeRecipeAria(snapshot) {
  return snapshot.replace(/#dock-[^\s]+-(\d+)/g, "#dock-:instance-$1");
}

export async function activateRecipes(samples, id) {
  const interaction = recipeInteractions[id];
  const steps = await Promise.all(samples.map(async sample => {
    const { result } = interaction;
    const control = result.role ? sample.getByRole(result.role, { name: result.name, exact: typeof result.name === "string" }) : sample.locator(result.selector);
    const before = await interaction.before?.(sample);
    for (const action of interaction.actions) {
      if (typeof action === "function") { await action(sample); continue; }
      const [role, name, operation, value] = action;
      const target = role === "password" ? sample.getByLabel(name) : sample.getByRole(role, { name }).first();
      await target[operation](value);
    }
    if (result.verify) await result.verify(control, before);
    else if (interaction.result.inlineStyle) await expect.poll(() => control.evaluate((node, name) => node.style.getPropertyValue(name), interaction.result.inlineStyle)).toBe(interaction.result.value);
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
  const ariaMatch = normalizeRecipeAria(steps[0].aria) === normalizeRecipeAria(steps[1].aria);
  return { ariaMatch, semanticMatch: JSON.stringify(steps[0].semantic) === JSON.stringify(steps[1].semantic),
    ...(!ariaMatch ? { studioAria: steps[0].aria, consumerAria: steps[1].aria } : {}) };

}
