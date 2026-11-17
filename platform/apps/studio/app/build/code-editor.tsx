"use client";
import { useEffect, useRef, useState } from "react";
import type { BuildProject } from "@motionux/build-core";
import type { CodeProject } from "@motionux/build-core/code-project";
import { sourceRequest, SourceJobStatus, useSourceJob } from "./source-job";

type Preview = { documentDigest?: string; id?: string; revision?: number; status: string; url?: string; message?: string };

export function CodeEditor({ initial, onBack }: { initial: BuildProject; onBack: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [past, setPast] = useState<BuildProject[]>([]);
  const [future, setFuture] = useState<BuildProject[]>([]);
  const [preview, setPreview] = useState<Preview>();
  const [route, setRoute] = useState("/");
  const [device, setDevice] = useState("desktop");
  const [panel, setPanel] = useState("canvas");
  const [error, setError] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [inventory, setInventory] = useState<{ counts: { total: number; compilerReady: number; reasons: Record<string, number> } }>();
  const program = draft.document.codeProject!;
  const dimensions = device === "mobile" ? [390, 844] : device === "tablet" ? [768, 1024] : [1440, 1000];
  const scale = Math.min(1, (availableWidth || dimensions[0]) / dimensions[0]);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => setAvailableWidth(node.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [preview?.status]);
  const dirty = JSON.stringify(saved.document) !== JSON.stringify(draft.document);
  const operation = useSourceJob(saved.id, async (id) => {
    const next = await sourceRequest<BuildProject>("/" + id);
    setSaved(next); setDraft(next); setPast([]); setFuture([]);
  });
  const locked = busy || operation.active;
  function projectControls() {
    const target = frame.current?.contentWindow;
    if (!target || !preview?.documentDigest || preview.status !== "ready") return;
    target.postMessage({ type: "motionux:controls", digest: preview.documentDigest,
      values: Object.fromEntries(program.controls.map(({ key, value }) => [key, value])),
    }, "http://127.0.0.1:5202");
  }
  useEffect(projectControls, [draft, preview?.documentDigest, preview?.status]);
  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<{ baseRevision: number; document: BuildProject["document"] } | null>("/" + initial.id + "/draft", "GET", undefined, controller.signal).then((draft) => {
      if (draft?.baseRevision === initial.revision && draft.document.codeProject) setDraft({ ...initial, document: draft.document });
    }, () => {});
    return () => controller.abort();
  }, [initial]);
  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<Preview>("/preview", "GET", undefined, controller.signal).then((current) => {
      setPreview(current.id === saved.id && current.revision === saved.revision ? current : undefined);
    }, () => {});
    return () => controller.abort();
  }, [saved.id, saved.revision]);
  useEffect(() => {
    if (!preview || ["failed", "idle"].includes(preview.status)) return;
    const timer = setTimeout(() => {
      void sourceRequest<Preview>("/preview").then((current) => {
        setPreview(current.id === saved.id ? current : undefined);
      }, (error: Error) => setError(error.message));
    }, preview.status === "ready" ? 3000 : 400);
    return () => clearTimeout(timer);
  }, [preview, saved.id]);
  useEffect(() => {
    if (!dirty) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void sourceRequest("/" + saved.id + "/draft", "PUT", {
        version: 1, baseRevision: saved.revision, updatedAt: Date.now(), document: draft.document,
        pageId: draft.document.pages.find((page) => page.route === route)?.id ?? draft.document.pages[0].id,
        selected: null, device: "desktop", mode: "edit", panel: "canvas",
      }, controller.signal).catch((error: Error) => { if (!controller.signal.aborted) setError(error.message); });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [dirty, draft, saved.id, saved.revision, route]);
  async function action(work: () => Promise<void>) {
    setError(""); setBusy(true);
    try { await work(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  function edit(key: string, value: string) {
    setPast([...past.slice(-29), draft]); setFuture([]);
    const codeProject: CodeProject = { ...program, controls: program.controls.map((field) => field.key === key ? { ...field, value } : field) };
    setDraft({ ...draft, document: { ...draft.document, codeProject } });
  }
  function history(forward: boolean) {
    const selected = (forward ? future : past).at(-1);
    if (!selected) return;
    if (forward) { setFuture(future.slice(0, -1)); setPast([...past, draft]); }
    else { setPast(past.slice(0, -1)); setFuture([...future, draft]); }
    setDraft(selected);
  }
  async function stop() {
    const current = await sourceRequest<Preview>("/preview");
    if (current.id === saved.id) await sourceRequest("/preview", "DELETE");
    setPreview(undefined);
  }
  async function run() {
    if (preview) await stop();
    setPreview(await sourceRequest<Preview>("/" + saved.id + "/preview", "POST", { revision: saved.revision }));
    setPanel("canvas");
  }
  async function download(pwa: boolean) {
    const response = await fetch("/api/build/" + saved.id + (pwa ? "/export-pwa" : "/export"), {
      headers: { "X-MotionUX-Build": "1", "X-MotionUX-Revision": String(saved.revision) },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = "motionux-app" + (pwa ? "-pwa" : "") + ".zip"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main className="b11-editor">
    <header className="build-toolbar">
      <div className="b11-editor-title"><button className="build-button" type="button" onClick={() => void action(async () => { await stop(); onBack(); })}>Projects</button><strong>{saved.document.name}</strong></div>
      <div className="build-toolbar-actions">
        <span role="status">{dirty ? "Draft preview · save before Run or export" : "Saved revision " + saved.revision}</span>
        <button type="button" className="build-button" disabled={!past.length || locked} onClick={() => history(false)}>Undo</button>
        <button type="button" className="build-button" disabled={!future.length || locked} onClick={() => history(true)}>Redo</button>
        <button type="button" className="build-button" disabled={!dirty || locked} onClick={() => void action(async () => {
          await stop();
          const next = await sourceRequest<BuildProject>("/" + saved.id, "PUT", draft);
          setSaved(next); setDraft(next); setPast([]); setFuture([]);
        })}>Save</button>
        <button type="button" className="build-button" disabled={locked || dirty} onClick={() => void action(preview ? stop : run)}>{preview ? "Stop Run" : "Run"}</button>
        <button type="button" className="build-button" disabled={locked || dirty} onClick={() => void action(() => download(false))}>Export</button>
        <button type="button" className="build-button" disabled={locked || dirty} onClick={() => void action(() => download(true))}>Export PWA</button>
      </div>
    </header>
    {error && <p className="build-alert" role="alert">{error}</p>}
    <SourceJobStatus operation={operation} />
    <nav className="build-mobile-panels" aria-label="Editor panes">{["outline", "canvas", "properties"].map((value) =>
      <button type="button" className="build-button" key={value} aria-pressed={panel === value} onClick={() => setPanel(value)}>{value}</button>)}</nav>
    <div className="b11-workspace" data-pane={panel}>
      <aside className="b11-outline" aria-label="Project outline">
        <h2>Pages</h2><nav aria-label="Project pages">{program.pages.map((page) =>
          <button className="build-button" key={page.id} aria-pressed={route === page.route} onClick={() => setRoute(page.route)}>{page.title}</button>)}</nav>
        <details onToggle={(event) => {
          if (event.currentTarget.open && !inventory)
            void sourceRequest<typeof inventory>("/source-jobs/inventory").then(setInventory, (error: Error) => setError(error.message));
        }}><summary>Sources / Used components</summary>
          {inventory && <div><p>{inventory.counts.compilerReady} eligible closures of {inventory.counts.total} prepared sources</p>
            <details><summary>Eligibility breakdown</summary>{Object.entries(inventory.counts.reasons).map(([reason, count]) => <p key={reason}>{reason} · {count}</p>)}</details></div>}{program.sources.map((source) => <div key={source.id} className="b11-source">
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><small>{source.provider} · {source.license} · {source.fidelity} · {source.revision.slice(0, 8)}</small>
          {program.usages.filter((usage) => usage.source === source.id).map((usage) => <p key={usage.instance}>{usage.route} · {usage.reason}</p>)}
        </div>)}</details>
        <details><summary>Application source</summary>{program.files.map((file) => <details key={file.path}><summary>{file.path}</summary><pre className="b11-code" tabIndex={0} aria-label={file.path}><code>{file.content}</code></pre></details>)}</details>
        <details><summary>Generated modules</summary>{program.generated.map((file) => <div key={file.file} className="b11-source"><strong>{file.file}</strong><p>{file.purpose}</p><small>{file.generatedFrom.join(", ")}</small></div>)}</details>
        <details><summary>Design and limitations</summary><p>{program.design.composition}</p><p>{program.design.mobile}</p>{program.limitations.map((limit) => <p key={limit}>{limit}</p>)}</details>
      </aside>
      <section className="b11-canvas" aria-label="Application canvas">
        <div className="b11-canvas-bar"><span role="status">{preview?.message ?? "Open the saved application"}</span>
          <label>Preview size<select value={device} onChange={(event) => setDevice(event.target.value)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label></div>
        {preview?.status === "ready" && preview.url ?
          <div ref={viewport} className="b11-preview-viewport">
            <div className="b11-preview-frame" style={{ width: dimensions[0] * scale, height: dimensions[1] * scale }}>
              <iframe ref={frame} onLoad={projectControls} title="Live source application" sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="no-referrer" data-size={device}
                style={{ width: dimensions[0], height: dimensions[1], transform: "scale(" + scale + ")" }} src={preview.url + route} />
            </div>
            <p className="b11-preview-caption">{dimensions[0]} × {dimensions[1]} · {Math.round(scale * 100)}% <a href={preview.url + route} target="_blank" rel="noreferrer">Open Run</a></p>
          </div> :
          <button className="build-button" disabled={locked || dirty || preview?.status === "building" || preview?.status === "starting"} onClick={() => void action(run)}>Open saved preview</button>}
      </section>
      <aside className="b11-properties" aria-label="Source properties">
        <h2>Application properties</h2>
        {program.controls.map((field) => <label key={field.key}>{field.label}
          {field.kind === "motion" ? <select value={field.value} disabled={locked} onChange={(event) => edit(field.key, event.target.value)}>
            <option value="system">System</option><option value="still">Reduced</option></select> :
            <input type={field.kind === "color" ? "color" : "text"} dir="auto" maxLength={500} disabled={locked} value={field.value} onChange={(event) => edit(field.key, event.target.value)} />}
        </label>)}
        <form onSubmit={(event) => { event.preventDefault(); void action(async () => {
          await stop(); await operation.start(brief, { project: saved.id, revision: saved.revision });
        }); }}>
          <label>Revise with Codex<textarea value={brief} minLength={12} maxLength={3200} disabled={locked || dirty} required onChange={(event) => setBrief(event.target.value)} /></label>
          <button className="build-button" disabled={locked || dirty}>Revise saved application</button>
        </form>
        <button type="button" className="build-button" disabled={locked || dirty} onClick={() => void action(async () => {
          await stop(); const prior = await sourceRequest<BuildProject>("/" + saved.id + "/recover", "POST"); setSaved(prior); setDraft(prior); setPast([]); setFuture([]);
        })}>Restore previous revision</button>
      </aside>
    </div>
  </main>;
}
