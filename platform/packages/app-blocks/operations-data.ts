import type { TaskRecord } from "@motionux/build-core";

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

export function starterTasks(locale: "en" | "tr"): TaskRecord[] {
  return operationsTasks.map(({ id, title, owner, priority }) => ({
    id, title: title[locale === "tr" ? 1 : 0], owner, priority, summary: "", status: "open",
  }));
}

export type TaskChanges = Record<string, boolean>;
export function readTaskChanges(value: string | null, tasks: readonly TaskRecord[]): TaskChanges {
  if (!value || value.length > 4096) return {};
  try {
    const stored: unknown = JSON.parse(value);
    if (!stored || typeof stored !== "object") return {};
    if (Array.isArray(stored)) return Object.fromEntries(
      tasks.filter(({ id }) => stored.includes(id)).map(({ id }) => [id, true]),
    );
    const statuses = stored as Record<string, unknown>;
    return Object.fromEntries(tasks.flatMap(({ id }) =>
      Object.hasOwn(statuses, id) && typeof statuses[id] === "boolean" ? [[id, statuses[id]]] : [],
    ));
  } catch {
    return {};
  }
}
