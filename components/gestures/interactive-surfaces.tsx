"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Maximize, RefreshCw } from "lucide-react";
import { useId, useRef, useState, type ReactNode, type PointerEvent } from "react";
import "./interactive-surfaces.css";

const recoil = { stiffness: 290, damping: 28, mass: .7 };

export function ParallaxTicket({ title, subtitle, serial, reducedMotion }: {
  title: string; subtitle: string; serial: string; reducedMotion?: boolean;
}) {
  const system = useReducedMotion();
  const quiet = system || reducedMotion;
  const x = useSpring(0, recoil);
  const y = useSpring(0, recoil);
  const foil = useSpring(0, recoil);
  function reset() { x.set(0); y.set(0); foil.set(0); }
  function update(event: PointerEvent<HTMLElement>) {
    if (quiet || event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - .5;
    const py = (event.clientY - box.top) / box.height - .5;
    x.set(py * -14); y.set(px * 16); foil.set(px * 30);
  }
  return <div data-mx-surface="ticket" onPointerMove={update} onPointerLeave={reset} onPointerCancel={reset}>
    <motion.article style={quiet ? undefined : { rotateX: x, rotateY: y }}>
      <motion.div className="mx-ticket-foil" aria-hidden="true" style={quiet ? undefined : { x: foil }} />
      <p>{subtitle}</p><h3>{title}</h3><span>{serial}</span>
    </motion.article>
  </div>;
}

export function GlassLens({ image, label, hint, zoom = 2.1 }: {
  image: { src: string; alt: string }; label: string; hint: string; zoom?: number;
}) {
  const [open, setOpen] = useState(false);
  const hintId = useId();
  const x = useMotionValue(50);
  const y = useMotionValue(50);
  const left = useMotionTemplate`${x}%`;
  const top = useMotionTemplate`${y}%`;
  const backgroundPosition = useMotionTemplate`${x}% ${y}%`;
  const contact = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const bound = (value: number) => Math.max(0, Math.min(100, value));
  const factor = Number.isFinite(zoom) ? Math.max(1, Math.min(zoom, 4)) : 2.1;
  function move(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(bound((event.clientX - rect.left) / Math.max(1, rect.width) * 100));
    y.set(bound((event.clientY - rect.top) / Math.max(1, rect.height) * 100));
  }
  return <div data-mx-surface="lens">
    <button type="button" className="mx-lens-plane" aria-label={`${label}: ${image.alt}`} aria-pressed={open} aria-describedby={hintId}
      onClick={event => {
        if (!event.detail || !suppressClick.current) setOpen(!open);
        suppressClick.current = false;
      }}
      onPointerDown={event => {
        suppressClick.current = false;
        if (!open || event.pointerType === "mouse" || !event.isPrimary) return;
        contact.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!open) return;
        const pointer = contact.current;
        if (event.pointerType === "mouse") move(event);
        else if (pointer?.pointerId === event.pointerId &&
          (pointer.moved || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 5)) {
          pointer.moved = true;
          move(event);
        }
      }}
      onPointerUp={event => {
        if (contact.current?.pointerId !== event.pointerId) return;
        suppressClick.current = contact.current.moved;
        contact.current = null;
      }}
      onPointerCancel={() => { contact.current = null; }}
      onLostPointerCapture={() => { contact.current = null; }}
      onKeyDown={(event) => {
        if (!open) return;
        const arrows: Record<string, [number, number]> = { ArrowLeft: [-7, 0], ArrowRight: [7, 0], ArrowUp: [0, -7], ArrowDown: [0, 7] };
        if (event.key === "Escape") setOpen(false);
        const step = arrows[event.key];
        if (step) { event.preventDefault(); x.set(bound(x.get() + step[0])); y.set(bound(y.get() + step[1])); }
      }}>
      <img src={image.src} alt="" draggable={false} /><Maximize size={18} aria-hidden="true" />
      {open && <motion.span aria-hidden="true" className="mx-lens-glass" style={{ left, top,
        backgroundImage: `url(${JSON.stringify(image.src)})`, backgroundPosition, backgroundSize: `${factor * 210}%` }} />}
    </button>
    <p id={hintId}>{hint}</p>
  </div>;
}

export function PullRefresh({ children, label, status, pending, onRefresh, reducedMotion, handleLabel, threshold = 65 }: {
  children: ReactNode; label: string; status: string; pending: boolean; onRefresh: () => void; reducedMotion?: boolean; handleLabel: string; threshold?: number;
}) {
  const system = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const detent = Number.isFinite(threshold) ? Math.min(180, Math.max(25, threshold)) : 65;
  const pull = useMotionValue(0);
  const transform = useSpring(pull, recoil);
  const start = useRef<{ id: number; y: number; distance: number } | null>(null);
  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    const active = start.current;
    if (active?.id !== event.pointerId) return;
    start.current = null;
    pull.set(0);
    if (commit && active.distance >= detent && !pending) onRefresh();
  }
  return <div data-mx-surface="refresh">
    <div className="mx-refresh-commands"><button disabled={pending} type="button" onClick={onRefresh}><RefreshCw size={17} aria-hidden="true" />{label}</button>
      <span role="status">{status}</span></div>
    <div ref={viewport} className="mx-refresh-list" aria-busy={pending}>
      <div className="mx-refresh-handle" aria-hidden="true" onPointerDown={(event) => {
        if (pending || !event.isPrimary || event.button !== 0 || (viewport.current?.scrollTop ?? 0) > 1) return;
        start.current = { id: event.pointerId, y: event.clientY, distance: 0 };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={(event) => {
        const active = start.current;
        if (active?.id !== event.pointerId) return;
        active.distance = Math.max(0, event.clientY - active.y);
        pull.set(72 * active.distance / (active.distance + detent));
      }} onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)}
        onLostPointerCapture={(event) => finish(event, false)}>{handleLabel}</div>
      <motion.div style={system || reducedMotion ? undefined : { y: transform }}>{children}</motion.div>
    </div>
  </div>;
}
