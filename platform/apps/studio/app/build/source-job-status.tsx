"use client";

import { AlertCircle, Check, Circle, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { useSourceJob } from "./source-job";

const steps = [
  ["analyzing", "Brief"],
  ["selecting", "Sources"],
  ["composing", "Compose"],
  ["building", "Build"],
  ["verifying", "Verify"],
];

export function SourceJobStatus({ operation }: { operation: ReturnType<typeof useSourceJob> }) {
  const { job, active, starting, error, cancel, retry, reconnecting } = operation;
  const panel = useRef<HTMLElement>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    function tick() { setNow(Date.now()); }
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [active]);
  useEffect(() => {
    if (starting) panel.current?.scrollIntoView({ block: "nearest" });
  }, [starting]);

  if (active) {
    const step = starting ? 0 : Math.max(0, steps.findIndex(([status]) => status === job?.status));
    const elapsed = starting || !job?.started ? 0 : Math.max(0, Math.floor((now - job.started) / 1000));
    const clock = Math.floor(elapsed / 60) + ":" + String(elapsed % 60).padStart(2, "0");
    const repair = starting ? 0 : job?.repairAttempt ?? 0;
    return <section className="source-progress" ref={panel} aria-label="App generation progress">
      <div className="source-progress-main">
        <div className="source-progress-orbit" aria-hidden="true"><Sparkles size={23} /></div>
        <div role="status">
          <h2>{repair ? "Refining your app" : "Creating your app"}</h2>
          <p>{reconnecting ? "Reconnecting to your generation…" : starting ? "Opening a local Build workspace" : job?.message}</p>
        </div>
        <time aria-hidden="true" dateTime={`PT${elapsed}S`}>{clock}</time>
      </div>
      <ol aria-label="Build stages" className="source-progress-steps">
        {steps.map(([status, title], index) => <li key={status} aria-current={index === step ? "step" : undefined} data-complete={index < step}>
          {index < step ? <Check size={14} aria-label="Complete" /> : index === step ? <LoaderCircle size={14} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}
          {title}
        </li>)}
      </ol>
      <div className="source-progress-actions">
        <span>{repair ? `Checking fixes · attempt ${repair} of 2` : "Your app opens after the browser checks."}</span>
        <button type="button" className="build-button" onClick={() => void cancel()} disabled={starting}>Cancel generation</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>;
  }

  if (!job && !error) return null;
  const failed = job?.status === "failed";
  const canRetry = (failed || job?.status === "cancelled") && Boolean(job?.attempts?.length);
  const detail = error || job?.message;
  const title = failed
    ? job.message.startsWith("Accessibility at ") ? "Build found an accessibility issue" : "Build couldn’t finish this app"
    : error ? "Build couldn’t complete this action" : job?.status === "ready" ? "Your app is ready" : "Generation cancelled";
  return <section className="source-job-status">
    <div className="source-job-summary" role={failed || error ? "alert" : "status"}>
      {failed || error ? <AlertCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
      <div>
        <h2>{title}</h2>
        {failed && <p>{canRetry ? "Your brief, components and generated draft are available to retry." : "Your brief and components are available for a new attempt."}</p>}
      </div>
    </div>
    {job?.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
    {(failed || error) && detail && <details className="source-job-diagnostics">
      <summary>Technical details</summary><p>{detail}</p>
    </details>}
    {canRetry && <button type="button" className="build-button" onClick={() => void retry()}><RotateCcw size={15} aria-hidden="true" /> Retry generated application</button>}
  </section>;
}
