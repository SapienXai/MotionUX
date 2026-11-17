export const operationsTasks = [
  { id: "dispatch", title: ["Verify dispatch checklist", "Sevkiyat kontrol listesini doğrula"], owner: "Avery Lane", priority: "high" },
  { id: "handover", title: ["Publish shift handover", "Vardiya devir notunu yayımla"], owner: "Morgan Blake", priority: "normal" },
  { id: "spares", title: ["Count equipment spares", "Yedek ekipmanları say"], owner: "Casey Reid", priority: "normal" },
  { id: "access", title: ["Review visitor access log", "Ziyaretçi giriş kaydını incele"], owner: "Casey Reid", priority: "high" },
] as const;

export type OperationsTaskId = (typeof operationsTasks)[number]["id"];

export function readTaskProgress(value: string | null): OperationsTaskId[] {
  if (!value || value.length > 512) return [];
  try {
    const stored: unknown = JSON.parse(value);
    return Array.isArray(stored)
      ? operationsTasks.filter(({ id }) => stored.includes(id)).map(({ id }) => id)
      : [];
  } catch {
    return [];
  }
}
