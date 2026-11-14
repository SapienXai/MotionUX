"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
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
  const [coords, setCoords] = useState([50, 50]);
  const bound = (value: number) => Math.max(0, Math.min(100, value));
  const factor = Number.isFinite(zoom) ? Math.max(1, Math.min(zoom, 4)) : 2.1;
  function move(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setCoords([bound((event.clientX - rect.left) / rect.width * 100), bound((event.clientY - rect.top) / rect.height * 100)]);
  }
  return <div data-mx-surface="lens">
    <button type="button" className="mx-lens-plane" aria-label={`${label}: ${image.alt}`} aria-pressed={open} aria-describedby={hintId}
      onClick={() => setOpen(!open)} onPointerMove={(event) => { if (open && event.pointerType !== "touch") move(event); }}
      onKeyDown={(event) => {
        if (!open) return;
        const arrows: Record<string, [number, number]> = { ArrowLeft: [-7, 0], ArrowRight: [7, 0], ArrowUp: [0, -7], ArrowDown: [0, 7] };
        if (event.key === "Escape") setOpen(false);
        const step = arrows[event.key];
        if (step) { event.preventDefault(); setCoords(([x, y]) => [bound(x + step[0]), bound(y + step[1])]); }
      }}>
      <img src={image.src} alt="" draggable={false} /><Maximize size={18} aria-hidden="true" />
      {open && <span aria-hidden="true" className="mx-lens-glass" style={{ left: `${coords[0]}%`, top: `${coords[1]}%`,
        backgroundImage: `url(${JSON.stringify(image.src)})`, backgroundPosition: `${coords[0]}% ${coords[1]}%`, backgroundSize: `${factor * 210}%` }} />}
    </button>
    <p id={hintId}>{hint}</p>
  </div>;
}

export function PullRefresh({ children, label, status, pending, onRefresh, reducedMotion, handleLabel }: {
  children: ReactNode; label: string; status: string; pending: boolean; onRefresh: () => void; reducedMotion?: boolean; handleLabel: string;
}) {
  const system = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const pull = useMotionValue(0);
  const transform = useSpring(pull, recoil);
  const start = useRef<{ id: number; y: number; distance: number } | null>(null);
  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    const active = start.current;
    if (active?.id !== event.pointerId) return;
    start.current = null;
    pull.set(0);
    if (commit && active.distance >= 65 && !pending) onRefresh();
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
        pull.set(Math.min(55, active.distance * .55));
      }} onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)}
        onLostPointerCapture={(event) => finish(event, false)}>{handleLabel}</div>
      <motion.div style={system || reducedMotion ? undefined : { y: transform }}>{children}</motion.div>
    </div>
  </div>;
}
