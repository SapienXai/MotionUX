import { useEffect, useRef, useState } from "react";

export type Original = {
  id: string; slug: string; group: string; provider: string; title: string; category: string;
  repo?: string; upstreamCommit?: string; upstreamHash: string; demoURL: string; sourceURL: string;
  licenseNoticePath?: string; sourceMethod: string; sourceAvailability: string; fidelityStatus: string;
  scenes: string[]; usage: string; entry: string;
  installURL: string; format?: "html"; height?: number;
  codeFiles: { path: string; sha256: string }[];
  sourceKind: "react" | "html"; installed: boolean; availability: "ready" | "unavailable"; legacyId?: string;
  dependencies: Record<string, string>; assets: { path: string; sourceURL: string; sha256: string }[]; notice?: string; visualAcceptance: "pending";
  tags: string[]; preview: { height: number; rank?: number };
  editionOrdinal: number; addedSequence: number; renderCost?: "standard" | "heavy";
};

export type OriginalCard = Pick<Original, "id" | "slug" | "group" | "provider" | "title" | "category" | "format" | "height" | "demoURL" | "sourceURL" | "upstreamCommit" | "upstreamHash" | "fidelityStatus" |
  "sourceKind" | "installed" | "availability" | "legacyId" | "tags" | "preview" | "visualAcceptance" | "editionOrdinal" | "addedSequence" | "renderCost">;
const empty = new Map<string, OriginalCard>();

export const localStudio = document.documentElement.dataset.originalSources === "local";

export function useLocalSources() {
  const [catalog, setCatalog] = useState<{ originals: Map<string, OriginalCard>; loading: boolean; failed?: boolean }>(() => ({
    originals: empty, loading: localStudio,
  }));
  useEffect(() => {
    if (!localStudio) return;
    const controller = new AbortController();
    fetch("/v9/catalog.json", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Local source workspace unavailable");
        return response.json() as Promise<OriginalCard[]>;
      })
      .then(items => setCatalog({ originals: new Map(items.map(item => [item.id, item])), loading: false }), () => {
        if (!controller.signal.aborted) setCatalog({ originals: empty, loading: false, failed: true });
      });
    return () => controller.abort();
  }, []);
  return catalog;
}

export type SourceLane = "original" | "studio" | "installed";

export function sourceFrameURL(entry: OriginalCard, lane: SourceLane, scheme: "light" | "dark", scene?: string) {
  const build = lane === "installed" ? "installed" : "original";
  if (entry.format === "html" && lane === "original") return `/v9/live/${entry.group}/original/${entry.slug}.html`;
  const query = new URLSearchParams({ item: entry.slug, scheme });
  if (scene) query.set("scene", scene);
  if (lane === "studio") return `/v10/preview/${encodeURIComponent(entry.id)}?${query}`;
  return `/v9/live/${entry.group}/${build}/?${query}`;
}

export function SourceFrame({ entry, lane, scheme, scene, label }: {
  entry: OriginalCard; lane: SourceLane; scheme: "light" | "dark"; scene?: string; label: string;
}) {
  const src = sourceFrameURL(entry, lane, scheme, scene);
  return <LiveFrame key={src} entry={entry} lane={lane} src={src} label={label} />;
}

function LiveFrame({ entry, lane, src, label }: { entry: OriginalCard; lane: SourceLane; src: string; label: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const gesture = useRef<AbortController | undefined>(undefined);
  const isolated = entry.editionOrdinal >= 13;
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [stage, setStage] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (stage !== "loading") return;
    const timer = setTimeout(() => setStage("failed"), 12000);
    const waiting = setTimeout(() => setSlow(true), 900);
    const check = isolated ? undefined : setInterval(probe, 38);
    return () => { clearTimeout(timer); clearTimeout(waiting); clearInterval(check); };
  }, [isolated, retry, stage]);
  useEffect(() => {
    if (!isolated) return;
    function receive(event: MessageEvent) {
      if (event.origin !== "null" || event.source !== frame.current?.contentWindow) return;
      const state = event.data?.motionuxPreview;
      if (state === "ready" || state === "failed") setStage(state);
      if ((state === "engaged" || state === "released") && lane === "studio") {
        const wrapper = frame.current?.parentElement;
        if (!wrapper?.closest("[data-original-stage]")) return;
        wrapper.dataset.previewGesture = String(state === "engaged");
        window.dispatchEvent(new Event("mx-preview-interaction"));
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [isolated, lane]);
  useEffect(() => () => gesture.current?.abort(), []);
  function probe() {
    const document = frame.current?.contentDocument;
    if (document?.documentElement?.dataset.previewLoaded === "true" ||
      document?.querySelector("#specimen > *, .command > *, #root > iframe")) setStage("ready");
    else if (document?.querySelector("#root > [role=alert]")) setStage("failed");
  }
  function watchGestures() {
    gesture.current?.abort();
    const document = frame.current?.contentDocument;
    const stage = frame.current?.parentElement;
    if (!document || !stage || lane !== "studio" || !stage.closest("[data-original-stage]")) return;
    const controller = new AbortController();
    gesture.current = controller;
    const mark = (active: boolean) => {
      stage.dataset.previewGesture = active ? "true" : "false";
      window.dispatchEvent(new Event("mx-preview-interaction"));
    };
    document.addEventListener("pointerdown", () => mark(true), { capture: true, signal: controller.signal });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      document.addEventListener(name, () => mark(false), { capture: true, signal: controller.signal });
    }
    document.defaultView?.addEventListener("blur", () => mark(false), { signal: controller.signal });
  }
  return <div className="mx-original-frame" data-preview-lane={lane} data-preview-state={stage}>
    {stage !== "failed" && <iframe key={retry} ref={frame} title={label} src={src} referrerPolicy="no-referrer"
      sandbox={isolated || entry.sourceKind === "html" && lane === "original" ? "allow-scripts" : undefined}
      onLoad={() => {
        if (isolated) return;
        if (entry.sourceKind === "html" && lane === "original") setStage("ready");
        else if (lane === "studio" && frame.current?.contentDocument?.readyState === "complete" &&
          !frame.current?.contentDocument?.documentElement?.dataset.studioPreview) setStage("failed");
        else { probe(); watchGestures(); }
      }} />}
    {stage === "loading" && <div className="mx-frame-status mx-frame-loading" aria-hidden="true">
      {slow && <span>Preview is taking longer to load…</span>}
    </div>}
    {stage === "failed" && <div className="mx-frame-status mx-frame-error">
      <p role="status">Preview unavailable</p>
      <button className="mx-button" type="button" onClick={() => { setRetry(retry + 1); setStage("loading"); setSlow(false); }}>Retry</button>
      <a href={entry.demoURL} target="_blank" rel="noreferrer">Original demo</a>
    </div>}
  </div>;
}
