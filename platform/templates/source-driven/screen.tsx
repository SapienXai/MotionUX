"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { project } from "./project";
import { adapters } from "./adapters";
import { generated } from "./generated";
import type { SourceGraph, SourceInstance } from "./source-graph";

type Entity = SourceGraph["entities"][number];
type Row = { id: string; values: string[] };
type Records = Record<string, Row[]>;
const graph = project.document.sourceGraph!;
const initial: Records = Object.fromEntries(graph.entities.map((entity) => [entity.id, entity.examples.map((values, index) => ({ id: "sample-" + index, values }))]));
const tr = graph.locale === "tr";
const labels = tr ? {
  add: "Ekle", edit: "Düzenle", remove: "Sil", save: "Kaydet", cancel: "İptal", find: "Ara", undo: "Geri al", empty: "Kayıt bulunamadı.", saved: "Kaydedildi.",
  overlap: "Bu saat aralığı başka bir kayıtla çakışıyor.", interval: "Bitiş saati başlangıçtan sonra olmalı.", local: "Veriler bu tarayıcıda saklanır.", all: "Tümü", skip: "İçeriğe geç",
} : {
  add: "Add", edit: "Edit", remove: "Delete", save: "Save", cancel: "Cancel", find: "Search", undo: "Undo", empty: "No matching records.", saved: "Saved.",
  overlap: "This time range overlaps another record.", interval: "The end time must follow the start.", local: "Data is stored in this browser.", all: "All", skip: "Skip to content",
};

function restore(key: string): Records {
  try {
    const source = localStorage.getItem(key);
    if (!source || source.length > 300_000) return initial;
    const stored = JSON.parse(source);
    if (stored.version !== 1 || !stored.records) return initial;
    return Object.fromEntries(graph.entities.map((entity) => {
      const values: unknown = stored.records[entity.id];
      if (!Array.isArray(values) || values.length > 160 || !values.every((row) =>
        row && typeof row.id === "string" && Array.isArray(row.values) && row.values.length === entity.fields.length &&
        row.values.every((value: unknown) => typeof value === "string" && value.length <= 200))) return [entity.id, initial[entity.id]];
      if (new Set(values.map((row) => row.id)).size !== values.length) return [entity.id, initial[entity.id]];
      return [entity.id, values];
    }));
  } catch {
    return initial;
  }
}

export type SourceProps = {
  instance: SourceInstance; rows: Row[]; entity?: Entity; still: boolean;
  edit: (row?: Row) => void;
};
export type Adapter = (props: SourceProps) => ReactNode;

function DataView({ instance, rows, entity, edit, remove }: SourceProps & { remove: (row: Row) => void }) {
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState("");
  if (!entity) return null;
  const choice = entity.fields.findIndex((field) => field.type === "choice");
  const search = filter.toLocaleLowerCase(graph.locale);
  const visible = rows.filter((row) => row.values.join(" ").toLocaleLowerCase(graph.locale).includes(search) &&
    (!group || row.values[choice] === group));
  const fieldList = instance.fields.length ? instance.fields : entity.fields.map(({ id }) => id);
  const columns = fieldList.map((id) => entity.fields.findIndex((field) => field.id === id));
  const groups = instance.kind === "board" && choice >= 0 ? entity.fields[choice].options : [""];
  const date = entity.fields.findIndex((field) => field.type === "date" || field.type === "time");
  if (instance.kind === "agenda" && date >= 0) visible.sort((a, b) => a.values[date].localeCompare(b.values[date]));
  function renderRow(row: Row) {
    return <article key={row.id} className="mx-record">
      <dl>{columns.map((index) => <div key={index}><dt>{entity!.fields[index].label}</dt><dd dir="auto">{row.values[index]}</dd></div>)}</dl>
      {instance.action === "edit" && <div className="mx-row-actions">
        <button type="button" onClick={() => edit(row)} aria-label={labels.edit + " " + row.values[0]}>{labels.edit}</button>
        <button type="button" onClick={() => remove(row)} aria-label={labels.remove + " " + row.values[0]}>{labels.remove}</button>
      </div>}
    </article>;
  }
  return <>
    <div className="mx-tools">
      <label>{labels.find}<input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
      {choice >= 0 && <label>{entity.fields[choice].label}<select value={group} onChange={(event) => setGroup(event.target.value)}>
        <option value="">{labels.all}</option>{entity.fields[choice].options.map((value) => <option key={value}>{value}</option>)}
      </select></label>}
      {instance.action === "edit" && <button type="button" className="mx-primary" onClick={() => edit()}>{labels.add} {entity.label}</button>}
    </div>
    {!visible.length && <p role="status">{labels.empty}</p>}
    <div className={instance.kind === "board" ? "mx-board" : "mx-records"}>
      {groups.map((key) => <section key={key} className="mx-lane" aria-label={key || entity.label}>
        {key && <h3>{key}</h3>}
        {visible.filter((row) => !key || row.values[choice] === key).map(renderRow)}
      </section>)}
    </div>
  </>;
}

