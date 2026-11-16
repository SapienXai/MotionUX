"use client";

import {
  ArrowDown,
  Layers3,
  ArrowUp,
  Blocks,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  Copy,
  Download,
  ExternalLink,
  GripVertical,
  LoaderCircle,
  Monitor,
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
  type Config,
  type Data,
  type Slot,
} from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { RenderBlock } from "@motionux/app-blocks";
import { AppFrame } from "@motionux/app-blocks/frame";
import {
  allBlocks,
  blockSchema,
  families,
  makeBlock,
  registry,
  compatibleBlock,
  metricOptions,
  routeSlug,
  type Block,
  type BlockId,
  type BlockProps,
  type BuildPage,
  type BuildProject,
  type Document,
} from "@motionux/build-core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
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
type Runtime = {
  document: Document;
  page: BuildPage;
  device: Device;
  theme?: "light" | "dark";
  navigate: (route: string) => void;
};
const RuntimeContext = createContext<Runtime | null>(null);
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

function RuntimeRoot({ children }: { children: ReactNode }) {
  const runtime = useContext(RuntimeContext);
  if (!runtime) return null;
  const { document, page, device, theme, navigate } = runtime;
  return (
    <AppFrame
      document={document}
      route={page.route}
      device={device}
      themeOverride={theme}
      navigate={navigate}
      studio
    >
      {children}
    </AppFrame>
  );
}
type EditorConfig = Config<
  Record<BlockId, BlockProps> & { SidebarInset: BlockProps & { items: Slot } }
>;
const staticBlocks = new Set<BlockId>([
  "PageHeader",
  "KpiCard",
  "KpiGrid",
  "ChartCard",
  "RecentActivity",
  "StatusBadge",
]);
function previewBlock(
  type: BlockId,
): EditorConfig["components"]["PageHeader"]["render"] {
  return ({
    id,
    title,
    description,
    variant,
    motion,
    visibility,
    accessibleLabel,
    dataBinding,
    puck,
  }) => {
    const block: Block = {
      id,
      type,
      version: 1,
      props: {
        title,
        description,
        variant,
        motion,
        visibility,
        accessibleLabel,
        dataBinding,
      },
    };
    // Editing selects the block through Puck. It must not also activate an app control.
    return puck.isEditing && !staticBlocks.has(type) ? (
      <>
        <span className="build-sr">{registry[type].title}</span>
        <div inert>
          <RenderBlock block={block} />
        </div>
      </>
    ) : (
      <RenderBlock block={block} />
    );
  };
}
const config: EditorConfig = {
  components: {
    ...Object.fromEntries(
      blockList
        .filter((type) => type !== "SidebarInset")
        .map((type) => [
          type,
          {
            label: registry[type].title,
            defaultProps: makeBlock(type, "b-default").props,
            render: previewBlock(type),
          },
        ]),
    ),
    SidebarInset: {
      label: registry.SidebarInset.title,
      inline: true,
      fields: { items: { type: "slot", disallow: ["SidebarInset"] } },
      defaultProps: {
        ...makeBlock("SidebarInset", "b-default").props,
        items: [],
      },
      render: ({
        id,
        title,
        description,
        variant,
        motion,
        visibility,
        accessibleLabel,
        dataBinding,
        items: Items,
        puck,
      }: Parameters<
        EditorConfig["components"]["SidebarInset"]["render"]
      >[0]) => (
        <RenderBlock
          block={{
            id,
            type: "SidebarInset",
            version: 1,
            props: {
              title,
              description,
              variant,
              motion,
              visibility,
              accessibleLabel,
              dataBinding,
            },
          }}
          edit={puck.isEditing}
          dragRef={puck.dragRef}
          slot={
            <Items
              className="hotel-layout-slot"
              minEmptyHeight={44}
              aria-label="Section blocks"
            />
          }
        />
      ),
    },
  } as unknown as EditorConfig["components"],
  root: { render: ({ children }) => <RuntimeRoot>{children}</RuntimeRoot> },
};
type PuckItem = Data["content"][number];
function puckItem(block: Block): PuckItem {
  return {
    type: block.type,
    props: {
      id: block.id,
      ...block.props,
      ...(block.type === "SidebarInset" && {
        items: (block.children ?? []).map(puckItem),
      }),
    },
  };
}
function toPuck(blocks: Block[]): Data {
  return { content: blocks.map(puckItem), root: { props: {} } };
}
function decode(item: PuckItem, nested = false): unknown {
  const { id, items, ...fields } = item.props;
  if (nested && items !== undefined)
    throw new Error("Only one section level is supported.");
  return {
    id,
    type: item.type,
    version: 1,
    props: fields,
    ...(Array.isArray(items) && {
      children: items.map((child) => decode(child, true)),
    }),
  };
}
function fromPuck(data: Data) {
  return data.content.map((item) => blockSchema.parse(decode(item)));
}
function sectionItems(item?: PuckItem): PuckItem[] {
  return Array.isArray(item?.props.items) ? item.props.items : [];
}
function newHistory(document: Document): History {
  return { past: [], present: document, future: [] };
}

