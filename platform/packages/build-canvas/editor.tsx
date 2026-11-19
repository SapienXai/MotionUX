"use client";

import {
  ArrowDown,
  ArrowUp,
  Blocks,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  GripVertical,
  LoaderCircle,
  Monitor,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Square,
  Sun,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  Drawer,
  Puck,
  createUsePuck,
  type Data,
} from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "@motionux/app-blocks/marketing.css";
import { RuntimeContext, config, fromPuck, puckItem, sectionItems, toPuck, type PuckItem } from "./puck-projection";
import { InteractPreview } from "./interact-preview";
import type { TaskProgress } from "@motionux/app-blocks/frame";
import { MediaFields, MediaPanel, type MediaRecord } from "./media-fields";
import { SectionLayoutFields, SectionLibrary } from "./section-fields";
import { ArticleFields, TaskFields } from "./collection-fields";
import { FrameSize } from "./frame-size";
import { IdentityFields } from "./identity-fields";
import { MotionDnaFields } from "./motion-dna-fields";
import { openStudioSheet, StudioSheet, useWideWorkspace, WorkspaceHeader, WorkspaceStructure } from "./workspace-shell";
import { RuntimeInspector } from "./runtime-inspector";
import { IntegrationLab } from "./integration-lab";
import { readLocalDraft, selectBlock, writeLocalDraft } from "./creator-recovery";
import {
  allBlocks,
  sectionFromRecipe,
  type RecipeId,
  appendPageFromPattern,
  availablePagePatterns,
  families,
  makeBlock,
  registry,
  compatibleBlock,
  isMarketing,
  isBlockGroup,
  isSectionChild,
  metricOptions,
  routeSlug,
  type BlockId,
  type BlockProps,
  type BuildPage,
  type PagePatternId,
  type BuildProject,
  type DesignIdentity,
  type CreatorDraft,
  type Document,
} from "@motionux/build-core";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

type Device = "desktop" | "tablet" | "mobile";
type Preview = {
  status: "idle" | "building" | "starting" | "ready" | "failed";
  id?: string;
  revision?: number;
  url?: string;
  message?: string;
  peakBytes?: number;
};
type History = { past: Document[]; present: Document; future: Document[] };
const useSelector = createUsePuck();
const blockList = Object.keys(registry) as BlockId[];
const presets = [
  [Monitor, "desktop"],
  [Tablet, "tablet"],
  [Smartphone, "mobile"],
] as const;
const id = (prefix: string) => prefix + "-" + crypto.randomUUID();
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const describe = (error: unknown) =>
  error instanceof Error ? error.message : "The operation failed.";

function newHistory(document: Document): History {
  return { past: [], present: document, future: [] };
}

