"use client";

import type { InspectionReport } from "@motionux/build-core/inspection";
import { ScanLine } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

const labels = {
  layout: "Layout",
  accessibility: "Accessibility",
  interaction: "Interaction",
};

export function RuntimeInspector({
  pages,
  route,
  revision,
  disabled,
  inspect,
}: {
  pages: { route: string; title: string }[];
  route: string;
  revision: number;
  disabled: boolean;
  inspect: (route: string, signal: AbortSignal) => Promise<InspectionReport>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef<AbortController>(null);
  const [selected, setSelected] = useState(route);
  const [report, setReport] = useState<InspectionReport>();
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const total = report?.viewports.reduce(
    (sum, view) => sum + view.findings.length,
    0,
  );
  const review = report?.viewports.reduce(
    (sum, view) => sum + view.manualReview.length,
    0,
  );

  useEffect(() => () => active.current?.abort(), []);

  function close() {
    active.current?.abort();
    active.current = null;
    setRunning(false);
  }

  async function scan(event: FormEvent) {
    event.preventDefault();
    if (active.current || disabled) return;
    const controller = new AbortController();
    active.current = controller;
    setRunning(true);
    setError("");
    setReport(undefined);
    try {
      const next = await inspect(selected, controller.signal);
      if (!controller.signal.aborted) setReport(next);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Inspection could not finish.",
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setRunning(false);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={
          disabled ? "Save and run the new revision to inspect it" : undefined
        }
        onClick={() => {
          if (!report || !pages.some((page) => page.route === selected))
            setSelected(route);
          setError("");
          dialog.current?.showModal();
        }}
      >
        <ScanLine size={14} aria-hidden="true" /> Inspector
      </button>
      <dialog
        className="build-dialog build-runtime-inspector"
        aria-labelledby="build-inspection-title"
        ref={dialog}
        onClose={close}
      >
        <h2 id="build-inspection-title">Inspector</h2>
        <p className="build-inspection-meta">
          Saved revision {revision} · Chromium · 3 viewport sizes
        </p>
        <form onSubmit={scan}>
          <label>
            Page to inspect
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setReport(undefined);
                setError("");
              }}
              disabled={running}
              autoFocus
            >
              {pages.map((page) => (
                <option key={page.route} value={page.route}>
                  {page.title} ({page.route})
                </option>
              ))}
            </select>
          </label>
          <div>
            <button
              type="button"
              className="build-button"
              onClick={() => dialog.current?.close()}
            >
              {running ? "Cancel" : "Close"}
            </button>
            <button
              type="submit"
              className="build-button accent"
              disabled={running || disabled}
            >
              Inspect page
            </button>
          </div>
        </form>
        <p
          className={error ? undefined : "build-inspection-meta"}
          role="status"
        >
          {error ||
            (running
              ? "Checking layout, accessibility and page search…"
              : report &&
                (total
                  ? `${total} findings across ${report.viewports.length} viewports.`
                  : "No automated findings.") +
                  (review ? " Manual review needed." : ""))}
        </p>
        {report && (
          <div className="build-inspection-results">
            <p className="build-inspection-meta">
              <code>{report.route}</code> ·{" "}
              {(report.durationMs / 1000).toFixed(1)} s · reduced motion
            </p>
            {report.viewports.map((view) => (
              <details
                key={view.width}
                open={Boolean(view.findings.length || view.manualReview.length)}
              >
                <summary>
                  <strong>
                    {view.width} × {view.height}
                  </strong>
                  <span>
                    {view.touch ? "Touch" : "Pointer"} · {view.findings.length}{" "}
                    findings{view.manualReview.length ? " · Needs review" : ""}
                  </span>
                </summary>
                {view.findings.length > 0 ? (
                  <ul>
                    {view.findings.map((finding) => (
                      <li key={finding.category + "/" + finding.rule}>
                        <span>
                          {labels[finding.category]}
                          {finding.impact ? " · " + finding.impact : ""}
                        </span>
                        <strong>{finding.summary}</strong>
                        <code>{finding.evidence}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="build-inspection-meta">
                    Layout, axe and page search checks completed.
                  </p>
                )}
                {view.manualReview.length > 0 && (
                  <ul>
                    {view.manualReview.map((item) => (
                      <li key={item.rule}>
                        <span>Manual review</span>
                        <strong>{item.rule}</strong>
                        <code>{item.evidence}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        )}
      </dialog>
    </>
  );
}
