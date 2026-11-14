import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Contrast, Clipboard, Monitor, RotateCcw, Search, Smartphone, Tablet } from "lucide-react";
import { MotionConfig, useReducedMotion } from "motion/react";
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import { labels, previews, references, type Reference } from "./catalog";
import "./studio.css";

const featured = "designbookmark-tab-pill";
const sizes = { Desktop: "100%", Tablet: "768px", Mobile: "375px" };
type Device = keyof typeof sizes;
type Filter = "all" | "demos" | "ready" | "needs-review" | "blocked";
const views = ["Overview", "Usage", "Install", "Accessibility", "Source"] as const;
type View = (typeof views)[number];

function currentId() {
  return new URLSearchParams(location.search).get("item") || "";
}

function LiveSpecimen({ item, previewKey, reduced, language, view }: {
  item: Reference; previewKey: number; reduced: boolean; language: "en" | "tr"; view: View;
}) {
  const Preview = useMemo(() => lazy(async () => {
    const { default: story } = await previews[item.id]!();
    return { default: ({ previewKey, reduced, language, view }: Omit<Parameters<typeof LiveSpecimen>[0], "item">) => (
      view === "Overview" ? <>
        <div className="mx-studio-interaction" data-testid="specimen-interaction" key={previewKey}>
          <div lang={language}><story.component reduced={reduced} language={language} /></div>
        </div>
        <div className="mx-spec-notes"><p>{story.states}</p><p>{story.api}</p></div>
      </> : view === "Usage" ? <>
        <CopyBlock content={story.usage} label="Copy React example" />
        <p>{story.api}</p>
      </> : view === "Accessibility" ? <>
        <h3>Keyboard and touch</h3><p>{story.accessibility}</p>
        <h3>Performance</h3><p>{story.performance}</p>
      </> : null
    ) };
  }), [item.id]);
  return <Suspense fallback={<p className="mx-loading" role="status">Loading specimen…</p>}>
    <Preview previewKey={previewKey} reduced={reduced} language={language} view={view} />
  </Suspense>;
}

function CopyBlock({ content, label }: { content: string; label: string }) {
  const [message, setMessage] = useState("");
  return <div className="mx-copy-block">
    <pre><code>{content}</code></pre>
    <button type="button" aria-label={label} onClick={async () => {
      try { await navigator.clipboard.writeText(content); setMessage("Copied."); }
      catch { setMessage("Clipboard unavailable. Select the text to copy it."); }
    }}><Clipboard size={16} aria-hidden /> Copy</button>
    <span role="status">{message}</span>
  </div>;
}

function Install({ item }: { item: Reference }) {
  const ref = item.version;
  if (!ref) return <p>Install instructions will appear after this component has a verified GitHub ref.</p>;
  return <><p>Run this in a React project with a shadcn configuration. The files are copied into your component alias.</p>
    <CopyBlock content={`npx shadcn@latest add 'SapienXai/MotionUX/${item.registryItem}#${ref}'`} label="Copy install command" />
  </>;
}

