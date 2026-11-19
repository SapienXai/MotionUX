"use client";
import { useEffect, useRef, useState } from "react";
import type { BuildProject } from "@motionux/build-core";
import { isLocalCodePin, localSourceRights, type CodeProject } from "@motionux/build-core/code-project";
import { openSavedPreview, sourceRequest, SourceJobStatus, restoreSourceRevision, useSourceJob } from "./source-job";

import { KineticEditor, type SourcePreview as Preview } from "./kinetic-editor";
import { useStudioCopy } from "./kinetic-ui";
import { SourceCatalogDialog } from "./source-catalog-dialog";
import type { SourceAttachment } from "./source-attachment";
import type { CompositionComponent } from "./component-picker";

export function CodeEditor({ initial, onBack, attachment }: {
  initial: BuildProject; onBack: () => void; attachment?: SourceAttachment;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const t = useStudioCopy();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [past, setPast] = useState<BuildProject[]>([]);
  const [future, setFuture] = useState<BuildProject[]>([]);
  const [preview, setPreview] = useState<Preview>();
  const [route, setRoute] = useState("/");
  const [draftSaved, setDraftSaved] = useState(false);
  const [feedback, setFeedback] = useState(() => attachment?.rows.length
    ? t("Components attached to your next revision.", "Bileşenler sonraki revizyona eklendi.") : "");
  const [error, setError] = useState(() => attachment?.unavailable
    ? t("These components could not be attached. Check the current selection in the project catalog.",
      "Bu bileşenler eklenemedi. Proje kataloğundaki seçimi kontrol et.") : "");
  const [brief, setBrief] = useState("");
  const [additions, setAdditions] = useState<CompositionComponent[]>(attachment?.rows ?? []);
  const [busy, setBusy] = useState(false);
  const [inventory, setInventory] = useState<{ counts: { total: number; compilerReady: number; reasons: Record<string, number> } }>();
  const program = draft.document.codeProject!;
  const localOnly = saved.document.codeProject!.sources.some(isLocalCodePin);
  const hasSpecimens = saved.document.codeProject!.sources.some(({ fidelity }) => fidelity === "local-frame");
  const dirty = JSON.stringify(saved.document) !== JSON.stringify(draft.document);
  const operation = useSourceJob(saved.id, async (id) => {
    const next = await sourceRequest<BuildProject>("/" + id);
    setSaved(next); setDraft(next); setPast([]); setFuture([]); setBrief(""); setAdditions([]);
    setFeedback(t("Codex revision saved.", "Codex revizyonu kaydedildi."));
  }, (input) => setBrief(input.brief));
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
    function ready(event: MessageEvent) {
      if (event.origin === "http://127.0.0.1:5202" && event.source === frame.current?.contentWindow &&
          event.data?.type === "motionux:controls-ready" && event.data.digest === preview?.documentDigest) projectControls();
    }
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [draft, preview?.documentDigest, preview?.status]);
  useEffect(() => {
    const controller = new AbortController();
    void sourceRequest<{ baseRevision: number; document: BuildProject["document"] } | null>("/" + initial.id + "/draft", "GET", undefined, controller.signal).then((draft) => {
      if (draft?.baseRevision === initial.revision && draft.document.codeProject) {
        setDraft({ ...initial, document: draft.document }); setDraftSaved(true);
      }
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
        setPreview(current.id === saved.id && current.revision === saved.revision ? current : undefined);
      }, (error: Error) => setError(error.message));
    }, preview.status === "ready" ? 3000 : 400);
    return () => clearTimeout(timer);
  }, [preview, saved.id, saved.revision]);
  useEffect(() => {
    if (!dirty) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void sourceRequest("/" + saved.id + "/draft", "PUT", {
        version: 1, baseRevision: saved.revision, updatedAt: Date.now(), document: draft.document,
        pageId: draft.document.pages.find((page) => page.route === route)?.id ?? draft.document.pages[0].id,
        selected: null, device: "desktop", mode: "edit", panel: "canvas",
      }, controller.signal).then(() => { if (!controller.signal.aborted) setDraftSaved(true); },
        (error: Error) => { if (!controller.signal.aborted) setError(error.message); });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [dirty, draft, saved.id, saved.revision, route]);
  async function action(work: () => Promise<void>, confirmed = "") {
    setError(""); setFeedback(t("Working…", "İşleniyor…")); setBusy(true);
    try { await work(); setFeedback(confirmed); }
    catch (error) { setError((error as Error).message); setFeedback(""); } finally { setBusy(false); }
  }
  function edit(key: string, value: string) {
    setDraftSaved(false);
    setPast([...past.slice(-29), draft]); setFuture([]);
    const codeProject: CodeProject = { ...program, controls: program.controls.map((field) => field.key === key ? { ...field, value } : field) };
    setDraft({ ...draft, document: { ...draft.document, codeProject } });
  }
  function history(forward: boolean) {
    const selected = (forward ? future : past).at(-1);
    if (!selected) return;
    if (forward) { setFuture(future.slice(0, -1)); setPast([...past, draft]); }
    else { setPast(past.slice(0, -1)); setFuture([...future, draft]); }
    setDraftSaved(false); setDraft(selected);
  }
  async function stop() {
    const current = await sourceRequest<Preview>("/preview");
    if (current.id === saved.id) await sourceRequest("/preview", "DELETE");
    setPreview(undefined);
  }
  async function run() {
    setPreview(await openSavedPreview<Preview>(saved.id, saved.revision));
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
  const sources = <details className="kinetic-source-disclosure" onToggle={(event) => {
    if (event.currentTarget.open && !inventory)
      void sourceRequest<typeof inventory>("/source-jobs/inventory").then(setInventory, (error: Error) => setError(error.message));
  }}>
    <summary>{t("Used sources", "Kullanılan kaynaklar")} <small>{program.sources.length}</small></summary>
    {program.sources.map((source) => <div key={source.id} className="kinetic-source-record">
      <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
      <small>{source.provider} · {source.license} · {source.fidelity} · {source.revision.slice(0, 8)}</small>
      {program.usages.filter((usage) => usage.source === source.id).map((usage) => <p key={usage.instance}>{usage.route} · {usage.reason}</p>)}
    </div>)}
    {!!program.references?.length && <details><summary>{t("Design references", "Tasarım referansları")}</summary>{program.references.map((reference) =>
      <p key={reference.id}>{reference.title} · {reference.provider}</p>)}</details>}
    <details><summary>{t("Application source", "Uygulama kodu")}</summary>{program.files.map((file) => <details key={file.path}><summary>{file.path}</summary>
      <pre className="b11-code" tabIndex={0} aria-label={file.path}><code>{file.content}</code></pre></details>)}</details>
    <details><summary>{t("Generated modules", "Üretilen modüller")}</summary>{program.generated.map((file) => <div key={file.file}>
      <strong>{file.file}</strong><p>{file.purpose}</p><small>{file.generatedFrom.join(", ")}</small></div>)}</details>
    <details><summary>{t("Design and limitations", "Tasarım ve sınırlar")}</summary><p>{program.design.composition}</p><p>{program.design.mobile}</p>
      {program.limitations.map((limit) => <p key={limit}>{limit}</p>)}</details>
    {inventory && <details><summary>{t("Source eligibility", "Kaynak uygunluğu")}</summary>
      <p>{inventory.counts.compilerReady} / {inventory.counts.total}</p>
      {Object.entries(inventory.counts.reasons).map(([reason, count]) => <p key={reason}>{reason} · {count}</p>)}
    </details>}
  </details>;
  const fields = program.controls.map((field) => <label key={field.key}><span dir="auto">{field.label}</span>
    {field.kind === "motion" ? <select value={field.value} disabled={locked} onChange={(event) => edit(field.key, event.target.value)}>
      <option value="system">{t("System", "Sistem")}</option><option value="still">{t("Reduced", "Azaltılmış")}</option></select> :
      <input type={field.kind === "color" ? "color" : "text"} dir="auto" maxLength={500} disabled={locked} value={field.value} onChange={(event) => edit(field.key, event.target.value)} />}
  </label>);
  const inspector = <>
    <p>{t("Adjust the controls exposed by this application.", "Bu uygulamanın sunduğu kontrolleri düzenle.")}</p>
    {[[t("Content", "İçerik"), "text"], [t("Style", "Stil"), "appearance"], [t("Motion", "Hareket"), "motion"]].map(([label, kind]) => {
      const controls = fields.filter((_, index) => (["color", "size", "spacing"].includes(program.controls[index].kind) ? "appearance" : program.controls[index].kind) === kind);
      if (!controls.length) return null;
      return kind === "text" ? <section key={kind}><h3>{label}</h3>{controls}</section> :
        <details key={kind}><summary>{label}</summary><section>{controls}</section></details>;
    })}
    <button type="button" className="kinetic-button" disabled={locked || dirty || !saved.revision} onClick={() => {
      if (!confirm(t("Restore the previous revision as a new saved revision?", "Önceki revizyon yeni bir kayıt olarak geri yüklensin mi?"))) return;
      void action(async () => {
        await stop();
        const prior = await restoreSourceRevision(saved);
        setSaved(prior); setDraft(prior); setPast([]); setFuture([]);
      }, t("Previous revision restored.", "Önceki revizyon geri yüklendi."));
    }}>{t("Restore previous revision", "Önceki revizyonu geri yükle")}</button>
    {error && <p role="alert">{error}</p>}
    {feedback && <p role="status">{feedback}</p>}
  </>;
  return <KineticEditor projectId={saved.id} name={saved.document.name} revision={saved.revision} dirty={dirty} draftSaved={draftSaved} locked={locked}
    error={error} feedback={feedback} pages={program.pages} route={route} onPage={setRoute}
    inspectorTitle={t("Application controls", "Uygulama kontrolleri")} inspector={inspector} sources={sources}
    catalog={(compact) => <SourceCatalogDialog existing={program.sources} selected={additions} attach={setAdditions} disabled={locked} compact={compact} />}
    revisionContext={additions.length > 0 && <ul className="unified-revision-sources" aria-label={t("Components attached to revision", "Revizyona eklenen bileşenler")}>
      {additions.map(({ id, title }) => <li key={id}><button type="button" className="kinetic-button" disabled={locked}
        aria-label={t("Remove ", "Kaldır ") + title}
        onClick={() => setAdditions((previous) => previous.filter((source) => source.id !== id))}>{title} <span aria-hidden="true">×</span></button></li>)}
    </ul>}
    preview={preview} frame={frame} onFrameLoad={projectControls} exportBlocked={localOnly}
    notice={localOnly && <div className="build-local-export-note"><span>{t(localSourceRights, "Bu proje yerel kaynaklar kullanıyor. Dışa aktarma kullanılamıyor.")}</span>
      {hasSpecimens && <a className="build-text-button" href={"/build?composeFrom=" + encodeURIComponent(saved.id)}>{t("Rebuild as a new app", "Yeni uygulama olarak oluştur")}</a>}
    </div>}
    onBack={() => void action(async () => { await stop(); onBack(); })} canUndo={Boolean(past.length)} canRedo={Boolean(future.length)}
    onUndo={() => history(false)} onRedo={() => history(true)}
    onSave={() => void action(async () => {
      await stop();
      const next = await sourceRequest<BuildProject>("/" + saved.id, "PUT", draft);
      setSaved(next); setDraft(next); setPast([]); setFuture([]);
    }, t("Revision saved.", "Revizyon kaydedildi."))}
    onRun={() => void action(preview && ["starting", "building", "ready"].includes(preview.status) ? stop : run)}
    onExport={(pwa) => void action(() => download(pwa), pwa ? t("PWA source downloaded.", "PWA kaynak kodu indirildi.") : t("Next.js source downloaded.", "Next.js kaynak kodu indirildi."))}
    brief={brief} onBrief={setBrief} onRevise={(event) => {
      event.preventDefault();
      if (locked || dirty || brief.trim().length < 12) return;
      void action(async () => { await stop(); await operation.start(brief, { project: saved.id, revision: saved.revision, kit: additions.map(({ id }) => id) }); });
    }} job={<SourceJobStatus operation={operation} />} />;
}
