"use client";

import { Check, Layers3, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { maxCompositionSources } from "@motionux/build-core/code-project";
import { sourceRequest } from "./source-job";

type Component = { id: string; title: string; provider: string; mode: "direct" | "connected" | "reference" };
const modeLabel = { direct: "Original component", connected: "Connected · local", reference: "Design reference" };

export function ComponentPicker({ selected, onChange, disabled }: {
  selected: string[]; onChange: (ids: string[]) => void; disabled: boolean;
}) {
  const [rows, setRows] = useState<Component[]>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<Component[]>("/source-jobs/components", "GET", undefined, controller.signal)
      .then(setRows, () => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  const query = search.trim().toLowerCase();
  const visible = (rows ?? []).filter(({ title, provider, id }) =>
    query.split(/\s+/).every((term) => `${title} ${provider} ${id}`.toLowerCase().includes(term)));
  const atLimit = selected.length >= maxCompositionSources;
  return <section className="compose-components" aria-labelledby="compose-components-title">
    <div className="compose-components-heading">
      <Layers3 size={18} aria-hidden="true" />
      <h2 id="compose-components-title">Components</h2>
      <span>{selected.length}/{maxCompositionSources}</span>
    </div>
    {selected.length === 0 && <p>Choose components for your product, or let Build find a fit.</p>}
    {selected.length > 0 && <ul className="compose-selected" aria-label="Selected components">
      {selected.map((id) => {
        const item = rows?.find((row) => row.id === id);
        return <li key={id}><div><strong>{item?.title ?? id}</strong>
          {item && <small>{item.provider} · {modeLabel[item.mode]}</small>}</div>
          <button type="button" className="build-icon-button" aria-label={"Remove " + (item?.title ?? id)} disabled={disabled}
            onClick={() => onChange(selected.filter((value) => value !== id))}><X size={16} /></button></li>;
      })}
    </ul>}
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><Plus size={16} aria-hidden="true" /> Browse components</summary>
      {open && <div className="compose-catalog">
        <search className="compose-catalog-search" aria-label="Component catalog">
          <Search size={15} aria-hidden="true" />
          <input type="search" aria-label="Find components for your app" placeholder="Search names or providers"
            value={search} onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
        </search>
        {error && <p role="status">Catalog unavailable. <button type="button" className="build-text-button"
          onClick={() => { setError(false); setAttempt(attempt + 1); }}>Retry</button></p>}
        {rows && !visible.length && <p role="status">No matching components.</p>}
        {!rows && !error && <p role="status">Loading catalog…</p>}
        <ul aria-label="Component results">
          {visible.slice(0, 32).map((item) => {
            const chosen = selected.includes(item.id);
            return <li key={item.id}><button type="button" aria-pressed={chosen} disabled={disabled || (atLimit && !chosen)}
              onClick={() => onChange(chosen ? selected.filter((id) => id !== item.id) : [...selected, item.id])}>
              <span><strong>{item.title}</strong><small>{item.provider} · {modeLabel[item.mode]}</small></span>
              {chosen ? <Check size={16} /> : <Plus size={16} />}
            </button></li>;
          })}
        </ul>
        {visible.length > 32 && <p>Showing 32 of {visible.length}. Search to narrow the list.</p>}
      </div>}
    </details>
  </section>;
}
