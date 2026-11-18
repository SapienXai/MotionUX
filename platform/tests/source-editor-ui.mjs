export async function openProjectActions(page) {
  const dialog = page.getByRole("dialog", { name: "Project actions" });
  if (!await dialog.isVisible()) await page.getByRole("button", { name: "Export and actions", exact: true }).click();
  return dialog;
}

export async function openSourceProperties(page) {
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  return page.getByRole("complementary", { name: "Source properties" });
}

export async function exportFromSourceEditor(page, label) {
  const actions = await openProjectActions(page);
  const download = page.waitForEvent("download");
  await actions.getByRole("button", { name: label, exact: true }).click();
  const file = await download;
  await actions.getByRole("button", { name: "Close", exact: true }).click();
  return file;
}
