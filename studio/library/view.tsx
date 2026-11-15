import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Bookmark, Folder, Layers3, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { hrefFor, type Route } from "../app/catalog-view";
import { intercept } from "../app/shell";
import type { OriginalCard } from "../sources/local";
import { Collect, Favorite, LibraryDialog, LibraryFeedback, PersonalEdit } from "./actions";
import { type Collection, useLibrary } from "./store";

export default function LibraryView({ originals, route, navigate }: {
  originals: Map<string, OriginalCard>; route: Route; navigate: (route: Route) => void;
}) {
  const store = useLibrary()!;
  const data = store.data;
  const home: Route = { page: "library", item: "", query: "", category: "" };
  const requested = route.shelf;
  const collection = data?.collections.find(item => item.id === requested);
  const ids = collection ? collection.items : data?.favorites ?? [];
  const providerOptions = [...new Set(ids.map(id => originals.get(id)?.provider).filter(Boolean))].sort();
  const term = route.query.toLowerCase().trim();
  const list = ids.filter(id => {
    const source = originals.get(id);
    const note = data?.details[id];
    const text = [id, source?.title, source?.provider, ...(source?.tags ?? []), note?.note, ...(note?.tags ?? [])].join(" ").toLowerCase();
    return (!route.provider || route.provider === source?.provider) && (!route.kind || route.kind === source?.sourceKind)
      && term.split(/\s+/).every(word => text.includes(word));
  });
  if (route.sort) list.sort((a, b) => {
    const source = originals.get(a);
    const other = originals.get(b);
    const name = (source?.title ?? a).localeCompare(other?.title ?? b);
    return route.sort === "provider" ? (source?.provider ?? "").localeCompare(other?.provider ?? "") || name : name;
  });
  const href = (next: Route) => ({ href: hrefFor(next), onClick: (event: React.MouseEvent<HTMLAnchorElement>) => intercept(event, () => navigate(next)) });
  return <section className="mx-library mx-inner-page">
    <header className="mx-library-header">
      <div>{requested && <a className="mx-library-back" {...href(home)}><ArrowLeft size={16} aria-hidden="true" /> My Library</a>}
        <h1 tabIndex={-1}>{collection?.name ?? (requested ? "Collection unavailable" : "My Library")}</h1>
        <p>{requested && collection ? `${ids.length} saved originals` : "Keep your favorites and organize originals for your projects."}</p></div>
      <div className="mx-library-actions">
        <CollectionName />
        <ImportLibrary />
        <button className="mx-button" type="button" disabled={!data} onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" }));
          const download = document.createElement("a");
          download.href = url;
          download.download = "motionux-library.json";
          download.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}><ArrowDownToLine size={16} aria-hidden="true" /> Export library</button>
      </div>
    </header>
    <LibraryFeedback />
    {store.loading && !data ? <p role="status">Loading saved originals…</p> : data && <>
      <nav aria-label="Library collections" className="mx-library-shelves">
        <a {...href(home)} aria-current={!requested ? "page" : undefined}><Bookmark size={16} aria-hidden="true" /> Favorites <span>{data.favorites.length}</span></a>
        {data.collections.map(item => <a key={item.id} {...href({ ...home, shelf: item.id })} aria-current={requested === item.id ? "page" : undefined}>
          <Folder size={16} aria-hidden="true" /> {item.name} <span>{item.items.length}</span></a>)}
      </nav>
      {(!requested || collection) && <>
        <div className="mx-library-toolbar">
          <h2>{collection ? "Saved originals" : "Favorites"} <span>{list.length}</span></h2>
          <div className="mx-library-actions">
            {collection && <><CollectionName collection={collection} /><DeleteCollection collection={collection} close={() => navigate(home)} />
              <button type="button" className="mx-button" aria-pressed={Boolean(route.kit)} onClick={() => navigate({ ...route, kit: !route.kit })}>
                <Layers3 size={16} aria-hidden="true" /> Project Kit
              </button></>}
          </div>
        </div>
        {collection && route.kit && <ProjectKit key={collection.id} collection={collection} />}
        {ids.length > 0 && <div className="mx-library-filters">
          <select aria-label="Library provider" value={route.provider ?? ""} onChange={event => navigate({ ...route, provider: event.target.value || undefined })}>
            <option value="">All providers</option>{providerOptions.map(provider => <option key={provider}>{provider}</option>)}
          </select>
          <select aria-label="Library format" value={route.kind ?? ""} onChange={event => navigate({ ...route, kind: (event.target.value || undefined) as Route["kind"] })}>
            <option value="">All formats</option><option value="react">React</option><option value="html">HTML demo</option>
          </select>
          <select aria-label="Sort library" value={route.sort ?? ""} onChange={event => navigate({ ...route, sort: (event.target.value || undefined) as Route["sort"] })}>
            <option value="">Saved order</option><option value="name">Name</option><option value="provider">Provider</option>
          </select>
        </div>}
        {list.length ? <div className="mx-library-items">{list.map(id => {
          const source = originals.get(id);
          const note = data.details[id];
          const missing = source?.availability !== "ready";
          const title = source?.title ?? id;
          return <article key={id} className="mx-library-item" data-card={id}>
            <div><h3>{missing ? title : <a className="mx-open-playground" {...href({ ...route, fromLibrary: true, page: "playground", item: id })}>{title} <ArrowUpRight size={14} aria-hidden="true" /></a>}</h3>
              <p>{missing ? "Original unavailable. Saved in your library." : `${source.provider} · ${source.sourceKind === "html" ? "HTML/iframe" : "React"}`}</p>
              {note?.note && <p className="mx-personal-note">{note.note}</p>}
              {note?.tags.length > 0 && <ul className="mx-personal-tags">{note.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
            </div>
            <div className="mx-library-actions">
              {missing && source && <a className="mx-button" href={source.demoURL}>Original source</a>}
              <Favorite source={id} title={title} /><Collect source={id} title={title} missing={missing} /><PersonalEdit source={id} title={title} />
              {collection && <button type="button" className="mx-button" aria-label={`Remove ${title} from ${collection.name}`}
                disabled={store.saving} onClick={() => void store.save({ action: "membership", source: id,
                  collections: data.collections.filter(item => item.id !== collection.id && item.items.includes(id)).map(item => item.id) })}>Remove</button>}
            </div>
          </article>;
        })}</div> : <div className="mx-library-empty"><h3>{ids.length ? "No matching originals" : collection ? "This collection is empty" : "No favorites yet"}</h3>
          <p>{ids.length ? "Try another search or change the filters." : "Save originals from the Gallery to keep them here."}</p>
          <a className="mx-button" {...href({ ...home, page: "gallery" })}>Browse Gallery</a></div>}
      </>}
    </>}
  </section>;
}

function CollectionName({ collection }: { collection?: Collection }) {
  const store = useLibrary()!;
  const title = collection ? "Rename collection" : "New collection";
  return <LibraryDialog title={title} trigger={<>{!collection && <Plus size={16} aria-hidden="true" />}{collection ? "Rename" : title}</>}
    blocked={!store.data}>{close => <form onSubmit={async event => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get("name"));
      if (await store.save(collection ? { action: "rename", collection: collection.id, name } : { action: "create", name })) close();
    }}>
      <label>Collection name <input name="name" required maxLength={64} defaultValue={collection?.name} autoFocus /></label>
      <LibraryFeedback compact />
      <div className="mx-library-form-actions"><button className="mx-button" type="button" onClick={close}>Cancel</button>
        <button className="mx-button mx-library-primary" disabled={store.saving}>{collection ? "Save name" : "Create collection"}</button></div>
    </form>}</LibraryDialog>;
}

