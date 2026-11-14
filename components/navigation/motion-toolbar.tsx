"use client";

import { useState, type ReactNode } from "react";
import "./motion-toolbar.css";

type Tool = { id: string; label: string; icon: ReactNode; disabled?: boolean; pressed?: boolean; shortcut?: string };

export function MotionToolbar({ label, tools, onAction, className }: {
  label: string; tools: readonly Tool[]; onAction: (id: string) => void; className?: string;
}) {
  const [focused, setFocused] = useState<string>();
  const current = tools.find((tool) => tool.id === focused && !tool.disabled) ?? tools.find((tool) => !tool.disabled);
  return <div role="toolbar" aria-label={label} className={className} data-mx-toolbar="">
    {tools.map((tool) => <button type="button" key={tool.id} aria-label={tool.label} title={tool.label}
      aria-pressed={tool.pressed} aria-keyshortcuts={tool.shortcut} disabled={tool.disabled} tabIndex={current === tool ? 0 : -1}
      onFocus={() => setFocused(tool.id)} onClick={() => onAction(tool.id)}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const offset = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
        const currentIndex = buttons.indexOf(event.currentTarget);
        event.preventDefault();
        const next = event.key === "Home" ? buttons[0] : event.key === "End" ? buttons.at(-1) :
          buttons[(currentIndex + offset + buttons.length) % buttons.length];
        next?.focus();
      }}><span aria-hidden="true">{tool.icon}</span></button>)}
  </div>;
}
