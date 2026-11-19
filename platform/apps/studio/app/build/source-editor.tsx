"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { BuildProject } from "@motionux/build-core";
import type { SourceGraph, SourceInstance } from "@motionux/build-core/source-graph";
import { SourceJobStatus, restoreSourceRevision, sourceRequest, useSourceJob } from "./source-job";

import { KineticEditor, type SourcePreview as Preview } from "./kinetic-editor";
import { useStudioCopy } from "./kinetic-ui";
type Draft = { baseRevision: number; document: BuildProject["document"] };

export function SourceEditor({ initial, onBack }: { initial: BuildProject; onBack: () => void }) {
  const t = useStudioCopy();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [past, setPast] = useState<BuildProject[]>([]);
  const [future, setFuture] = useState<BuildProject[]>([]);
  const [route, setRoute] = useState("/");
  const [selected, setSelected] = useState("");
  const [inspectRequest, setInspectRequest] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState<Preview>();
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
    setFeedback(t("Codex revision saved.", "Codex revizyonu kaydedildi."));
  }, (input) => setBrief(input.brief));

  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<Draft | null>("/" + initial.id + "/draft", "GET", undefined, controller.signal).then((stored) => {
      if (stored?.baseRevision === initial.revision && stored.document.sourceGraph) {
        setDraft({ ...initial, document: stored.document }); setDraftSaved(true);
      }
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
      }, controller.signal).then(() => { if (!controller.signal.aborted) setDraftSaved(true); },
        (error: Error) => { if (!controller.signal.aborted) setError(error.message); });
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
    setDraftSaved(false);
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
    setDraftSaved(false); setDraft(candidate);
  }
  async function action(callback: () => Promise<void>, confirmed = "") {
    setError(""); setFeedback(t("Working…", "İşleniyor…")); setBusy(true);
    try { await callback(); setFeedback(confirmed); } catch (error) { setError((error as Error).message); setFeedback(""); }
    finally { setBusy(false); }
  }
  async function stop() {
    const current = await sourceRequest<Preview>("/preview");
    if (current.id === saved.id) await sourceRequest("/preview", "DELETE");
    setPreview(undefined);
  }
  function revise(event: FormEvent) {
    event.preventDefault();
    if (dirty || busy || operation.active || brief.trim().length < 12) return;
    void action(async () => { await stop(); await operation.start(brief, { project: saved.id, revision: saved.revision }); });
  }

  const locked = busy || operation.active;
  const outline = <details><summary>{t("Sections", "Bölümler")}</summary><div className="kinetic-page-list">
    {page.instances.map((item) => <button type="button" key={item.id} aria-pressed={node.id === item.id}
      onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setSelected(item.id); setInspectRequest((value) => value + 1); }}><span dir="auto">{item.title}</span></button>)}
  </div></details>;
  const sources = <details className="kinetic-source-disclosure">
    <summary>{t("Used sources", "Kullanılan kaynaklar")} <small>{graph.sources.length}</small></summary>
    {graph.sources.map((source) => <div key={source.id} className="kinetic-source-record"><a href={source.upstream} target="_blank" rel="noreferrer">{source.title}</a>
      <small>{source.provider} · {source.license} · {source.revision.slice(0, 8)}</small></div>)}
    {graph.artifacts.map((item) => <div key={item.instance} className="kinetic-source-record"><small>{item.instance} · {item.generatedFrom.join(", ")}</small></div>)}
    {graph.limitations.map((item) => <p key={item}>{item}</p>)}
  </details>;
  const inspector = <><h3 dir="auto">{node.title}</h3>
        <label>{t("Title", "Başlık")}<input dir="auto" maxLength={400} value={node.title} disabled={locked} onChange={(event) => editInstance({ title: event.target.value })} /></label>
        <label>{t("Description", "Açıklama")}<textarea dir="auto" maxLength={600} value={node.description} disabled={locked} onChange={(event) => editInstance({ description: event.target.value })} /></label>
        <label>{t("Placement", "Yerleşim")}<select value={node.layout} disabled={locked} onChange={(event) => editInstance({ layout: event.target.value === "column" ? "column" : "full" })}>
          <option value="full">{t("Full width", "Tam genişlik")}</option><option value="column">{t("In grid", "Izgarada")}</option></select></label>
        {node.entity && <fieldset disabled={locked}><legend>{t("Data fields", "Veri alanları")}</legend>
          {graph.entities.find((entity) => entity.id === node.entity)?.fields.map((field) => <label key={field.id}>
            <input type="checkbox" checked={node.fields.includes(field.id)} onChange={(event) => editInstance({
              fields: event.target.checked ? [...node.fields, field.id] : node.fields.filter((id) => id !== field.id),
            })} /> {field.label}
          </label>)}
        </fieldset>}
        {node.media && <label>{t("Image description", "Görsel açıklaması")}<input dir="auto" maxLength={200} value={node.alternative} disabled={locked}
          onChange={(event) => editInstance({ alternative: event.target.value })} /></label>}
        <label>{t("Motion", "Hareket")}<select value={node.motion} disabled={locked} onChange={(event) => editInstance({ motion: event.target.value === "still" ? "still" : "inherit" })}>
          <option value="inherit">{t("Follow project", "Projeyi izle")}</option><option value="still">{t("Reduced", "Azaltılmış")}</option></select></label>
        {node.items.map((item, index) => <fieldset key={index} disabled={locked}><legend>{t("Item", "Öğe")} {index + 1}</legend>
          <label>{t("Label", "Etiket")}<input dir="auto" maxLength={400} value={item.label} onChange={(event) => editInstance({ items: node.items.map((row, at) => at === index ? { ...row, label: event.target.value } : row) })} /></label>
          <label>{t("Text", "Metin")}<textarea dir="auto" maxLength={400} value={item.text} onChange={(event) => editInstance({ items: node.items.map((row, at) => at === index ? { ...row, text: event.target.value } : row) })} /></label>
        </fieldset>)}
        <details><summary>{t("Project appearance", "Proje görünümü")}</summary>
          <label>{t("Theme", "Tema")}<select disabled={locked} value={graph.theme} onChange={(event) => {
            const theme = event.target.value;
            if (theme === "system" || theme === "light" || theme === "dark") edit((current) => ({ ...current, theme }));
          }}><option value="system">{t("System", "Sistem")}</option><option value="light">{t("Light", "Açık")}</option><option value="dark">{t("Dark", "Koyu")}</option></select></label>
          <label>{t("Project motion", "Proje hareketi")}<select disabled={locked} value={graph.motion} onChange={(event) => {
            const motion = event.target.value === "still" ? "still" : "system";
            edit((current) => ({ ...current, motion }));
          }}><option value="system">{t("Follow system", "Sistemi izle")}</option><option value="still">{t("Reduced", "Azaltılmış")}</option></select></label>
        </details>
    <button type="button" className="kinetic-button" disabled={dirty || locked || !saved.revision} onClick={() => {
      if (!confirm(t("Restore the previous revision as a new saved revision?", "Önceki revizyon yeni bir kayıt olarak geri yüklensin mi?"))) return;
      void action(async () => {
        await stop();
        load(await restoreSourceRevision(saved));
      }, t("Previous revision restored.", "Önceki revizyon geri yüklendi."));
    }}>{t("Restore previous revision", "Önceki revizyonu geri yükle")}</button>
    {error && <p role="alert">{error}</p>}
  </>;
  return <KineticEditor projectId={saved.id} name={saved.document.name} revision={saved.revision} dirty={dirty} draftSaved={draftSaved} locked={locked} error={error} feedback={feedback}
    pages={graph.pages} route={page.route} onPage={(next) => { setRoute(next); setSelected(""); }} outline={outline} sources={sources}
    inspectorTitle={t("Section properties", "Bölüm özellikleri")} inspector={inspector} inspectRequest={inspectRequest}
    preview={preview} previewPath={page.route + (selected ? "#" + encodeURIComponent(node.id) : "")}
    onBack={() => { void stop().catch(() => {}); onBack(); }} canUndo={Boolean(past.length)} canRedo={Boolean(future.length)}
    onUndo={() => history()} onRedo={() => history(true)}
    onSave={() => void action(async () => {
      await stop(); load(await sourceRequest<BuildProject>("/" + saved.id, "PUT", draft));
    }, t("Revision saved.", "Revizyon kaydedildi."))}
    onRun={() => void action(async () => {
      if (preview && !["failed", "idle"].includes(preview.status)) await stop();
      else setPreview(await sourceRequest<Preview>("/" + saved.id + "/preview", "POST", { revision: saved.revision }));
    })}
    onExport={(pwa) => void action(() => download(saved.id, pwa), pwa ? t("PWA source downloaded.", "PWA kaynak kodu indirildi.") : t("Next.js source downloaded.", "Next.js kaynak kodu indirildi."))}
    brief={brief} onBrief={setBrief} onRevise={revise} job={<SourceJobStatus operation={operation} />} />;
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