function DeleteCollection({ collection, close: navigateBack }: { collection: Collection; close: () => void }) {
  const store = useLibrary()!;
  return <LibraryDialog title={`Delete ${collection.name}?`} trigger="Delete" blocked={store.saving}>{close => <>
    <p>Favorites, personal notes and items in other collections will stay in My Library.</p>
    <LibraryFeedback compact />
    <div className="mx-library-form-actions"><button className="mx-button" type="button" onClick={close} autoFocus>Keep collection</button>
      <button className="mx-button mx-library-primary" type="button" disabled={store.saving} onClick={async () => {
        if (await store.save({ action: "delete", collection: collection.id })) { close(); navigateBack(); }
      }}>Delete collection</button></div>
  </>}</LibraryDialog>;
}

function ImportLibrary() {
  const store = useLibrary()!;
  return <LibraryDialog title="Import library" trigger={<><Upload size={16} aria-hidden="true" /> Import library</>}
    blocked={!store.data}>{close => <ImportForm close={close} />}</LibraryDialog>;
}

function ImportForm({ close }: { close: () => void }) {
  const store = useLibrary()!;
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState("");
  return <form onSubmit={async event => {
    event.preventDefault();
    setError("");
    const values = new FormData(event.currentTarget);
    const file = values.get("file");
    if (!(file instanceof File) || !file.size || file.size > 512 * 1024) {
      setError("Choose a non-empty library JSON file up to 512 KiB.");
      return;
    }
    let library;
    try { library = JSON.parse(await file.text()); }
    catch { setError("The selected file is not valid JSON."); return; }
    if (await store.save({ action: "import", mode: replace ? "replace" : "merge", library })) close();
  }}>
    <label>Library JSON <input type="file" accept="application/json,.json" name="file" required autoFocus /></label>
    <label>Import mode <select value={replace ? "replace" : "merge"} onChange={event => setReplace(event.target.value === "replace")}>
      <option value="merge">Merge into my library</option><option value="replace">Replace my library</option>
    </select></label>
    {replace && <label className="mx-library-check"><input type="checkbox" required /> Replace current favorites, notes and collections. A backup will be kept locally.</label>}
    {error && <p role="alert">{error}</p>}
    <LibraryFeedback compact />
    <div className="mx-library-form-actions"><button className="mx-button" type="button" onClick={close}>Cancel</button>
      <button className="mx-button mx-library-primary" disabled={store.saving}>Import</button></div>
  </form>;
}

