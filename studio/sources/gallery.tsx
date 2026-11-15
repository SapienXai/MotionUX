import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Code2, Download, Play } from "lucide-react";
import { hrefFor, type Route } from "../app/catalog-view";
import { Empty } from "../app/gallery";
import { intercept } from "../app/shell";
import { SourceFrame, type OriginalCard } from "./local";
import "./originals.css";

export const previewLimit = 8;

export function OriginalsGallery({ originals, loading, failed, route, scheme, navigate }: {
  originals: Map<string, OriginalCard>; loading: boolean; failed?: boolean;
  route: Route; scheme: "light" | "dark"; navigate: (route: Route) => void;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState<ReadonlySet<string>>(new Set());
  const catalog = [...originals.values()];
  const providers = [...new Set(catalog.map(item => item.provider))].sort();
  const categories = ["Buttons", "Inputs", "Navigation", "Cards", "Gestures", "AI", "Text", "Media", "Effects", "Feedback"]
    .filter(category => catalog.some(item => item.category === category));
  const query = route.query.trim().toLowerCase();
  const items = catalog.filter(item => {
    const searchable = [item.title, item.id.replaceAll("-", " "), item.provider, ...item.tags].join(" ").toLowerCase();
    return (!route.category || route.category === item.category.toLowerCase()) &&
      (!route.provider || route.provider === item.provider) &&
      (!route.kind || route.kind === item.sourceKind) &&
      query.split(/\s+/).every(term => searchable.includes(term));
  }).sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title);
    if (route.sort === "name") return byTitle;
    if (route.sort === "provider") return a.provider.localeCompare(b.provider) || byTitle;
    return (a.preview.rank ?? Infinity) - (b.preview.rank ?? Infinity) || byTitle;
  });
  const visibleOrder = items.map(item => item.id).join(" ");
  useLayoutEffect(() => {
    const container = grid.current;
    if (!container) return;
    const stages = [...container.querySelectorAll<HTMLElement>("[data-original-stage]")];
    const visible = new Set<Element>();
    let scheduled = 0;
    const update = () => {
      if (scheduled) return;
      scheduled = requestAnimationFrame(() => {
        scheduled = 0;
        const active = document.activeElement?.closest("[data-original-stage]");
        const next = new Set<string>();
        if (!document.hidden) {
          const eligible = [...visible].map(stage => {
            const rect = stage.getBoundingClientRect();
            const overlap = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
            return { stage: stage as HTMLElement, coverage: stage === active ? Infinity : overlap / rect.height };
          }).filter(item => item.coverage > 0);
          eligible.sort((a, b) => b.coverage - a.coverage);
          eligible.slice(0, previewLimit).forEach(({ stage }) => next.add(stage.dataset.originalStage!));
        }
        setMounted(current => next.size === current.size && [...next].every(id => current.has(id)) ? current : next);
      });
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      update();
    });
    stages.forEach(stage => observer.observe(stage));
    window.addEventListener("scroll", update, { passive: true });
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(scheduled);
      window.removeEventListener("scroll", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [visibleOrder]);
  const ready = catalog.filter(item => item.availability === "ready").length;
  const clear = () => navigate({ page: "gallery", item: "", category: "", query: "" });
  return <>
    <header className="mx-originals-header">
      <div className="mx-originals-title">
        <div><h1 tabIndex={-1}>Originals Gallery</h1><p>Live source previews from {providers.length} providers.</p></div>
        <a className="mx-legacy-link" href={hrefFor({ page: "gallery", item: "", category: "", query: "", collection: "legacy" })}
          onClick={event => intercept(event, () => navigate({ page: "gallery", item: "", category: "", query: "", collection: "legacy" }))}>Legacy V8 <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div>
      <nav className="mx-originals-categories" aria-label="Filter originals">
        {["All originals", ...categories].map((label, index) => {
          const next = { ...route, category: index ? label.toLowerCase() : "" };
          return <a key={label} href={hrefFor(next)} aria-current={next.category === route.category ? "true" : undefined}
            onClick={event => intercept(event, () => navigate(next))}>{label}</a>;
        })}
      </nav>
      <div className="mx-originals-toolbar">
        <p role="status">{loading ? "Loading the local catalog…" :
          items.length !== catalog.length ? `${items.length} of ${catalog.length} originals` : `${ready} live originals`}</p>
        <div>
          <select aria-label="Provider" value={route.provider ?? ""} onChange={event => navigate({ ...route, provider: event.target.value || undefined })}>
            <option value="">All providers</option>
            {providers.map(provider => <option key={provider}>{provider}</option>)}
          </select>
          <select aria-label="Source kind" value={route.kind ?? ""} onChange={event => navigate({ ...route, kind: (event.target.value || undefined) as Route["kind"] })}>
            <option value="">All formats</option><option value="react">React</option><option value="html">HTML demo</option>
          </select>
          <select aria-label="Sort originals" value={route.sort ?? ""} onChange={event => navigate({ ...route, sort: (event.target.value || undefined) as Route["sort"] })}>
            <option value="">Featured</option><option value="name">Name</option><option value="provider">Provider</option>
          </select>
        </div>
      </div>
    </header>
    {ready < catalog.length && <p className="mx-catalog-notice" role="status">{catalog.length - ready} local records are unavailable. Run <code>npm run sources:prepare</code> to repair the workspace.</p>}
    {failed ? <p role="alert">The local catalog could not be read. <a href={location.href}>Retry</a> or restart <code>npm run studio</code>.</p> :
      items.length ? <div className="mx-originals-grid" ref={grid} aria-label="Original components">
        {items.map(entry => <OriginalCardView key={entry.id} entry={entry} mounted={mounted.has(entry.id)} route={route} scheme={scheme} navigate={navigate} />)}
      </div> : !loading && <Empty clear={clear}>Try another search or clear the filters.</Empty>}
  </>;
}

