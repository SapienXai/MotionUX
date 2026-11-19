"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { BuildProject } from "@motionux/build-core";
export { SourceJobStatus } from "./source-job-status";

type SourceInput = { brief: string; preferred?: string; includeLocal?: boolean; kit?: string[]; project?: string; revision?: number };
type Job = {
  id: string; status: string; message: string; project?: string; warnings?: string[];
  attempts?: unknown[]; started: number; updated: number; repairAttempt?: number; request?: SourceInput;
};
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

export async function restoreSourceRevision(current: BuildProject) {
  const path = "/" + current.id;
  const previous = await sourceRequest<BuildProject>(path + "/previous");
  if (previous.revision >= current.revision ||
      Boolean(previous.document.codeProject) !== Boolean(current.document.codeProject) ||
      Boolean(previous.document.sourceGraph) !== Boolean(current.document.sourceGraph))
    throw new Error("The previous revision does not match this workspace. Reopen the project.");
  return sourceRequest<BuildProject>(path, "PUT", { ...current, document: previous.document });
}

export async function openSavedPreview<T extends { status: string; id?: string; revision?: number }>(project: string, revision: number) {
  const current = await sourceRequest<T>("/preview");
  if (current.id === project && current.revision === revision &&
    ["ready", "building", "starting"].includes(current.status)) return current;
  if (current.status !== "idle" && current.id !== project)
    throw new Error("Another project has an active preview. Stop it before previewing this project.");
  if (current.status !== "idle") await sourceRequest("/preview", "DELETE");
  return sourceRequest<T>("/" + project + "/preview", "POST", { revision });
}

export function useSourceJob(scope: string, onReady: (projectId: string) => Promise<void>, onResume?: (request: SourceInput) => void | false) {
  const [job, setJob] = useState<Job>();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const key = "motionux:source-job:" + scope;
  const complete = useEffectEvent(onReady);
  const resume = useEffectEvent((request: SourceInput) => onResume?.(request));
  const liveId = job && !terminal.has(job.status) ? job.id : undefined;
  const readyProject = job?.status === "ready" ? job.project : undefined;
  const active = starting || Boolean(liveId);

  useEffect(() => {
    const controller = new AbortController();
    let id: string | null = null;
    try { id = sessionStorage.getItem(key); } catch { /* Optional resume hint. */ }
    if (id) void sourceRequest<Job>("/source-jobs/" + id, "GET", undefined, controller.signal)
      .then((current) => {
        if (controller.signal.aborted) return;
        if (current.request && resume(current.request) === false && terminal.has(current.status)) return;
        setJob(current);
      }, () => {});
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    if (!readyProject) return;
    try { sessionStorage.removeItem(key); } catch { /* Optional resume hint. */ }
    void complete(readyProject).catch((error: Error) => setError(error.message));
  }, [readyProject, key]);

  useEffect(() => {
    if (!liveId) return;
    const controller = new AbortController();
    async function poll() {
      try {
        const current = await sourceRequest<Job>("/source-jobs/" + liveId, "GET", undefined, controller.signal);
        if (controller.signal.aborted) return;
        setReconnecting(false);
        setJob((latest) => latest?.id === current.id && !terminal.has(latest.status) && current.updated >= latest.updated ? current : latest);
        if (!terminal.has(current.status)) timer = window.setTimeout(poll, 700);
      } catch {
        if (controller.signal.aborted) return;
        setReconnecting(true);
        timer = window.setTimeout(poll, 2000);
      }
    }
    let timer = window.setTimeout(poll, 700);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [liveId]);

  async function start(brief: string, options: { preferred?: string; includeLocal?: boolean; kit?: string[]; project?: string; revision?: number } = {}) {
    if (active) return;
    setError("");
    setReconnecting(false);
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
    setReconnecting(false);
    try {
      const result = await sourceRequest<Job>("/source-jobs/" + job.id + "/retry", "POST");
      try { sessionStorage.setItem(key, result.id); } catch { /* Optional resume hint. */ }
      setJob(result);
    } catch (error) { setError((error as Error).message); }
    finally { setStarting(false); }
  }
  return { active, start, cancel, retry, starting, job, error, reconnecting: Boolean(liveId) && reconnecting };
}
