export async function revealTemplates(page) {
  const shelf = page.getByText("Examples and templates", { exact: true });
  if (!await shelf.evaluate((node) => node.closest("details").open)) await shelf.click();
}

export async function chooseProjectExport(page, pwa = false) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog", { name: "Export application", exact: true })
    .getByRole("button", { name: pwa ? "Export PWA" : "Export Next.js", exact: true }).click();
}
