"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { ArrowDownToLine, ArrowRight, ChevronDown, ExternalLink, File, List, Monitor, PanelLeft, Play, Redo2, Save, Settings2, Smartphone, Sparkles, Square, Tablet, Undo2 } from "lucide-react";
import { useWideWorkspace, useWorkspaceSearch, WorkspaceHeader, WorkspaceStructure } from "@motionux/build-canvas/workspace";
import { RuntimeInspector } from "@motionux/build-canvas/runtime-inspector";
import { SegmentedControl } from "../../../../../components/navigation/motion-selector";
import { openStudioSheet, StudioSheet, useStudioCopy } from "./kinetic-ui";
import { sourceRequest } from "./source-job";
import { useRevisionViewport } from "./revision-viewport";

export type SourcePreview = { documentDigest?: string; id?: string; revision?: number; status: string; url?: string; message?: string };
const screens = {
  desktop: { width: 1440, height: 1000, Icon: Monitor },
  tablet: { width: 768, height: 1024, Icon: Tablet },
  mobile: { width: 390, height: 844, Icon: Smartphone },
} as const;
type Device = keyof typeof screens;
type Page = { id: string; title: string; route: string };

export function KineticEditor({ projectId, name, revision, dirty, draftSaved, locked, error, feedback, notice, pages, route, onPage,
  outline, sources, inspector, inspectorTitle, inspectRequest, preview, frame, onFrameLoad, previewPath, onBack, onUndo, onRedo,
  onSave, onRun, onExport, canUndo, canRedo, exportBlocked, brief, onBrief, onRevise, job, catalog, revisionContext }: {
  projectId: string; name: string; revision: number; dirty: boolean; draftSaved: boolean; locked: boolean;
  error: string; feedback: string; notice?: ReactNode; pages: Page[]; route: string; onPage: (route: string) => void;
  outline?: ReactNode; sources: ReactNode; inspector: ReactNode; inspectorTitle: string; inspectRequest?: number;
  preview?: SourcePreview; frame?: RefObject<HTMLIFrameElement | null>; onFrameLoad?: () => void; previewPath?: string;
  onBack: () => void; onUndo: () => void; onRedo: () => void; onSave: () => void; onRun: () => void;
  onExport: (pwa: boolean) => void; canUndo: boolean; canRedo: boolean; exportBlocked?: boolean;
  brief: string; onBrief: (brief: string) => void; onRevise: (event: FormEvent) => void; job: ReactNode;
  catalog: (compact: boolean) => ReactNode; revisionContext?: ReactNode;
}) {
  const t = useStudioCopy();
  const [device, setDevice] = useState<Device>(() => typeof window === "undefined" ? "desktop" :
    window.matchMedia("(max-width: 600px)").matches ? "mobile" : window.matchMedia("(max-width: 1050px)").matches ? "tablet" : "desktop");
  const wide = useWideWorkspace();
  useWorkspaceSearch(pages, onPage);
  const [fullSize, setFullSize] = useState(false);
  const [rail, setRail] = useState(true);
  const [width, setWidth] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const properties = useRef<HTMLDialogElement>(null);
  const navigation = useRef<HTMLDialogElement>(null);
  const actions = useRef<HTMLDialogElement>(null);
  const prompt = useRef<HTMLTextAreaElement>(null);
  useRevisionViewport(prompt);
  const { width: idealWidth, height } = screens[device];
  const scale = fullSize ? 1 : Math.min(1, (width || idealWidth) / idealWidth);
  const currentPage = pages.find((page) => route === page.route) ?? pages[0];
  const ready = preview?.status === "ready" && preview.url;
  const running = Boolean(preview && ["building", "starting", "ready"].includes(preview.status));
  const title = running ? t("Stop preview", "Önizlemeyi durdur") : t("Preview", "Önizleme");
  const dimensions = idealWidth + " × " + height + " · " + Math.round(scale * 100) + "%";
  const canRevise = !locked && !dirty && brief.trim().length >= 12;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);
  useEffect(() => {
    if (inspectRequest && !wide && !properties.current?.open) properties.current?.showModal();
  }, [inspectRequest, wide]);

  useEffect(() => {
    if (!dirty || draftSaved) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const beforeLeave = (event: Event) => {
      if (!confirm(navigator.language.toLowerCase().startsWith("tr") ? "Taslak kaydedilmeden çıkılsın mı?" : "Leave before the draft is saved?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("motionux:before-leave", beforeLeave);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("motionux:before-leave", beforeLeave);
    };
  }, [dirty, draftSaved]);

  function pageLinks(close?: () => void) {
    return <nav className="kinetic-page-list" aria-label={t("Project pages", "Proje sayfaları")}>
      {pages.map((page) => <button key={page.id} type="button" aria-current={currentPage.route === page.route ? "page" : undefined}
        onClick={() => { onPage(page.route); close?.(); }} title={page.route}><File size={14} aria-hidden="true" /><span dir="auto">{page.title}</span></button>)}
    </nav>;
  }
  const exportReason = exportBlocked ? t("Local sources restrict export.", "Yerel kaynaklar dışa aktarmayı kısıtlıyor.") :
    dirty ? t("Save your changes before exporting.", "Dışa aktarmadan önce değişiklikleri kaydet.") : undefined;
  return <main className="kinetic kinetic-editor">
    <WorkspaceHeader name={name} revision={revision} dirty={dirty} draftSaved={draftSaved} busy={locked}
      backLabel={t("Projects", "Projeler")} statusLabels={{ saved: t("All changes saved", "Tüm değişiklikler kaydedildi"),
        draft: t("Draft saved locally", "Taslak yerelde kaydedildi"), unsaved: t("Unsaved changes", "Kaydedilmemiş değişiklikler") }}
      onBack={() => { if (!dirty || draftSaved || confirm(t("Leave before the draft is saved?", "Taslak kaydedilmeden çıkılsın mı?"))) onBack(); }}>
        <div className="kinetic-history">
          <button className="kinetic-icon" type="button" aria-label={t("Undo", "Geri al")} title={t("Undo", "Geri al")} disabled={!canUndo || locked} onClick={onUndo}><Undo2 size={16} /></button>
          <button className="kinetic-icon" type="button" aria-label={t("Redo", "Yinele")} title={t("Redo", "Yinele")} disabled={!canRedo || locked} onClick={onRedo}><Redo2 size={16} /></button>
        </div>
        <button className="kinetic-button kinetic-run" type="button" disabled={locked || dirty && !running} onClick={onRun}>
          {running ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}{title}
        </button>
        <button className="kinetic-button kinetic-primary kinetic-save" type="button" disabled={locked || !dirty} onClick={onSave}
          aria-label={t("Save", "Kaydet")} title={t("Save", "Kaydet")}><Save size={15} aria-hidden="true" /><span>{t("Save", "Kaydet")}</span></button>
        <button className="kinetic-button kinetic-export" type="button" aria-haspopup="dialog" aria-label={t("Export and actions", "Dışa aktar ve işlemler")} onClick={(event) => openStudioSheet(actions.current, event.currentTarget)}>
          <span>{t("Export and actions", "Dışa aktar ve işlemler")}</span><ChevronDown size={14} aria-hidden="true" />
        </button>
    </WorkspaceHeader>
    {notice}
    {error && <p className="kinetic-editor-notice" role="alert">{error}</p>}
    {feedback && <p className="kinetic-editor-notice" role="status">{feedback}</p>}
    <div className="kinetic-workspace" data-rail={rail} data-properties={wide}>
      <WorkspaceStructure className="kinetic-rail" hidden={!rail} aria-label={t("Project outline", "Proje yapısı")}>
        <h2>{t("Pages", "Sayfalar")}</h2>{pageLinks()}{outline}{sources}
        {wide && catalog(false)}
      </WorkspaceStructure>
      <section className="kinetic-stage" aria-label={t("Application canvas", "Uygulama tuvali")}>
        <div className="kinetic-stage-bar">
          <button type="button" className="kinetic-icon kinetic-rail-toggle" onClick={() => setRail(!rail)}
            aria-label={t("Toggle workspace rail", "Çalışma panelini aç veya kapat")} aria-pressed={rail}
            title={t("Toggle workspace rail", "Çalışma panelini aç veya kapat")}><PanelLeft size={16} aria-hidden="true" /></button>
          <div className="kinetic-stage-heading"><h2 dir="auto">{currentPage.title}</h2>
            <span role="status">{ready ? dirty ? onFrameLoad ? t("Live preview · draft controls", "Canlı önizleme · taslak kontrolleri")
                : t("Live preview · saved revision", "Canlı önizleme · kayıtlı revizyon") : t("Live preview", "Canlı önizleme") :
              preview?.message ?? t("Saved application", "Kayıtlı uygulama")}</span>
          </div>
        <SegmentedControl className="kinetic-devices" label={t("Preview size", "Önizleme boyutu")} value={device}
          options={Object.entries(screens).map(([value, { Icon }]) => ({
            value, label: value === "desktop" ? t("Desktop", "Masaüstü") : value === "tablet" ? "Tablet" : t("Mobile", "Mobil"),
            icon: <Icon size={14} aria-hidden="true" />,
          }))} onValueChange={(value) => setDevice(value as Device)} />
          <div className="kinetic-stage-actions">
            {ready && <select className="kinetic-scale" aria-label={t("Preview scale", "Önizleme ölçeği")} value={fullSize ? "actual" : "fit"}
              onChange={(event) => setFullSize(event.target.value === "actual")}>
              <option value="fit">{t("Fit", "Sığdır")}</option><option value="actual">100%</option>
            </select>}
          </div>
        </div>
        {ready ? <>
          <div ref={stage} className="kinetic-frame-scroll" tabIndex={0} role="region"
            aria-label={t("Preview scroll area", "Önizleme kaydırma alanı")}>
            <div className="kinetic-frame" style={{ width: idealWidth * scale, height: height * scale }}>
              <iframe ref={frame} onLoad={onFrameLoad} title="Live source application" sandbox="allow-scripts allow-same-origin allow-forms"
                referrerPolicy="no-referrer" data-size={device} style={{ width: idealWidth, height, transform: "scale(" + scale + ")" }}
                src={preview.url + (previewPath ?? currentPage.route)} />
            </div>
          </div>
          <div className="kinetic-frame-caption"><span>{dimensions}</span>
            <a href={preview.url + (previewPath ?? currentPage.route)} target="_blank" rel="noreferrer">{t("Open Run", "Önizlemeyi aç")}<ExternalLink size={13} aria-hidden="true" /></a>
            <RuntimeInspector key={revision} pages={pages} route={currentPage.route} revision={revision} disabled={dirty || locked}
              inspect={(route, signal) => sourceRequest("/" + projectId + "/inspect", "POST", { route, revision }, signal)} />
          </div>
        </> : <div className="kinetic-stage-empty">
          <span className="kinetic-empty-icon"><Monitor size={26} aria-hidden="true" /></span>
          <strong>{preview?.status === "failed" ? t("Preview couldn’t start", "Önizleme başlatılamadı") :
            running ? t("Starting the application", "Uygulama başlatılıyor") : t("Your application canvas", "Uygulama tuvalin")}</strong>
          <p>{dirty ? t("Save changes to run this revision.", "Bu revizyonu çalıştırmak için kaydet.") : t("Run the saved application to interact with it here.", "Burada etkileşim için kayıtlı uygulamayı çalıştır.")}</p>
        </div>}
        <div className="kinetic-revision">
          {job}
          <form onSubmit={onRevise}>
            <label htmlFor="kinetic-revision-brief"><Sparkles size={15} aria-hidden="true" />{t("Revise with Codex", "Codex ile düzenle")}</label>
            {revisionContext}
            <div className="kinetic-revision-input">
              <textarea id="kinetic-revision-brief" ref={prompt} dir="auto" rows={2} required minLength={12} maxLength={3200}
                value={brief} disabled={locked} onChange={(event) => onBrief(event.target.value)}
                placeholder={t("Ask for a change to this application…", "Bu uygulamada bir değişiklik iste…")} aria-describedby="kinetic-revision-help" />
              <button type="submit" className="kinetic-button kinetic-primary" disabled={!canRevise}
                aria-label={t("Revise saved application", "Kayıtlı uygulamayı düzenle")} title={t("Revise saved application", "Kayıtlı uygulamayı düzenle")}><ArrowRight size={18} aria-hidden="true" /></button>
            </div>
            {dirty ? <p id="kinetic-revision-help">{t("Save your draft before requesting a revision.", "Revizyon istemeden önce taslağı kaydet.")}</p> :
              <div id="kinetic-revision-help" className="kinetic-suggestions">
                {[[t("More breathing room", "Daha ferah yerleşim"), t("Give the main content more breathing room while preserving the workflow.", "Akışı koruyarak ana içeriğin yerleşimini daha ferah yap.")],
                  [t("Subtle motion", "Sade hareket"), t("Make the existing interaction motion more subtle.", "Mevcut etkileşim animasyonlarını daha sade hale getir.")],
                  [t("Improve mobile", "Mobili iyileştir"), t("Improve layout and touch targets on narrow screens.", "Dar ekranlarda yerleşimi ve dokunma hedeflerini iyileştir.")]].map(([label, suggestion]) =>
                  <button key={label} type="button" className="kinetic-button" disabled={locked} onClick={() => { onBrief(suggestion); prompt.current?.focus(); }}>{label}</button>)}
              </div>}
          </form>
        </div>
      </section>
      {wide && <aside className="kinetic-properties unified-properties" aria-label={inspectorTitle}>
        <h2>{t("Properties", "Özellikler")}</h2>{inspector}
      </aside>}
    </div>
    {!wide && <nav className="unified-source-mobile-nav" aria-label={t("Editor panes", "Düzenleme panelleri")}>
      <button type="button" className="kinetic-button" aria-haspopup="dialog" onClick={(event) => openStudioSheet(navigation.current, event.currentTarget)}>
        <List size={17} aria-hidden="true" />{t("Pages", "Sayfalar")}
      </button>
      <button type="button" className="kinetic-button" disabled={locked || dirty && !running} onClick={onRun}>
        {running ? <Square size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{running ? t("Stop", "Durdur") : t("Preview", "Önizleme")}
      </button>
      <button type="button" className="kinetic-button" aria-haspopup="dialog" onClick={(event) => openStudioSheet(properties.current, event.currentTarget)}>
        <Settings2 size={17} aria-hidden="true" />{t("Properties", "Özellikler")}
      </button>
      {catalog(true)}
    </nav>}
    {!wide && <StudioSheet dialog={properties} title={inspectorTitle} side>
      <div className="kinetic-properties">{inspector}</div>
    </StudioSheet>}
    <StudioSheet dialog={navigation} title={t("Pages and sources", "Sayfalar ve kaynaklar")} side>
      <div className="kinetic-rail-content">{pageLinks(() => navigation.current?.close())}{outline}{sources}</div>
    </StudioSheet>
    <StudioSheet dialog={actions} title={t("Project actions", "Proje işlemleri")}>
      <div className="kinetic-export-actions">
        <button className="kinetic-button" type="button" disabled={locked || dirty || exportBlocked} onClick={() => onExport(false)}><ArrowDownToLine size={15} aria-hidden="true" />{t("Export", "Dışa aktar")}</button>
        <button className="kinetic-button" type="button" disabled={locked || dirty || exportBlocked} onClick={() => onExport(true)}><ArrowDownToLine size={15} aria-hidden="true" />{t("Export PWA", "PWA dışa aktar")}</button>
        <button className="kinetic-button" type="button" disabled={locked || dirty && !running} onClick={() => { actions.current?.close(); onRun(); }}>{title}</button>
        <button className="kinetic-button" type="button" disabled={locked || !canUndo} onClick={() => { actions.current?.close(); onUndo(); }}>{t("Undo", "Geri al")}</button>
        <button className="kinetic-button" type="button" disabled={locked || !canRedo} onClick={() => { actions.current?.close(); onRedo(); }}>{t("Redo", "Yinele")}</button>
        {exportReason && <p>{exportReason}</p>}
        {error && <p role="alert">{error}</p>}
        {feedback && <p role="status">{feedback}</p>}
      </div>
    </StudioSheet>
  </main>;
}
