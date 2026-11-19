import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Code2, Download, FolderPlus, Play } from "lucide-react";
import { hrefFor, type Route } from "../app/catalog-view";
import { Empty } from "../app/gallery";
import { intercept } from "../app/shell";
import { Favorite, MembershipForm } from "../library/actions";
import { useLibrary } from "../library/store";
import { PreviewError, SourceFrame, type OriginalCard } from "./local";
import { useGalleryPreviews } from "./gallery-previews";
import { useGalleryWindow, GalleryRow, type GalleryJump, type GalleryReturn } from "./gallery-window";
import { BuildPickButton, BuildSelectionTray, type GalleryBuildSelection } from "./build-selection";
import "./originals.css";
type Thumbnail = { url: string; height: number; width: number; scheme: "light" | "dark" };

export function OriginalsGallery({ originals, loading, failed, route, scheme, navigate, restore, selection }: {
  originals: Map<string, OriginalCard>; loading: boolean; failed?: boolean;
  route: Route; scheme: "light" | "dark"; navigate: (route: Route) => void; restore?: GalleryReturn;
  selection: GalleryBuildSelection;
}) {
  const library = useLibrary();
  const picker = useRef<HTMLDialogElement>(null);
  const pickerTitle = useId();
  const [collecting, setCollecting] = useState<OriginalCard>();
  const [buildOnly, setBuildOnly] = useState(false);
  const modes = selection.modes;
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
  const { catalog, edition, newCount, providers, categories, ready } = useMemo(() => {
    const catalog = [...originals.values()];
    const available = catalog.filter(entry => entry.availability === "ready");
    const edition = available.reduce((maximum, entry) => Math.max(maximum, entry.editionOrdinal), 0);
    const providers = [...new Set(catalog.map(item => item.provider))].sort();
    const categories = ["Buttons", "Inputs", "Navigation", "Cards", "Gestures", "AI", "Text", "Media", "Effects", "Feedback"]
      .filter(category => catalog.some(item => item.category === category));
    return { catalog, edition, providers, categories, ready: available.length,
      newCount: available.filter(entry => entry.editionOrdinal === edition).length };
  }, [originals]);
  const details = library?.data?.details;
  const favorites = library?.data?.favorites;
  const index = useMemo(() => new Map(catalog.map(item => {
    const personal = details?.[item.id];
    return [item.id, [item.title, item.id, item.id.replaceAll("-", " "), item.provider, ...item.tags,
      personal?.note, ...(personal?.tags ?? [])].join(" ").toLowerCase()];
  })), [catalog, details]);
  const sorted = useMemo(() => [...catalog].sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title);
    if (route.sort === "name") return byTitle;
    if (route.sort === "provider") return a.provider.localeCompare(b.provider) || byTitle;
    const featured = (a.preview.rank ?? Infinity) - (b.preview.rank ?? Infinity) || byTitle;
    if (route.sort === "featured") return featured;
    const difference = route.sort === "oldest" ? a.editionOrdinal - b.editionOrdinal : b.editionOrdinal - a.editionOrdinal;
    return difference || a.addedSequence - b.addedSequence || featured;
  }), [catalog, route.sort]);
  const query = route.query.trim().toLowerCase();
  const items = useMemo(() => {
    const favoriteIDs = new Set(favorites);
    const terms = query ? query.split(/\s+/) : [];
    return sorted.filter(item => (!route.category || route.category === item.category.toLowerCase()) &&
      (!buildOnly || modes?.has(item.id)) &&
      (!route.provider || route.provider === item.provider) && (!route.kind || route.kind === item.sourceKind) &&
      (route.subset !== "new" || item.editionOrdinal === edition) &&
      (route.subset !== "favorites" || favoriteIDs.has(item.id)) &&
      terms.every(term => index.get(item.id)!.includes(term)));
  }, [sorted, index, edition, favorites, query, route.category, route.kind, route.provider, route.subset, buildOnly, modes]);
  const { mounted, retained, register, refresh, rapidScroll } = useGalleryPreviews(grid, items.length > 0);
  const held = useMemo(() => collecting ? new Set([...retained, collecting.id]) : retained, [collecting, retained]);
  const windowing = useGalleryWindow(grid, items, held, restore);
  const [failures, setFailures] = useState<ReadonlySet<string>>(new Set());
  const rememberFailure = useCallback((id: string, failed: boolean) => {
    setFailures(previous => {
      if (previous.has(id) === failed) return previous;
      const next = new Set(previous);
      if (failed) next.add(id);
      else next.delete(id);
      return next;
    });
    refresh();
  }, [refresh]);
  const clear = () => { setBuildOnly(false); navigate({ page: "gallery", item: "", category: "", query: "" }); };
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
          {modes && <button id="mx-build-compatible" type="button" className="mx-build-filter" aria-pressed={buildOnly}
            onClick={() => { setBuildOnly(!buildOnly); window.scrollTo({ top: 0, behavior: "instant" }); }}>Build compatible</button>}
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
    <BuildSelectionTray originals={originals} selection={selection} />
    {edition >= 13 && !buildOnly && !route.sort && !route.subset && !query && !route.category && !route.provider && !route.kind &&
      <h2 className="mx-new-arrivals">V{edition} New arrivals <span>{newCount}</span></h2>}
    {ready < catalog.length && <p className="mx-catalog-notice" role="status">{catalog.length - ready} local records are unavailable. Run <code>npm run studio:doctor</code> for details.</p>}
    {failed ? <p role="alert">The local catalog could not be read. <a href={location.href}>Retry</a> or restart <code>npm run studio</code>.</p> :
      items.length ? <div className="mx-originals-grid" ref={grid} role="list" aria-label="Original components"
        data-results={items.length} style={{ height: windowing.height }}>
        {windowing.rendered.map((row, position, rendered) => <GalleryRow key={row.key} row={row} register={windowing.registerRow}>
          {row.items.map((entry, index) => <OriginalCardView key={entry.id} entry={entry}
            ordinal={row.index * windowing.columns + index + 1} total={items.length}
            fresh={edition >= 13 && entry.editionOrdinal === edition}
            priority={row.index === 0 && index === 0} previews={thumbnails[entry.id]} mounted={mounted.has(entry.id)} deferThumbnail={rapidScroll}
            previousRow={index === 0 && row.index > (rendered[position - 1]?.index ?? -1) + 1 ? row.index - 1 : undefined}
            nextRow={index === row.items.length - 1 && row.index + 1 < (rendered[position + 1]?.index ?? windowing.rowCount) ? row.index + 1 : undefined}
            moveFocus={windowing.focusRow}
            previouslyFailed={failures.has(scheme + ":" + entry.id)} rememberFailure={rememberFailure} register={register}
            route={route} scheme={scheme} navigate={navigate} openCollection={openCollection} collectionDisabled={!library?.data} selection={selection} />)}
        </GalleryRow>)}
      </div> : !loading && <Empty clear={clear}>Try another search or clear the filters.</Empty>}
    <dialog className="mx-library-dialog" aria-labelledby={pickerTitle} ref={picker} onClose={() => setCollecting(undefined)}>
      {collecting && <><h2 id={pickerTitle}>Collections for {collecting.title}</h2>
        <MembershipForm source={collecting.id} missing={collecting.availability !== "ready"} close={() => picker.current?.close()} /></>}
    </dialog>
  </>;
}

