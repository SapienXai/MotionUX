import { expect, test } from "@playwright/test";

for (const [id, result] of [
  ["designbookmark-word-roll", "Canopy"],
  ["kokonut-dynamic-text", "Light crosses the valley"],
]) {
  test(`${id} changes the intended accessible phrase`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    await page.getByRole("button", { name: "Next phrase" }).click();
    const stage = page.getByTestId("specimen-interaction");
    await expect(stage.locator(".mx-type-assist")).toHaveText(result);
    await expect(stage.locator(".mx-type-visible")).toHaveCount(1);
  });
}

for (const [id, variant, text] of [
  ["designbookmark-weight-wave", "weight", "A slower journey"],
  ["kokonut-marker-text", "marker", "On the ridge"],
]) {
  test(`${variant} replays while preserving the readable phrase`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    const root = page.locator(`[data-mx-type="${variant}"]`);
    const prior = await root.locator(":scope > [aria-hidden=true]").elementHandle();
    await page.getByRole("button", { name: "Replay emphasis" }).press("Enter");
    await expect(root.locator(".mx-type-assist")).toHaveText(text);
    await expect.poll(() => prior?.evaluate((el) => el.isConnected)).toBe(false);
    await expect(root.locator(":scope > [aria-hidden=true]")).toHaveText(text);
  });
}

for (const [id, variant, text] of [
  ["designbookmark-scramble-text", "scramble", "Signal through mist"],
  ["kokonut-typewriter", "typewriter", "The trail runs east"],
]) {
  test(`${variant} reaches its exact final text and hides interim glyphs`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    const root = page.locator(`[data-mx-type="${variant}"]`);
    await page.getByRole("button", { name: "Replay reveal" }).click();
    const display = root.locator(".mx-type-display");
    await expect(display).not.toHaveText(text);
    await expect(display).toHaveAttribute("aria-hidden", "true");
    await expect(root.locator(".mx-type-assist")).toHaveText(text);
    await expect(display).toHaveText(text);
  });
}

test("Read along marks the new phrase without removing the others", async ({ page }) => {
  await page.goto("/?item=designbookmark-read-along");
  await page.getByRole("button", { name: "Next line" }).click();
  const list = page.locator('[data-mx-type="read"]');
  await expect(list.locator("[aria-current]")).toHaveText("Follow the river below the hill.");
  await expect(list.getByRole("listitem")).toHaveCount(3);
});

