"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Ellipsis } from "lucide-react";
import "./action-menu.css";

export type MenuAction = { id: string; label: string; icon?: ReactNode; disabled?: boolean };
export function ActionMenu({ label, actions, onAction, variant = "dropdown", reducedMotion, className }: {
  label: string; actions: readonly MenuAction[]; onAction: (id: string) => void;
  variant?: "dropdown" | "dynamic" | "morph"; reducedMotion?: boolean; className?: string;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const noMotion = reducedMotion || pref;
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const position = useRef(0);
  const enabled = () => Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);

  useEffect(() => {
    if (!open) return;
    const controls = enabled();
    controls.at(position.current === -1 ? -1 : 0)?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open]);

  function openMenu(last = false) {
    if (open) { enabled().at(last ? -1 : 0)?.focus(); return; }
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) setAbove(window.innerHeight - rect.bottom < 220 && rect.top > window.innerHeight - rect.bottom);
    position.current = last ? -1 : 0;
    setOpen(true);
  }
  function close(restore: boolean) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }

  return <div ref={root} data-mx-action-menu={variant} data-above={above} className={className}
    onBlur={(e) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => open ? close(true) : openMenu()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); openMenu(e.key === "ArrowUp"); }
      }} className="mx-menu-trigger">
      {variant === "dynamic" && <Ellipsis size={17} aria-hidden />}{label}
      {variant !== "dynamic" && <ChevronDown size={15} aria-hidden />}
    </button>
    {open && <motion.div ref={menu} id={id} role="menu" aria-label={label} className="mx-menu-items"
      initial={noMotion ? false : { opacity: .65, y: above ? 6 : -6, scale: variant === "morph" ? .84 : .96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={noMotion ? { duration: 0 } : { type: "spring", stiffness: 445, damping: 34 }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); return; }
        if (e.key === "Tab") return;
        if (!["Home", "End", "ArrowDown", "ArrowUp"].includes(e.key)) return;
        e.preventDefault();
        const controls = enabled();
        const index = controls.indexOf(document.activeElement as HTMLButtonElement);
        const offset = e.key === "ArrowDown" ? 1 : -1;
        const target = e.key === "Home" ? controls[0] : e.key === "End" ? controls.at(-1) :
          controls[(index + controls.length + offset) % controls.length];
        target?.focus();
      }}>
      {actions.map((item) => <button type="button" role="menuitem" key={item.id} tabIndex={-1} disabled={item.disabled}
        onClick={() => { close(true); onAction(item.id); }}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
    </motion.div>}
  </div>;
}
