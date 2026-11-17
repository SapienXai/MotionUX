export async function sourceTarget(page, step) {
  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog")).filter({ visible: true });
  if (await dialog.count() === 1) {
    const scoped = dialog.getByRole(step.role, { name: step.name, exact: true });
    if (await scoped.count()) return scoped;
  }
  return page.getByRole(step.role, { name: step.name, exact: true });
}

export async function performSourceStep(page, step) {
  const target = await sourceTarget(page, step);
  if (step.action === "click") await target.click();
  else if (step.action === "fill") await target.fill(step.value);
  else if (step.action === "select") await target.selectOption(step.value);
  else if (step.action === "press") await target.press(step.value);
  else if (step.action === "hover") await target.hover();
  else if (step.action === "wheel" || step.action === "drag") {
    if (!/^-?\d{1,3},-?\d{1,3}$/.test(step.value)) throw new Error("Invalid pointer delta.");
    const [dx, dy] = step.value.split(",").map(Number);
    if (Math.abs(dx) > 800 || Math.abs(dy) > 800) throw new Error("Pointer delta exceeds its bound.");
    await target.hover();
    if (step.action === "wheel") await page.mouse.wheel(dx, dy);
    else {
      const box = await target.boundingBox();
      if (!box) throw new Error("The drag target is not rendered.");
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      try { await page.mouse.move(x + dx, y + dy, { steps: 8 }); }
      finally { await page.mouse.up(); }
    }
  } else throw new Error("Unsupported source action.");
  return target;
}
