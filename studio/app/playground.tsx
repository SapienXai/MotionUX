import { ArrowLeft, ArrowUpRight, Check, Clipboard, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import registry from "../../registry.json";
import { type Reference, type Specimen } from "../catalog";
import { FEATURED, hrefFor, repoURL, type Route } from "./catalog-view";
import { GalleryPreview, PreviewBoundary, PreviewError, PreviewLoading, useStory } from "./preview";
import { intercept } from "./shell";

const panels = ["Preview", "Props", "Variants", "States", "Code", "Install", "Usage", "Accessibility", "Source"] as const;
type Panel = (typeof panels)[number];
const widths = { Desktop: [Monitor, "100%"], Tablet: [Tablet, "768px"], Mobile: [Smartphone, "375px"] } as const;
type Device = keyof typeof widths;
const files = import.meta.glob<string>("../../components/**/*.{tsx,ts,css}", { query: "?raw", import: "default" });

function CopyBlock({ content, label }: { content: string; label: string }) {
  const [message, setMessage] = useState("");
  return <div className="mx-copy-block">
    <button type="button" className="mx-button" aria-label={label} onClick={async () => {
      try { await navigator.clipboard.writeText(content); setMessage("Copied."); }
      catch { setMessage("Clipboard unavailable. Select the text to copy manually."); }
    }}>{message === "Copied." ? <Check size={16} /> : <Clipboard size={16} />} Copy</button>
    <span role="status">{message}</span><pre><code>{content}</code></pre>
  </div>;
}
function SourceCode({ item }: { item: Reference }) {
  const sources = registry.items.find(entry => entry.name === item.registryItem)?.files ?? [];
  const [path, setPath] = useState(sources[0]?.path ?? "");
  const [code, setCode] = useState<{ path: string; value?: string }>({ path: "" });
  useEffect(() => {
    let live = true;
    const load = files[`../../${path}`];
    if (load) void load().then(value => { if (live) setCode({ path, value }); }, () => { if (live) setCode({ path }); });
    return () => { live = false; };
  }, [path]);
  if (!sources.length) return <p>Registry file information is unavailable for this item.</p>;
  return <>
    <label className="mx-source-select">Registry file <select value={path} onChange={event => setPath(event.target.value)}>
      {sources.map(entry => <option key={entry.path}>{entry.path}</option>)}
    </select></label>
    <p>Source in this Studio build. The Install tab uses the verified catalog pin.</p>
    {code.path !== path ? <PreviewLoading /> : code.value ? <CopyBlock key={path} content={code.value} label="Copy source code" /> : <p role="alert">This file could not be loaded. <a href={`${repoURL}/blob/main/${path}`}>View source on GitHub</a></p>}
  </>;
}
function Inspector({ item, panel, story }: { item: Reference; panel: Panel; story?: Specimen }) {
  if (panel === "Code") return <SourceCode item={item} />;
  if (panel === "Install") return item.version ? <>
    <p>Install the pinned Studio preview in a project with a shadcn configuration. Review the generated files before use.</p>
    <CopyBlock content={`npx shadcn@4.23.0 add 'SapienXai/MotionUX/${item.registryItem}#${item.version}'`} label="Copy install command" />
  </> : <p>A verified installation pin is unavailable.</p>;
  if (panel === "Source") return <>
    <h2>{item.provider}</h2><p>{item.decision}</p><p>{item.sourceLicense}</p>
    <div className="mx-links"><a href={item.referencePreview}>View reference <ArrowUpRight size={15} /></a>
      {item.version && <a href={`${repoURL}/blob/${item.version}/registry.json`}>Pinned registry <ArrowUpRight size={15} /></a>}
      {item.test && <a href={`${repoURL}/blob/main/${item.test}`}>Tests <ArrowUpRight size={15} /></a>}</div>
  </>;
  if (!story) return <PreviewLoading />;
  if (panel === "Usage") return <CopyBlock content={story.usage} label="Copy React example" />;
  if (panel === "Accessibility") return <><h2>Keyboard and touch</h2><p>{story.accessibility}</p><h2>Performance</h2><p>{story.performance}</p></>;
  if (panel === "States") return <p>{story.states}</p>;
  if (panel === "Props") return <p>{story.api}</p>;
  return <><p>{story.api}</p><p>See Usage for supported options on this registry item. The preview settings let you test the same interaction across themes and viewport sizes.</p></>;
}

export default function Playground({ item, route, back, reduced, systemReduced }: { item: Reference; route: Route; back: () => void; reduced: boolean; systemReduced: boolean }) {
  const { story, error, retry } = useStory(item);
  const [panel, setPanel] = useState<Panel>("Preview");
  const [theme, setTheme] = useState("neutral");
  const [device, setDevice] = useState<Device>("Desktop");
  const [language, setLanguage] = useState<"en" | "tr">("en");
  const [quiet, setQuiet] = useState(false);
  const [compare, setCompare] = useState(false);
  const [reset, setReset] = useState(0);
  const [galleryExample, setGalleryExample] = useState(false);
  const hasFeatured = FEATURED.some(([id]) => id === item.id);
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (document.activeElement?.id === "studio-main") heading.current?.focus({ preventScroll: true });
  }, []);
  const minimize = systemReduced || quiet || reduced;
  const gallery: Route = { ...route, page: "gallery", item: "" };
  const stage = (comparison = false) => <MotionConfig reducedMotion={comparison || minimize ? "always" : "never"}>
    <div className="mx-studio-interaction" data-testid="specimen-interaction" data-reduced={comparison || minimize} lang={language}>
      <PreviewBoundary key={reset}>
        {galleryExample && language === "en" ? <GalleryPreview item={item} reduced={comparison || minimize} lead /> :
          error ? <PreviewError retry={retry} /> : story ? <story.component reduced={comparison || minimize} language={language} comparison={comparison} /> : <PreviewLoading />}
      </PreviewBoundary>
    </div>
  </MotionConfig>;
  return <article className="mx-playground" data-testid="specimen">
    <a className="mx-backlink" href={hrefFor(gallery)} onClick={event => intercept(event, back)}><ArrowLeft size={17} /> Back to Gallery</a>
    <div className="mx-play-title"><div><h1 id="specimen" ref={heading} tabIndex={-1}>{item.name}</h1><p>{item.provider} · {item.status === "ready" ? "Ready" : "Studio preview"} · {item.registryItem}</p></div>
      <button type="button" aria-label="Reset preview" className="mx-icon" onClick={() => setReset(value => value + 1)}><RotateCcw size={20} /></button></div>
    <nav className="mx-play-tabs" aria-label="Specimen information">
      {panels.map(name => <button key={name} type="button" className="mx-button" aria-pressed={panel === name} onClick={() => setPanel(name)}>{name}</button>)}
    </nav>
    {panel === "Preview" ? <>
      <details className="mx-play-settings"><summary>Preview settings</summary><div className="mx-play-controls">
        <div className="mx-play-devices" role="group" aria-label="Preview width">{Object.entries(widths).map(([name, [Icon]]) => <button type="button" className="mx-icon" key={name}
          title={name} aria-label={name} aria-pressed={device === name} onClick={() => setDevice(name as Device)}><Icon size={18} /></button>)}</div>
        <label>Theme <select value={theme} onChange={event => setTheme(event.target.value)}><option value="neutral">Neutral</option><option value="bookplace">BookPlace</option><option value="dinewallet">DineWallet</option></select></label>
        <label>Language <select value={language} onChange={event => setLanguage(event.target.value as "en" | "tr")}><option value="en">English</option><option value="tr">Türkçe</option></select></label>
        <label className="mx-check"><input type="checkbox" checked={minimize} disabled={systemReduced} onChange={event => setQuiet(event.target.checked)} /> Reduced motion</label>
        <button type="button" className="mx-button" aria-pressed={compare} onClick={() => setCompare(!compare)}>Compare</button>
        {hasFeatured && <button type="button" className="mx-button" aria-pressed={galleryExample} disabled={language !== "en"} onClick={() => setGalleryExample(!galleryExample)}>Gallery example</button>}
      </div></details>
      <div className="mx-play-stage mx-stage" data-theme={theme}><div className="mx-stage-meta"><span>Interactive preview</span><span>{device} · {minimize ? "Reduced motion" : "Normal motion"}</span></div>
        <div className="mx-stage-width" style={{ maxInlineSize: widths[device][1] }}>
          {stage()}
          {compare && <section className="mx-compare" aria-label="Reduced-motion comparison"><h2>Reduced-motion comparison</h2>{stage(true)}</section>}
        </div>
      </div>
      <div className="mx-play-notes">{story && <p>{story.states}</p>}</div>
    </> : <section className="mx-inspector" aria-label={panel}><Inspector item={item} panel={panel} story={story} /></section>}
  </article>;
}
