import { useEffect, useState } from "react";
import { ArrowLeft, ArrowDownToLine, RotateCcw } from "lucide-react";
import { hrefFor, type Route } from "../app/catalog-view";
import { intercept } from "../app/shell";
import { Collect, Favorite, PersonalEdit } from "../library/actions";
import { useLibrary } from "../library/store";
import { SourceFrame, type Original, type OriginalCard, type SourceLane } from "./local";
import reference from "../../metadata/v9-reference.json";
import "./sources.css";

type Scheme = "light" | "dark";
type Candidates = typeof import("../../metadata/v9-provider-candidates.json");

export function Discovery({ originals, route }: { originals: Map<string, OriginalCard>; route: Route }) {
  const [data, setData] = useState<Candidates>();
  const [failed, setFailed] = useState(false);
  const [provider, setProvider] = useState("");
  const [count, setCount] = useState(36);
  useEffect(() => { void import("../../metadata/v9-provider-candidates.json").then(setData, () => setFailed(true)); }, []);
  const groups = data?.providers ?? [];
  const installed = [...originals.values()].filter(item => item.availability === "ready");
  const installedURLs = new Set(installed.flatMap(item => [item.sourceURL, item.demoURL]).filter(Boolean));
  const installedSlugs = new Set(installed.map(item => item.group + ":" + item.slug.toLowerCase()));
  const candidates = groups.flatMap(group => group.candidates
    .filter(item => !installedURLs.has(item.source ?? "") && !installedURLs.has(item.demo ?? "") &&
      !installedSlugs.has(group.id + ":" + item.id.toLowerCase()))
    .map(item => ({ ...item, group })));
  const query = route.query.toLowerCase().trim();
  const matching = candidates.filter(item => (!provider || provider === item.group.id) &&
    [item.title, item.id.replaceAll("-", " "), item.group.name, item.category].join(" ").toLowerCase().includes(query));
  return <section className="mx-source-lab mx-inner-page">
    <header><h1 tabIndex={-1}>Discovery</h1><p>Browse upstream candidates outside the installed gallery.</p></header>
    {failed ? <p role="alert">The provider index could not be loaded. Reload to retry.</p> :
      !data ? <p role="status">Loading provider catalogs…</p> : <>
      <div className="mx-source-toolbar">
        <label>Provider <select value={provider} onChange={event => { setProvider(event.target.value); setCount(36); }}>
          <option value="">All providers</option>
          {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select></label>
        <p role="status">{matching.length} {matching.length === 1 ? "candidate" : "candidates"}</p>
      </div>
      <div className="mx-source-directory">{matching.slice(0, count).map(item =>
        <a key={item.group.id + ":" + item.id} href={item.demo ?? item.group.officialIndex} target="_blank" rel="noreferrer">
          <strong>{item.title}</strong><span>{item.group.name}</span><small>{item.category}</small>
        </a>)}</div>
      {matching.length > count && <button type="button" className="mx-button" onClick={() => setCount(count + 36)}>Show more</button>}
    </>}
  </section>;
}

export function Unavailable({ id, back }: { id: string; back: () => void }) {
  const known = reference.items.find(row => row.id === id);
  return <section className="mx-inner-page mx-source-lab">
    <header><h1 tabIndex={-1}>{known?.name ?? "Original unavailable"}</h1>
      {known && <p><strong>Original unavailable.</strong> {known.reason}</p>}</header>
    <div className="mx-source-actions">
      <button type="button" className="mx-button" onClick={back}>Back to Gallery</button>
      {known && <><a href={known.reference}>Original preview</a>
        <a href={hrefFor({ page: "playground", category: "", query: "", item: known.id, collection: "legacy", preset: true })}>V8 legacy preview</a></>}
    </div>
  </section>;
}

export default function SourceDetail({ id, route, scheme, back, navigate }: {
  id: string; route: Route; scheme: Scheme; back: () => void; navigate: (route: Route, replace?: boolean) => void;
}) {
  const [entry, setEntry] = useState<Original>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/v9/catalog.json?" + new URLSearchParams({ id }), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Source metadata unavailable");
      return response.json();
    }).then(setEntry, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [id]);
  if (failed || entry?.availability === "unavailable") return <Unavailable id={id} back={back} />;
  return entry ? <Comparison entry={entry} route={route} scheme={scheme} navigate={navigate} back={back} /> :
    <section className="mx-inner-page"><h1 tabIndex={-1} className="mx-sr">Source Playground</h1><p role="status">Loading original source…</p></section>;
}

