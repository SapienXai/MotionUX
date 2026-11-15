import { expect } from "@playwright/test";

export async function visibleSource(frame, item, installed = false) {
  await expect(frame).toHaveAttribute("data-preview-state", "ready", { timeout: 5000 });
  let context = frame.frameLocator("iframe");
  if (item.sourceKind === "html" && (installed || (await frame.getAttribute("data-preview-lane")) === "studio")) context = context.frameLocator("iframe");
  const root = context.locator(item.sourceKind === "html" ? "body" : item.group === "designbookmark" ? "#root" : "#specimen");
  await expect(root).toBeAttached({ timeout: 4000 });
  let result;
  await expect.poll(async () => {
    result = await root.evaluate(node => ({
      controls: node.querySelectorAll("button, input, select, [tabindex], [role]").length,
      visible: [...node.querySelectorAll("*")].some(element => {
        if (["SCRIPT", "STYLE", "LINK", "DEFS"].includes(element.tagName)) return false;
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return bounds.width > 1 && bounds.height > 1 && bounds.right > 0 && bounds.bottom > 0 &&
          bounds.left < innerWidth && bounds.top < innerHeight && style.visibility === "visible" && style.opacity !== "0";
      }),
      viewport: { width: innerWidth, height: innerHeight },
      overflow: { horizontal: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        vertical: Math.max(0, document.documentElement.scrollHeight - innerHeight) },
    }));
    return result.visible;
  }, { timeout: 4000 }).toBe(true);
  return result;
}