async function request<T>(
  path = "",
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const result = await fetch("/api/build" + path, {
    method,
    cache: "no-store",
    signal,
    headers: {
      "X-MotionUX-Build": "1",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await result.json();
  if (!result.ok)
    throw new Error(
      data.message ?? "The local Studio could not complete this request.",
    );
  return data;
}
function ToolbarButton({
  label,
  children,
  ...rest
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  "aria-pressed"?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className="build-icon"
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}
export function Editor({
  initial,
  onBack,
}: {
  initial: BuildProject;
  onBack: () => void;
}) {
  const [checkpoint] = useState(() => readLocalDraft(initial.id));
  const originalDraft = checkpoint?.baseRevision === initial.revision ? checkpoint : null;
  const [conflict, setConflict] = useState<CreatorDraft | null>(() =>
    checkpoint && !originalDraft && !same(checkpoint.document, initial.document) ? checkpoint : null,
  );
  const [history, setHistory] = useState(() => originalDraft
    ? { past: same(originalDraft.document, initial.document) ? [] : [initial.document], present: originalDraft.document, future: [] }
    : newHistory(initial.document),
  );
  const [saved, setSaved] = useState(initial);
  const [pageId, setPageId] = useState(originalDraft?.pageId ?? initial.document.pages[0].id);
  const [selected, setSelected] = useState<string | null>(originalDraft?.selected ?? null);
  const [epoch, setEpoch] = useState(0);
  const [device, setDevice] = useState<Device>(originalDraft?.device ?? "desktop");
  const [theme, setTheme] = useState<"light" | "dark">();
  const [mediaInventory, setMediaInventory] = useState<MediaRecord[]>([]);
  const pageDialog = useRef<{ add: (pattern: PagePatternId) => void }>(null);
  const frameElement = useRef<HTMLDivElement>(null);
  const exportDialog = useRef<HTMLDialogElement>(null);
  const libraryDialog = useRef<HTMLDialogElement>(null);
  const propertiesDialog = useRef<HTMLDialogElement>(null);
  const wide = useWideWorkspace();
  const [focusCanvas, setFocusCanvas] = useState(false);
  const [identityPreview, setIdentityPreview] = useState<DesignIdentity>();
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const [mode, setMode] = useState<"edit" | "interact" | "run">(originalDraft?.mode ?? "edit");
  const [panel, setPanel] = useState<"left" | "canvas" | "right">(originalDraft?.panel ?? "canvas");
  useEffect(() => {
    if (wide) return;
    const next = panel === "left" ? libraryDialog.current : panel === "right" ? propertiesDialog.current : null;
    if (next && !next.open) next.showModal();
  }, [panel, wide]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<BlockId[]>([]);
  const [taskChanges, setTaskChanges] = useState<TaskProgress["changes"]>({});
  const launch = useRef(false);
  const changed = useRef(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [draftSafe, setDraftSafe] = useState(Boolean(originalDraft));
  const stored = useRef(checkpoint?.updatedAt ?? 0);
  const remoteDraft = useRef<number | null>(null);
  const document = history.present;
  const page =
    document.pages.find((item) => item.id === pageId) ?? document.pages[0];
  const dirty = !same(document, saved.document);
  const defaultTheme = theme ?? document.theme;
  const marketing = document.template === "hotel-marketing";
  const tr = document.locale === "tr";
  const mediaBase = "/api/build/" + initial.id + "/media/";

  const commit = useCallback((update: (previous: Document) => Document) => {
    changed.current = true;
    setHistory((previous) => {
      const next = update(previous.present);
      if (same(previous.present, next)) return previous;
      return {
        past: [...previous.past.slice(-39), previous.present],
        present: next,
        future: [],
      };
    });
  }, []);
  const restoreDraft = useCallback((draft: CreatorDraft) => {
    setHistory({ past: [saved.document], present: draft.document, future: [] });
    setPageId(draft.pageId);
    setSelected(draft.selected);
    setDevice(draft.device);
    setMode(draft.mode);
    setPanel(draft.panel);
    setEpoch((value) => value + 1);
    setConflict(null);
  }, [saved.document]);
  useEffect(() => {
    const controller = new AbortController();
    // Check the vault once. The browser checkpoint survives immediate navigation.
    void request<CreatorDraft | null>("/" + initial.id + "/draft", "GET", undefined, controller.signal)
      .then((draft) => {
        if (!draft || changed.current || (checkpoint && checkpoint.updatedAt >= draft.updatedAt) ||
            same(draft.document, initial.document)) return;
        stored.current = draft.updatedAt;
        remoteDraft.current = draft.updatedAt;
        if (draft.baseRevision === initial.revision) restoreDraft(draft);
        else setConflict(draft);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setRecoveryReady(true); });
    return () => controller.abort();
    // The server fallback is only needed when opening this editor.
  }, [initial.id]);
  useEffect(() => {
    if (!recoveryReady || conflict) return;
    const previous = stored.current;
    const draft: CreatorDraft = {
      version: 1, baseRevision: saved.revision, updatedAt: Math.max(Date.now(), previous + 1),
      document, pageId: page.id, selected, device, mode: mode === "run" ? "edit" : mode, panel,
    };
    const body = JSON.stringify(draft);
    if (new TextEncoder().encode(body).length > 192 * 1024) {
      setDraftSafe(false);
      return;
    }
    const local = writeLocalDraft(initial.id, body);
    setDraftSafe(local);
    stored.current = draft.updatedAt;
    if (!dirty) {
      const timestamp = remoteDraft.current;
      if (timestamp !== null) {
        remoteDraft.current = null;
        void request("/" + initial.id + "/draft", "DELETE", { updatedAt: timestamp }).catch(() => {});
      }
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void request("/" + initial.id + "/draft", "PUT", draft, controller.signal)
        .then(() => {
          remoteDraft.current = draft.updatedAt;
          if (stored.current === draft.updatedAt) setDraftSafe(true);
        }).catch(() => {});
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [initial.id, saved.revision, document, page.id, selected, device, mode, panel, dirty, conflict, recoveryReady]);
  async function discardDraft() {
    if (!conflict) return;
    try {
      await request("/" + initial.id + "/draft", "DELETE", { updatedAt: conflict.updatedAt });
      setConflict(null);
    } catch (error) { setMessage(describe(error)); }
  }

  const historyStep = useCallback(
    (forward = false) => {
      const source = forward ? history.future : history.past;
      if (!source.length) return;
      if (forward) {
        setHistory({
          past: [...history.past, history.present],
          present: source[0],
          future: source.slice(1),
        });
      } else {
        setHistory({
          past: source.slice(0, -1),
          present: source.at(-1)!,
          future: [history.present, ...history.future],
        });
      }
      setEpoch((value) => value + 1);
    },
    [history],
  );
  const save = useCallback(async () => {
    setBusy("Saving");
    setMessage("");
    try {
      const value = await request<BuildProject>("/" + initial.id, "PUT", {
        ...saved,
        document,
      });
      setSaved(value);
      return value;
    } catch (error) {
      setMessage(describe(error));
      return null;
    } finally {
      setBusy("");
    }
  }, [document, saved, initial.id]);

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.isComposing ||
        event.defaultPrevented
      )
        return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !busy) void save();
      }
      if (
        event.key.toLowerCase() === "z" &&
        !(
          event.target instanceof Element &&
          event.target.closest("input,textarea,[contenteditable]")
        )
      ) {
        event.preventDefault();
        historyStep(event.shiftKey);
      }
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    const beforeLeave = (event: Event) => {
      if (!confirm("Leave this project with unsaved changes?")) event.preventDefault();
    };
    window.addEventListener("keydown", key);
    if (dirty && !draftSafe) {
      window.addEventListener("beforeunload", beforeUnload);
      window.addEventListener("motionux:before-leave", beforeLeave);
    }
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("motionux:before-leave", beforeLeave);
    };
  }, [busy, dirty, historyStep, save, draftSafe]);
  useEffect(() => {
    if (mode !== "run") return;
    let stale = false;
    const poll = async () => {
      try {
        const next = await request<Preview>("/preview");
        if (!stale) setPreview(next);
      } catch (error) {
        if (!stale) setMessage(describe(error));
      }
    };
    void poll();
    const timer = setInterval(poll, 1000);
    return () => {
      stale = true;
      clearInterval(timer);
    };
  }, [mode]);
  async function run() {
    if (launch.current) return;
    launch.current = true;
    setMessage("");
    const latest = dirty ? await save() : saved;
    if (!latest) {
      launch.current = false;
      return;
    }
    setBusy("Starting preview");
    setMode("run");
    setPanel("canvas");
    setFocusCanvas(true);
    try {
      const active = await request<Preview>("/preview");
      if (
        active.id === latest.id &&
        active.revision === latest.revision &&
        ["ready", "building", "starting"].includes(active.status)
      ) {
        setPreview(active);
      } else {
        if (active.status !== "idle") await request("/preview", "DELETE");
        setPreview(
          await request<Preview>("/" + latest.id + "/preview", "POST", { revision: latest.revision }),
        );
      }
    } catch (error) {
      setPreview({ status: "failed", message: describe(error) });
    } finally {
      setBusy("");
      launch.current = false;
    }
  }
  async function stop() {
    setBusy("Stopping preview");
    try {
      setPreview(await request<Preview>("/preview", "DELETE"));
    } catch (error) {
      setMessage(describe(error));
    } finally {
      setBusy("");
    }
  }
  async function download(pwa = false) {
    setMessage("");
    const latest = dirty ? await save() : saved;
    if (!latest) return;
    setBusy("Exporting");
    let url: string | undefined;
    try {
      const response = await fetch("/api/build/" + initial.id + (pwa ? "/export-pwa" : "/export"), {
        cache: "no-store",
        headers: { "X-MotionUX-Revision": String(latest.revision) },
      });
      if (!response.ok) throw new Error((await response.json()).message);
      url = URL.createObjectURL(await response.blob());
      const link = window.document.createElement("a");
      link.href = url;
      const name = latest.document.template === "hotel-dashboard" ? "hotel-desk" : latest.document.template;
      link.download = name + (pwa ? "-pwa" : "") + "-source.zip";
      link.click();
    } catch (error) {
      setMessage(describe(error));
    } finally {
      if (url) {
        const target = url;
        setTimeout(() => URL.revokeObjectURL(target), 1000);
      }
      setBusy("");
    }
  }
  function updatePage(next: BuildPage) {
    commit((previous) => ({
      ...previous,
      pages: previous.pages.map((item) => (item.id === next.id ? next : item)),
    }));
    setEpoch((value) => value + 1);
  }
  function addPage(title: string, route: string, pattern: PagePatternId) {
    const pageId = id("p");
    const next = appendPageFromPattern(document, { id: pageId, title, route, pattern });
    commit(() => next);
    setPageId(pageId);
  }
  function onChange(data: Data) {
    try {
      const blocks = fromPuck(data);
      if (blocks.length > 36) throw new Error("A page can contain 36 blocks.");
      const total = document.pages.reduce(
        (count, item) =>
          count +
          allBlocks(item.id === page.id ? blocks : item.blocks).length +
          1,
        0,
      );
      if (total > 180) throw new Error("Project limit reached.");
      commit((previous) => ({
        ...previous,
        pages: previous.pages.map((item) =>
          item.id === page.id ? { ...item, blocks } : item,
        ),
      }));
    } catch {
      setMessage("This block or value is outside the managed project limits.");
      setEpoch((value) => value + 1);
    }
  }
  const previewOwned =
    preview.id === initial.id && preview.revision === saved.revision;
  const renderDocument = identityPreview ? { ...document, identity: identityPreview } : document;
  const runtime = {
    document: renderDocument,
    page,
    device,
    theme: defaultTheme,
    mediaBase,
    navigate: (route: string) => {
      const target = document.pages.find((item) => item.route === route);
      if (target) setPageId(target.id);
    },
  };
  const library = <>
    <Pages
      document={document}
      page={page}
      onSelect={setPageId}
      onAdd={addPage}
      onRename={updatePage}
      dialogHandle={pageDialog}
    />
    <Palette
      document={document}
      route={page.route}
      mediaBase={mediaBase}
      onPattern={(pattern) => pageDialog.current?.add(pattern)}
      recent={recent}
      onUsed={(type) =>
        setRecent((value) =>
          [type, ...value.filter((item) => item !== type)].slice(
            0,
            4,
          ),
        )
      }
      count={page.blocks.length}
    />
    {marketing && <MediaPanel onInventory={setMediaInventory} project={initial.id} document={document} onDocument={commit}
      onPurged={(id) => setHistory((previous) => ({
        ...previous,
        past: previous.past.filter(({ assets }) => !assets.includes(id)),
        future: previous.future.filter(({ assets }) => !assets.includes(id)),
      }))} />}
  </>;
  const properties = <Properties
      document={document}
      page={page}
      onDocument={commit}
      device={device}
      media={mediaInventory}
      mediaBase={mediaBase}
      previewIdentity={setIdentityPreview}
      setTheme={setTheme}
    />;
  return (
    <main className="build-app kinetic-puck">
      <WorkspaceHeader name={document.name} revision={saved.revision} dirty={dirty} draftSaved={draftSafe} busy={Boolean(busy)}
        backLabel={tr ? "Projeler" : "Projects"}
        statusLabels={{ saved: tr ? "Tüm değişiklikler kaydedildi" : "All changes saved",
          draft: tr ? "Taslak yerelde kaydedildi" : "Draft saved locally",
          unsaved: tr ? "Kaydedilmemiş değişiklikler" : "Unsaved changes" }}
        onBack={() => { if (!dirty || draftSafe || confirm("Leave this project with unsaved changes?")) onBack(); }}>
      {initial.blueprint && <details className="build-blueprint-note">
        <summary>App blueprint</summary>
        <div><strong>Codex plan · spec v{initial.blueprint.blockSpecVersion}</strong>
          <p>{initial.blueprint.summary}</p>
          {initial.blueprint.limitations.length > 0 && <ul>{initial.blueprint.limitations.map((item) => <li key={item}>{item}</li>)}</ul>}
          <code>{initial.blueprint.digest.slice(0, 12)}</code>
        </div>
      </details>}
        <div className="build-mode" aria-label="Canvas mode">
          <button
            type="button"
            aria-pressed={mode === "edit"}
            onClick={() => { setMode("edit"); setFocusCanvas(false); }}
          >
            {tr ? "Düzenle" : "Edit"}
          </button>
          <button type="button" aria-pressed={mode === "interact"} onClick={() => { setMode("interact"); setPanel("canvas"); }}>
            {tr ? "Etkileşim" : "Interact"}
          </button>
          <button
            type="button"
            aria-pressed={mode === "run"}
            disabled={Boolean(busy)}
            onClick={run}
          >
            Run
          </button>
        </div>
        <div className="build-toolbar-actions">
          <ToolbarButton
            label="Undo"
            disabled={!history.past.length}
            onClick={() => historyStep()}
          >
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!history.future.length}
            onClick={() => historyStep(true)}
          >
            <Redo2 size={16} />
          </ToolbarButton>
          <button
            type="button"
            className="build-button"
            disabled={!dirty || Boolean(busy)}
            onClick={() => void save()}
          >
            <Save size={15} /> Save
          </button>
          <button type="button" className="build-button accent" aria-haspopup="dialog" disabled={Boolean(busy)}
            onClick={(event) => openStudioSheet(exportDialog.current, event.currentTarget)}>
            <Download size={15} aria-hidden="true" /> Export
          </button>
        </div>
      </WorkspaceHeader>
      <StudioSheet dialog={exportDialog} title={tr ? "Uygulamayı dışa aktar" : "Export application"}>
        <div className="kinetic-export-actions">
          <button className="build-button" type="button" onClick={() => { exportDialog.current?.close(); void download(); }}>Export Next.js</button>
          <button className="build-button" type="button" onClick={() => { exportDialog.current?.close(); void download(true); }}>Export PWA</button>
          {dirty && <p>{tr ? "Dışa aktarmadan önce değişiklikler kaydedilir." : "Changes will be saved before export."}</p>}
        </div>
      </StudioSheet>
      {message && (
        <div className="build-alert" role="alert">
          <CircleAlert size={16} /> {message}
          <button
            type="button"
            aria-label="Dismiss status"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      {conflict && <div className="build-alert" role="status">
        {tr ? "Taslak daha eski bir revizyona ait." : "A recovery draft belongs to an older revision."}
        <button type="button" className="build-button" onClick={() => restoreDraft(conflict)}>{tr ? "Taslağı aç" : "Restore draft"}</button>
        <button type="button" className="build-button" onClick={() => void discardDraft()}>{tr ? "Taslağı at" : "Discard draft"}</button>
      </div>}
      <RuntimeContext.Provider value={runtime}>
        <Puck
          key={page.id + ":" + epoch}
          data={toPuck(page.blocks)}
          ui={{ itemSelector: selectBlock(page, selected) }}
          config={config}
          iframe={{ enabled: false }}
          dnd={{ behavior: "static" }}
          onChange={onChange}
        >
          <RememberSelection onSelect={setSelected} />
          <div className="build-workspace" data-focus-canvas={focusCanvas} data-compact={!wide}>
            {wide && <WorkspaceStructure className="build-left" aria-label="Pages and blocks">{library}</WorkspaceStructure>}
            <section className="build-canvas" aria-label="Application canvas">
              <div className="build-canvas-bar">
                {identityPreview && mode !== "run" && <button type="button" className="build-button" onClick={() => setIdentityPreview(undefined)}>Close style preview</button>}
                <div className="kinetic-puck-page">
                  <h2 dir="auto">{page.title}</h2>
                  <small className="build-route">{page.route}</small>
                </div>
                <div className="build-viewports" aria-label="Viewport">
                  {presets.map(([Icon, value]) => (
                    <ToolbarButton
                      key={value}
                      label={value[0].toUpperCase() + value.slice(1)}
                      aria-pressed={device === value}
                      onClick={() => setDevice(value)}
                    >
                      <Icon size={16} />
                    </ToolbarButton>
                  ))}
                  <FrameSize frame={frameElement} />
                </div>
                <div className="creator-canvas-actions">
                <ToolbarButton label={focusCanvas ? "Restore panels" : "Focus canvas"} aria-pressed={focusCanvas}
                  onClick={() => setFocusCanvas((value) => !value)}>
                  {focusCanvas ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </ToolbarButton>
                <ToolbarButton
                  label={
                    defaultTheme === "dark"
                      ? "Preview light theme"
                      : "Preview dark theme"
                  }
                  onClick={() =>
                    setTheme(defaultTheme === "dark" ? "light" : "dark")
                  }
                  disabled={mode === "run"}
                >
                  {defaultTheme === "dark" ? (
                    <Sun size={16} />
                  ) : (
                    <Moon size={16} />
                  )}
                </ToolbarButton>
                </div>
              </div>
              <div className="build-canvas-scroll">
                <div ref={frameElement} className="build-canvas-paper" data-device={device}>
                  <div hidden={mode !== "edit"}>
                    {page.blocks.length === 0 && <p className="creator-empty-page">{tr ? "Bu sayfaya Kitaplık’tan bir blok veya bölüm ekleyin." : "Add a block or section from the Library to start this page."}</p>}
                    <Puck.Preview />
                  </div>
                  {mode === "interact" && <InteractPreview document={renderDocument} page={page} navigate={runtime.navigate} device={device} theme={defaultTheme} mediaBase={mediaBase} taskProgress={{ changes: taskChanges, update: setTaskChanges }} />}
                  {mode === "run" &&
                    (previewOwned && preview.status === "ready" ? (
                      <iframe
                        title="Live Next.js application"
                        src={preview.url + page.route}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="build-run-state" role="status">
                        {previewOwned &&
                        ["building", "starting"].includes(preview.status) ? (
                          <LoaderCircle size={24} />
                        ) : (
                          <Monitor size={24} />
                        )}
                        <strong>
                          {preview.status === "failed"
                            ? "Preview unavailable"
                            : preview.status === "starting"
                              ? "Starting Next.js"
                              : preview.status === "building"
                                ? "Building the saved app"
                                : "Run the saved app"}
                        </strong>
                        {preview.message && <p>{preview.message}</p>}
                        {!busy &&
                          ["idle", "failed"].includes(preview.status) && (
                            <button
                              type="button"
                              className="build-button"
                              onClick={run}
                            >
                              Retry preview
                            </button>
                          )}
                      </div>
                    ))}
                </div>
              </div>
              <footer className="build-canvas-foot">
                <span>
                  {mode === "edit" ? "Instant canvas" : mode === "interact" ? (tr ? "Canlı taslak" : "Interactive draft") : "Isolated Next.js"} ·{" "}
                  {device}
                </span>
                {mode === "edit" && !marketing && (
                  <IntegrationLab
                    key={saved.revision + ":" + page.route}
                    project={saved.id}
                    revision={saved.revision}
                    route={page.route}
                    request={request}
                    disabled={dirty}
                  />
                )}
                {mode === "run" &&
                  previewOwned &&
                  preview.status === "ready" && (
                    <a
                      href={preview.url + page.route}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open app <ExternalLink size={13} />
                    </a>
                  )}
                {mode === "run" && previewOwned && preview.status === "ready" && (
                  <RuntimeInspector
                    key={saved.revision}
                    pages={saved.document.pages}
                    route={page.route}
                    revision={saved.revision}
                    disabled={dirty}
                    inspect={(route, signal) =>
                      request("/" + saved.id + "/inspect", "POST", { route, revision: saved.revision }, signal)
                    }
                  />
                )}
                {mode === "run" &&
                  ["building", "starting", "ready"].includes(
                    preview.status,
                  ) && (
                    <button
                      type="button"
                      onClick={stop}
                      disabled={Boolean(busy)}
                    >
                      <Square size={13} /> Stop
                    </button>
                  )}
              </footer>
            </section>
            {wide && <aside className="build-right" aria-label="Properties">{properties}</aside>}

          </div>
          {!wide && <>
            <StudioSheet dialog={libraryDialog} title={tr ? "Sayfalar ve bloklar" : "Pages and blocks"} side onDismiss={() => setPanel("canvas")}>{library}</StudioSheet>
            <StudioSheet dialog={propertiesDialog} title={tr ? "Özellikler" : "Properties"} side onDismiss={() => setPanel("canvas")}>{properties}</StudioSheet>
          </>}
        </Puck>
      </RuntimeContext.Provider>
      <nav className="build-mobile-panels unified-mobile-workspace-nav" aria-label="Editor panes">
        {(["left", "canvas", "right"] as const).map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={panel === id}
            onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setPanel(id); setFocusCanvas(false); }}
          >
            {id === "left"
              ? "Library"
              : id === "right"
                ? "Properties"
                : "Canvas"}
          </button>
        ))}
      </nav>
    </main>
  );
}

