import { ArrowRight, Check, Layers3, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buildSelectionLimit, buildSourceIds, studioOrigin } from "../../lib/studio-bridge";
import type { OriginalCard } from "./local";

type Mode = "direct" | "connected";

export function useGalleryBuildSelection(embedded: boolean) {
  const [modes, setModes] = useState<ReadonlyMap<string, Mode>>();
  const [ids, setIds] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  function send(message: object) {
    window.parent.postMessage(message, studioOrigin);
  }
  function load() {
    setFailed(false);
    send({ type: "motionux:build-catalog-request" });
  }
  useEffect(() => {
    if (!embedded) return;
    function receive(event: MessageEvent) {
      if (event.origin !== studioOrigin || event.source !== window.parent) return;
      if (event.data?.type === "motionux:build-catalog-unavailable") setFailed(true);
      if (event.data?.type !== "motionux:build-catalog" || !Array.isArray(event.data.entries)) return;
      const entries = new Map<string, Mode>(event.data.entries);
      setModes(entries);
      setIds((buildSourceIds(event.data.selected) ?? []).filter((id) => entries.has(id)));
    }
    window.addEventListener("message", receive);
    load();
    return () => window.removeEventListener("message", receive);
  }, [embedded]);

  function toggle(id: string) {
    if (!modes?.has(id)) return;
    setIds((previous) => previous.includes(id) ? previous.filter((value) => value !== id) :
      previous.length < buildSelectionLimit ? [...previous, id] : previous);
  }
  return { embedded, modes, ids, failed, load, toggle,
    openBuild: () => send({ type: "motionux:build-selection", ids }) };
}

export type GalleryBuildSelection = ReturnType<typeof useGalleryBuildSelection>;

export function BuildPickButton({ entry, selection }: { entry: OriginalCard; selection: GalleryBuildSelection }) {
  if (!selection.modes || entry.availability !== "ready") return null;
  const selected = selection.ids.includes(entry.id);
  const mode = selection.modes.get(entry.id);
  if (!mode) return <span className="mx-build-reference" title="This component can be used as a design reference from Build.">Reference only</span>;
  const Icon = selected ? Check : Plus;
  return <button type="button" className="mx-build-pick" aria-pressed={selected}
    aria-label={`Use in Build: ${entry.title}${mode === "connected" ? " (local only)" : ""}`}
    disabled={!selected && selection.ids.length >= buildSelectionLimit}
    onClick={() => selection.toggle(entry.id)}>
    <Icon size={14} aria-hidden="true" /> Use in Build
    {mode === "connected" && <small aria-hidden="true">Local</small>}
  </button>;
}

export function BuildSelectionTray({ originals, selection }: {
  originals: ReadonlyMap<string, OriginalCard>; selection: GalleryBuildSelection;
}) {
  const { embedded, modes, ids, failed, load, toggle, openBuild } = selection;
  if (!embedded) return null;
  if (failed) return <p className="mx-build-load" role="status">Build compatibility could not load. <button type="button" onClick={load}>Retry</button></p>;
  if (!modes) return <p className="mx-build-load" role="status">Checking Build compatibility…</p>;
  const full = ids.length === buildSelectionLimit;
  const local = ids.some((id) => modes.get(id) === "connected");
  if (!ids.length) return <p className="mx-build-load" role="status">Choose up to {buildSelectionLimit} components to build an app with them.</p>;
  return <aside className="mx-build-tray" aria-label="Build selection">
    <div className="mx-build-tray-content">
      <p role="status"><Layers3 size={16} aria-hidden="true" /><strong>{ids.length} / {buildSelectionLimit} selected</strong>
        {full && <span className="mx-sr">. Remove a component to choose another.</span>}
        {local && <span>· Local project only</span>}
      </p>
      <ul aria-label="Selected for Build">{ids.map((id) => {
        const title = originals.get(id)?.title ?? id;
        return <li key={id}><button type="button" aria-label={`${title}, remove from Build selection`}
          onClick={(event) => {
            const tray = event.currentTarget.closest("aside");
            if (ids.length > 1) (event.currentTarget.closest("li")?.nextElementSibling?.querySelector("button") ??
              tray?.querySelector<HTMLButtonElement>(".mx-build-open"))?.focus();
            else (document.getElementById("mx-build-compatible") ??
              document.querySelector<HTMLButtonElement>('.mx-build-pick[aria-pressed="true"]'))?.focus();
            toggle(id);
          }}>{title}<X size={13} aria-hidden="true" /></button></li>;
      })}</ul>
    </div>
    <button className="mx-build-open" type="button" onClick={openBuild}>Continue to Build <ArrowRight size={15} aria-hidden="true" /></button>
  </aside>;
}
