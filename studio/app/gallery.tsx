import { Code2, Download, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Reference } from "../catalog";
import { categories, FEATURED, hrefFor, presentation, type Route } from "./catalog-view";
import { GalleryPreview, PreviewLoading } from "./preview";
import { intercept } from "./shell";
import type { Config, Value } from "../playground/controls";
import { SourceFrame, type OriginalCard } from "../sources/local";

let observer: IntersectionObserver | undefined;
const listeners = new Map<Element, (visible: boolean) => void>();
export function observePreview(element: Element, change: (visible: boolean) => void) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) listeners.get(entry.target)?.(entry.isIntersecting);
  }, { rootMargin: "0px" });
  listeners.set(element, change);
  observer.observe(element);
  return () => { observer?.unobserve(element); listeners.delete(element); };
}

function GalleryCard({ item, original, awaitingOriginals, route, open, openSource, reduced, scheme }: {
  item: Reference; original?: OriginalCard; route: Route; open: (id: string, configuration?: string, panel?: Route["panel"]) => void;
  openSource: (id: string, panel?: Route["sourcePanel"]) => void; awaitingOriginals: boolean; reduced: boolean; scheme: "light" | "dark";
}) {
  const { title } = presentation(item);
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [revision, setRevision] = useState(0);
  const lead = FEATURED.some(([id]) => id === item.id);
  const selected = useRef<Config>({});
  const update = useCallback((key: string, value: Value) => {
    selected.current = { ...selected.current, [key]: value };
  }, []);
  const state = () => Object.keys(selected.current).length ? JSON.stringify(selected.current) : undefined;
  const link = (panel?: Route["panel"]) => original
    ? hrefFor({ page: "sources", item: "", category: "", query: "", source: original.id, sourcePanel: panel })
    : hrefFor({ ...route, page: "playground", item: item.id, preset: true, panel });
  const launch = (panel?: Route["panel"]) => original ? openSource(original.id, panel) : open(item.id, state(), panel);
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    return observePreview(el, setVisible);
  }, []);
  const mounted = visible || focused || typeof IntersectionObserver === "undefined";
  return <article className="mx-gallery-card" data-card={item.id}>
    <div className="mx-gallery-stage mx-stage" ref={stage} data-theme="neutral" data-scheme={scheme} data-preview-mounted={mounted}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {mounted && <>
        <button type="button" className="mx-card-reset" aria-label={`Reset ${title} preview`} onClick={() => { selected.current = {}; setRevision(value => value + 1); }}><RotateCcw size={15} aria-hidden="true" /></button>
        {awaitingOriginals ? <PreviewLoading /> : original ? <SourceFrame key={revision} entry={original} lane="adapter" scheme={scheme} label={title + " original preview"} fill /> :
          <GalleryPreview key={revision} item={item} lead={lead} reduced={reduced} config={lead ? selected.current : undefined} onStateChange={lead ? update : undefined} />}
      </>}
    </div>
    <div className="mx-card-copy">
      <div className="mx-card-caption"><h2>{title}</h2><p>{item.provider} · {awaitingOriginals ? "Loading source" : original ? "Original source" : "Legacy preview"}</p></div>
      <div className="mx-card-links">
        <a href={link()} className="mx-open-playground" aria-label={`Open playground for ${title}`}
          onClick={event => intercept(event, () => launch())}><Play size={14} aria-hidden="true" /> Playground</a>
        <a href={link("usage")} aria-label={`React code for ${title}`}
          onClick={event => intercept(event, () => launch("usage"))}><Code2 size={14} aria-hidden="true" /> Code</a>
        <a href={link("install")} aria-label={`Install ${title}`}
          onClick={event => intercept(event, () => launch("install"))}><Download size={13} aria-hidden="true" /> Install</a>
      </div>
    </div>
  </article>;
}

export function Gallery({ items, originals, awaitingOriginals, openSource, route, open, reduced, clear, selectCategory, scheme }: {
  items: Reference[]; originals: Map<string, OriginalCard>; openSource: (id: string, panel?: Route["sourcePanel"]) => void;
  awaitingOriginals: boolean;
  route: Route; open: (id: string, configuration?: string, panel?: Route["panel"]) => void; reduced: boolean;
  clear: () => void; selectCategory: (category: string) => void; scheme: "light" | "dark";
}) {
  const filtered = Boolean(route.query.trim() || route.category);
  const grid = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const cards = Array.from(grid.current?.querySelectorAll<HTMLElement>('[data-preview-mounted="true"]') ?? []).map(stage => stage.parentElement!);
    const visible = cards.map(card => ({ card, rect: card.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > 0 && rect.top < innerHeight);
    const next = new Map(visible.map(({ card, rect }) => [card.dataset.card!, rect]));
    if (!reduced) {
      for (const { card, rect } of visible) {
        const before = positions.current.get(card.dataset.card!);
        if (!before) continue;
        const x = before.x - rect.x, y = before.y - rect.y;
        if (Math.abs(x) + Math.abs(y) > 2 && Math.abs(y) < 360) {
          card.animate([{ translate: `${x}px ${y}px` }, { translate: "0 0" }], { duration: 220, easing: "cubic-bezier(.2,.7,.25,1)" });
        }
      }
    }
    positions.current = next;
  }, [route.category, route.query, reduced]);
  return <>
    <section className="mx-gallery-header">
      <h1 tabIndex={-1}>Motion</h1>
      <p>Try interactive components and install the ones you want to use in React.</p>
      <nav className="mx-gallery-filters" aria-label="Filter gallery">
        {["All", ...categories].map(label => {
          const category = label === "All" ? "" : label.toLowerCase();
          return <a key={label} href={hrefFor({ ...route, category })} aria-current={route.category === category ? "true" : undefined}
            onClick={event => intercept(event, () => selectCategory(category))}>{label}</a>;
        })}
      </nav>
    </section>
    <p className={filtered ? "mx-result-count" : "mx-sr"} role="status">{items.length} {items.length === 1 ? "component" : "components"}</p>
    {items.length ? <div ref={grid} className="mx-gallery" aria-label="Component gallery">{items.map(item =>
      <GalleryCard key={item.id} item={item} original={originals.get(item.id)} awaitingOriginals={awaitingOriginals} route={route} open={open} openSource={openSource} reduced={reduced} scheme={scheme} />)}</div>
      : <Empty clear={clear}>Try a different name or clear the filters.</Empty>}
  </>;
}
export function Empty({ clear, children }: { clear: () => void; children: ReactNode }) {
  return <section className="mx-empty"><h2>No components found</h2><p>{children}</p><button type="button" className="mx-button" onClick={clear}>Clear filters</button></section>;
}
