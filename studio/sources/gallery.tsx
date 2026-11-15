import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Code2, Download, FolderPlus, Play } from "lucide-react";
import { hrefFor, type Route } from "../app/catalog-view";
import { Empty } from "../app/gallery";
import { intercept } from "../app/shell";
import { Favorite, MembershipForm } from "../library/actions";
import { useLibrary } from "../library/store";
import { SourceFrame, type OriginalCard } from "./local";
import "./originals.css";

export const previewLimit = 8;
type Thumbnail = { url: string; height: number; width: number; scheme: "light" | "dark" };

export function OriginalsGallery({ originals, loading, failed, route, scheme, navigate }: {
  originals: Map<string, OriginalCard>; loading: boolean; failed?: boolean;
  route: Route; scheme: "light" | "dark"; navigate: (route: Route) => void;
}) {
  const library = useLibrary();
  const picker = useRef<HTMLDialogElement>(null);
  const pickerTitle = useId();
  const [collecting, setCollecting] = useState<OriginalCard>();
  const openCollection = useCallback((entry: OriginalCard) => {
    setCollecting(entry);
    picker.current?.showModal();
  }, []);
  const [thumbnails, setThumbnails] = useState<Record<string, Thumbnail[]>>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch("/v11/thumbnails.json", { signal: controller.signal }).then(response => response.ok ? response.json() : {}).then(setThumbnails, () => {});
    return () => controller.abort();
  }, []);
  const grid = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState<ReadonlySet<string>>(new Set());
  const [nearby, setNearby] = useState<ReadonlySet<string>>(new Set());
  const catalog = useMemo(() => [...originals.values()], [originals]);
  const edition = catalog.reduce((maximum, entry) => entry.availability === "ready" ? Math.max(maximum, entry.editionOrdinal) : maximum, 0);
  const newCount = catalog.filter(entry => entry.editionOrdinal === edition && entry.availability === "ready").length;
  const providers = [...new Set(catalog.map(item => item.provider))].sort();
  const categories = ["Buttons", "Inputs", "Navigation", "Cards", "Gestures", "AI", "Text", "Media", "Effects", "Feedback"]
    .filter(category => catalog.some(item => item.category === category));
  const query = route.query.trim().toLowerCase();
  const items = useMemo(() => {
    const favoriteIDs = new Set(library?.data?.favorites ?? []);
    const terms = query ? query.split(/\s+/) : [];
    return catalog.filter(item => {
      const personal = library?.data?.details[item.id];
      const searchable = [item.title, item.id, item.id.replaceAll("-", " "), item.provider, ...item.tags, personal?.note, ...(personal?.tags ?? [])].join(" ").toLowerCase();
      return (!route.category || route.category === item.category.toLowerCase()) &&
        (!route.provider || route.provider === item.provider) &&
        (!route.kind || route.kind === item.sourceKind) &&
        (route.subset !== "new" || item.editionOrdinal === edition) &&
        (route.subset !== "favorites" || favoriteIDs.has(item.id)) &&
        terms.every(term => searchable.includes(term));
    }).sort((a, b) => {
      const byTitle = a.title.localeCompare(b.title);
      if (route.sort === "name") return byTitle;
      if (route.sort === "provider") return a.provider.localeCompare(b.provider) || byTitle;
      const featured = (a.preview.rank ?? Infinity) - (b.preview.rank ?? Infinity) || byTitle;
      if (route.sort === "featured") return featured;
      const difference = route.sort === "oldest" ? a.editionOrdinal - b.editionOrdinal : b.editionOrdinal - a.editionOrdinal;
      return difference || a.addedSequence - b.addedSequence || featured;
    });
  }, [catalog, edition, library?.data, query, route.category, route.kind, route.provider, route.sort, route.subset]);
  const visibleOrder = useMemo(() => items.map(item => item.id).join(" "), [items]);
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
        const active = document.activeElement instanceof HTMLIFrameElement ? document.activeElement.closest("[data-original-stage]") : null;
        const engaged = new Set<Element>();
        if (active) engaged.add(active);
        for (const frame of container.querySelectorAll('[data-preview-gesture="true"]')) {
          const stage = frame.closest("[data-original-stage]");
          if (stage) engaged.add(stage);
        }
        const next = new Set<string>();
        if (!document.hidden) {
          const eligible = [...new Set([...engaged, ...visible])].map(stage => {
            const rect = stage.getBoundingClientRect();
            const overlap = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
            return { stage: stage as HTMLElement, coverage: engaged.has(stage) ? Infinity : overlap / rect.height };
          }).filter(item => item.coverage > 0);
          eligible.sort((a, b) => b.coverage - a.coverage);
          let remaining = previewLimit;
          for (const { stage } of eligible) {
            const cost = Number(stage.dataset.previewCost ?? "1");
            if (cost > remaining) continue;
            next.add(stage.dataset.originalStage!);
            remaining -= cost;
          }
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
    const nearbyStages = new Set<string>();
    const images = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.originalStage!;
        if (entry.isIntersecting) nearbyStages.add(id);
        else nearbyStages.delete(id);
      }
      setNearby(current => current.size === nearbyStages.size && [...nearbyStages].every(id => current.has(id)) ? current : new Set(nearbyStages));
    }, { rootMargin: "240px 0px" });
    stages.forEach(stage => { observer.observe(stage); images.observe(stage); });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("blur", update);
    document.addEventListener("focusin", update);
    window.addEventListener("mx-preview-interaction", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      images.disconnect();
      cancelAnimationFrame(scheduled);
      window.removeEventListener("scroll", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("focusin", update);
      window.removeEventListener("mx-preview-interaction", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [visibleOrder]);
  const ready = catalog.filter(item => item.availability === "ready").length;
  const clear = () => navigate({ page: "gallery", item: "", category: "", query: "" });
  return <>
    <header className="mx-originals-header">
      <div className="mx-originals-title">
        <div><h1 tabIndex={-1}>Originals Gallery</h1><p>Live source previews from {providers.length} providers.</p></div>
      </div>
      <nav className="mx-originals-categories" aria-label="Filter originals">
        {[
          { label: "All originals", category: "", subset: undefined },
          ...(edition >= 13 ? [{ label: `New in V${edition}`, category: "", subset: "new" as const }] : []),
          { label: "Favorites", category: "", subset: "favorites" as const },
          ...categories.map(label => ({ label, category: label.toLowerCase(), subset: undefined })),
        ].map(({ label, category, subset }) => {
          const next = { ...route, category, subset };
          return <a key={label} href={hrefFor(next)} aria-current={category === route.category && subset === route.subset ? "true" : undefined}
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
            <option value="">Newest first</option><option value="oldest">Oldest</option><option value="featured">Featured</option>
            <option value="name">Name</option><option value="provider">Provider</option>
          </select>
        </div>
      </div>
    </header>
    {edition >= 13 && !route.sort && !route.subset && !query && !route.category && !route.provider && !route.kind &&
      <h2 className="mx-new-arrivals">V{edition} New arrivals <span>{newCount}</span></h2>}
    {ready < catalog.length && <p className="mx-catalog-notice" role="status">{catalog.length - ready} local records are unavailable. Run <code>npm run studio:doctor</code> for details.</p>}
    {failed ? <p role="alert">The local catalog could not be read. <a href={location.href}>Retry</a> or restart <code>npm run studio</code>.</p> :
      items.length ? <div className="mx-originals-grid" ref={grid} aria-label="Original components">
        {items.map((entry, index) => <OriginalCardView key={entry.id} entry={entry} fresh={edition >= 13 && entry.editionOrdinal === edition} deferred={index >= 12} previews={nearby.has(entry.id) ? thumbnails[entry.id] : undefined} mounted={mounted.has(entry.id)} route={route}
          scheme={scheme} navigate={navigate} openCollection={openCollection} collectionDisabled={!library?.data} />)}
      </div> : !loading && <Empty clear={clear}>Try another search or clear the filters.</Empty>}
    <dialog className="mx-library-dialog" aria-labelledby={pickerTitle} ref={picker} onClose={() => setCollecting(undefined)}>
      {collecting && <><h2 id={pickerTitle}>Collections for {collecting.title}</h2>
        <MembershipForm source={collecting.id} missing={collecting.availability !== "ready"} close={() => picker.current?.close()} /></>}
    </dialog>
  </>;
}

const OriginalCardView = memo(function OriginalCardView({ entry, fresh, deferred, previews, mounted, scheme, route, navigate, openCollection, collectionDisabled }: {
  entry: OriginalCard; fresh: boolean; deferred: boolean; previews?: Thumbnail[]; mounted: boolean; scheme: "light" | "dark"; route: Route; navigate: (route: Route) => void;
  openCollection: (entry: OriginalCard) => void; collectionDisabled: boolean;
}) {
  const detail = (pane?: Route["sourcePanel"]): Route => ({ ...route, page: "playground", item: entry.id, sourcePanel: pane });
  return <article className="mx-original-card" data-card={entry.id} data-original-card={entry.id} data-source-kind={entry.sourceKind} data-edition={entry.editionOrdinal}>
    <div className={deferred && !mounted ? "mx-original-stage mx-stage-deferred" : "mx-original-stage"} data-original-stage={entry.id}
      data-preview-cost={entry.renderCost === "heavy" ? 3 : entry.sourceKind === "html" ? 2 : 1} style={{ blockSize: entry.preview.height }}>
      {entry.availability === "ready" && <PreviewThumbnail key={scheme} previews={previews} scheme={scheme} />}
      {entry.availability !== "ready" ? <div className="mx-frame-error"><p>Original unavailable</p><a href={entry.demoURL}>Original demo</a></div> :
        mounted && <SourceFrame entry={entry} lane="studio" scheme={scheme} label={entry.title + " interactive preview"} />}
    </div>
    <header className="mx-original-caption">
      <div><div className="mx-original-card-title"><h2><a className="mx-open-playground" href={hrefFor(detail())} onClick={event => intercept(event, () => navigate(detail()))}>{entry.title}</a></h2>
        {fresh && <span className="mx-new-badge">New</span>}</div>
      <p>{entry.provider} <span aria-hidden="true">·</span> {entry.category} <span aria-hidden="true">·</span> {entry.sourceKind === "html" ? "HTML/iframe" : "React"}</p></div>
      <div className="mx-original-save"><Favorite source={entry.id} title={entry.title} />
        <button type="button" className="mx-library-icon" aria-label={`Add ${entry.title} to collections`} disabled={collectionDisabled} onClick={() => openCollection(entry)}>
          <FolderPlus size={16} aria-hidden="true" /></button></div>
    </header>
    <footer className="mx-original-actions">
      <a href={hrefFor(detail())} aria-label={`Open playground for ${entry.title}`} onClick={event => intercept(event, () => navigate(detail()))}><Play size={13} aria-hidden="true" /> Playground</a>
      <a href={entry.demoURL} target="_blank" rel="noreferrer" aria-label={`Original demo for ${entry.title}`}>Original <ArrowUpRight size={13} aria-hidden="true" /></a>
      <a href={hrefFor(detail("code"))} aria-label={`Code for ${entry.title}`} onClick={event => intercept(event, () => navigate(detail("code")))}><Code2 size={13} aria-hidden="true" /> Code</a>
      <a href={hrefFor(detail("install"))} aria-label={`Install ${entry.title}`} onClick={event => intercept(event, () => navigate(detail("install")))}><Download size={13} aria-hidden="true" /> Install</a>
    </footer>
  </article>;
});

function PreviewThumbnail({ previews, scheme }: { previews?: Thumbnail[]; scheme: Thumbnail["scheme"] }) {
  const [broken, setBroken] = useState(false);
  const options = previews?.filter(entry => entry.scheme === scheme).sort((a, b) => b.width - a.width) ?? [];
  if (!options.length || broken) return null;
  const [wide, small] = options;
  return <picture className="mx-preview-thumbnail">
    {small && <source media="(max-width: 365px)" srcSet={small.url} />}
    <img src={wide.url} width={wide.width} height={wide.height} alt="" loading="lazy" decoding="async" fetchPriority="low" onError={() => setBroken(true)} />
  </picture>;
}