type Kit = { items: { id: string; title: string; sourceKind: "react" | "html" }[]; missing: string[]; conflicts: { name: string; versions: string[] }[] };

function ProjectKit({ collection }: { collection: Collection }) {
  const [kit, setKit] = useState<Kit>();
  const [failed, setFailed] = useState(false);
  const path = "/v11/kits/" + collection.id;
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetch(path, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("No kit");
      return response.json() as Promise<Kit>;
    }).then(setKit, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [path, collection.items]);
  return <section className="mx-library-kit">
    <h3>Project Kit</h3>
    {failed ? <p role="alert">The kit could not be read. Close and reopen Project Kit to retry.</p> : !kit ? <p role="status">Preparing the package list…</p> : <>
      <ol><li>Download the kit to a private local folder and unzip it.</li><li>Follow the included instructions from your shadcn-configured project.</li>
        <li>Check overlapping dependencies, CSS and file targets before installing several originals into one project.</li></ol>
      <div className="mx-kit-types">{(["react", "html"] as const).map(kind => <section key={kind}><h4>{kind === "react" ? "React sources" : "Standalone HTML hosts"}</h4>
        {kit.items.some(item => item.sourceKind === kind) ? <ul>{kit.items.filter(item => item.sourceKind === kind).map(item =>
          <li key={item.id}>{item.title}</li>)}</ul> : <p>No items in this format.</p>}</section>)}</div>
      {Boolean(kit.missing.length) && <p>Unavailable and excluded from the kit: {kit.missing.join(", ")}.</p>}
      {Boolean(kit.conflicts.length) && <section><h4>Conflicting dependency pins</h4><ul>{kit.conflicts.map(item =>
        <li key={item.name}><code>{item.name}</code> {item.versions.join(", ")}</li>)}</ul><p>Evaluate these packages in separate consumers until you verify a shared dependency version.</p></section>}
      {Boolean(kit.items.length) && <a className="mx-button mx-library-primary" href={path + ".zip"} download><ArrowDownToLine size={16} aria-hidden="true" /> Download Project Kit</a>}
    </>}
  </section>;
}
