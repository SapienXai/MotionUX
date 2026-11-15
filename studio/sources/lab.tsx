import { useEffect, useState, type MouseEvent } from "react";
import { hrefFor, type Route } from "../app/catalog-view";
import { SourceFrame, type Original, type SourceLane } from "./local";
import reference from "../../metadata/v9-reference.json";
import "./sources.css";

type Pane = "provenance" | "code" | "usage" | "install";
const lanes: ReadonlyArray<[SourceLane, string]> = [
  ["original", "Original upstream"], ["adapter", "MotionUX Studio"], ["installed", "Installed React"],
];
const rows = reference.items;
type Candidates = typeof import("../../metadata/v9-provider-candidates.json");

export default function SourceLab({ originals, route, scheme, navigate }: {
  originals: Map<string, Original>; route: Route; scheme: "light" | "dark"; navigate: (route: Route) => void;
}) {
  const [provider, setProvider] = useState("");
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState<Candidates>();
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const requested = originals.get(route.source ?? "");
  const known = rows.find(row => row.id === route.source);
  function select(event: MouseEvent<HTMLAnchorElement>, source: string) {
    if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    navigate({ ...route, source, sourcePanel: undefined });
  }
  const href = (source: string) => hrefFor({ ...route, source, sourcePanel: undefined });
  const query = route.query.toLocaleLowerCase().trim();
  const primary = rows.map(row => ({
    ...row, original: originals.get(row.id),
  }));
  const referenceIds = new Set(rows.map(row => row.id));
  const extra = [...originals.values()].filter(item => !referenceIds.has(item.id)).map(item => ({
    id: item.id, name: item.title, provider: item.provider, reference: item.demoURL, sourceStatus: item.fidelityStatus, original: item,
  }));
  const all = [...primary, ...extra];
  const matched = all.filter(row => (!provider || provider === row.provider) &&
    [row.name, row.provider, row.sourceStatus].join(" ").toLocaleLowerCase().includes(query));
  async function loadCandidates() {
    setLoadingCatalog(true);
    setCatalogError(false);
    try {
      const module = await import("../../metadata/v9-provider-candidates.json");
      setCandidates(module.default);
    } catch {
      setCatalogError(true);
    } finally {
      setLoadingCatalog(false);
    }
  }
  return <section className="mx-source-lab mx-inner-page">
    <header>
      <h1 tabIndex={-1}>Original sources</h1>
      <p>{originals.size ? `${originals.size} mounted in the private workspace` : "Open the private Studio to run the original-source previews."}</p>
    </header>
    {requested ? <Comparison key={`${requested.id}-${route.sourcePanel ?? ""}`} entry={requested} scheme={scheme}
      initialPane={route.sourcePanel} isLegacy={Boolean(known)} /> :
      known && <section className="mx-inspector"><h2>{known.name}</h2><p>{known.reason}</p>
        <div className="mx-source-actions"><a href={known.reference}>Original preview</a>
          {known.upstream && <a href={known.upstream}>Provider documentation</a>}
          <a href={`?item=${known.id}&preset=gallery`}>V8 legacy preview</a></div>
      </section>}
    <div className="mx-source-toolbar">
      <label>Provider <select value={provider} onChange={event => { setProvider(event.target.value); setPage(1); }}>
        <option value="">All providers</option>
        {[...new Set(all.map(row => row.provider))].sort().map(name => <option key={name}>{name}</option>)}
      </select></label>
      <p role="status">{matched.length} matches</p>
    </div>
    <div className="mx-source-directory">
      {matched.slice(0, page * 30).map(row => <a key={row.id} href={href(row.id)} onClick={event => select(event, row.id)}
        aria-current={route.source === row.id ? "true" : undefined}>
        <strong>{row.name}</strong><span>{row.provider}</span>
        <small>{row.original ? "Local original" : row.sourceStatus === "source-acquired" ? "Source captured" : row.sourceStatus === "upstream-linked" ? "Official source link" : "Original unavailable"}</small>
      </a>)}
    </div>
    {matched.length > page * 30 && <button type="button" className="mx-button" onClick={() => setPage(page + 1)}>Show 30 more</button>}
    <section className="mx-inspector">
      <h2>Provider discovery</h2>
      {candidates ? <ProviderList data={candidates} /> :
        <button type="button" className="mx-button" disabled={loadingCatalog} onClick={() => void loadCandidates()}>
          {loadingCatalog ? "Loading provider index…" : "Browse discovered sources"}
        </button>}
      {catalogError && <p role="alert">The provider index could not load. Try again.</p>}
    </section>
  </section>;
}