const OriginalCardView = memo(function OriginalCardView({ entry, ordinal, total, fresh, priority, previews, mounted, deferThumbnail, previouslyFailed, rememberFailure, register, scheme, route, navigate, openCollection, collectionDisabled, previousRow, nextRow, moveFocus, selection }: {
  entry: OriginalCard; ordinal: number; total: number; fresh: boolean; priority: boolean; previews?: Thumbnail[]; mounted: boolean;
  deferThumbnail: boolean; previouslyFailed: boolean; rememberFailure: (id: string, failed: boolean) => void;
  register: (id: string, node: HTMLDivElement | null) => void; scheme: "light" | "dark"; route: Route; navigate: (route: Route) => void;
  openCollection: (entry: OriginalCard) => void; collectionDisabled: boolean;
  previousRow?: number; nextRow?: number; moveFocus: (target: GalleryJump) => void;
  selection: GalleryBuildSelection;
}) {
  const detail = (pane?: Route["sourcePanel"]): Route => ({ ...route, page: "playground", item: entry.id, sourcePanel: pane });
  const stage = useCallback((node: HTMLDivElement | null) => register(entry.id, node), [entry.id, register]);
  const failureKey = scheme + ":" + entry.id;
  const onPreviewError = useCallback(() => rememberFailure(failureKey, true), [failureKey, rememberFailure]);
  return <article role="listitem" aria-posinset={ordinal} aria-setsize={total} className="mx-original-card" data-card={entry.id} data-original-card={entry.id} data-source-kind={entry.sourceKind} data-edition={entry.editionOrdinal}>
    {previousRow !== undefined && <button type="button" data-gallery-jump className="mx-sr"
      onFocus={() => moveFocus({ index: previousRow, edge: "last" })}>Previous gallery row</button>}
    <div className="mx-original-stage" ref={stage} data-original-stage={entry.id} tabIndex={-1}
      data-preview-cost={previouslyFailed || entry.availability !== "ready" ? 0 : entry.renderCost === "heavy" ? 3 : entry.sourceKind === "html" ? 2 : 1}
      style={{ blockSize: entry.preview.height }}>
      {entry.availability === "ready" && <PreviewThumbnail key={scheme} previews={previews} scheme={scheme} priority={priority} deferred={deferThumbnail} />}
      {entry.availability !== "ready" ? <div className="mx-frame-error"><p>Original unavailable</p><a href={entry.demoURL}>Original demo</a></div> :
        previouslyFailed ? <div data-preview-state="failed" className="mx-original-frame">
          <PreviewError entry={entry} retry={event => {
            event.currentTarget.closest<HTMLElement>("[data-original-stage]")?.focus({ preventScroll: true });
            rememberFailure(failureKey, false);
          }} />
        </div> : mounted && <SourceFrame entry={entry} lane="studio" scheme={scheme} label={entry.title + " interactive preview"} onPreviewError={onPreviewError} />}
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
      <BuildPickButton entry={entry} selection={selection} />
      <a href={hrefFor(detail())} aria-label={`Open playground for ${entry.title}`} onClick={event => intercept(event, () => navigate(detail()))}><Play size={13} aria-hidden="true" /> Playground</a>
      <a href={entry.demoURL} target="_blank" rel="noreferrer" aria-label={`Original demo for ${entry.title}`}>Original <ArrowUpRight size={13} aria-hidden="true" /></a>
      <a href={hrefFor(detail("code"))} aria-label={`Code for ${entry.title}`} onClick={event => intercept(event, () => navigate(detail("code")))}><Code2 size={13} aria-hidden="true" /> Code</a>
      <a href={hrefFor(detail("install"))} aria-label={`Install ${entry.title}`} onClick={event => intercept(event, () => navigate(detail("install")))}><Download size={13} aria-hidden="true" /> Install</a>
    </footer>
    {nextRow !== undefined && <button type="button" data-gallery-jump className="mx-sr"
      onFocus={() => moveFocus({ index: nextRow, edge: "first" })}>Next gallery row</button>}
  </article>;
});

function PreviewThumbnail({ previews, scheme, priority, deferred }: { previews?: Thumbnail[]; scheme: Thumbnail["scheme"]; priority: boolean; deferred: boolean }) {
  const [broken, setBroken] = useState(false);
  const [started, setStarted] = useState(!deferred);
  useEffect(() => { if (!deferred) setStarted(true); }, [deferred]);
  const options = previews?.filter(entry => entry.scheme === scheme).sort((a, b) => b.width - a.width) ?? [];
  if (!options.length || broken || (deferred && !started && !priority)) return null;
  const [wide, small] = options;
  return <picture className="mx-preview-thumbnail">
    {small && <source media="(max-width: 365px)" srcSet={small.url} />}
    <img src={wide.url} width={wide.width} height={wide.height} alt="" loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "low"} onError={() => setBroken(true)} />
  </picture>;
}