function Comparison({ entry, route, scheme, navigate, back }: {
  entry: Original; route: Route; scheme: Scheme; back: () => void; navigate: (route: Route, replace?: boolean) => void;
}) {
  const pane = route.sourcePanel ?? "provenance";
  const html = entry.sourceKind === "html";
  const originalLabel = html ? "Captured original HTML" : "Captured upstream React";
  const installedLabel = html ? "Installed HTML iframe host" : "Installed React consumer";
  const lanes: [SourceLane, string][] = route.compare ?
    [["original", originalLabel], ["studio", "MotionUX Studio"], ["installed", installedLabel]] : [["studio", "MotionUX Studio"]];
  const saved = useLibrary()?.data?.details[entry.id];
  const [sceneOverride, setScene] = useState<string>();
  const scene = sceneOverride ?? (saved?.scene && entry.scenes.includes(saved.scene) ? saved.scene : entry.scenes[0]) ?? "";
  const previewScheme = !html && saved?.theme ? saved.theme : scheme;
  const [viewport, setViewport] = useState("auto");
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
  const galleryRoute: Route = { ...route, page: route.fromLibrary ? "library" : "gallery", item: "", source: undefined, sourcePanel: undefined, compare: false };
  return <section className="mx-source-lab mx-inner-page" id="specimen" aria-label={entry.title + " source Playground"}>
    <div className="mx-detail-header">
      <a href={hrefFor(galleryRoute)} className="mx-detail-back" onClick={event => intercept(event, back)}><ArrowLeft size={15} aria-hidden="true" /> {route.fromLibrary ? "My Library" : "Gallery"}</a>
      <div className="mx-source-heading">
        <div><h1 tabIndex={-1}>{entry.title}</h1><p>{entry.provider} · {html ? "Standalone HTML" : "React source"}</p></div>
        <div className="mx-library-actions"><Favorite source={entry.id} title={entry.title} /><Collect source={entry.id} title={entry.title} />
          <PersonalEdit source={entry.id} title={entry.title} scenes={entry.scenes} supportsTheme={!html} /></div>
        <div className="mx-source-actions">
          {entry.scenes.length > 0 && <label>Original scene <select value={scene} onChange={event => setScene(event.target.value)}>
            {entry.scenes.map(item => <option key={item}>{item}</option>)}
          </select></label>}
          {!route.compare && <label>Viewport <select aria-label="Preview viewport" value={viewport} onChange={event => setViewport(event.target.value)}>
            <option value="auto">Fit available space</option><option value="320">320 px</option><option value="390">390 px</option><option value="768">768 px</option>
          </select></label>}
          <button type="button" className="mx-button" onClick={() => setReset(reset + 1)}><RotateCcw size={15} aria-hidden="true" /> {route.compare ? "Reset all" : "Replay preview"}</button>
          <button type="button" className="mx-button" aria-pressed={route.compare === true} onClick={() => navigate({ ...route, compare: !route.compare }, true)}>Compare</button>
        </div>
      </div>
    </div>
    {route.compare && <p className="mx-comparison-note">The capture and Studio use the same upstream source. Studio applies its preview host. The installed consumer is built separately from the registry package. {html &&
      "The installed React host embeds the original HTML document. "}Reset all lanes together and repeat the interaction in each lane.</p>}
    <div className={route.compare ? "mx-source-comparison" : "mx-source-comparison mx-source-single"}>
      {lanes.map(([lane, label]) => <figure key={lane}>
        {route.compare && <figcaption>{label}</figcaption>}
        <div className="mx-detail-frame" style={{ blockSize: Math.max(entry.preview.height, 400) }}>
          <div className="mx-detail-viewport" style={{ inlineSize: route.compare || viewport === "auto" ? "100%" : `min(100%, ${viewport}px)` }}>
          <SourceFrame key={reset} scheme={previewScheme} entry={entry} lane={lane} scene={scene} label={label + " for " + entry.title} />
          </div>
        </div>
      </figure>)}
    </div>
    <section className="mx-inspector mx-source-inspector" aria-label="Source details">
      <div className="mx-source-actions">{(["provenance", "code", "usage", "install", "evidence"] as const).map(key =>
        <button type="button" className="mx-button" key={key} aria-pressed={pane === key} onClick={() => { navigate({ ...route, sourcePanel: key }, true); setStatus(""); }}>
          {key === "provenance" ? "Source" : key[0].toUpperCase() + key.slice(1)}
        </button>)}
      </div>
      {pane === "provenance" && <>
        <p>Source SHA-256 <code>{entry.upstreamHash}</code></p>
        {entry.upstreamCommit && <p>Upstream commit <code>{entry.upstreamCommit}</code></p>}
        <div className="mx-source-actions"><a href={entry.demoURL}>Official demo</a><a href={entry.sourceURL}>Original code</a>
          {entry.repo && <a href={entry.repo}>Original repository</a>}
          {entry.legacyId && <a href={hrefFor({ ...route, collection: "legacy", sourcePanel: undefined, compare: false })}>Legacy V8 version</a>}
        </div>
        <details><summary>Source and integration details</summary>
          {entry.notice && <p>{entry.notice}</p>}
          {Object.keys(entry.dependencies).length > 0 && <p>Dependencies <code>{Object.entries(entry.dependencies).map(([name, version]) => name + "@" + version).join(", ")}</code></p>}
          {entry.assets?.some(asset => asset.sourceURL) && <ul>{entry.assets.filter(asset => asset.sourceURL).map(asset =>
            <li key={asset.path}><a href={asset.sourceURL}>{asset.path}</a></li>)}</ul>}
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
          <Code value={result.source} title={codeLane === "original" ? "Upstream code" : "Installed code"} copy={copy} /> : <p role="status">Loading source…</p>}
      </>}
      {pane === "usage" && <>
        {html && <p>The React host loads the original standalone HTML document in a sandboxed iframe.</p>}
        <Code value={usage} title={html ? "HTML iframe host usage" : "React usage"} copy={copy} />
      </>}
      {pane === "evidence" && <Evidence entry={entry} />}
      {pane === "install" && <>
        <h2>Use in your project</h2>
        <p><strong>Source type</strong> {html ? "Standalone HTML (React iframe host)" : "React"}</p>
        <p>Run the install command from a shadcn-configured React project on this Mac while Studio is running.</p>
        {html ? <details><summary>HTML host integration</summary><p>The wrapper embeds the original document in a sandboxed iframe. The parent app can set its width and height. Styling, callbacks and accessibility semantics are scoped to the embedded document. The consumer’s CSP must permit same-origin frames and the original document’s approved assets.</p></details> :
          <details><summary>React consumer setup</summary><p>Install the package with the listed dependencies and use its included CSS, assets and aliases. Follow the Usage example. Sources with browser interaction need a client boundary in Next.js.</p></details>}
        <Code value={install} title="Private install command" copy={copy} />
        <div className="mx-source-actions"><a className="mx-button" href={entry.installURL} download>Download registry item</a>
          <a className="mx-button" href={`/v11/export/${entry.id}.zip`} download><ArrowDownToLine size={15} aria-hidden="true" /> Export local package</a></div>
      </>}
      {status && <p role="status">{status}</p>}
    </section>
  </section>;
}