function OriginalCardView({ entry, mounted, scheme, route, navigate }: {
  entry: OriginalCard; mounted: boolean; scheme: "light" | "dark"; route: Route; navigate: (route: Route) => void;
}) {
  const detail = (pane?: Route["sourcePanel"]): Route => ({ ...route, page: "playground", item: entry.id, sourcePanel: pane });
  return <article className="mx-original-card" data-card={entry.id} data-original-card={entry.id} data-source-kind={entry.sourceKind}>
    <div className="mx-original-stage" data-original-stage={entry.id} style={{ blockSize: entry.preview.height }}>
      {entry.availability !== "ready" ? <div className="mx-frame-error"><p>Original unavailable</p><a href={entry.demoURL}>Original demo</a></div> :
        mounted && <SourceFrame entry={entry} lane="studio" scheme={scheme} label={entry.title + " interactive preview"} />}
    </div>
    <div className="mx-original-caption">
      <h2><a className="mx-open-playground" href={hrefFor(detail())} onClick={event => intercept(event, () => navigate(detail()))}>{entry.title}</a></h2>
      <p>{entry.provider} <span aria-hidden="true">·</span> {entry.category} <span aria-hidden="true">·</span> {entry.sourceKind === "html" ? "HTML/iframe" : "React"}</p>
    </div>
    <div className="mx-original-actions">
      <a href={hrefFor(detail())} aria-label={`Open playground for ${entry.title}`} onClick={event => intercept(event, () => navigate(detail()))}><Play size={13} aria-hidden="true" /> Playground</a>
      <a href={entry.demoURL} target="_blank" rel="noreferrer" aria-label={`Original demo for ${entry.title}`}>Original <ArrowUpRight size={13} aria-hidden="true" /></a>
      <a href={hrefFor(detail("code"))} aria-label={`Code for ${entry.title}`} onClick={event => intercept(event, () => navigate(detail("code")))}><Code2 size={13} aria-hidden="true" /> Code</a>
      <a href={hrefFor(detail("install"))} aria-label={`Install ${entry.title}`} onClick={event => intercept(event, () => navigate(detail("install")))}><Download size={13} aria-hidden="true" /> Install</a>
    </div>
  </article>;
}
