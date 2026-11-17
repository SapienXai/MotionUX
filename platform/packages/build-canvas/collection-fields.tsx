"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { articleRecords, type BlockProps, type Document, type TaskRecord } from "@motionux/build-core";
import { starterTasks } from "@motionux/app-blocks/operations-data";

const newId = (prefix: string) => prefix + "-" + crypto.randomUUID();
type Entry = { id: string; title: string };
function Records<T extends Entry>({
  records, change, seed, limit, tr, itemName, fields,
}: {
  records: T[];
  change: (next: T[]) => void;
  seed: () => T;
  limit: number;
  tr: boolean;
  itemName: string;
  fields: (entry: T, patch: (value: Partial<T>) => void) => ReactNode;
}) {
  const [confirm, setConfirm] = useState<string>();
  const t = (en: string, turkish: string) => tr ? turkish : en;
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= records.length) return;
    const next = [...records];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }
  return (
    <div className="creator-records">
      {!records.length && <p className="build-hint">{t("This collection is empty.", "Bu koleksiyon boş.")}</p>}
      {records.map((entry, index) => {
        const title = entry.title || itemName;
        return <fieldset className="creator-record" key={entry.id}>
          <legend>{title}</legend>
          {fields(entry, (value) => change(records.map((record, at) => at === index ? { ...record, ...value } : record)))}
          <div className="creator-field-actions">
            <button type="button" className="build-icon" aria-label={t("Move up", "Yukarı taşı") + " " + title}
              disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="build-icon" aria-label={t("Move down", "Aşağı taşı") + " " + title}
              disabled={index === records.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="build-icon" aria-label={t("Duplicate", "Çoğalt") + " " + title}
              disabled={records.length >= limit}
              onClick={() => change([...records.slice(0, index + 1), { ...entry, id: seed().id }, ...records.slice(index + 1)])}>
              <Copy size={14} />
            </button>
            <button type="button" className="build-icon" aria-label={t("Remove", "Kaldır") + " " + title}
              aria-expanded={confirm === entry.id} onClick={() => setConfirm(confirm === entry.id ? undefined : entry.id)}>
              <Trash2 size={14} />
            </button>
          </div>
          {confirm === entry.id && <div className="creator-field-actions">
            <button type="button" className="build-button" onClick={() => setConfirm(undefined)}>{t("Keep", "Koru")}</button>
            <button type="button" className="build-button" onClick={() => {
              change(records.filter((record) => record.id !== entry.id));
              setConfirm(undefined);
            }}>{t("Confirm removal", "Kaldırmayı onayla")}</button>
          </div>}
        </fieldset>;
      })}
      <button type="button" className="build-button" disabled={records.length >= limit} onClick={() => change([...records, seed()])}>
        {t("Add " + itemName, itemName + " ekle")}
      </button>
    </div>
  );
}
export function ArticleFields({ props, tr, change }: {
  props: BlockProps; tr: boolean; change: (change: Partial<BlockProps>) => void;
}) {
  return (
    <details className="build-media-items">
      <summary>{tr ? "Kılavuzlar" : "Content items"}</summary>
      <Records records={articleRecords(props.articles, props.items)} tr={tr} limit={12} itemName={tr ? "kılavuz" : "guide"}
        change={(records) => change({ articles: { version: 1, records }, items: undefined })}
        seed={() => ({ id: newId("guide"), title: tr ? "Yeni kılavuz" : "New guide", body: "", tag: "" })}
        fields={(entry, patch) => <>
          <label>{tr ? "Başlık" : "Item title"}<input value={entry.title} maxLength={72} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label>{tr ? "Kılavuz metni" : "Item text"}<textarea rows={4} value={entry.body} maxLength={1000} onChange={(event) => patch({ body: event.target.value })} /></label>
          <label>{tr ? "Etiket" : "Tag"}<input value={entry.tag} maxLength={32} onChange={(event) => patch({ tag: event.target.value })} /></label>
        </>}
      />
    </details>
  );
}

export function TaskFields({ document, change }: {
  document: Document;
  change: (edit: (previous: Document) => Document) => void;
}) {
  const tr = document.locale === "tr";
  const t = (en: string, turkish: string) => tr ? turkish : en;
  const records = document.tasks?.records ?? starterTasks(document.locale);
  return (
    <details className="build-panel-section creator-settings">
      <summary>{t("Task collection", "Görev koleksiyonu")}</summary>
      <p className="build-hint">{t("These records ship with the app. Completion changes in the exported app stay in this browser and reset on a new revision.", "Bu kayıtlar uygulamayla yayımlanır. Tamamlama değişiklikleri tarayıcıya özeldir ve yeni revizyonda sıfırlanır.")}</p>
      <Records records={records} tr={tr} limit={30} itemName={tr ? "görev" : "task"}
        change={(records) => change((previous) => ({ ...previous, tasks: { version: 1, records } }))}
        seed={(): TaskRecord => ({ id: newId("task"), title: t("New task", "Yeni görev"), owner: "", summary: "", priority: "normal", status: "open" })}
        fields={(entry, patch) => <>
          <label>{t("Task title", "Görev başlığı")}<input value={entry.title} maxLength={88} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label>{t("Owner label", "Sorumlu adı")}<input value={entry.owner} maxLength={56} onChange={(event) => patch({ owner: event.target.value })} /></label>
          <label>{t("Summary", "Özet")}<textarea rows={2} value={entry.summary} maxLength={180} onChange={(event) => patch({ summary: event.target.value })} /></label>
          <div className="creator-field-pair">
            <label>{t("Priority", "Öncelik")}<select value={entry.priority} onChange={(event) => patch({ priority: event.target.value === "high" ? "high" : "normal" })}>
              <option value="normal">{t("Normal", "Normal")}</option><option value="high">{t("High", "Yüksek")}</option>
            </select></label>
            <label>{t("Initial status", "Başlangıç durumu")}<select value={entry.status} onChange={(event) => patch({ status: event.target.value === "completed" ? "completed" : "open" })}>
              <option value="open">{t("Open", "Açık")}</option><option value="completed">{t("Completed", "Tamamlandı")}</option>
            </select></label>
          </div>
        </>}
      />
    </details>
  );
}
