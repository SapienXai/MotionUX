"use client";

import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";

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

export function StudioSheet({ dialog, title, side = false, children }: {
  dialog: RefObject<HTMLDialogElement | null>; title: string; side?: boolean; children: ReactNode;
}) {
  const titleId = useId();
  const t = useStudioCopy();
  return <dialog ref={dialog} className="kinetic-sheet" data-side={side} aria-labelledby={titleId}
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
