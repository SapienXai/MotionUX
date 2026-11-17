"use client";

import { useEffect, useEffectEvent, useState } from "react";

type Job = { id: string; status: string; message: string; project?: string; warnings?: string[]; attempts?: unknown[] };
const terminal = new Set(["failed", "cancelled", "ready"]);

export async function sourceRequest<T>(path: string, method = "GET", value?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/build" + path, {
    method, signal, cache: "no-store",
    headers: { "X-MotionUX-Build": "1", ...(value !== undefined && { "Content-Type": "application/json" }) },
    ...(value !== undefined && { body: JSON.stringify(value) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "The local workspace could not complete this action.");
  return result;
}

export function useSourceJob(scope: string, onReady: (projectId: string) => Promise<void>) {
  const [job, setJob] = useState<Job>();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const key = "motionux:source-job:" + scope;
  const complete = useEffectEvent(onReady);
  const active = starting || Boolean(job && !terminal.has(job.status));

  useEffect(() => {
    const controller = new AbortController();
    let id: string | null = null;
    try { id = sessionStorage.getItem(key); } catch { /* Optional resume hint. */ }
    if (id) void sourceRequest<Job>("/source-jobs/" + id, "GET", undefined, controller.signal)
      .then(setJob, () => {});
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    if (!job) return;
    const controller = new AbortController();
    if (terminal.has(job.status)) {
      if (job.status === "ready") {
        try { sessionStorage.removeItem(key); } catch { /* Optional resume hint. */ }
      }
      if (job.status === "ready" && job.project)
        void complete(job.project).catch((error: Error) => setError(error.message));
      return;
    }
    const timer = window.setTimeout(() => {
      void sourceRequest<Job>("/source-jobs/" + job.id, "GET", undefined, controller.signal)
        .then(setJob, (error: Error) => { if (!controller.signal.aborted) setError(error.message); });
    }, 700);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [job, key]);

  async function start(brief: string, options: { preferred?: string; project?: string; revision?: number } = {}) {
    if (active) return;
    setError("");
    setStarting(true);
    try {
      const result = await sourceRequest<Job>("/source-jobs/start", "POST", { brief, ...options });
      try { sessionStorage.setItem(key, result.id); } catch { /* Optional resume hint. */ }
      setJob(result);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function cancel() {
    if (!job || !active) return;
    try { setJob(await sourceRequest<Job>("/source-jobs/" + job.id, "DELETE")); }
    catch (error) { setError((error as Error).message); }
  }
  async function retry() {
    if (!job || active) return;
    setStarting(true); setError("");
    try {
      const result = await sourceRequest<Job>("/source-jobs/" + job.id + "/retry", "POST");
      try { sessionStorage.setItem(key, result.id); } catch { /* Optional resume hint. */ }
      setJob(result);
    } catch (error) { setError((error as Error).message); }
    finally { setStarting(false); }
  }
  return { active, start, cancel, retry, starting, job, error };
}

export function SourceJobStatus({ operation }: { operation: ReturnType<typeof useSourceJob> }) {
  const { job, active, starting, error, cancel, retry } = operation;
  if (!job && !active && !error) return null;
  return <div className="source-job-status">
    <p role={job?.status === "failed" || error ? "alert" : "status"}>
      {error || job?.message || "Starting source generation"}
    </p>
    {job?.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
    {!active && job && ["failed", "cancelled"].includes(job.status) && Boolean(job.attempts?.length) &&
      <button type="button" className="build-button" onClick={() => void retry()}>Retry generated application</button>}
    {active && <button type="button" className="build-button" onClick={() => void cancel()} disabled={starting}>Cancel generation</button>}
  </div>;
}
