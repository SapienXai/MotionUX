import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Reference } from "../catalog";
import { FEATURED, hrefFor, presentation, type Route } from "./catalog-view";
import { GalleryPreview } from "./preview";
import { intercept } from "./shell";
import type { Config, Value } from "../playground/controls";

let observer: IntersectionObserver | undefined;
const listeners = new Map<Element, (visible: boolean) => void>();
function observe(element: Element, change: (visible: boolean) => void) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) listeners.get(entry.target)?.(entry.isIntersecting);
  }, { rootMargin: "0px" });
  listeners.set(element, change);
  observer.observe(element);
  return () => { observer?.unobserve(element); listeners.delete(element); };
}

function GalleryCard({ item, route, open, reduced }: { item: Reference; route: Route; open: (id: string, configuration?: string) => void; reduced: boolean }) {
  const { title, description, tags } = presentation(item);
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
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    return observe(el, setVisible);
  }, []);
  const mounted = visible || focused || typeof IntersectionObserver === "undefined";
  return <article className="mx-gallery-card" data-card={item.id}>
    <div className="mx-gallery-stage mx-stage" ref={stage} data-theme="neutral" data-preview-mounted={mounted}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {mounted && <>
        <button type="button" className="mx-card-reset" aria-label={`Reset ${title} preview`} onClick={() => { selected.current = {}; setRevision(value => value + 1); }}><RotateCcw size={15} aria-hidden="true" /></button>
        <GalleryPreview key={revision} item={item} lead={lead} reduced={reduced} config={lead ? selected.current : undefined} onStateChange={lead ? update : undefined} />
      </>}
    </div>
    <div className="mx-card-copy">
      <h2>{title}</h2><p>{description}</p>
      <div className="mx-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      <a href={hrefFor({ ...route, page: "playground", item: item.id, preset: lead })} className="mx-open-playground" aria-label={`Open playground for ${title}`}
        onClick={event => intercept(event, () => open(item.id, state()))}><Play size={15} aria-hidden="true" /><span>Open playground</span><ArrowRight size={15} aria-hidden="true" /></a>
    </div>
  </article>;
}

export function Gallery({ items, route, open, reduced, clear }: { items: Reference[]; route: Route; open: (id: string, configuration?: string) => void; reduced: boolean; clear: () => void }) {
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
    <section className="mx-hero">
      <h1 tabIndex={-1}>{route.category ? `${route.category[0].toUpperCase()}${route.category.slice(1)} components` : "Beautiful motion. Ready to use."}</h1>
      <p>Premium interactive components for modern React applications.</p>
    </section>
    <p className={filtered ? "mx-result-count" : "mx-sr"} role="status">{items.length} {items.length === 1 ? "component" : "components"}</p>
    {items.length ? <div ref={grid} className="mx-gallery" aria-label="Component gallery">{items.map(item => <GalleryCard key={item.id} item={item} route={route} open={open} reduced={reduced} />)}</div>
      : <Empty clear={clear}>Try a different name or clear the filters.</Empty>}
  </>;
}
export function Empty({ clear, children }: { clear: () => void; children: ReactNode }) {
  return <section className="mx-empty"><h2>No components found</h2><p>{children}</p><button type="button" className="mx-button" onClick={clear}>Clear filters</button></section>;
}
