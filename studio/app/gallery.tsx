import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Reference } from "../catalog";
import { FEATURED, hrefFor, presentation, type Route } from "./catalog-view";
import { GalleryPreview } from "./preview";
import { intercept } from "./shell";

let observer: IntersectionObserver | undefined;
const listeners = new Map<Element, (visible: boolean) => void>();
function observe(element: Element, change: (visible: boolean) => void) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) listeners.get(entry.target)?.(entry.isIntersecting);
  }, { rootMargin: "90px 0px" });
  listeners.set(element, change);
  observer.observe(element);
  return () => { observer?.unobserve(element); listeners.delete(element); };
}

function GalleryCard({ item, route, open, reduced }: { item: Reference; route: Route; open: (id: string) => void; reduced: boolean }) {
  const { title, description, tags } = presentation(item);
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [revision, setRevision] = useState(0);
  const lead = FEATURED.some(([id]) => id === item.id);
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
        <button type="button" className="mx-card-reset" aria-label={`Reset ${title} preview`} onClick={() => setRevision(value => value + 1)}><RotateCcw size={15} aria-hidden="true" /></button>
        <GalleryPreview key={revision} item={item} lead={lead} reduced={reduced} />
      </>}
    </div>
    <div className="mx-card-copy">
      <h2>{title}</h2><p>{description}</p>
      <div className="mx-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      <a href={hrefFor({ ...route, page: "playground", item: item.id })} className="mx-open-playground" aria-label={`Open playground for ${title}`}
        onClick={event => intercept(event, () => open(item.id))}><Play size={15} aria-hidden="true" /><span>Open playground</span><ArrowRight size={15} aria-hidden="true" /></a>
    </div>
  </article>;
}

export function Gallery({ items, route, open, reduced, clear }: { items: Reference[]; route: Route; open: (id: string) => void; reduced: boolean; clear: () => void }) {
  const filtered = Boolean(route.query.trim() || route.category);
  return <>
    <section className="mx-hero">
      <h1 tabIndex={-1}>{route.category ? `${route.category[0].toUpperCase()}${route.category.slice(1)} components` : "Beautiful motion. Ready to use."}</h1>
      <p>Premium interactive components for modern React applications.</p>
    </section>
    <p className={filtered ? "mx-result-count" : "mx-sr"} role="status">{items.length} {items.length === 1 ? "component" : "components"}</p>
    {items.length ? <div className="mx-gallery" aria-label="Component gallery">{items.map(item => <GalleryCard key={item.id} item={item} route={route} open={open} reduced={reduced} />)}</div>
      : <Empty clear={clear}>Try a different name or clear the filters.</Empty>}
  </>;
}
export function Empty({ clear, children }: { clear: () => void; children: ReactNode }) {
  return <section className="mx-empty"><h2>No components found</h2><p>{children}</p><button type="button" className="mx-button" onClick={clear}>Clear filters</button></section>;
}
