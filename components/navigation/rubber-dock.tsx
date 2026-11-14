"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useId, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import "./rubber-dock.css";

type Link = { href: string; label: string; icon: ReactNode };
function DockItem({ item, pointer, active, reduced, compact, indicator, magnification, onNavigate }: {
  item: Link; pointer: MotionValue<number>; active: boolean; reduced: boolean; compact: boolean; indicator: string; magnification: number;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const center = useMotionValue(0);
  const emphasis = useTransform([pointer, center], ([x, at]) => {
    const proximity = Math.max(0, 1 - Math.abs(Number(x) - Number(at)) / 138);
    return reduced ? 1 : 1 + magnification * proximity * proximity * (3 - 2 * proximity);
  });
  const scale = useSpring(emphasis, { stiffness: 370, damping: 24 });
  const lift = useTransform(scale, value => (1 - value) * 26);
  const link = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    const node = link.current;
    if (!node) return;
    function measure() {
      const box = node!.getBoundingClientRect();
      center.set(box.left + box.width / 2);
    }
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : undefined;
    observer?.observe(node);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    measure();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [center]);
  return <a ref={link} href={item.href} aria-current={active ? "page" : undefined} onClick={(event) => onNavigate?.(event, item.href)}>
    {compact && active && (reduced
      ? <span className="mx-rubber-indicator" aria-hidden="true" />
      : <motion.span layoutId={indicator} className="mx-rubber-indicator" aria-hidden="true" initial={false}
          transition={{ type: "spring", stiffness: 430, damping: 34, mass: .76 }} />)}
    <motion.span className="mx-rubber-icon" aria-hidden="true" style={reduced ? undefined : { scale, y: lift }}>{item.icon}</motion.span>
    <span className="mx-rubber-label">{item.label}</span>
  </a>;
}

export function RubberDock({ label, links, activeHref, reducedMotion, className, compact = false, magnification = .24, onNavigate }: {
  label: string; links: readonly Link[]; activeHref?: string; reducedMotion?: boolean; className?: string; compact?: boolean; magnification?: number;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const pref = useReducedMotion();
  const pointer = useMotionValue(-1000);
  const indicator = useId();
  const strength = Number.isFinite(magnification) ? Math.min(.5, Math.max(0, magnification)) : .24;
  return <nav className={className} data-mx-rubber-dock="" data-compact={compact || undefined} aria-label={label}
    onPointerMove={(event) => { if (event.pointerType === "mouse" && !(reducedMotion || pref)) pointer.set(event.clientX); }}
    onPointerLeave={() => pointer.set(-1000)} onPointerCancel={() => pointer.set(-1000)}>
    {links.map((item) => <DockItem key={item.href} item={item} pointer={pointer} active={activeHref === item.href}
      reduced={Boolean(reducedMotion || pref)} compact={compact} indicator={indicator} magnification={strength} onNavigate={onNavigate} />)}
  </nav>;
}
