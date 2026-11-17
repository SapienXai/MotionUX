"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Ellipsis } from "lucide-react";
import "./action-menu.css";

const defaultStiffness = 445;
const defaultDamping = 34;
const collapsedClip = "inset(0% 14% 88% 14% round 20px)";
const expandedClip = "inset(0% 0% 0% 0% round 13px)";
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export type MenuAction = { id: string; label: string; icon?: ReactNode; disabled?: boolean };
export function ActionMenu({ label, actions, onAction, variant = "dropdown", reducedMotion, className, defaultOpen = false, inline = false, triggerIcon, open: controlledOpen, onOpenChange, stiffness = defaultStiffness, damping = defaultDamping }: {
  label: string; actions: readonly MenuAction[]; onAction: (id: string) => void;
  variant?: "dropdown" | "dynamic" | "morph"; reducedMotion?: boolean; className?: string; defaultOpen?: boolean; inline?: boolean; triggerIcon?: ReactNode;
  open?: boolean; onOpenChange?: (open: boolean) => void; stiffness?: number; damping?: number;
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
  const safeStiffness = Number.isFinite(stiffness) ? Math.min(800, Math.max(120, stiffness)) : defaultStiffness;
  const safeDamping = Number.isFinite(damping) ? Math.min(85, Math.max(14, damping)) : defaultDamping;
  const transition = noMotion ? { duration: 0 } : { type: "spring" as const, stiffness: safeStiffness, damping: safeDamping };
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
      const viewportTop = bounds.top + gutter;
      const viewportBottom = Math.max(viewportTop, bounds.top + bounds.height - gutter);
      // Keyboard focus can open the menu before an offscreen trigger scrolls into view.
      const aboveBottom = clamp(target.top - gutter, viewportTop, viewportBottom);
      const belowTop = clamp(target.bottom + gutter, viewportTop, viewportBottom);
      const roomAbove = aboveBottom - viewportTop;
      const roomBelow = viewportBottom - belowTop;
      const upward = roomBelow < desiredHeight && roomAbove > roomBelow;
      const availableHeight = upward ? roomAbove : roomBelow;
      const height = Math.min(desiredHeight, Math.max(44, availableHeight), viewportBottom - viewportTop);
      const top = clamp(upward ? aboveBottom - height : belowTop, viewportTop, viewportBottom - height);
      const rtl = getComputedStyle(button).direction === "rtl";
      const left = Math.min(Math.max(rtl ? target.right - width : target.left, bounds.left + gutter), bounds.left + bounds.width - width - gutter);
      layer.style.setProperty("--mx-menu-top", top + "px");
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

  useLayoutEffect(() => {
    if (!open || !shouldFocus.current) return;
    shouldFocus.current = false;
    enabled().at(position.current === -1 ? -1 : 0)?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
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

  const collapsed = variant === "morph"
    ? { opacity: 0, y: above && !inline ? 5 : -5, clipPath: collapsedClip }
    : { opacity: 0, y: above ? 6 : -6, scale: .96 };
  const expanded = variant === "morph"
    ? { opacity: 1, y: 0, clipPath: expandedClip }
    : { opacity: 1, y: 0, scale: 1 };

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
    {(open || inline) && <div ref={overlay} className="mx-menu-layer" inert={!open} aria-hidden={!open || undefined}>
      <motion.div ref={menu} id={id} role="menu" aria-label={label} className="mx-menu-items"
      initial={inline || noMotion ? false : collapsed}
      animate={open ? { ...expanded, transitionEnd: { clipPath: "none", visibility: "visible" } }
        : { ...collapsed, transitionEnd: { visibility: "hidden" } }}
      style={{ visibility: open ? "visible" : undefined }}
      transition={transition}
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
    </motion.div></div>}
  </div>;
}
