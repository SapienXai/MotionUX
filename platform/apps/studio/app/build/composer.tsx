"use client";

import { SourceJobStatus, useSourceJob } from "./source-job";

import { projectPathKey } from "../../../../../lib/studio-bridge";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Building2,
  BookOpen,
  ListChecks,
  ChevronRight,
  LayoutTemplate,
  LockKeyhole,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import { designPresets, presetDetails, sectionRecipeNames } from "@motionux/build-core/creator-catalog";
import type { BuildProject, Template } from "@motionux/build-core";
import type { ReviewedPlan } from "@motionux/build-core/blueprint";

type CanvasProps = { initial: BuildProject; onBack: () => void };
type Row = {
  id: string;
  name: string;
  revision: number | null;
  error: boolean;
};
type Review = { job: string; plan: ReviewedPlan };
type Edits = Pick<ReviewedPlan, "name" | "theme" | "sidebar" | "routes" | "preset">;
const editFor = ({ name, theme, sidebar, routes, preset }: ReviewedPlan): Edits => ({
  name,
  theme,
  sidebar,
  routes,
  preset,
});
const actionLabels: Record<string, string> = {
  navigate: "Open another page",
  "select-local": "Change local preferences",
  inspect: "Open details",
  "filter-sort-page": "Search, sort and paginate",
  "filter-sort": "Search and sort",
  "change-demo-stage": "Move a demo deal",
  "change-demo-task": "Complete or reopen a demo task",
  "search-local": "Search local content",
  "filter-local": "Filter local records",
  "undo-local": "Undo a local change",
  "validate-local": "Validate and save a local form",
  announce: "Show local feedback",
  "reset-local": "Reset a local example",
};
const choices = [
  {
    id: "crm-dashboard",
    label: "Sales CRM",
    description: "Contacts, deals and follow-ups",
    Icon: Users,
    brief:
      "Create a premium sales CRM with contacts, a pipeline with editable deal stages, activities and settings. Use a desktop sidebar and mobile bottom navigation with fictional data.",
  },
  {
    id: "hotel-dashboard",
    label: "Hotel Desk",
    description: "Bookings, rooms and operations",
    Icon: Building2,
    brief:
      "Create a calm hotel operations dashboard for occupancy, bookings, room readiness and preferences. Use fictional local data.",
  },
  {
    id: "hotel-marketing",
    label: "Hotel Marketing",
    description: "Editorial rooms, gallery and inquiry",
    Icon: Building2,
    brief: "Create a boutique hotel marketing website with editorial photography, room details, a gallery, FAQ and demo inquiry.",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    description: "Searchable guides and local feedback",
    Icon: BookOpen,
    brief: "Build a team handbook with a searchable knowledge base, editable reference guides and a local feedback form.",
  },
  {
    id: "operations-workspace",
    label: "Operations Workspace",
    description: "Task queue, workload and runbooks",
    Icon: ListChecks,
    brief: "Create a fictional operations workspace with workload totals, a task queue with complete and reopen actions, and team runbooks.",
  },
  {
    id: "blank-app",
    label: "Blank workspace",
    description: "One page to build on",
    Icon: Plus,
    brief:
      "Create a static business form in a blank workspace. Use a clearly labeled local field, visible keyboard focus and no animation.",
  },
] as const;
const messageFor = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The workspace could not complete the request.";
async function request<T>(
  path = "",
  method = "GET",
  value?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/build" + path, {
    method,
    signal,
    cache: "no-store",
    headers: {
      "X-MotionUX-Build": "1",
      ...(value !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(value !== undefined ? { body: JSON.stringify(value) } : {}),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.message ?? "The local workspace could not complete this action.",
    );
  return body;
}

function rememberProject(path: string) {
  window.history.replaceState(window.history.state, "", path);
  try { sessionStorage.setItem(projectPathKey, path); } catch { /* optional navigation memory */ }
  window.dispatchEvent(new Event("motionux:project"));
}

export function ComposerHome({
  Canvas,
  SourceCanvas,
  prepareCanvas,
}: {
  Canvas: ComponentType<CanvasProps>;
  SourceCanvas: ComponentType<Pick<CanvasProps, "initial" | "onBack">>;
  prepareCanvas: () => Promise<unknown>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [project, setProject] = useState<BuildProject>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<Review>();
  const [edits, setEdits] = useState<Edits>();
  const generation = useRef<{
    job: string;
    controller: AbortController;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const briefInput = useRef<HTMLTextAreaElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  const [preferred, setPreferred] = useState<string>();
  const sourceOperation = useSourceJob("home", async (id) => {
    openCanvas(await request<BuildProject>("/" + id));
  });

  function openCanvas(value: BuildProject) {
    setReview(undefined);
    setEdits(undefined);
    setError("");
    setProject(value);
    rememberProject("/build?project=" + value.id);
  }
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(location.search);
    const selected = params.get("project");
    setPreferred(params.get("source") ?? undefined);
    void (async () => {
      try {
        setRows(await request<Row[]>("", "GET", undefined, controller.signal));
        if (selected)
          openCanvas(
            await request<BuildProject>(
              "/" + encodeURIComponent(selected),
              "GET",
              undefined,
              controller.signal,
            ),
          );
      } catch (error) {
        if (!controller.signal.aborted) setError(messageFor(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
      generation.current?.controller.abort();
    };
  }, []);
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review?.job]);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  async function load(path: string, method = "GET", value?: unknown) {
    if (busy || generation.current) return;
    setBusy(true);
    setError("");
    try {
      const preloaded = method === "POST" ? prepareCanvas().catch(() => undefined) : undefined;
      const result = await request<BuildProject>(path, method, value);
      if (!result.document.sourceGraph) await preloaded;
      openCanvas(result);
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    const running = generation.current;
    if (!running) return;
    generation.current = null;
    running.controller.abort();
    setGenerating(false);
    setStatus("Generation cancelled. No project was created.");
    briefInput.current?.focus();
    await request("/compose/" + running.job, "DELETE").catch(() => {});
  }
  async function generate(event: FormEvent) {
    event.preventDefault();
    if (generation.current || busy) return;
    const job = crypto.randomUUID().replaceAll("-", "");
    const controller = new AbortController();
    generation.current = { job, controller };
    setGenerating(true);
    setError("");
    setStatus("Waiting for Codex to propose pages and blocks…");
    try {
      const value = await request<Review>(
        "/compose/generate",
        "POST",
        { job, brief },
        controller.signal,
      );
      if (generation.current?.job !== job) return;
      setReview(value);
      setEdits(editFor(value.plan));
      setStatus("Blueprint validated. Review it before creating an app.");
    } catch (error) {
      if (generation.current?.job !== job) return;
      setStatus("");
      setError(messageFor(error));
    } finally {
      if (generation.current?.job === job) {
        generation.current = null;
        setGenerating(false);
      }
    }
  }
  async function revise(event: FormEvent) {
    event.preventDefault();
    if (!review || busy || !edits) return;
    setError("");
    setBusy(true);
    try {
      const value = await request<Review>("/compose/review", "POST", {
        job: review.job,
        digest: review.plan.digest,
        edits,
      });
      setReview(value);
      setEdits(editFor(value.plan));
      setStatus("Changes validated. This revision is ready to create.");
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setBusy(false);
    }
  }
  function clearReview() {
    if (!review) return;
    setReview(undefined);
    setEdits(undefined);
    setError("");
    setStatus("");
    void request("/compose/" + review.job, "DELETE").catch(() => {});
    requestAnimationFrame(() => briefInput.current?.focus());
  }
  function reorder(route: string, delta: number) {
    if (!edits) return;
    const routes = [...edits.routes];
    const index = routes.indexOf(route);
    const next = index + delta;
    if (next < 1 || next >= routes.length) return;
    [routes[index], routes[next]] = [routes[next], routes[index]];
    setEdits({ ...edits, routes });
  }
  if (project?.document.sourceGraph)
    return <SourceCanvas key={project.id} initial={project} onBack={() => {
      setProject(undefined);
      rememberProject("/build");
      void request<Row[]>().then(setRows, (error) => setError(messageFor(error)));
    }} />;
  if (project)
    return (
      <Canvas
        key={project.id}
        initial={project}
        onBack={() => {
          setProject(undefined);
          rememberProject("/build");
          setLoading(true);
          void request<Row[]>()
            .then(setRows, (error) => setError(messageFor(error)))
            .finally(() => setLoading(false));
        }}
      />
    );
  const dirty =
    review &&
    edits &&
    JSON.stringify(editFor(review.plan)) !== JSON.stringify(edits);
  const visiblePages =
    review && edits
      ? [
          ...edits.routes.map(
            (route) => review.plan.pages.find((page) => page.route === route)!,
          ),
          ...review.plan.pages.filter(
            (page) => !edits.routes.includes(page.route),
          ),
        ]
      : [];
  return (
    <main className="project-dashboard compose-home">
      <div className="compose-width">
        {error && (
          <p className="build-error" ref={alertRef} tabIndex={-1} role="alert">
            {error}
          </p>
        )}
        {!review ? (
          <>
            <section className="compose-hero" aria-labelledby="compose-title">
              <div className="compose-intro">
                <span className="studio-overline">
                  <span className="compose-dot" /> MotionUX App Studio
                </span>
                <h1 id="compose-title">
                  Start with an idea.
                  <br />
                  Build something real.
                </h1>
                <p>
                  Describe how your app should work. Build searches your source catalog and opens the verified application in Studio.
                </p>
              </div>
              <form
                className="compose-form"
                method="post"
                action="/api/build/compose/generate"
                onSubmit={(event) => {
                  if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-mode") === "blueprint") {
                    void generate(event);
                  } else {
                    event.preventDefault();
                    void sourceOperation.start(brief, { preferred });
                  }
                }}
                aria-labelledby="brief-label"
              >
                <label id="brief-label" htmlFor="app-brief">
                  Describe your app
                </label>
                <textarea
                  ref={briefInput}
                  id="app-brief"
                  name="brief"
                  aria-describedby="brief-hint"
                  required
                  minLength={12}
                  maxLength={3200}
                  rows={4}
                  placeholder="A sales workspace with a clean contacts directory, a deal board and a mobile navigation bar…"
                  value={brief}
                  readOnly={generating || sourceOperation.active}
                  onChange={(event) => setBrief(event.target.value)}
                />
                <div className="compose-form-foot">
                  <span id="brief-hint">
                    <LockKeyhole size={14} /> Codex receives the brief and selected source excerpts with export rights. Use fictional data.
                  </span>
                  {generating ? (
                    <button
                      type="button"
                      className="build-button"
                      onClick={cancel}
                    >
                      Cancel
                    </button>
                  ) : (
                    <div className="b11-create-actions">
                      <button className="build-button accent" type="submit" disabled={busy || sourceOperation.active}><Sparkles size={16} /> Create app</button>
                      <button className="build-text-button" type="submit" data-mode="blueprint" disabled={busy || sourceOperation.active}>Generate blueprint</button>
                    </div>
                  )}
                </div>
                {preferred && <p>Selected source <strong>{preferred}</strong> <button type="button" className="build-text-button" onClick={() => setPreferred(undefined)}>Remove</button></p>}
                <SourceJobStatus operation={sourceOperation} />
              </form>
              <div className="compose-pills" aria-label="Example briefs">
                {choices.map(({ id, label, Icon, brief }) => (
                  <button
                    disabled={generating}
                    type="button"
                    key={id}
                    className="build-button"
                    onClick={() => {
                      setBrief(brief);
                      setError("");
                      briefInput.current?.focus();
                    }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
              <p className="compose-status" role="status">
                {status}
              </p>
            </section>
            <div className="compose-shelves">
              <section aria-labelledby="manual-title">
                <div className="compose-section-title">
                  <h2 id="manual-title">Start from a template</h2>
                  <p>Open the canvas directly. No Codex session needed.</p>
                </div>
                <div className="projects-list">
                  {choices.map(({ id, label, description, Icon }) => (
                    <button
                      className="project-row"
                      type="button"
                      aria-label={"New " + label}
                      disabled={busy || generating}
                      key={id}
                      onClick={() =>
                        void load("", "POST", {
                          template: id satisfies Template,
                        })
                      }
                    >
                      <span>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>New {label}</strong>
                        <small>{description}</small>
                      </div>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
              <section aria-labelledby="projects-title">
                <div className="compose-section-title">
                  <h2 id="projects-title">Your projects</h2>
                  <p>Stored on this computer and ready to reopen.</p>
                </div>
                <div className="projects-list" aria-busy={loading}>
                  {loading && <p role="status">Loading projects…</p>}
                  {!loading && !rows.length && (
                    <div className="projects-empty">
                      <LayoutTemplate size={23} />
                      <strong>No saved projects yet</strong>
                      <p>Blueprints become projects after you choose Create.</p>
                    </div>
                  )}
                  {rows.map((row) => (
                    <button
                      className="project-row"
                      type="button"
                      disabled={busy || generating}
                      key={row.id}
                      onClick={() =>
                        void load(
                          "/" + row.id + (row.error ? "/recover" : ""),
                          row.error ? "POST" : "GET",
                        )
                      }
                    >
                      <span>
                        <LayoutTemplate size={18} />
                      </span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>
                          {row.error
                            ? "Restore the last verified revision"
                            : "Revision " + row.revision}
                        </small>
                      </div>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          edits && (
            <>
              <header className="compose-review-head">
                <div>
                  <span className="studio-overline">
                    <Sparkles size={15} /> Codex proposal
                  </span>
                  <h1 ref={reviewHeading} id="review-title" tabIndex={-1}>
                    Review your blueprint
                  </h1>
                  <p>{review.plan.summary}</p>
                </div>
                <button
                  disabled={busy}
                  type="button"
                  onClick={clearReview}
                  className="build-button"
                >
                  <X size={16} /> Discard draft
                </button>
              </header>
              <div className="compose-review">
                <form
                  className="review-pages"
                  method="post"
                  action="/api/build/compose/review"
                  onSubmit={revise}
                  aria-label="Edit blueprint"
                >
                  <div className="compose-section-title">
                    <h2>Pages & navigation</h2>
                    <p>{review.plan.template === "hotel-marketing"
                      ? "Review the six linked pages and choose their order."
                      : "Choose pages and their order. Home is always first."}</p>
                  </div>
                  <label className="review-field">
                    App name{" "}
                    <input
                      name="appName"
                      value={edits.name}
                      maxLength={80}
                      required
                      onChange={(event) =>
                        setEdits({ ...edits, name: event.target.value })
                      }
                    />
                  </label>
                  <div className="review-options">
                    <label className="review-field">
                      Theme{" "}
                      <select
                        name="theme"
                        value={edits.theme}
                        onChange={(event) =>
                          setEdits({
                            ...edits,
                            theme: event.target.value === "system" ? "system" :
                              event.target.value === "dark" ? "dark" : "light",
                          })
                        }
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </label>
                    <label className="review-field">
                      Design preset
                      <select value={edits.preset} onChange={(event) => {
                        const preset = designPresets.find((value) => value === event.target.value) ?? "starter";
                        setEdits({ ...edits, preset });
                      }}>
                        <option value="starter">Starter appearance</option>
                        {designPresets.map((value) => <option key={value} value={value}>{presetDetails[value].name[review.plan.locale === "tr" ? 1 : 0]}</option>)}
                      </select>
                    </label>
                    {review.plan.template !== "hotel-marketing" && <label className="review-field">
                      Desktop navigation{" "}
                      <select
                        name="sidebar"
                        value={edits.sidebar}
                        onChange={(event) =>
                          setEdits({
                            ...edits,
                            sidebar:
                              event.target.value === "rail"
                                ? "rail"
                                : "expanded",
                          })
                        }
                      >
                        <option value="expanded">Full sidebar</option>
                        <option value="rail">Icon rail</option>
                      </select>
                    </label>}
                  </div>
                  <ol className="review-route-list">
                    {visiblePages.map((page) => {
                      const index = edits.routes.indexOf(page.route);
                      return (
                        <li key={page.route} data-included={index >= 0}>
                          <div className="review-route-line">
                            <label>
                              <input
                                type="checkbox"
                                name="includedPage"
                                value={page.route}
                                checked={index >= 0}
                                disabled={busy || page.route === "/" || review.plan.template === "hotel-marketing"}
                                onChange={(event) =>
                                  setEdits({
                                    ...edits,
                                    routes: event.target.checked
                                      ? [...edits.routes, page.route]
                                      : edits.routes.filter(
                                          (route) => route !== page.route,
                                        ),
                                  })
                                }
                              />{" "}
                              <strong>{page.label}</strong>
                            </label>
                            <code>{page.route}</code>
                            {index >= 1 && (
                              <div className="review-route-actions">
                                <button
                                  disabled={busy || index <= 1}
                                  className="build-button"
                                  type="button"
                                  onClick={() => reorder(page.route, -1)}
                                  aria-label={"Move " + page.label + " earlier"}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  disabled={
                                    busy || index >= edits.routes.length - 1
                                  }
                                  className="build-button"
                                  type="button"
                                  onClick={() => reorder(page.route, 1)}
                                  aria-label={"Move " + page.label + " later"}
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p>{page.purpose}</p>
                          {page.addedSection && <p>{sectionRecipeNames[page.addedSection][review.plan.locale === "tr" ? 1 : 0]}</p>}
                          <details>
                            <summary>
                              {page.blocks.length}{" "}
                              {page.blocks.length === 1 ? "block" : "blocks"}
                            </summary>
                            <ul>
                              {page.blocks.map((block) => (
                                <li key={block.id}>
                                  <strong>{block.label}</strong>
                                  <span>{block.reason}</span>
                                  {block.actions.length > 0 && (
                                    <small>
                                      Verified actions:{" "}
                                      {block.actions
                                        .map((action) => actionLabels[action])
                                        .join(" · ")}
                                    </small>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </details>
                        </li>
                      );
                    })}
                  </ol>
                  <button
                    type="submit"
                    className="build-button"
                    disabled={busy || !dirty}
                  >
                    Validate changes
                  </button>
                </form>
                <aside
                  className="review-evidence"
                  aria-label="Blueprint readiness"
                >
                  <span className="compose-badge">
                    {dirty ? "Changes to validate" : "Ready to create"}
                  </span>
                  <h2>What you’re building</h2>
                  <dl>
                    <dt>Data</dt>
                    <dd>
                      {review.plan.template === "blank-app"
                        ? "Local form only"
                        : "Fictional demo records"}
                    </dd>
                    <dt>Responsive</dt>
                    <dd>{review.plan.template === "hotel-marketing" ? "Responsive website header and footer" : "Desktop sidebar · mobile bottom navigation"}</dd>
                    <dt>Motion</dt>
                    <dd>
                      {review.plan.motion === "none"
                        ? "No animation"
                        : "System preference"}
                    </dd>
                    <dt>Rights</dt>
                    <dd>MotionUX-owned blocks · MIT</dd>
                  </dl>
                  {review.plan.limitations.length > 0 && (
                    <div className="review-limits">
                      <strong>Outside this app</strong>
                      <ul>
                        {review.plan.limitations.map((limit) => (
                          <li key={limit}>{limit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p>
                    Review revision{" "}
                    <code>{review.plan.digest.slice(0, 12)}</code>
                  </p>
                  <button
                    className="build-button accent"
                    type="button"
                    disabled={busy || Boolean(dirty)}
                    onClick={() =>
                      void load("/compose/create", "POST", {
                        job: review.job,
                        digest: review.plan.digest,
                      })
                    }
                  >
                    Create App in MotionUX <ArrowRight size={16} />
                  </button>
                  <p>A new local project. No existing project is replaced.</p>
                </aside>
              </div>
              <p className="compose-status" role="status">
                {status}
              </p>
            </>
          )
        )}
      </div>
    </main>
  );
}
