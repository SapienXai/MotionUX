"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import "./rubber-dock.css";

type Link = { href: string; label: string; icon: ReactNode };
function DockItem({ item, pointer, active, reduced, onNavigate }: {
  item: Link; pointer: MotionValue<number>; active: boolean; reduced: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const center = useMotionValue(0);
  const emphasis = useTransform([pointer, center], ([x, at]) => {
    const proximity = Math.max(0, 1 - Math.abs(Number(x) - Number(at)) / 138);
    return reduced ? 1 : 1 + .24 * proximity * proximity * (3 - 2 * proximity);
  });
  const scale = useSpring(emphasis, { stiffness: 370, damping: 24 });
  const lift = useTransform(scale, [1, 1.24], [0, -6]);
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
    <motion.span aria-hidden="true" style={reduced ? undefined : { scale, y: lift }}>{item.icon}</motion.span>
    {item.label}
  </a>;
}

export function RubberDock({ label, links, activeHref, reducedMotion, className, onNavigate }: {
  label: string; links: readonly Link[]; activeHref?: string; reducedMotion?: boolean; className?: string;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const pref = useReducedMotion();
  const pointer = useMotionValue(-1000);
  return <nav className={className} data-mx-rubber-dock="" aria-label={label}
    onPointerMove={(event) => { if (event.pointerType === "mouse" && !(reducedMotion || pref)) pointer.set(event.clientX); }}
    onPointerLeave={() => pointer.set(-1000)} onPointerCancel={() => pointer.set(-1000)}>
    {links.map((item) => <DockItem key={item.href} item={item} pointer={pointer} active={activeHref === item.href}
      reduced={Boolean(reducedMotion || pref)} onNavigate={onNavigate} />)}
  </nav>;
}