function Pages({
  document,
  page,
  onSelect,
  onAdd,
  onRename,
  dialogHandle,
}: {
  document: Document;
  page: BuildPage;
  onSelect: (id: string) => void;
  onAdd: (title: string, route: string, pattern: PagePatternId) => void;
  onRename: (page: BuildPage) => void;
  dialogHandle: Ref<{ add: (pattern: PagePatternId) => void }>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"add" | "rename">("add");
  const [pattern, setPattern] = useState<PagePatternId>("blank");
  const choices = availablePagePatterns(document);
  const tr = document.locale === "tr";
  const [title, setTitle] = useState("");
  const [route, setRoute] = useState("");
  const [error, setError] = useState("");
  function show(next: "add" | "rename", preset: PagePatternId = "blank") {
    setAction(next);
    setPattern(preset);
    setTitle(next === "add" ? "" : page.title);
    setRoute(next === "add" ? "/" : page.route);
    setError("");
    dialog.current?.showModal();
  }
  useImperativeHandle(dialogHandle, () => ({ add: (preset) => show("add", preset) }));
  return (
    <section className="build-panel-section">
      <div className="build-panel-title">
        <h2>Pages</h2>
        <ToolbarButton label="Add page" onClick={() => show("add")}>
          <Plus size={16} />
        </ToolbarButton>
      </div>
      <nav className="build-pages" aria-label="Project pages">
        {document.pages.map((item) => (
          <button
            key={item.id}
            aria-current={item.id === page.id ? "page" : undefined}
            type="button"
            onClick={() => onSelect(item.id)}
          >
            <span>{item.title}</span>
            <small>{item.route}</small>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="build-text-button"
        onClick={() => show("rename")}
      >
        Edit page name and route
      </button>
      <dialog
        ref={dialog}
        className="build-dialog"
        aria-labelledby="build-page-form-title"
      >
        <h2 id="build-page-form-title">
          {action === "add" ? "Add page" : "Edit page"}
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const path = route.trim();
            if (
              !title.trim() ||
              !routeSlug.safeParse(path).success ||
              document.pages.some(
                (item) =>
                  (action === "add" || item.id !== page.id) &&
                  item.route === path,
              )
            ) {
              setError(
                "Use a unique route such as /reports and enter a page name.",
              );
              return;
            }
            try {
              if (action === "add") onAdd(title.trim(), path, pattern);
              else {
                const name = title.trim();
                const blocks = page.blocks.map((block) =>
                  block.type === "PageHeader" &&
                  block.props.title === page.title
                    ? { ...block, props: { ...block.props, title: name } }
                    : block,
                );
                onRename({ ...page, title: name, route: path, blocks });
              }
              dialog.current?.close();
            } catch (error) {
              setError(describe(error));
            }
          }}
        >
          <label>
            Page name
            <input
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              maxLength={60}
            />
          </label>
          <label>
            Route
            <input
              value={route}
              readOnly={action === "rename" && page.route === "/"}
              onChange={(event) => setRoute(event.target.value)}
              maxLength={41}
            />
          </label>
          {action === "add" && <>
            <label htmlFor="build-page-pattern">{tr ? "Sayfa şablonu" : "Page pattern"}</label>
            <select id="build-page-pattern" aria-describedby="build-page-pattern-help" value={pattern}
              onChange={(event) => {
                const chosen = choices.find(({ id }) => id === event.target.value);
                if (chosen) setPattern(chosen.id);
              }}>
              {choices.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
            <p id="build-page-pattern-help" className="build-hint">{choices.find(({ id }) => id === pattern)?.summary}</p>
          </>}
          {error && <p role="alert">{error}</p>}
          <div>
            <button
              type="button"
              className="build-button"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button className="build-button accent" type="submit">
              {action === "add" ? "Create page" : "Save page"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}

function RememberSelection({ onSelect }: { onSelect: (id: string | null) => void }) {
  const selected = useSelector((store) => store.selectedItem?.props.id ?? null);
  useEffect(() => { onSelect(selected); }, [onSelect, selected]);
  return null;
}

function useBlockActions() {
  const dispatch = useSelector((store) => store.dispatch);
  const items = useSelector((store) => store.appState.data.content);
  function select(index: number, group?: string) {
    dispatch({
      type: "setUi",
      ui: {
        itemSelector:
          index < 0
            ? null
            : { index, ...(group && { zone: group + ":items" }) },
      },
    });
  }
  function replace(content: PuckItem[], index: number, group?: string) {
    dispatch({ type: "setData", data: { content } });
    select(index, group);
  }
  function update(siblings: PuckItem[], index: number, group?: string) {
    replace(
      group
        ? items.map((item) =>
            item.props.id === group
              ? { ...item, props: { ...item.props, items: siblings } }
              : item,
          )
        : siblings,
      index,
      group,
    );
  }
  return { items, select, update, replace };
}
function Palette({
  document,
  route,
  mediaBase,
  onPattern,
  recent,
  onUsed,
  count,
}: {
  document: Document;
  route: string;
  mediaBase: string;
  onPattern: (pattern: PagePatternId) => void;
  recent: BlockId[];
  onUsed: (type: BlockId) => void;
  count: number;
}) {
  const data = document.data;
  const [kind, setKind] = useState<"blocks" | "sections" | "patterns">("blocks");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All blocks");
  const [target, setTarget] = useState("");
  const { items, update } = useBlockActions();
  const groups = items.filter((item) => isBlockGroup(item.type));
  const group = groups.find((item) => item.props.id === target);
  const siblings = group ? sectionItems(group) : items;
  const full = group ? siblings.length >= 12 : count >= 36;
  const ids = (
    family === "Recent"
      ? recent
      : blockList.filter(
          (id) => family === "All blocks" || registry[id].family === family,
        )
  ).filter((id) => id !== "CreatorSection" && compatibleBlock(id, data) &&
    (registry[id].title + " " + registry[id].detail)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  function insert(recipe: RecipeId) {
    if (items.length >= 36) return;
    const block = sectionFromRecipe(document, recipe, () => id("b"));
    const footer = items.findIndex((item) => item.type === "MarketingFooter");
    const position = footer < 0 ? items.length : footer;
    update([...items.slice(0, position), puckItem(block), ...items.slice(position)], position);
  }
  return (
    <section className="build-panel-section build-palette">
      <div className="build-panel-title">
        <h2>
          <Blocks size={16} /> Library
        </h2>

      </div>
      <div className="creator-library-switch" role="group" aria-label="Library type">
        {(["blocks", "sections", "patterns"] as const).map((type) => (
          <button type="button" key={type} aria-pressed={kind === type} onClick={() => { setKind(type); setQuery(""); }}>
            {type[0].toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      <label className="build-sr" htmlFor="block-search">
        {"Search " + kind}
      </label>
      <input
        id="block-search"
        type="search"
        placeholder={"Find " + kind + "…"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {kind === "sections" ? <SectionLibrary document={document} route={route} mediaBase={mediaBase} query={query} insert={insert} /> : kind === "patterns" ? (
        <div className="creator-sections">
          {availablePagePatterns(document).filter(({ label, summary }) =>
            (label + " " + summary).toLocaleLowerCase(document.locale).includes(query.toLocaleLowerCase(document.locale).trim())
          ).map(({ id, label, summary }) => (
            <div className="creator-section-card" key={id}>
              <button type="button" className="creator-section-choice" onClick={() => onPattern(id)}>
                <strong>{label}</strong><span>{summary}</span>
              </button>
            </div>
          ))}
        </div>
      ) : <>
      <label className="build-sr" htmlFor="block-family">
        Block family
      </label>
      <select
        id="block-family"
        value={family}
        onChange={(event) => setFamily(event.target.value)}
      >
        {["All blocks", "Recent", ...families].map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      {groups.length > 0 && (
        <label>
          Add to
          <select
            aria-label="Block insertion target"
            value={group?.props.id ?? ""}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">Page</option>
            {groups.map((item) => (
              <option key={item.props.id} value={item.props.id}>
                {item.props.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {!ids.length && <p role="status">No matching blocks.</p>}
      <Drawer>
        {ids.map((type) => (
          <div className="build-palette-row" key={type}>
            <Drawer.Item
              name={type}
              label={registry[type].title}
              isDragDisabled={count >= 36}
            >
              {({ children }) => (
                <div className="build-drag-label">
                  <GripVertical size={14} />
                  {children}
                </div>
              )}
            </Drawer.Item>
            <ToolbarButton
              label={"Add " + registry[type].title}
              disabled={full || Boolean(group && (isBlockGroup(type) || (group.type === "CreatorSection" && !isSectionChild(type))))}
              onClick={() => {
                const block = makeBlock(type, id("b"));
                update(
                  [...siblings, puckItem(block)],
                  siblings.length,
                  group?.props.id,
                );
                onUsed(type);
              }}
            >
              <Plus size={15} />
            </ToolbarButton>
          </div>
        ))}
      </Drawer>
      </>}
    </section>
  );
}
function Properties({
  document,
  page,
  onDocument,
  device,
  media,
  mediaBase,
  previewIdentity,
  setTheme,
}: {
  document: Document;
  page: BuildPage;
  onDocument: (edit: (previous: Document) => Document) => void;
  device: Device;
  media: MediaRecord[];
  mediaBase: string;
  previewIdentity: (value?: DesignIdentity) => void;
  setTheme: (theme: "light" | "dark" | undefined) => void;
}) {
  const selected = useSelector((store) => store.selectedItem);
  const { items, select, update, replace } = useBlockActions();
  const group = selected
    ? items.find((item) =>
        sectionItems(item).some(
          (child) => child.props.id === selected.props.id,
        ),
      )
    : undefined;
  const siblings = group ? sectionItems(group) : items;
  const index = selected
    ? siblings.findIndex((item) => item.props.id === selected.props.id)
    : -1;
  const current =
    index < 0
      ? undefined
      : allBlocks(page.blocks).find((block) => block.id === selected?.props.id);
  const owner = group?.props.id;
  function props(change: Partial<BlockProps>) {
    if (!current) return;
    update(
      siblings.map((item, position) =>
        position === index
          ? { ...item, props: { ...item.props, ...change } }
          : item,
      ),
      index,
      owner,
    );
  }
  function relocate(target?: string) {
    if (!current || target === owner) return;
    const moved = puckItem(current);
    const root = items
      .filter((item) => item.props.id !== current.id)
      .map((item) =>
        item.props.id === owner
          ? {
              ...item,
              props: {
                ...item.props,
                items: sectionItems(item).filter(
                  (child) => child.props.id !== current.id,
                ),
              },
            }
          : item,
      );
    if (!target) {
      if (root.length < 36) replace([...root, moved], root.length);
    } else {
      const destination = root.find((item) => item.props.id === target);
      const children = sectionItems(destination);
      if (!destination || !isBlockGroup(destination.type) || (destination.type === "CreatorSection" && !isSectionChild(current.type)) || children.length >= 12) return;
      replace(
        root.map((item) =>
          item === destination
            ? { ...item, props: { ...item.props, items: [...children, moved] } }
            : item,
        ),
        children.length,
        target,
      );
    }
  }
  function move(delta: number) {
    const copy = [...siblings];
    const target = index + delta;
    if (index < 0 || target < 0 || target >= copy.length) return;
    [copy[target], copy[index]] = [copy[index], copy[target]];
    update(copy, target, owner);
  }
  return (
    <>
      <section className="build-panel-section">
        <div className="build-panel-title">
          <h2>Properties</h2>
        </div>
        {current ? (
          <>
            <span className="build-selected-label">
              {registry[current.type].title}
            </span>
            <label>
              Block title
              <input
                value={current.props.title}
                maxLength={72}
                onChange={(event) => props({ title: event.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={current.props.description}
                maxLength={180}
                rows={3}
                onChange={(event) => props({ description: event.target.value })}
              />
            </label>
            {isMarketing(current.type) && <MediaFields key={current.id} type={current.type} props={current.props} document={document} media={media} mediaBase={mediaBase} change={props} />}
            {current.type === "ArticleLibrary" && <ArticleFields key={current.id} props={current.props} tr={document.locale === "tr"} change={props} />}
            {current.props.layout && <SectionLayoutFields key={current.id} value={current.props.layout} device={device} onChange={(layout) => props({ layout })} />}
            <details className="creator-settings creator-block-style">
            <summary>{document.locale === "tr" ? "Stil ve etkileşim" : "Style and interaction"}</summary>
            <label>
              Appearance
              <select
                value={current.props.variant}
                onChange={(event) =>
                  props({
                    variant:
                      event.target.value === "quiet" ? "quiet" : "default",
                  })
                }
              >
                <option value="default">Default</option>
                <option value="quiet">Quiet</option>
              </select>
            </label>
            <label>
              Visibility
              <select
                value={current.props.visibility}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === "all" ||
                    value === "mobile" ||
                    value === "desktop"
                  )
                    props({ visibility: value });
                }}
              >
                <option value="all">All sizes</option>
                <option value="desktop">Desktop and tablet</option>
                <option value="mobile">Mobile</option>
              </select>
            </label>
            <label>
              Motion
              <select
                value={current.props.motion}
                onChange={(event) =>
                  props({
                    motion: event.target.value === "none" ? "none" : "system",
                  })
                }
              >
                <option value="system">System preference</option>
                <option value="none">No motion</option>
              </select>
            </label>
            <label>
              Accessible label
              <input
                value={current.props.accessibleLabel}
                maxLength={72}
                onChange={(event) =>
                  props({ accessibleLabel: event.target.value })
                }
              />
            </label>
            </details>
            {current.type === "KpiCard" && (
              <label>
                Metric source
                <select
                  value={current.props.dataBinding}
                  onChange={(event) => {
                    const binding = metricOptions[document.data].find((item) => item === event.target.value);
                    if (binding) props({ dataBinding: binding });
                  }}
                >
                  {metricOptions[document.data].map((item) => <option key={item} value={item}>{({
                    automatic: document.data === "hotel-demo-v1" ? "Default occupancy" : "Open pipeline",
                    occupancy: "Occupancy", arrivals: "Arrivals", revenue: "Booked revenue",
                    "pipeline-value": "Open pipeline value", "qualified-deals": "Qualified deals", contacts: "Contacts", "open-tasks": "Open activities",
                  })[item]}</option>)}
                </select>
              </label>
            )}
            {!isBlockGroup(current.type) &&
              items.some((item) => isBlockGroup(item.type)) && (
                <label>
                  Block location
                  <select
                    value={owner ?? ""}
                    onChange={(event) =>
                      relocate(event.target.value || undefined)
                    }
                  >
                    <option value="">Page</option>
                    {items
                      .filter((item) => isBlockGroup(item.type))
                      .map((item) => (
                        <option
                          key={item.props.id}
                          value={item.props.id}
                          disabled={
                            sectionItems(item).length >= 12 &&
                            item.props.id !== owner
                          }
                        >
                          {item.props.title}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            <div className="build-block-actions">
              <ToolbarButton
                label="Move block up"
                onClick={() => move(-1)}
                disabled={index === 0}
              >
                <ArrowUp size={16} />
              </ToolbarButton>
              <ToolbarButton
                label="Move block down"
                onClick={() => move(1)}
                disabled={index + 1 >= siblings.length}
              >
                <ArrowDown size={16} />
              </ToolbarButton>
              <ToolbarButton
                label="Duplicate block"
                disabled={siblings.length >= (group ? 12 : 36)}
                onClick={() =>
                  update(
                    [
                      ...siblings.slice(0, index + 1),
                      puckItem({
                        ...current,
                        id: id("b"),
                        ...(current.children && {
                          children: current.children.map((child) => ({
                            ...child,
                            id: id("b"),
                          })),
                        }),
                      }),
                      ...siblings.slice(index + 1),
                    ],
                    index + 1,
                    owner,
                  )
                }
              >
                <Copy size={15} />
              </ToolbarButton>
              <ToolbarButton
                label="Remove block"
                onClick={() =>
                  update(
                    siblings.filter((_, at) => at !== index),
                    Math.min(index, siblings.length - 2),
                    owner,
                  )
                }
              >
                <Trash2 size={15} />
              </ToolbarButton>
            </div>
          </>
        ) : (
          <p className="build-hint">
            Select a block in the canvas or outline to edit it.
          </p>
        )}
      </section>
      <section className="build-panel-section">
        <div className="build-panel-title">
          <h2>Outline</h2>
        </div>
        {items.length ? (
          <div className="build-outline">
            {items.map((item, index) => (
              <div key={item.props.id}>
                <button
                  type="button"
                  aria-pressed={selected?.props.id === item.props.id}
                  onClick={() => select(index)}
                >
                  {index + 1}. {item.type === "CreatorSection" ? item.props.title : registry[item.type as BlockId].title}
                </button>
                {sectionItems(item).map((child, childIndex) => (
                  <button
                    key={child.props.id}
                    type="button"
                    className="build-outline-child"
                    aria-pressed={selected?.props.id === child.props.id}
                    onClick={() => select(childIndex, item.props.id)}
                  >
                    {index + 1}.{childIndex + 1}.{" "}
                    {registry[child.type as BlockId].title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="build-hint">Add a block to start this page.</p>
        )}
      </section>
      <IdentityFields document={document} onChange={onDocument} preview={previewIdentity} />
      {document.data === "operations-demo-v1" && <TaskFields document={document} change={onDocument} />}
      <MotionDnaFields document={document} onChange={onDocument} />
      <section className="build-panel-section">
        <div className="build-panel-title">
          <h2>Project</h2>
        </div>
        <label>
          Name
          <input
            value={document.name}
            maxLength={80}
            onChange={(event) => {
              const name = event.target.value;
              if (name.trim()) onDocument((item) => ({ ...item, name }));
            }}
          />
        </label>
        <label>
          Default theme
          <select
            value={document.theme}
            onChange={(event) => {
              const theme = event.target.value === "system" ? "system" : event.target.value === "dark" ? "dark" : "light";
              onDocument((item) => ({ ...item, theme }));
              setTheme(undefined);
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
        <label>
          Sidebar variant
          <select
            value={document.sidebar}
            onChange={(event) => {
              const sidebar =
                event.target.value === "rail" ? "rail" : "expanded";
              onDocument((item) => ({ ...item, sidebar }));
            }}
          >
            <option value="expanded">Expanded</option>
            <option value="rail">Icon rail</option>
          </select>
        </label>
      </section>
    </>
  );
}
