export async function openProjectActions(page) {
  const dialog = page.getByRole("dialog", { name: "Project actions" });
  if (!await dialog.isVisible()) await page.getByRole("button", { name: "Export and actions", exact: true }).click();
  return dialog;
}

export async function openSourceProperties(page) {
  const panel = page.getByRole("complementary", { name: /Application controls|Section properties/ });
  if (await panel.isVisible()) {
    const style = panel.getByText("Style", { exact: true });
    if (await style.count() && !await style.evaluate((summary) => summary.closest("details").open)) await style.click();
    return panel;
  }
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  return page.getByRole("dialog", { name: /Application controls|Section properties/ });
}

export async function exportFromSourceEditor(page, label) {
  const actions = await openProjectActions(page);
  const download = page.waitForEvent("download");
  await actions.getByRole("button", { name: label, exact: true }).click();
  const file = await download;
  await actions.getByRole("button", { name: "Close", exact: true }).click();
  return file;
}