function Evidence({ entry }: { entry: Original }) {
  const [result, setResult] = useState<{
    comparisons: { scheme: string; differentPixels?: number; totalPixels?: number; evidence?: string; error?: string }[];
    trajectories: { behaviorEqual?: boolean }[];
    galleryMount: boolean; deepLink: boolean; studio?: {
      image: string;
      pixelDiffs: { originalStudio: { different: number; total: number }; originalInstalled: { different: number; total: number } };
      interactionSampled: boolean; statesMatch: boolean;
    };
  }>();
  const [failed, setFailed] = useState(false);
  const url = "/v9/evidence/" + entry.id + ".json";
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Evidence unavailable");
      return response.json();
    }).then(setResult, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [url]);
  if (failed) return <p role="alert">Verification evidence could not be loaded.</p>;
  if (!result) return <p role="status">Loading verification…</p>;
  return <>
    <p>Source acceptance is pending.</p>
    {result.galleryMount && <p>V10 browser evidence recorded a live Gallery mount{result.deepLink ? " and a working direct Playground link" : ""}.</p>}
    {result.studio && <figure className="mx-source-evidence mx-v10-evidence">
      <figcaption>V10 comparison of captured upstream, Studio and installed</figcaption>
      <img alt={`Three execution contexts for ${entry.title}`} src={"/v9/evidence/" + result.studio.image} loading="lazy" />
      <p>{result.studio.pixelDiffs.originalStudio.different.toLocaleString()} of {result.studio.pixelDiffs.originalStudio.total.toLocaleString()} pixels differed in the upstream and Studio capture.</p>
      {result.studio.interactionSampled && <p>{result.studio.statesMatch ? "Sampled interaction outcomes matched." : "Sampled interaction outcomes differed."}</p>}
    </figure>}
    {!result.studio && !result.comparisons.length && !result.trajectories.length && <p>Matched visual and motion tests are pending for this source.</p>}
    {result.comparisons.map(comparison => <figure className="mx-source-evidence" key={comparison.scheme}>
      <figcaption>{comparison.scheme} · {comparison.error ? "Comparison did not complete" :
        `${comparison.differentPixels} of ${comparison.totalPixels} pixels differed`}</figcaption>
      {comparison.evidence && <img alt={`Original versus installed pixel overlay for ${entry.title}`} src={"/v9/evidence/" + comparison.evidence} width={440} height={440} loading="lazy" />}
    </figure>)}
    {result.trajectories.length > 0 && <p>{result.trajectories.filter(row => row.behaviorEqual).length} of {result.trajectories.length} sampled behavior comparisons matched.</p>}
    {(result.studio || result.comparisons.length > 0 || result.trajectories.length > 0) && <a href={url} download>Download comparison measurements</a>}
  </>;
}

function Code({ value, title, copy }: { value: string; title: string; copy: (source: string) => Promise<void> }) {
  return <>
    <pre tabIndex={0} role="region" aria-label={title}><code>{value}</code></pre>
    <button type="button" className="mx-button" onClick={() => void copy(value)}>Copy {title.toLowerCase()}</button>
  </>;
}
