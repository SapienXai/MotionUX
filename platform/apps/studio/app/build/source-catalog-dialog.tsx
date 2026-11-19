"use client";

import { Plus } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { buildSelectionLimit, buildSourceIds, galleryOrigin, isAppearance } from "../../../../../lib/studio-bridge";
import { maxProjectSources } from "@motionux/build-core/code-project";
import type { CompositionComponent } from "./component-picker";
import { openStudioSheet, StudioSheet, useStudioCopy } from "./kinetic-ui";
import { sourceRequest } from "./source-job";

export function SourceCatalogDialog({ existing, selected, attach, disabled, compact, purpose = "revision", triggerLabel }: {
  existing: readonly { id: string }[]; selected: readonly CompositionComponent[];
  attach?: (rows: CompositionComponent[]) => void; disabled?: boolean; compact?: boolean;
  purpose?: "creation" | "revision"; triggerLabel?: string;
}) {
  const t = useStudioCopy();
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const canAdd = Boolean(attach);
  const apply = useEffectEvent((rows: CompositionComponent[]) => attach?.(rows));
  const getSelection = useEffectEvent(() => selected.map(({ id }) => id));
  const limit = purpose === "creation" ? buildSelectionLimit :
    canAdd ? Math.min(buildSelectionLimit, Math.max(0, maxProjectSources - existing.length)) : 0;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const current = new Set(existing.map(({ id }) => id));
    let catalog: Promise<CompositionComponent[]> | undefined;
    let acknowledged = false;
    const check = window.setTimeout(() => { if (!acknowledged) setOffline(true); }, 5000);
    const allowed = (row: CompositionComponent) => Boolean(limit &&
      (purpose === "creation" || row.mode === "direct" && !current.has(row.id)));
    async function receive(event: MessageEvent) {
      const target = frame.current?.contentWindow;
      if (!target || event.origin !== galleryOrigin || event.source !== target || !dialog.current?.open) return;
      if (event.data?.type === "motionux:gallery-ready") {
        const theme = document.documentElement.dataset.studioAppearance;
        target.postMessage({ type: "motionux:appearance", value: isAppearance(theme) ? theme : "system" }, galleryOrigin);
      }
      if (event.data?.type === "motionux:close-picker") dialog.current?.close();
      if (event.data?.type === "motionux:build-catalog-request") {
        acknowledged = true;
        setOffline(false);
        catalog ??= sourceRequest<CompositionComponent[]>("/source-jobs/components", "GET", undefined, controller.signal);
        try {
          const rows = await catalog;
          if (controller.signal.aborted || frame.current?.contentWindow !== target) return;
          target.postMessage({
            type: "motionux:build-catalog", purpose, limit,
            selected: getSelection(), entries: rows.filter(allowed).map(({ id, mode }) => [id, mode]),
            reasons: rows.filter((row) => !allowed(row)).map(({ id, mode }) => [id,
              current.has(id) ? "Already in this project" : mode === "reference" ? "Design reference" :
                mode === "connected" ? "Local-only source" : canAdd ? "Source limit reached" : "Requires a code project",
            ]),
          }, galleryOrigin);
        } catch {
          catalog = undefined;
          if (!controller.signal.aborted) target.postMessage({ type: "motionux:build-catalog-unavailable" }, galleryOrigin);
        }
      }
      if (event.data?.type === "motionux:build-selection" && catalog && limit) {
        const ids = buildSourceIds(event.data.ids);
        if (!ids || ids.length > limit || (!ids.length && purpose !== "creation")) return;
        const rows = await catalog.catch(() => []);
        const chosen = ids.flatMap((id) => rows.find((row) => row.id === id && allowed(row)) ?? []);
        if (!controller.signal.aborted && frame.current?.contentWindow === target && chosen.length === ids.length) {
          apply(chosen);
          dialog.current?.close();
        }
      }
    }
    window.addEventListener("message", receive);
    return () => {
      controller.abort(); window.clearTimeout(check); window.removeEventListener("message", receive);
    };
  }, [open, existing, canAdd, limit, purpose]);

  return <>
    <button type="button" className="kinetic-button unified-add-component" aria-haspopup="dialog" disabled={disabled}
      onClick={(event) => { setOffline(false); setOpen(true); openStudioSheet(dialog.current, event.currentTarget); }}>
      <Plus size={17} aria-hidden="true" />{triggerLabel ?? (compact ? t("Add", "Ekle") : t("Add component", "Bileşen ekle"))}
    </button>
    <StudioSheet dialog={dialog} title={t("Add a component", "Bileşen ekle")} side onDismiss={() => setOpen(false)}>
      <div className="unified-catalog-body">
        <p>{purpose === "creation" ? t("Try original components and pick the ones that fit your brief.", "Orijinal bileşenleri dene ve fikrine uyanları seç.") :
          canAdd ? t("Try a component and attach it to your next revision.", "Bir bileşeni dene ve sonraki revizyona ekle.") :
          t("Explore the source library. This project format keeps its existing source set.", "Kaynak kitaplığını keşfet. Bu proje biçimi mevcut kaynaklarını korur.")}</p>
        {offline && <p role="status">{t("The local catalog did not connect.", "Yerel kataloğa bağlanılamadı.")} <a href="/discover">{t("Open Discover", "Keşfet’i aç")}</a></p>}
        {open && <iframe ref={frame} src={galleryOrigin + "/?picker=1"} title={t("Component catalog", "Bileşen kataloğu")} referrerPolicy="no-referrer" />}
      </div>
    </StudioSheet>
  </>;
}
