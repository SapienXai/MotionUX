import { useEffect, useState } from "react";

export type Original = {
  id: string; slug: string; group: string; provider: string; title: string; category: string;
  repo?: string; upstreamCommit?: string; upstreamHash: string; demoURL: string; sourceURL: string;
  licenseNoticePath?: string; sourceMethod: string; sourceAvailability: string; fidelityStatus: string;
  scenes: string[]; usage: string; entry: string;
  installURL: string; format?: "html"; height?: number;
  codeFiles: { path: string; sha256: string }[];
};

const empty = new Map<string, Original>();

export function useLocalSources() {
  const [originals, setOriginals] = useState(empty);
  useEffect(() => {
    if (document.documentElement.dataset.originalSources !== "local") return;
    const controller = new AbortController();
    fetch("/v9/catalog.json", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Local source workspace unavailable");
        return response.json() as Promise<Original[]>;
      })
      .then(items => setOriginals(new Map(items.map(item => [item.id, item]))), () => {});
    return () => controller.abort();
  }, []);
  return originals;
}

export type SourceLane = "original" | "adapter" | "installed";

export function sourceFrameURL(entry: Original, lane: SourceLane, scheme: "light" | "dark", scene?: string) {
  const build = lane === "installed" ? "installed" : "original";
  if (entry.format === "html" && build === "original") return `/v9/live/${entry.group}/original/${entry.slug}.html`;
  const query = new URLSearchParams({ item: entry.slug, scheme });
  if (scene) query.set("scene", scene);
  return `/v9/live/${entry.group}/${build}/?${query}`;
}

export function SourceFrame({ entry, lane, scheme, scene, label, fill = false }: {
  entry: Original; lane: SourceLane; scheme: "light" | "dark"; scene?: string; label: string; fill?: boolean;
}) {
  return <iframe
    title={label}
    className="mx-source-frame"
    sandbox={entry.format === "html" && lane !== "installed" ? "allow-scripts" : undefined}
    src={sourceFrameURL(entry, lane, scheme, scene)}
    loading="lazy"
    referrerPolicy="no-referrer"
    style={{ display: "block", inlineSize: "100%", blockSize: fill ? "100%" : `${entry.height ?? 360}px`, border: 0 }}
  />;
}