export function AppScreen({ id, page, status }: { id: string; page: { route: string }; status?: ReactNode }) {
  const active = graph.pages.find(({ route }) => route === page.route)!;
  const key = "motionux:source:" + id;
  const [data, setData] = useState<Records>(initial);
  const [previous, setPrevious] = useState<Records>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ entity: Entity; row?: Row }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement>(null);
  useEffect(() => { setData(restore(key)); }, [key]);
  function store(next: Records) {
    setData(next);
    try { localStorage.setItem(key, JSON.stringify({ version: 1, records: next })); } catch { /* Current view retains changes. */ }
  }
  function change(entity: Entity, entry: Row | undefined, rowId: string) {
    setPrevious(data);
    const rows = data[entity.id] ?? [];
    store({ ...data, [entity.id]: entry ? [...rows.filter((row) => row.id !== rowId), entry] : rows.filter((row) => row.id !== rowId) });
    setMessage(labels.saved);
  }
  function start(entity: Entity, row?: Row) {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError("");
    setEditing({ entity, row });
    dialog.current?.showModal();
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const { entity, row } = editing;
    const form = new FormData(event.currentTarget);
    const values = entity.fields.map((field) => String(form.get(field.id) ?? "").trim().slice(0, 200));
    const [group, from, to] = entity.collision.map((field) => entity.fields.findIndex(({ id }) => id === field));
    if (group !== undefined && from !== undefined && to !== undefined) {
      if (values[to] <= values[from]) { setError(labels.interval); return; }
      if (data[entity.id].some((item) => item.id !== row?.id && item.values[group] === values[group] &&
        item.values[from] < values[to] && item.values[to] > values[from])) { setError(labels.overlap); return; }
    }
    if (!row && data[entity.id].length >= 160) { setError(tr ? "Kayıt sınırına ulaşıldı." : "This collection reached its local record limit."); return; }
    const rowId = row?.id ?? crypto.randomUUID();
    change(entity, { id: rowId, values }, rowId);
    dialog.current?.close();
  }
  return <MotionConfig reducedMotion={graph.motion === "still" ? "always" : "user"}>
    <div className="mx-app" data-shell={graph.shell} data-theme={graph.theme} data-tone={graph.tone}>
      <a className="mx-skip" href="#main">{labels.skip}</a>
      <header className="mx-chrome">
        <a className="mx-brand" href="/">{graph.name}</a>
        <nav aria-label={tr ? "Sayfalar" : "Pages"}>{graph.pages.map((item) =>
          <a aria-current={item.route === active.route ? "page" : undefined} href={item.route} key={item.id}>{item.title}</a>)}</nav>
      </header>
      <main id="main" className="mx-main">
        <div className="mx-page-title"><h1>{active.title}</h1>{active.route === "/" && <p>{graph.summary}</p>}</div>
        <div className="mx-feedback"><span role="status">{message}</span>
          {previous && <button type="button" onClick={() => { store(previous); setPrevious(undefined); setMessage(""); }}>{labels.undo}</button>}
        </div>
        <div className="mx-grid" data-layout={active.layout}>{active.instances.map((instance) => {
          const entity = graph.entities.find(({ id }) => id === instance.entity);
          const props = { instance, entity, rows: data[instance.entity] ?? [], still: graph.motion === "still" || instance.motion === "still",
            edit: (row?: Row) => { if (entity) start(entity, row); } };
          const Component = instance.kind === "generated" ? generated[instance.id] : adapters[instance.source];
          return <section className="mx-section" aria-labelledby={instance.id + "-title"} id={instance.id} key={instance.id}
            data-instance={instance.id} data-kind={instance.kind} data-layout={instance.layout}>
            <h2 id={instance.id + "-title"}>{instance.title}</h2>
            {instance.description && <p>{instance.description}</p>}
            {instance.media && <picture className="mx-photo">
              <source media="(max-width: 520px)" srcSet={"/media/" + instance.media + "-360.webp"} />
              <img width="720" height="420" loading={instance === active.instances[0] ? "eager" : "lazy"}
                src={"/media/" + instance.media + "-720.webp"} alt={instance.alternative} />
            </picture>}
            {Component && <div className="mx-source-mount"><Component {...props} /></div>}
            {["records", "board", "agenda"].includes(instance.kind) && <DataView {...props} remove={(row) => { if (entity) change(entity, undefined, row.id); }} />}
            {instance.kind === "cards" && <div className="mx-cards">{instance.items.map((item, index) =>
              <article key={index}><h3>{item.label}</h3><p>{item.text}</p></article>)}</div>}
          </section>;
        })}</div>
        {graph.entities.length > 0 && <footer className="mx-footer">{labels.local} {status}</footer>}
        {graph.entities.length === 0 && status}
      </main>
      <dialog className="mx-dialog" ref={dialog} aria-labelledby="record-dialog-title" onClose={() => { setEditing(undefined); returnFocus.current?.focus(); }}>
        {editing && <form method="dialog" onSubmit={save}>
          <h2 id="record-dialog-title">{editing.row ? labels.edit : labels.add} {editing.entity.label}</h2>
          {editing.entity.fields.map((field, index) => <label key={field.id}>{field.label}
            {field.type === "choice" ?
              <select name={field.id} defaultValue={editing.row?.values[index] ?? ""} required={field.required}>
                <option value="">—</option>{field.options.map((value) => <option key={value}>{value}</option>)}
              </select> :
              <input dir="auto" name={field.id} type={field.type} defaultValue={editing.row?.values[index] ?? ""} maxLength={200} required={field.required} />}
          </label>)}
          {error && <p role="alert">{error}</p>}
          <div className="mx-row-actions"><button type="button" onClick={() => dialog.current?.close()}>{labels.cancel}</button><button className="mx-primary">{labels.save}</button></div>
        </form>}
      </dialog>
    </div>
  </MotionConfig>;
}
