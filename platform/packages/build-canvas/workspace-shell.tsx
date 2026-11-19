"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useState, useSyncExternalStore, type ComponentProps, type ReactNode, type RefObject } from "react";

const wideWorkspace = "(min-width: 1100px)";
function subscribe(reactToViewport: () => void) {
  const media = window.matchMedia(wideWorkspace);
  media.addEventListener("change", reactToViewport);
  return () => media.removeEventListener("change", reactToViewport);
}
function wideViewport() { return window.matchMedia(wideWorkspace).matches; }
function serverViewport() { return false; }

export function useWideWorkspace() {
  return useSyncExternalStore(subscribe, wideViewport, serverViewport);
}

export type WorkspaceSearch = {
  pages: readonly { title: string; route: string }[];
  navigate: (route: string) => void;
};

export function useWorkspaceSearch(pages: WorkspaceSearch["pages"], onPage: WorkspaceSearch["navigate"]) {
  const go = useEffectEvent(onPage);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<WorkspaceSearch>("motionux:workspace-search", {
      detail: { pages, navigate: (route) => go(route) },
    }));
    return () => {
      window.dispatchEvent(new CustomEvent("motionux:workspace-search", { detail: null }));
    };
  }, [pages]);
}

export function WorkspaceHeader({ name, revision, dirty, draftSaved, busy, backLabel, statusLabels, onBack, children }: {
  name: string; revision: number; dirty: boolean; draftSaved: boolean; busy?: boolean;
  backLabel: string; statusLabels: { saved: string; draft: string; unsaved: string };
  onBack: () => void; children: ReactNode;
}) {
  const state = dirty ? draftSaved ? "draft" : "unsaved" : "saved";
  return <header className="kinetic-command unified-workspace-head">
    <button type="button" className="kinetic-button kinetic-back" onClick={onBack} disabled={busy}
      aria-label={backLabel}><ArrowLeft size={16} aria-hidden="true" /><span>{backLabel}</span></button>
    <div className="kinetic-project-name">
      <h1 dir="auto">{name}</h1>
      <span className="unified-document-status" role="status" data-state={state} title={statusLabels.saved + " · " + revision}>
        {state === "saved" && <Check size={13} aria-hidden="true" />}{statusLabels[state]}
      </span>
    </div>
    <div className="kinetic-command-actions">{children}</div>
  </header>;
}

export function WorkspaceStructure(props: ComponentProps<"aside">) {
  const { className, ...attributes } = props;
  return <aside {...attributes} className={"unified-structure " + (className ?? "")} />;
}

export function useStudioCopy() {
  const [tr, setTr] = useState(false);
  useEffect(() => setTr(navigator.language.toLowerCase().startsWith("tr")), []);
  return (en: string, turkish: string) => tr ? turkish : en;
}

export function openStudioSheet(dialog: HTMLDialogElement | null, trigger: HTMLButtonElement) {
  if (!dialog || dialog.open) return;
  // Pointer presses in some browsers leave the button unfocused. Give the native dialog
  // the correct invoker so it can restore focus on close.
  trigger.focus({ preventScroll: true });
  dialog.showModal();
}

export function StudioSheet({ dialog, title, side = false, onDismiss, children }: {
  dialog: RefObject<HTMLDialogElement | null>; title: string; side?: boolean; onDismiss?: () => void; children: ReactNode;
}) {
  const titleId = useId();
  const t = useStudioCopy();
  return <dialog ref={dialog} className="kinetic-sheet" data-side={side} aria-labelledby={titleId} onClose={onDismiss}
    onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="kinetic-sheet-inner">
      <header><h2 id={titleId}>{title}</h2>
        <button className="kinetic-icon" type="button" title={t("Close", "Kapat")} aria-label={t("Close", "Kapat")}
          onClick={() => dialog.current?.close()}><X size={17} aria-hidden="true" /></button>
      </header>
      {children}
    </div>
  </dialog>;
}
