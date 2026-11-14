"use client";

import { useId, useRef, useState } from "react";
import { CornerDownLeft, Search, X } from "lucide-react";
import "./command-palette.css";

type Action = { id: string; label: string; keywords?: string; disabled?: boolean };

export function CommandPalette({ label, commands, onSelect, triggerLabel = "Search commands", searchLabel = "Search", emptyLabel = "No matching commands", closeLabel = "Close", className }: {
  label: string; commands: readonly Action[]; onSelect: (id: string) => void;
  triggerLabel?: string; searchLabel?: string; emptyLabel?: string; closeLabel?: string; className?: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const matching = commands.filter((command) =>
    `${command.label} ${command.keywords ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  function confirm(action: Action) {
    dialog.current?.close();
    onSelect(action.id);
  }
  function focusResult(last = false) {
    const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>("[data-mx-command]:not(:disabled)") ?? []);
    (last ? buttons.at(-1) : buttons[0])?.focus();
  }
  function open() {
    if (dialog.current && !dialog.current.open) {
      trigger.current?.focus({ preventScroll: true });
      dialog.current.showModal();
    }
    field.current?.focus();
  }

  return <div className={className} data-mx-command-palette="">
    <button type="button" className="mx-command-trigger" ref={trigger} onClick={open} aria-haspopup="dialog"><Search size={17} aria-hidden="true" />{triggerLabel}</button>
    <dialog ref={dialog} className="mx-command-dialog" aria-labelledby={id} onClose={() => setQuery("")}>
      <div className="mx-command-title"><h2 id={id}>{label}</h2><form method="dialog"><button type="submit" aria-label={closeLabel}><X size={18} aria-hidden="true" /></button></form></div>
      <label className="mx-command-input"><Search size={17} aria-hidden="true" />
        <input type="search" aria-label={searchLabel} placeholder={searchLabel} ref={field} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); focusResult(e.key === "ArrowUp"); }
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              const next = matching.find((item) => !item.disabled);
              if (next) confirm(next);
            }
          }} />
      </label>
      {matching.length ? <ul>
        {matching.map((item) => <li key={item.id}><button type="button" data-mx-command="" disabled={item.disabled}
          onClick={() => confirm(item)} onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            const controls = Array.from(dialog.current!.querySelectorAll<HTMLButtonElement>("[data-mx-command]:not(:disabled)"));
            const next = controls[controls.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
            (next ?? field.current)?.focus();
          }}>{item.label}<CornerDownLeft size={15} aria-hidden="true" /></button></li>)}
      </ul> : <p role="status">{emptyLabel}</p>}
    </dialog>
  </div>;
}