test("Roll link retains its native destination and works from the keyboard", async ({ page }) => {
  await page.goto("/?item=designbookmark-roll-links");
  const link = page.getByRole("link", { name: "Open journal note" });
  await expect(link).toHaveAttribute("href", /#journal-note$/);
  await link.press("Enter");
  await expect(page.getByText("A note from the valley.")).toBeVisible();
});

test("Prompt box validates and honours native input and abort", async ({ page }) => {
  await page.goto("/?item=designbookmark-prompt-box");
  const prompt = page.getByRole("textbox", { name: "Demo prompt" });
  const send = page.getByRole("button", { name: "Send demo" });
  await expect(send).toBeDisabled();
  await prompt.fill("a".repeat(161));
  await expect(prompt).toHaveAttribute("aria-invalid", "true");
  await prompt.fill("Describe a quieter route");
  await prompt.press("Control+Enter");
  await page.getByRole("button", { name: "Stop demo" }).click();
  await expect(page.getByText(/Demo stopped · Describe a quieter route/)).toBeVisible();
});

test("Ghost completion refuses a middle caret and accepts at the end", async ({ page }) => {
  await page.goto("/?item=designbookmark-ghost-suggestion");
  const field = page.getByRole("textbox", { name: /Try typing/ });
  await field.fill("fo");
  const accept = page.getByRole("button", { name: "Accept suggestion" });
  await expect(accept).toBeVisible();
  await field.press("ArrowLeft");
  await expect(accept).toHaveCount(0);
  await field.press("ArrowRight");
  await expect(accept).toBeVisible();
  await field.press("ArrowRight");
  await expect(field).toHaveValue("forest trail");
});

test("Synthetic stream shows partial content and can complete after cancellation", async ({ page }) => {
  await page.goto("/?item=designbookmark-streaming-reply");
  const stage = page.getByTestId("specimen-interaction");
  await stage.getByRole("button", { name: "Start reply" }).press("Enter");
  await expect(stage.locator(".mx-reply-copy")).toContainText("At first light");
  await expect(stage.getByRole("button", { name: "Stop reply" })).toBeFocused();
  await stage.getByRole("button", { name: "Stop reply" }).press("Enter");
  await expect(stage.getByRole("status")).toHaveText("Demo stopped");
  await stage.getByRole("button", { name: "Start reply" }).press("Enter");
  await expect(stage.getByRole("status")).toHaveText("Demo finished");
  await expect(stage.getByRole("button", { name: "Start reply" })).toBeFocused();
  await expect(stage.locator(".mx-reply-copy")).toContainText("Stop beside the river.");
});

test("Voice input simulates its state without requesting the microphone", async ({ page }) => {
  await page.addInitScript(() => {
    if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => { document.documentElement.dataset.microphoneRequested = "true"; throw new Error("Unexpected microphone request"); },
    });
  });
  await page.goto("/?item=kokonut-voice-input");
  await page.getByRole("button", { name: "Simulate recording" }).click();
  await expect(page.getByText("Simulated recording", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop simulation" }).click();
  await expect(page.getByText("Demo stopped", { exact: true })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-microphone-requested");
});

test("Thinking phases do not change the functional live status", async ({ page }) => {
  await page.clock.install();
  await page.goto("/?item=kokonut-thinking-text");
  const stage = page.getByTestId("specimen-interaction");
  await stage.getByRole("button", { name: "Try phases" }).click();
  await expect(stage.getByRole("status")).toHaveText("Demo running");
  await page.clock.runFor(270);
  await expect(stage.getByText("Reading", { exact: true })).toBeVisible();
  await expect(stage.getByRole("status")).toHaveText("Demo running");
  await page.clock.runFor(1500);
  await expect(stage.getByRole("status")).toHaveText("Demo finished");
});

test("Task list toggles both directions and reports the count", async ({ page }) => {
  await page.goto("/?item=smoothui-task-list");
  const task = page.getByRole("checkbox", { name: "Review the map" });
  await task.press("Space");
  await expect(task).toBeChecked();
  await expect(page.getByText("1 of 2 complete")).toBeVisible();
  await task.press("Space");
  await expect(task).not.toBeChecked();
});

test("Signal orb preserves its status without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?item=smoothui-siri-orb");
  await page.getByRole("button", { name: "Toggle signal" }).click();
  await expect(page.getByText("Simulated signal active")).toBeVisible();
  await expect(page.locator(".mx-orb-sphere")).toHaveCSS("transform", "none");
});

test("Scrubber reports absolute keyboard seek time", async ({ page }) => {
  await page.goto("/?item=smoothui-scrubber");
  const scrubber = page.getByRole("slider", { name: "Seek position" });
  await scrubber.press("End");
  await expect(scrubber).toHaveAttribute("aria-valuetext", "2:00");
  await scrubber.press("Home");
  await expect(scrubber).toHaveAttribute("aria-valuetext", "0:00");
});

for (const [id, seek] of [["kokonut-glass-player", true], ["smoothui-music-toggle", false]] as const) {
  test(`${id} plays and pauses the actual synthetic audio asset`, async ({ page }) => {
    await page.goto(`/?item=${id}`);
    const stage = page.getByTestId("specimen-interaction");
    const audio = stage.locator("audio");
    // Verify native playback without depending on the headless runner's audio device.
    await audio.evaluate((element: HTMLAudioElement) => { element.muted = true; element.loop = true; });
    await stage.getByRole("button", { name: "Play sample" }).click();
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => !element.paused && element.currentTime > 0)).toBe(true);
    await stage.getByRole("button", { name: "Pause sample" }).click();
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
    if (seek) {
      const range = stage.getByRole("slider", { name: "Sample position" });
      await expect(range).toBeEnabled();
      await range.press("Home");
      await expect(range).toHaveAttribute("aria-valuetext", "0:00");
    }
  });
}