function ProviderList({ data }: { data: Candidates }) {
  const [selected, setSelected] = useState(data.providers[0].id);
  const [count, setCount] = useState(30);
  const [query, setQuery] = useState("");
  const provider = data.providers.find(row => row.id === selected)!;
  const candidates = provider.candidates.filter(item => `${item.title} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="mx-source-toolbar">
      <label>Catalog <select value={selected} onChange={event => { setSelected(event.target.value); setCount(30); }}>
        {data.providers.map(row => <option key={row.id} value={row.id}>{row.name} ({row.candidates.length})</option>)}
      </select></label>
      <label>Find in provider <input type="search" value={query} onChange={event => { setCount(30); setQuery(event.target.value); }} /></label>
    </div>
    <p>{candidates.length} candidates in {provider.name}. Discovery entries link to the provider.</p>
    <div className="mx-source-directory">{candidates.slice(0, count).map(row =>
      <a key={row.id} href={row.demo ?? provider.officialIndex}><strong>{row.title}</strong><span>{row.category}</span><small>{row.access}</small></a>)}</div>
    {candidates.length > count && <button type="button" className="mx-button" onClick={() => setCount(count + 30)}>Show 30 more</button>}
  </>;
}

function Comparison({ entry, scheme, initialPane, isLegacy }: {
  entry: Original; scheme: "light" | "dark"; initialPane?: Pane; isLegacy: boolean;
}) {
  const [pane, setPane] = useState<Pane>(initialPane ?? "provenance");
  const [scene, setScene] = useState(entry.scenes[0] ?? "");
  const [reset, setReset] = useState(0);
  const [file, setFile] = useState(entry.entry);
  const [codeLane, setCodeLane] = useState("original");
  const [result, setResult] = useState<{ key: string; source?: string }>();
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (pane !== "code") return;
    const controller = new AbortController();
    const key = codeLane + ":" + file;
    fetch("/v9/source?" + new URLSearchParams({ id: entry.id, file, lane: codeLane }), { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Source unavailable");
        return response.text();
      })
      .then(source => setResult({ key, source }), () => { if (!controller.signal.aborted) setResult({ key }); });
    return () => controller.abort();
  }, [entry.id, file, pane, codeLane]);
  async function copy(source: string) {
    try { await navigator.clipboard.writeText(source); setStatus("Copied"); }
    catch { setStatus("Select the text to copy it."); }
  }
  const install = `npx shadcn@4.23.0 add ${location.origin}${entry.installURL}`;
  const usage = entry.usage.replace('const scene = "";', `const scene = ${JSON.stringify(scene)};`);
  return <section aria-label={entry.title + " live comparison"}>
    <div className="mx-source-heading">
      <div><h2>{entry.title}</h2><p>{entry.provider} · {entry.format === "html" ? "Original HTML, CSS and JavaScript" : "Original React source"}</p></div>
      <div className="mx-source-actions">
        {entry.scenes.length > 0 && <label>Original scene <select value={scene} onChange={event => setScene(event.target.value)}>
          {entry.scenes.map(item => <option key={item}>{item}</option>)}
        </select></label>}
        <button type="button" className="mx-button" onClick={() => setReset(reset + 1)}>Reset all</button>
      </div>
    </div>
    <div className="mx-source-comparison">
      {lanes.map(([lane, label]) => <figure key={lane}>
        <figcaption>{label}</figcaption>
        <SourceFrame key={reset} scheme={scheme} entry={entry} lane={lane} scene={scene} label={label + " for " + entry.title} />
      </figure>)}
    </div>
    <section className="mx-inspector mx-source-inspector" aria-label="Source details">
      <div className="mx-source-actions">{(["provenance", "code", "usage", "install"] as const).map(key =>
        <button type="button" className="mx-button" key={key} aria-pressed={pane === key} onClick={() => { setPane(key); setStatus(""); }}>
          {key[0].toUpperCase() + key.slice(1)}
        </button>)}
      </div>
      {pane === "provenance" && <>
        <p>Source SHA-256 <code>{entry.upstreamHash}</code></p>
        {entry.upstreamCommit && <p>Upstream commit <code>{entry.upstreamCommit}</code></p>}
        <div className="mx-source-actions"><a href={entry.demoURL}>Official demo</a><a href={entry.sourceURL}>Original code</a>
          {entry.repo && <a href={entry.repo}>Original repository</a>}
          {isLegacy && <a href={`?item=${entry.id}&preset=gallery`}>V8 legacy preview</a>}
        </div>
        <details><summary>Integration differences</summary>
          <p>{entry.fidelityStatus === "source-adapted"
            ? "The installed source remaps the upstream workspace imports to the consumer’s component and utility aliases."
            : "The installed component retains the captured source bytes."}
            {" "}The frame host supplies sizing and theme selection where supported.</p>
        </details>
      </>}
      {pane === "code" && <>
        <label>Version <select value={codeLane} onChange={event => setCodeLane(event.target.value)}>
          <option value="original">Upstream source</option><option value="installed">Installed source</option>
        </select></label>
        <label>Source file <select value={file} onChange={event => setFile(event.target.value)}>
          {entry.codeFiles.map(item => <option key={item.path}>{item.path}</option>)}
        </select></label>
        {result?.key === codeLane + ":" + file ? result.source === undefined ? <p role="alert">This file could not be opened.</p> :
          <Code value={result.source} title="Original code" copy={copy} /> : <p role="status">Loading source…</p>}
      </>}
      {pane === "usage" && <Code value={usage} title="React usage" copy={copy} />}
      {pane === "install" && <>
        <p>Run this command from a shadcn-configured React project while the private Studio is running. The payload keeps the original source and notices.</p>
        <Code value={install} title="Private install command" copy={copy} />
        <a href={entry.installURL} download>Download registry item</a>
      </>}
      {status && <p role="status">{status}</p>}
    </section>
  </section>;
}

function Code({ value, title, copy }: { value: string; title: string; copy: (source: string) => Promise<void> }) {
  return <>
    <pre tabIndex={0} role="region" aria-label={title}><code>{value}</code></pre>
    <button type="button" className="mx-button" onClick={() => void copy(value)}>Copy {title.toLowerCase()}</button>
  </>;
}