async function request<T>(
  path = "",
  method = "GET",
  body?: unknown,
): Promise<T> {
  const result = await fetch("/api/build" + path, {
    method,
    cache: "no-store",
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
function Brand() {
  return (
    <a href="/" className="build-brand">
      <span className="build-mark">
        <Layers3 size={17} />
      </span>
      MotionUX <span>Build</span>
    </a>
  );
}

export function Editor({
  initial,
  onBack,
}: {
  initial: BuildProject;
  onBack: () => void;
}) {
  const [history, setHistory] = useState(() => newHistory(initial.document));
  const [saved, setSaved] = useState(initial);
  const [pageId, setPageId] = useState(initial.document.pages[0].id);
  const [epoch, setEpoch] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [theme, setTheme] = useState<"light" | "dark">();
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const [mode, setMode] = useState<"edit" | "run">("edit");
  const [panel, setPanel] = useState<"left" | "canvas" | "right">("canvas");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<BlockId[]>([]);
  const launch = useRef(false);
  const document = history.present;
  const page =
    document.pages.find((item) => item.id === pageId) ?? document.pages[0];
  const dirty = !same(document, saved.document);
  const defaultTheme = theme ?? document.theme;

  const commit = useCallback((update: (previous: Document) => Document) => {
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
    window.addEventListener("keydown", key);
    if (dirty) window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [busy, dirty, historyStep, save]);
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
  function addPage(title: string, route: string) {
    if (document.pages.length >= 12)
      throw new Error("A project can contain 12 pages.");
    const next = {
      id: id("p"),
      route,
      title,
      blocks: [makeBlock("PageHeader", id("b"), { title })],
    };
    commit((previous) => ({ ...previous, pages: [...previous.pages, next] }));
    setPageId(next.id);
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
  const runtime = {
    document,
    page,
    device,
    theme: defaultTheme,
    navigate: (route: string) => {
      const target = document.pages.find((item) => item.route === route);
      if (target) setPageId(target.id);
    },
  };
  return (
    <main className="build-app">
      <header className="build-toolbar">
        <Brand />
        <span className="build-toolbar-divider" />
        <button
          type="button"
          className="build-button build-project-title"
          onClick={() => {
            if (!dirty || confirm("Leave this project with unsaved changes?"))
              onBack();
          }}
        >
          <span>{document.name}</span>
          <ChevronDown size={14} />
        </button>
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
            onClick={() => setMode("edit")}
          >
            Edit
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
          <span className="build-state" role="status">
            {busy ||
              (dirty ? (
                "Unsaved"
              ) : (
                <>
                  <Check size={13} /> Saved
                </>
              ))}
          </span>
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
          <button
            type="button"
            className="build-button accent"
            disabled={Boolean(busy)}
            onClick={() => void download()}
          >
            <Download size={15} /> Export
          </button>
          <button
            type="button"
            className="build-button"
            title="Download installable source with offline pages"
            disabled={Boolean(busy)}
            onClick={() => void download(true)}
          >
            Export PWA
          </button>
        </div>
      </header>
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
      <nav className="build-mobile-panels" aria-label="Editor panes">
        {(["left", "canvas", "right"] as const).map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={panel === id}
            onClick={() => setPanel(id)}
          >
            {id === "left"
              ? "Library"
              : id === "right"
                ? "Inspector"
                : "Canvas"}
          </button>
        ))}
      </nav>
      <RuntimeContext.Provider value={runtime}>
        <Puck
          key={page.id + ":" + epoch}
          data={toPuck(page.blocks)}
          config={config}
          iframe={{ enabled: false }}
          dnd={{ behavior: "static" }}
          onChange={onChange}
        >
          <div className="build-workspace" data-pane={panel}>
            <aside className="build-left" aria-label="Pages and blocks">
              <Pages
                document={document}
                page={page}
                onSelect={setPageId}
                onAdd={addPage}
                onRename={updatePage}
              />
              <Palette
                data={document.data}
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
            </aside>
            <section className="build-canvas" aria-label="Application canvas">
              <div className="build-canvas-bar">
                <span className="build-route">
                  <Code2 size={15} /> {page.route}
                </span>
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
                </div>
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
              <div className="build-canvas-scroll">
                <div className="build-canvas-paper" data-device={device}>
                  <div hidden={mode !== "edit"}>
                    <Puck.Preview />
                  </div>
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
                  {mode === "edit" ? "Instant canvas" : "Isolated Next.js"} ·{" "}
                  {device}
                </span>
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
            <aside className="build-right" aria-label="Inspector">
              <Properties
                document={document}
                page={page}
                onDocument={commit}
                setTheme={setTheme}
              />
            </aside>
          </div>
        </Puck>
      </RuntimeContext.Provider>
    </main>
  );
}

function Pages({
  document,
  page,
  onSelect,
  onAdd,
  onRename,
}: {
  document: Document;
  page: BuildPage;
  onSelect: (id: string) => void;
  onAdd: (title: string, route: string) => void;
  onRename: (page: BuildPage) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"add" | "rename">("add");
  const [title, setTitle] = useState("");
  const [route, setRoute] = useState("");
  const [error, setError] = useState("");
  function show(next: "add" | "rename") {
    setAction(next);
    setTitle(next === "add" ? "" : page.title);
    setRoute(next === "add" ? "/" : page.route);
    setError("");
    dialog.current?.showModal();
  }
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
              if (action === "add") onAdd(title.trim(), path);
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
  data,
  recent,
  onUsed,
  count,
}: {
  data: Document["data"];
  recent: BlockId[];
  onUsed: (type: BlockId) => void;
  count: number;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All blocks");
  const [target, setTarget] = useState("");
  const { items, update } = useBlockActions();
  const groups = items.filter((item) => item.type === "SidebarInset");
  const group = groups.find((item) => item.props.id === target);
  const siblings = group ? sectionItems(group) : items;
  const full = group ? siblings.length >= 12 : count >= 36;
  const ids = (
    family === "Recent"
      ? recent
      : blockList.filter(
          (id) => family === "All blocks" || registry[id].family === family,
        )
  ).filter((id) => compatibleBlock(id, data) &&
    (registry[id].title + " " + registry[id].detail)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="build-panel-section build-palette">
      <div className="build-panel-title">
        <h2>
          <Blocks size={16} /> Blocks
        </h2>
        <span>{blockList.length}</span>
      </div>
      <label className="build-sr" htmlFor="block-search">
        Search blocks
      </label>
      <input
        id="block-search"
        type="search"
        placeholder="Find a block…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
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
              disabled={full || Boolean(group && type === "SidebarInset")}
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
    </section>
  );
}
function Properties({
  document,
  page,
  onDocument,
  setTheme,
}: {
  document: Document;
  page: BuildPage;
  onDocument: (edit: (previous: Document) => Document) => void;
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
      if (destination?.type !== "SidebarInset" || children.length >= 12) return;
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
          <h2>Inspector</h2>
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
            {current.type !== "SidebarInset" &&
              items.some((item) => item.type === "SidebarInset") && (
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
                      .filter((item) => item.type === "SidebarInset")
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
                  {index + 1}. {registry[item.type as BlockId].title}
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
              const theme = event.target.value === "dark" ? "dark" : "light";
              onDocument((item) => ({ ...item, theme }));
              setTheme(undefined);
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
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
        <label>
          Project motion
          <select
            value={document.motionProfile}
            onChange={(event) => {
              const motionProfile =
                event.target.value === "none" ? "none" : "system";
              onDocument((item) => ({ ...item, motionProfile }));
            }}
          >
            <option value="system">System preference</option>
            <option value="none">No motion</option>
          </select>
        </label>
      </section>
    </>
  );
}
