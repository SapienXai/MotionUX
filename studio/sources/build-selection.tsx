import { ArrowRight, Check, Layers3, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buildSelectionLimit, buildSourceIds, studioOrigin } from "../../lib/studio-bridge";
import type { OriginalCard } from "./local";

type Mode = "direct" | "connected" | "reference";

export function useGalleryBuildSelection(embedded: boolean) {
  const [modes, setModes] = useState<ReadonlyMap<string, Mode>>();
  const [ids, setIds] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [context, setContext] = useState<{ purpose: "creation" | "revision"; limit: number; reasons: ReadonlyMap<string, string> }>();

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
      const limit = Number.isInteger(event.data.limit) && event.data.limit >= 0 && event.data.limit <= buildSelectionLimit
        ? event.data.limit : buildSelectionLimit;
      if ((event.data.purpose === "revision" || event.data.purpose === "creation") && Array.isArray(event.data.reasons)) {
        setContext({ purpose: event.data.purpose, limit, reasons: new Map<string, string>(event.data.reasons) });
      }
      setIds((buildSourceIds(event.data.selected) ?? []).filter((id) => entries.has(id)).slice(0, limit));
    }
    window.addEventListener("message", receive);
    load();
    return () => window.removeEventListener("message", receive);
  }, [embedded]);

  function toggle(id: string) {
    if (!modes?.has(id)) return;
    setIds((previous) => previous.includes(id) ? previous.filter((value) => value !== id) :
      previous.length < (context?.limit ?? buildSelectionLimit) ? [...previous, id] : previous);
  }
  return { embedded, modes, ids, failed, load, toggle, context,
    openBuild: () => send({ type: "motionux:build-selection", ids }) };
}

export type GalleryBuildSelection = ReturnType<typeof useGalleryBuildSelection>;

export function BuildPickButton({ entry, selection }: { entry: OriginalCard; selection: GalleryBuildSelection }) {
  if (!selection.modes || entry.availability !== "ready") return null;
  const selected = selection.ids.includes(entry.id);
  const mode = selection.modes.get(entry.id);
  if (!mode) return <span className="mx-build-reference">{selection.context?.reasons.get(entry.id) ?? "Reference only"}</span>;
  const Icon = selected ? Check : Plus;
  const label = selection.context?.purpose === "revision" ? "Select for revision" : mode === "reference" ? "Use as design reference" : "Use in Build";
  return <button type="button" className="mx-build-pick" aria-pressed={selected}
    aria-label={`${label}: ${entry.title}${mode === "connected" ? " (local only)" : ""}`}
    disabled={!selected && selection.ids.length >= (selection.context?.limit ?? buildSelectionLimit)}
    onClick={() => selection.toggle(entry.id)}>
    <Icon size={14} aria-hidden="true" /> {label}
    {mode === "connected" && <small aria-hidden="true">Local</small>}
  </button>;
}

export function BuildSelectionTray({ originals, selection }: {
  originals: ReadonlyMap<string, OriginalCard>; selection: GalleryBuildSelection;
}) {
  const { embedded, modes, ids, failed, load, toggle, openBuild, context } = selection;
  if (!embedded) return null;
  if (failed) return <p className="mx-build-load" role="status">Build compatibility could not load. <button type="button" onClick={load}>Retry</button></p>;
  if (!modes) return <p className="mx-build-load" role="status">Checking Build compatibility…</p>;
  const limit = context?.limit ?? buildSelectionLimit;
  const full = ids.length === limit;
  const local = ids.some((id) => modes.get(id) === "connected");
  if (!ids.length) return <div className="mx-build-load">
    <p role="status">{context?.purpose === "revision"
      ? limit ? `Choose up to ${limit} components to use in this revision.` : "Browse sources for this project. Direct additions are unavailable."
      : `Choose up to ${limit} components to build an app with them.`}</p>
    {context?.purpose === "creation" && <button type="button" onClick={openBuild}>Use automatic selection</button>}
  </div>;
  return <aside className="mx-build-tray" aria-label="Build selection">
    <div className="mx-build-tray-content">
      <p role="status"><Layers3 size={16} aria-hidden="true" /><strong>{ids.length} / {limit} selected</strong>
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
    <button className="mx-build-open" type="button" onClick={openBuild}>{context?.purpose === "revision" ? "Attach to revision" :
      context?.purpose === "creation" ? "Use selected components" : "Continue to Build"} <ArrowRight size={15} aria-hidden="true" /></button>
  </aside>;
}
