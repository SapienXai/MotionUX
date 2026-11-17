"use client";

import { useEffect, useRef, useState } from "react";
import { sourceRequest } from "../source-job";

type Source = { id: string; slug: string; title: string; provider: string; pin: string };

function LocalPreview({ source }: { source: Source }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source === frame.current?.contentWindow && event.origin === "null" &&
        event.data?.motionuxLocalSource === "ready") setStatus("ready");
    }
    window.addEventListener("message", receive);
    const timer = setTimeout(() => setStatus((current) => current === "loading" ? "failed" : current), 12_000);
    return () => {
      window.removeEventListener("message", receive);
      clearTimeout(timer);
    };
  }, [attempt]);
  const params = new URLSearchParams({ item: source.slug, pin: source.pin });
  return <section aria-label="Local source preview">
    <div className="build-local-status">
      <p role="status">{status === "loading" ? "Loading local source…" : status === "ready" ? "Ready to interact" : "Preview unavailable. Check that MotionUX Gallery is running."}</p>
      {status === "failed" && <button className="build-button" onClick={() => { setStatus("loading"); setAttempt(attempt + 1); }}>Retry preview</button>}
    </div>
    {status !== "failed" && <iframe key={attempt} ref={frame} title={source.title + " local preview"}
      className="build-local-preview" sandbox="allow-scripts" referrerPolicy="no-referrer" allow="fullscreen 'none'"
      src={"http://127.0.0.1:5199/v10/build-preview/" + encodeURIComponent(source.id) + "?" + params} />}
  </section>;
}

export default function LocalSourcesPage() {
  const [sources, setSources] = useState<Source[]>();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const id = new URLSearchParams(location.search).get("source");
    void sourceRequest<Source[]>("/source-jobs/local", "GET", undefined, controller.signal).then((rows) => {
      setSources(rows);
      if (rows.some((row) => row.id === id)) setSelected(id!);
    }, (error: Error) => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, []);
  const matches = sources?.filter(({ title, provider }) => (title + " " + provider).toLowerCase().includes(filter.trim().toLowerCase()));
  const source = sources?.find(({ id }) => id === selected);
  return <main className="project-dashboard compose-home">
    <div className="compose-width">
      <section className="compose-hero build-local-sources" aria-labelledby="local-sources-title">
        <div className="compose-intro">
          <a className="build-text-button" href="/build">Back to Build</a>
          <h1 id="local-sources-title">Local sources</h1>
          <p>Try originals from your local library or use one in Create app. Projects with local sources can open in Run. Their exports are disabled.</p>
        </div>
        {error && <p role="alert">{error}</p>}
        {!error && !sources && <p role="status">Loading local catalog…</p>}
        {sources && <div className="build-local-filters">
          <label>Filter sources<input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
          <label>Source<select value={matches?.some(({ id }) => id === selected) ? selected : ""} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Choose a source</option>
            {matches?.map(({ title, provider, id }) => <option key={id} value={id}>{title} · {provider}</option>)}
          </select></label>
          <p role="status">{matches?.length} local sources</p>
        </div>}
        {source && <>
          <a className="build-text-button" href={"/build?local=1&source=" + encodeURIComponent(source.id)}>Use in Create app</a>
          <LocalPreview key={source.id} source={source} />
        </>}
      </section>
    </div>
  </main>;
}
