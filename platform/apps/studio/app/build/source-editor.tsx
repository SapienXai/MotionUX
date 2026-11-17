"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { BuildProject } from "@motionux/build-core";
import type { SourceGraph, SourceInstance } from "@motionux/build-core/source-graph";
import { SourceJobStatus, sourceRequest, useSourceJob } from "./source-job";

type Pane = "outline" | "canvas" | "properties";
type Preview = { id?: string; status: string; url?: string; revision?: number; message?: string };
type Draft = { baseRevision: number; document: BuildProject["document"] };

export function SourceEditor({ initial, onBack }: { initial: BuildProject; onBack: () => void }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [past, setPast] = useState<BuildProject[]>([]);
  const [future, setFuture] = useState<BuildProject[]>([]);
  const [route, setRoute] = useState("/");
  const [selected, setSelected] = useState("");
  const [pane, setPane] = useState<Pane>("canvas");
  const [preview, setPreview] = useState<Preview>();
  const [width, setWidth] = useState("desktop");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const graph = draft.document.sourceGraph!;
  const page = graph.pages.find((page) => page.route === route) ?? graph.pages[0];
  const node = page.instances.find((item) => item.id === selected) ?? page.instances[0];
  const dirty = JSON.stringify(draft.document) !== JSON.stringify(saved.document);

  function load(project: BuildProject) {
    setSaved(project); setDraft(project); setPast([]); setFuture([]);
  }

  const operation = useSourceJob(initial.id, async (id) => {
    load(await sourceRequest<BuildProject>("/" + id));
    setBrief("");
    setPane("canvas");
  });

  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<Draft | null>("/" + initial.id + "/draft", "GET", undefined, controller.signal).then((stored) => {
      if (stored?.baseRevision === initial.revision && stored.document.sourceGraph)
        setDraft({ ...initial, document: stored.document });
    }, () => {});
    return () => controller.abort();
  }, [initial]);

  useEffect(() => {
    if (!dirty) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void sourceRequest("/" + saved.id + "/draft", "PUT", {
        version: 1, baseRevision: saved.revision, updatedAt: Date.now(), document: draft.document,
        pageId: "p-" + page.id, selected: node.id, device: "desktop", mode: "edit", panel: "canvas",
      }, controller.signal).catch((error: Error) => { if (!controller.signal.aborted) setError(error.message); });
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [dirty, draft, node.id, page.id, saved.id, saved.revision]);

  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<Preview>("/preview", "GET", undefined, controller.signal).then((current) => {
      if (current.id === saved.id && current.revision === saved.revision) setPreview(current);
      else setPreview(undefined);
    }, () => {});
    return () => controller.abort();
  }, [saved.id, saved.revision]);

  useEffect(() => {
    if (!preview || preview.status === "failed" || preview.status === "idle") return;
    const timer = window.setTimeout(() => {
      void sourceRequest<Preview>("/preview").then((current) => {
        if (current.id !== saved.id || current.revision !== saved.revision) setPreview(undefined);
        else setPreview(current);
      }, (error: Error) => setError(error.message));
    }, preview.status === "ready" ? 2500 : 400);
    return () => window.clearTimeout(timer);
  }, [preview, saved.id, saved.revision]);

  function edit(change: (graph: SourceGraph) => SourceGraph) {
    const next = change(graph);
    setPast((items) => [...items.slice(-29), draft]);
    setFuture([]);
    setDraft({ ...draft, document: { ...draft.document, sourceGraph: next, name: next.name, theme: next.theme,
      motionProfile: next.motion === "still" ? "none" : "system" } });
  }
  function editInstance(change: Partial<SourceInstance>) {
    edit((value) => ({ ...value, pages: value.pages.map((item) => item.id !== page.id ? item : {
      ...item, instances: item.instances.map((entry) => entry.id !== node.id ? entry : { ...entry, ...change }),
    }) }));
  }
  function history(forward = false) {
    const candidate = (forward ? future : past).at(-1);
    if (!candidate) return;
    if (forward) { setFuture(future.slice(0, -1)); setPast([...past, draft]); }
    else { setPast(past.slice(0, -1)); setFuture([...future, draft]); }
    setDraft(candidate);
  }
  async function action(callback: () => Promise<void>) {
    setError(""); setBusy(true);
    try { await callback(); } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function stop() {
    const current = await sourceRequest<Preview>("/preview");
    if (current.id === saved.id) await sourceRequest("/preview", "DELETE");
    setPreview(undefined);
  }
  function revise(event: FormEvent) {
    event.preventDefault();
    if (dirty || operation.active) return;
    void action(async () => { await stop(); await operation.start(brief, { project: saved.id, revision: saved.revision }); });
  }

  const locked = busy || operation.active;
  return <main className="b11-editor">
    <header className="build-toolbar">
      <div className="b11-editor-title"><button type="button" className="build-button" onClick={() => { void stop().catch(() => {}); onBack(); }}>Projects</button><strong dir="auto">{saved.document.name}</strong></div>
      <div className="build-toolbar-actions">
        <span role="status">{dirty ? "Unsaved changes" : "Revision " + saved.revision}</span>
        <button type="button" className="build-button" onClick={() => history()} disabled={!past.length || locked}>Undo</button>
        <button type="button" className="build-button" onClick={() => history(true)} disabled={!future.length || locked}>Redo</button>
        <button type="button" className="build-button" disabled={!dirty || locked} onClick={() => void action(async () => {
          await stop(); load(await sourceRequest<BuildProject>("/" + saved.id, "PUT", draft));
        })}>Save</button>
        <button type="button" className="build-button" disabled={dirty || locked || preview?.status === "building"} onClick={() => void action(async () => {
          if (preview) await stop();
          else {
            setPreview(await sourceRequest<Preview>("/" + saved.id + "/preview", "POST", { revision: saved.revision }));
            setPane("canvas");
          }
        })}>{preview ? "Stop Run" : "Run"}</button>
        <a aria-disabled={dirty || locked} href={!dirty && !locked ? "/api/build/" + saved.id + "/export" : undefined}
          onClick={(event) => { event.preventDefault(); if (!dirty && !locked) void action(() => download(saved.id, false)); }} className="build-button" >Export</a>
        <a aria-disabled={dirty || locked} href={!dirty && !locked ? "/api/build/" + saved.id + "/export-pwa" : undefined}
          onClick={(event) => { event.preventDefault(); if (!dirty && !locked) void action(() => download(saved.id, true)); }} className="build-button">Export PWA</a>
      </div>
    </header>
    {error && <p className="build-alert" role="alert">{error}</p>}
    <SourceJobStatus operation={operation} />
    <nav className="build-mobile-panels" aria-label="Source editor panes">{(["outline", "canvas", "properties"] as const).map((item) =>
      <button type="button" className="build-button" aria-pressed={pane === item} key={item} onClick={() => setPane(item)}>{item}</button>)}</nav>
    <div className="b11-workspace" data-pane={pane}>
      <aside className="b11-outline" aria-label="Project outline">
        <h2>Pages</h2>
        <nav aria-label="Project pages">{graph.pages.map((item) => <button type="button" key={item.id} className="build-button"
          aria-pressed={page.id === item.id} onClick={() => { setRoute(item.route); setSelected(""); }}>{item.title}</button>)}</nav>
        <h2>Sections</h2>
        {page.instances.map((item) => <button type="button" key={item.id} className="build-button" aria-pressed={node.id === item.id} onClick={() => {
          setSelected(item.id); setPane("properties");
        }}>{item.title}</button>)}
        <details><summary>Sources and limits</summary>
          {graph.sources.map((source) => <div key={source.id} className="b11-source">
            <a href={source.upstream} target="_blank" rel="noreferrer">{source.title}</a>
            <small>{source.provider} · {source.license} · {source.revision.slice(0, 8)}</small>
          </div>)}
          {graph.artifacts.map((item) => <div key={item.instance} className="b11-source"><small>{item.instance} · Generated from {item.generatedFrom.join(", ")}</small></div>)}
          {graph.limitations.map((item) => <p key={item}>{item}</p>)}
        </details>
      </aside>
      <section className="b11-canvas" aria-label="Application canvas">
        <div className="b11-canvas-bar">
          <span>{dirty ? "Run reflects the last saved revision." : preview?.message ?? page.title}</span>
          <label>Preview size <select value={width} onChange={(event) => setWidth(event.target.value)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
        </div>
        {preview?.status === "ready" && preview.url ? <iframe title="Live source application" data-size={width}
          sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="no-referrer" src={preview.url + page.route + (selected ? "#" + encodeURIComponent(node.id) : "")} /> :
          <button type="button" className="build-button" disabled={locked || dirty || Boolean(preview && preview.status === "building")}
            onClick={() => void action(async () => {
              if (preview) await stop();
              setPreview(await sourceRequest<Preview>("/" + saved.id + "/preview", "POST", { revision: saved.revision }));
            })}>Open saved preview</button>}
      </section>
      <aside className="b11-properties" aria-label="Source properties">
        <h2>Section properties</h2>
        <label>Title<input dir="auto" maxLength={400} value={node.title} disabled={locked} onChange={(event) => editInstance({ title: event.target.value })} /></label>
        <label>Description<textarea dir="auto" maxLength={600} value={node.description} disabled={locked} onChange={(event) => editInstance({ description: event.target.value })} /></label>
        <label>Placement<select value={node.layout} disabled={locked} onChange={(event) => editInstance({ layout: event.target.value === "column" ? "column" : "full" })}>
          <option value="full">Full width</option><option value="column">In grid</option></select></label>
        {node.entity && <fieldset disabled={locked}><legend>Data fields</legend>
          {graph.entities.find((entity) => entity.id === node.entity)?.fields.map((field) => <label key={field.id}>
            <input type="checkbox" checked={node.fields.includes(field.id)} onChange={(event) => editInstance({
              fields: event.target.checked ? [...node.fields, field.id] : node.fields.filter((id) => id !== field.id),
            })} /> {field.label}
          </label>)}
        </fieldset>}
        {node.media && <label>Image description<input dir="auto" maxLength={200} value={node.alternative} disabled={locked}
          onChange={(event) => editInstance({ alternative: event.target.value })} /></label>}
        <label>Motion<select value={node.motion} disabled={locked} onChange={(event) => editInstance({ motion: event.target.value === "still" ? "still" : "inherit" })}>
          <option value="inherit">Follow project</option><option value="still">Reduced</option></select></label>
        {node.items.map((item, index) => <fieldset key={index} disabled={locked}><legend>Item {index + 1}</legend>
          <label>Label<input dir="auto" maxLength={400} value={item.label} onChange={(event) => editInstance({ items: node.items.map((row, at) => at === index ? { ...row, label: event.target.value } : row) })} /></label>
          <label>Text<textarea dir="auto" maxLength={400} value={item.text} onChange={(event) => editInstance({ items: node.items.map((row, at) => at === index ? { ...row, text: event.target.value } : row) })} /></label>
        </fieldset>)}
        <details><summary>Project appearance</summary>
          <label>Theme<select disabled={locked} value={graph.theme} onChange={(event) => {
            const theme = event.target.value;
            if (theme === "system" || theme === "light" || theme === "dark") edit((current) => ({ ...current, theme }));
          }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <label>Project motion<select disabled={locked} value={graph.motion} onChange={(event) => {
            const motion = event.target.value === "still" ? "still" : "system";
            edit((current) => ({ ...current, motion }));
          }}><option value="system">Follow system</option><option value="still">Reduced</option></select></label>
        </details>
        <form onSubmit={revise}>
          <label>Revise with Codex<textarea dir="auto" value={brief} minLength={12} maxLength={3200} required disabled={locked} onChange={(event) => setBrief(event.target.value)} /></label>
          <button type="submit" className="build-button" disabled={dirty || locked}>Revise saved application</button>
        </form>
        <button type="button" className="build-button" disabled={dirty || locked} onClick={() => void action(async () => { await stop(); load(await sourceRequest<BuildProject>("/" + saved.id + "/recover", "POST")); })}>Restore previous revision</button>
      </aside>
    </div>
  </main>;
}

async function download(id: string, pwa: boolean) {
  const response = await fetch("/api/build/" + id + "/" + (pwa ? "export-pwa" : "export"), { headers: { "X-MotionUX-Build": "1" } });
  if (!response.ok) throw new Error((await response.json()).message);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "motionux-app.zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
