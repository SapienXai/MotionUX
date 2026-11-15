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
};

export type OriginalCard = Pick<Original, "id" | "slug" | "group" | "provider" | "title" | "category" | "format" | "height" | "demoURL" | "sourceURL" | "upstreamCommit" | "upstreamHash" | "fidelityStatus" |
  "sourceKind" | "installed" | "availability" | "legacyId" | "tags" | "preview" | "visualAcceptance">;
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
  const [retry, setRetry] = useState(0);
  const [stage, setStage] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (stage !== "loading") return;
    const timer = setTimeout(() => setStage("failed"), 12000);
    const check = setInterval(() => {
      const document = frame.current?.contentDocument;
      if (document?.documentElement.dataset.previewLoaded === "true" ||
        document?.querySelector("#specimen > *, .command > *, #root > iframe")) setStage("ready");
      else if (document?.querySelector("#root > [role=alert]")) setStage("failed");
    }, 80);
    return () => { clearTimeout(timer); clearInterval(check); };
  }, [retry, stage]);
  return <div className="mx-original-frame" data-preview-lane={lane} data-preview-state={stage}>
    {stage !== "failed" && <iframe key={retry} ref={frame} title={label} src={src} referrerPolicy="no-referrer"
      sandbox={entry.sourceKind === "html" && lane === "original" ? "allow-scripts" : undefined}
      onLoad={() => {
        if (entry.sourceKind === "html" && lane === "original") setStage("ready");
        else if (lane === "studio" && frame.current?.contentDocument?.readyState === "complete" &&
          !frame.current?.contentDocument?.documentElement.dataset.studioPreview) setStage("failed");
      }} />}
    {stage === "loading" && <span className="mx-frame-status" aria-hidden="true">Loading preview…</span>}
    {stage === "failed" && <div className="mx-frame-status mx-frame-error">
      <p role="status">Preview unavailable</p>
      <button className="mx-button" type="button" onClick={() => { setRetry(retry + 1); setStage("loading"); }}>Retry</button>
      <a href={entry.demoURL} target="_blank" rel="noreferrer">Original demo</a>
    </div>}
  </div>;
}