function Studio() {
  const platformReduced = useReducedMotion();
  const [selected, setSelected] = useState(currentId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [provider, setProvider] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("live");
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const [theme, setTheme] = useState("neutral");
  const [size, setSize] = useState<Device>("Desktop");
  const [reduced, setReduced] = useState(false);
  const [language, setLanguage] = useState<"en" | "tr">("en");
  const [view, setView] = useState<View>("Overview");
  const [compare, setCompare] = useState(false);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const sync = () => { setSelected(currentId()); setView("Overview"); };
    window.addEventListener("popstate", sync);
    if (location.hash === "#specimen" && currentId()) {
      document.getElementById("specimen")?.scrollIntoView({ block: "start" });
    }
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const prefersReduced = reduced || platformReduced === true;
  const item = references.find((entry) => entry.id === (selected || featured))!;
  const hasDemo = item && Boolean(previews[item.id]);
  const filtered = useMemo(() => references.filter((entry) => {
    const names = `${entry.name} ${entry.provider} ${entry.interaction}`.toLowerCase();
    return names.includes(query.trim().toLowerCase()) && (category === "all" || category === entry.category) &&
      (provider === "all" || provider === entry.provider) &&
      (filter === "all" || (filter === "demos" ? Boolean(previews[entry.id]) : entry.status === filter));
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "live" ? Number(Boolean(previews[b.id])) - Number(Boolean(previews[a.id])) : a.order - b.order), [query, category, provider, filter, sort]);
  const open = (id: string) => {
    const url = new URL(location.href);
    url.searchParams.set("item", id);
    url.hash = "specimen";
    history.pushState(null, "", url);
    setSelected(id); setView("Overview");
    requestAnimationFrame(() => {
      const heading = document.getElementById("specimen");
      heading?.focus({ preventScroll: true });
      if (window.innerWidth < 960) heading?.scrollIntoView({ block: "start" });
    });
  };
  const shownView = view === "Overview" || view === "Usage" || view === "Accessibility";

  return <div className="mx-studio" data-scheme={scheme}>
    <a className="mx-skip" href="#index">Skip to the catalog</a>
    <header className="mx-masthead">
      <a href="./" className="mx-wordmark">MotionUX <span>Studio</span></a>
      <nav aria-label="Studio"><a href="#index">Catalog</a><a href="https://github.com/SapienXai/MotionUX">GitHub <ArrowUpRight size={14} aria-hidden /></a></nav>
      <button className="mx-theme" aria-label={scheme === "light" ? "Switch to dark mode" : "Switch to light mode"} onClick={() => setScheme(scheme === "light" ? "dark" : "light")}><Contrast size={19} aria-hidden /></button>
    </header>
    <main className="mx-body">
      <section className="mx-intro" aria-labelledby="title">
        <div><h1 id="title">A field guide to<br/><em>interface motion.</em></h1>
          <p>Try a gesture. Change its setting. Take the React source into your own interface.</p>
          <a href="#specimen" className="mx-explore">Try the featured specimen <ArrowDown size={17} aria-hidden /></a>
        </div>
        <div className="mx-plate">
          <div className="mx-plate-forms" aria-hidden="true"><i/><i/><i/><i/><i/></div>
          <div><span>Motion studies</span><span>Volume 02</span></div>
        </div>
      </section>
      <section className="mx-workspace" aria-label="Component catalog">
        <aside className="mx-index" id="index" aria-labelledby="index-title">
          <div className="mx-index-title"><h2 id="index-title">Catalog</h2><span>{Object.keys(previews).length} live · {references.length} references</span></div>
          <label className="mx-search"><Search size={17} aria-hidden /><input type="search" placeholder="Find a component" aria-label="Find a component" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="mx-filters">
            <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>{Object.entries(labels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
            <select aria-label="Provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="all">All sources</option>{["DesignBookmark", "Kokonut UI", "SmoothUI"].map((name) => <option key={name}>{name}</option>)}
            </select>
            <select aria-label="Status" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
              <option value="all">All statuses</option><option value="demos">Live demo</option><option value="ready">Ready</option><option value="needs-review">Needs review</option><option value="blocked">Blocked</option>
            </select>
            <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="catalog">Catalog order</option><option value="name">Title A–Z</option><option value="live">Live first</option></select>
          </div>
          <p className="mx-result-count" role="status">{filtered.length} matches</p>
          <ul className="mx-items" aria-label="Specimens">
            {filtered.map((entry) => <li key={entry.id}>
              <a href={`?item=${entry.id}#specimen`} aria-current={entry.id === item?.id ? "true" : undefined}
                onClick={(event) => { if (!(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)) { event.preventDefault(); open(entry.id); } }}>
                <span>{String(entry.order).padStart(2, "0")}</span>
                <span>{entry.name}<small>{entry.provider}</small></span>
                <small className="mx-item-status">{previews[entry.id] ? "Live" : "Pending"}</small>
              </a>
            </li>)}
          </ul>
          {!filtered.length && <p className="mx-empty">Try a different name or filter.</p>}
        </aside>
        <article className="mx-specimen" data-testid="specimen">
          <a className="mx-back" href="#index">Browse the catalog <ArrowDown size={15} aria-hidden /></a>
          {item ? <>
            <div className="mx-specimen-title"><div><h2 id="specimen" tabIndex={-1}>{item.name}</h2><p>{item.provider} · {labels[item.category]} · {hasDemo ? (item.status === "ready" ? "Ready" : "Preview") : "Awaiting implementation"}</p></div>
              <button type="button" className="mx-icon" onClick={() => setReset(reset + 1)} disabled={!hasDemo} aria-label="Reset preview"><RotateCcw size={18} aria-hidden /></button>
            </div>
            <nav className="mx-views" aria-label="Specimen information">
              {views.map((name) => <button type="button" key={name} aria-pressed={name === view} onClick={() => setView(name)}>{name}</button>)}
            </nav>
            {view === "Overview" && <>
              <details className="mx-preview-settings"><summary>Preview settings</summary><div className="mx-controls">
                <div className="mx-device" role="group" aria-label="Preview width">
                  {Object.entries({ Desktop: Monitor, Tablet, Mobile: Smartphone }).map(([name, Icon]) => <button type="button" key={name} title={name} aria-label={name}
                    aria-pressed={size === name} onClick={() => setSize(name as Device)}><Icon size={17} aria-hidden /></button>)}
                </div>
                <label><span>Theme</span><select aria-label="Theme" value={theme} onChange={(event) => setTheme(event.target.value)}><option value="neutral">Neutral</option><option value="bookplace">BookPlace</option><option value="dinewallet">DineWallet</option></select></label>
                <label><span>Language</span><select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as "en" | "tr")}><option value="en">English</option><option value="tr">Türkçe</option></select></label>
                <label className="mx-toggle"><input type="checkbox" checked={prefersReduced} disabled={platformReduced === true} onChange={(event) => setReduced(event.target.checked)} />Reduced motion</label>
                <button type="button" aria-pressed={compare} disabled={!hasDemo} onClick={() => setCompare(!compare)}>Compare</button>
              </div></details>
            </>}
            {view === "Overview" && hasDemo ? <div className="mx-stage" data-theme={theme}>
              <div className="mx-stage-meta"><span>Interactive specimen</span><span>{size === "Desktop" ? "Available width" : size === "Tablet" ? "Up to 768 px" : "Up to 375 px"} · {prefersReduced ? "Reduced" : "Normal"}</span></div>
              <div className="mx-stage-body" style={{ maxInlineSize: sizes[size] }}>
                <MotionConfig reducedMotion={prefersReduced ? "always" : "user"}>
                  <LiveSpecimen key={item.id} item={item} previewKey={reset} reduced={prefersReduced} language={language} view={view} />
                </MotionConfig>
                {compare && <section className="mx-comparison" aria-label="Reduced-motion comparison">
                  <h3>{prefersReduced ? "Reduced-motion reference" : "Compare with reduced motion"}</h3>
                  <MotionConfig reducedMotion="always">
                    <LiveSpecimen key={item.id + "-static"} item={item} previewKey={reset} reduced language={language} view={view} />
                  </MotionConfig>
                </section>}
              </div>
            </div> : <div className="mx-inspector">
              {view === "Install" ? <Install item={item} /> : view === "Source" ? <>
                <h3>{item.provider}</h3><p>{item.decision}</p><p>{item.sourceLicense}</p>
                <a href={item.referencePreview}>View reference <ArrowUpRight size={14} aria-hidden /></a>
                {item.test && <a href={`https://github.com/SapienXai/MotionUX/blob/main/${item.test}`}>Test evidence <ArrowUpRight size={14} aria-hidden /></a>}
              </> : hasDemo && shownView ? <LiveSpecimen item={item} previewKey={reset} reduced={prefersReduced} language={language} view={view} /> :
              <><p>{item.interaction}</p><p>This entry is tracked in the reference inventory. Its component and preview are pending.</p></>}
            </div>}
          </> : <div className="mx-inspector"><h2 id="specimen" tabIndex={-1}>Specimen unavailable</h2><button onClick={() => open(featured)}><ArrowLeft size={16} aria-hidden /> Open the featured specimen</button></div>}
        </article>
      </section>
    </main>
    <footer className="mx-footer"><span>MotionUX Studio</span><a href="?legacy=1">v1 examples <ArrowRight size={15} aria-hidden /></a><a href="https://github.com/SapienXai/MotionUX/blob/main/docs/IMPLEMENTATION-STATUS.md">Implementation status <ArrowUpRight size={15} aria-hidden /></a></footer>
  </div>;
}

if (new URLSearchParams(location.search).has("legacy")) {
  document.documentElement.lang = "tr";
  void import("../examples/main");
} else {
  createRoot(document.getElementById("root")!).render(<Studio />);
}
