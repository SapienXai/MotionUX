export const studioOrigin = "http://127.0.0.1:5200";
export const galleryOrigin = "http://127.0.0.1:5199";
export const appearanceKey = "motionux-studio-appearance";
export const projectPathKey = "motionux-studio-resume";
export const buildDraftKey = "motionux:kinetic-brief";
export const buildSelectionLimit = 4;

export function buildSourceIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > buildSelectionLimit ||
    !value.every((id) => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,95}$/.test(id)) ||
    new Set(value).size !== value.length) return;
  return value;
}

export type Appearance = "system" | "light" | "dark";
export const isAppearance = (value: unknown): value is Appearance =>
  value === "system" || value === "light" || value === "dark";

export function isBuildPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/build(?:\?project=[a-f0-9]{32})?$/.test(value)
  );
}

export function isGalleryPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "/" || value.startsWith("/?")) &&
    value.length <= 8192 &&
    !/[\r\n#]/.test(value)
  );
}
