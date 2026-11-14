"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Ellipsis } from "lucide-react";
import "./action-menu.css";

export type MenuAction = { id: string; label: string; icon?: ReactNode; disabled?: boolean };
export function ActionMenu({ label, actions, onAction, variant = "dropdown", reducedMotion, className, defaultOpen = false, inline = false, triggerIcon, open: controlledOpen, onOpenChange }: {
  label: string; actions: readonly MenuAction[]; onAction: (id: string) => void;
  variant?: "dropdown" | "dynamic" | "morph"; reducedMotion?: boolean; className?: string; defaultOpen?: boolean; inline?: boolean; triggerIcon?: ReactNode;
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const noMotion = reducedMotion || pref;
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  const shouldFocus = useRef(false);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const position = useRef(0);
  const enabled = () => Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
  const setOpen = useCallback((value: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(value);
    onOpenChange?.(value);
  }, [controlledOpen, onOpenChange]);

  useLayoutEffect(() => {
    const layer = overlay.current;
    const button = trigger.current;
    if (inline || !open || !layer || !button || typeof layer.showPopover !== "function") return;
    layer.setAttribute("popover", "manual");
    layer.showPopover();
    const place = () => {
      const target = button.getBoundingClientRect();
      const viewport = window.visualViewport;
      const bounds = {
        left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
        width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight,
      };
      const gutter = 8;
      const inlineLimit = Math.max(24, bounds.width - gutter * 2);
      layer.style.setProperty("--mx-menu-width", inlineLimit + "px");
      const width = layer.offsetWidth;
      const desiredHeight = menu.current?.scrollHeight ?? layer.offsetHeight;
      const roomBelow = bounds.top + bounds.height - target.bottom - gutter;
      const roomAbove = target.top - bounds.top - gutter;
      const upward = roomBelow < desiredHeight + gutter && roomAbove > roomBelow;
      const height = Math.max(44, Math.min(desiredHeight, (upward ? roomAbove : roomBelow) - gutter));
      const rtl = getComputedStyle(button).direction === "rtl";
      const left = Math.min(Math.max(rtl ? target.right - width : target.left, bounds.left + gutter), bounds.left + bounds.width - width - gutter);
      layer.style.setProperty("--mx-menu-top", (upward ? target.top - height - gutter : target.bottom + gutter) + "px");
      layer.style.setProperty("--mx-menu-left", left + "px");
      layer.style.setProperty("--mx-menu-height", height + "px");
      layer.dataset.upward = String(upward);
    };
    place();
    const viewport = window.visualViewport;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; place(); });
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : undefined;
    observer?.observe(button);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      if (layer.matches(":popover-open")) layer.hidePopover();
      layer.removeAttribute("popover");
    };
  }, [open, inline]);

  useEffect(() => {
    if (!open) return;
    const controls = enabled();
    if (shouldFocus.current) controls.at(position.current === -1 ? -1 : 0)?.focus();
    shouldFocus.current = false;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open, setOpen]);

  function openMenu(last = false) {
    if (open) { enabled().at(last ? -1 : 0)?.focus(); return; }
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) setAbove(window.innerHeight - rect.bottom < 220 && rect.top > window.innerHeight - rect.bottom);
    position.current = last ? -1 : 0;
    shouldFocus.current = true;
    setOpen(true);
  }
  function close(restore: boolean) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }

  return <div ref={root} data-mx-action-menu={variant} data-above={above} className={className} data-inline={inline || undefined}
    onBlur={(e) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => open ? close(true) : openMenu()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); openMenu(e.key === "ArrowUp"); }
      }} className="mx-menu-trigger">
      {variant === "dynamic" && <Ellipsis size={17} aria-hidden />}{triggerIcon && <span aria-hidden="true">{triggerIcon}</span>}{label}
      {variant !== "dynamic" && <ChevronDown size={15} aria-hidden />}
    </button>
    {(open || inline) && <div ref={overlay} className="mx-menu-layer" inert={!open}><AnimatePresence initial={false}>{open && <motion.div ref={menu} id={id} role="menu" aria-label={label} className="mx-menu-items"
      initial={noMotion ? false : variant === "morph" ? { opacity: .25, y: -5, clipPath: "inset(0% 12% 72% 12% round 20px)" } : { opacity: .65, y: above ? 6 : -6, scale: .96 }}
      animate={variant === "morph" ? { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 13px)", transitionEnd: { clipPath: "none" } } : { opacity: 1, y: 0, scale: 1 }}
      exit={inline ? { opacity: 0, y: -3, clipPath: "inset(0% 12% 72% 12% round 20px)" } : undefined}
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
    </motion.div>}</AnimatePresence></div>}
  </div>;
}
