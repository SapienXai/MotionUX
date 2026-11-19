"use client";

import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Compass, Layers3, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { maxCompositionSources } from "@motionux/build-core/code-project";
import { sourceRequest } from "./source-job";
import { ComponentPreview } from "./component-preview";
import { openStudioSheet, StudioSheet, useStudioCopy } from "./kinetic-ui";

export type CompositionComponent = {
  id: string; title: string; provider: string; mode: "direct" | "connected" | "reference";
  preview?: { slug: string; pin: string };
};
const pageSize = 32;

export function ComponentPicker({ selected, onChange, disabled, idea, footer, localOption }: {
  selected: string[]; onChange: (ids: string[]) => void; disabled: boolean;
  idea: ReactNode; footer: ReactNode; localOption?: ReactNode;
}) {
  const t = useStudioCopy();
  const [rows, setRows] = useState<CompositionComponent[]>();
  const [focused, setFocused] = useState<string>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const needsCatalog = open || selected.length > 0;
  useEffect(() => {
    if (!needsCatalog || rows) return;
    const controller = new AbortController();
    void sourceRequest<CompositionComponent[]>("/source-jobs/components", "GET", undefined, controller.signal)
      .then(setRows, () => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt, needsCatalog, rows]);

  const terms = search.toLowerCase().trim().split(/\s+/);
  const visible = (rows ?? []).filter(({ title, provider, id }) => terms.every((term) => `${title} ${provider} ${id}`.toLowerCase().includes(term)));
  const start = page * pageSize;
  const end = Math.min(start + pageSize, visible.length);
  const atLimit = selected.length >= maxCompositionSources;
  const chosenRows = selected.flatMap((id) => rows?.find((row) => row.id === id) ?? []);
  const labels = { direct: t("Original component", "Orijinal bileşen"), connected: t("Connected · local", "Bağlı · yerel"),
    reference: t("Design reference", "Tasarım referansı") };
  const browse = t("Browse components", "Bileşenlere göz at");

  function toggle(id: string) {
    if (selected.includes(id)) {
      const remaining = selected.filter((value) => value !== id);
      if (focused === id) setFocused(remaining.at(-1));
      onChange(remaining);
    } else if (!atLimit) { setFocused(id); onChange([...selected, id]); }
  }
  function show(event: MouseEvent<HTMLButtonElement>) {
    setOpen(true);
    openStudioSheet(dialog.current, event.currentTarget);
    field.current?.focus();
  }
  function movePage(next: number) {
    setPage(next);
    results.current?.scrollTo(0, 0);
  }
  const discover = <a className="kinetic-text" href="/discover">
    <Compass size={15} aria-hidden="true" />{t("Choose in Gallery", "Galeriden seç")}
  </a>;
  return <>
    <div className="kinetic-idea-card">
      {idea}
      {localOption ?? <section className="kinetic-choices" aria-labelledby="compose-components-title">
        <div className="kinetic-choices-head"><h2 id="compose-components-title">{t("Components", "Bileşenler")}{selected.length > 0 && <small> {selected.length}/{maxCompositionSources}</small>}</h2>
          <div className="kinetic-choices-links">{!disabled && discover}
            <button type="button" className="kinetic-text" aria-haspopup="dialog" onClick={show} disabled={disabled}>{browse}<ArrowUpRight size={13} aria-hidden="true" /></button>
          </div>
        </div>
        {selected.length ? <ul className="kinetic-selected" aria-label={t("Selected components", "Seçilen bileşenler")}>
          {selected.map((id) => {
            const source = chosenRows.find((item) => item.id === id);
            return <li key={id}>
              <button type="button" className="kinetic-selected-source" aria-pressed={focused === id || !focused && id === selected.at(-1)}
                onClick={() => setFocused(id)}><span className="kinetic-source-icon"><Layers3 size={16} aria-hidden="true" /></span><span>
                  <strong>{source?.title ?? id}</strong>{source && <small>{source.provider} · {labels[source.mode]}</small>}
                </span></button>
              <button type="button" className="kinetic-icon" aria-label={t("Remove ", "Kaldır ") + (source?.title ?? id)}
                title={t("Remove component", "Bileşeni kaldır")} onClick={() => toggle(id)} disabled={disabled}><X size={15} aria-hidden="true" /></button>
            </li>;
          })}
        </ul> : null}
      </section>}
      {footer}
    </div>
    {selected.length > 0 && <ComponentPreview components={chosenRows} focused={focused} onFocus={setFocused} />}
    <StudioSheet dialog={dialog} title={browse}>
      <div className="kinetic-catalog">
        <div className="kinetic-filter"><Search size={16} aria-hidden="true" />
          <input ref={field} type="search" aria-label={t("Find components for your app", "Uygulaman için bileşen bul")}
            placeholder={t("Search names or providers", "Ad veya sağlayıcı ara")} value={search}
            onChange={(event) => { setSearch(event.target.value); movePage(0); }} onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
              if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                // Native search inputs may consume Escape to clear their query before the dialog sees it.
                event.preventDefault();
                dialog.current?.close();
              }
            }} />
        </div>
        <p role="status">{atLimit ? t("Four components selected. Remove one to add another.", "Dört bileşen seçildi. Bir tane eklemek için birini kaldır.") :
          t("Selected sources ", "Seçilen kaynaklar ") + selected.length + " / " + maxCompositionSources}</p>
        {error && <p role="alert">{t("Catalog unavailable.", "Katalog açılamadı.")} <button type="button" className="kinetic-text"
          onClick={() => { setError(false); setAttempt(attempt + 1); }}>{t("Retry", "Yeniden dene")}</button></p>}
        {!rows && !error && <p role="status">{t("Loading catalog…", "Katalog yükleniyor…")}</p>}
        {rows && !visible.length && <p role="status">{t("No matching components.", "Eşleşen bileşen yok.")}</p>}
        <ul ref={results} aria-label={t("Component results", "Bileşen sonuçları")}>
          {visible.slice(start, end).map((item) => {
            const chosen = selected.includes(item.id);
            return <li key={item.id}><button type="button" aria-pressed={chosen} disabled={disabled || atLimit && !chosen} onClick={() => toggle(item.id)}>
              <span><strong>{item.title}</strong><small>{item.provider} · {labels[item.mode]}</small></span>
              {chosen ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            </button></li>;
          })}
        </ul>
        {visible.length > pageSize && <nav className="kinetic-catalog-pages" aria-label={t("Component result pages", "Bileşen sonuç sayfaları")}>
          <button type="button" className="kinetic-icon" aria-label={t("Previous results", "Önceki sonuçlar")} disabled={!page}
            onClick={() => movePage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
          <p role="status">{start + 1}–{end} / {visible.length}</p>
          <button type="button" className="kinetic-icon" aria-label={t("Next results", "Sonraki sonuçlar")} disabled={end === visible.length}
            onClick={() => movePage(page + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
        </nav>}
        <div className="kinetic-catalog-footer">{!disabled && discover}
          <button type="button" className="kinetic-button kinetic-primary" onClick={() => dialog.current?.close()}>{t("Done", "Bitti")}</button>
        </div>
      </div>
    </StudioSheet>
  </>;
}
