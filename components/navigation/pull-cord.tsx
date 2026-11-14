"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./pull-cord.css";

export function PullCord({ label, checked, defaultChecked = false, onCheckedChange, reducedMotion, disabled, className, threshold = 36 }: {
  label: string; checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void;
  reducedMotion?: boolean; disabled?: boolean; className?: string; threshold?: number;
}) {
  const pref = useReducedMotion();
  const [internal, setInternal] = useState(defaultChecked);
  const on = checked ?? internal;
  const detent = Number.isFinite(threshold) ? Math.max(16, Math.min(90, threshold)) : 36;
  const start = useRef<{ id: number; y: number } | null>(null);
  const swallowClick = useRef(false);
  const offset = useMotionValue(0);
  const animation = useRef<{ stop(): void } | null>(null);
  useEffect(() => () => animation.current?.stop(), []);

  function toggle() {
    if (disabled) return;
    if (checked === undefined) setInternal(!on);
    onCheckedChange?.(!on);
  }
  function reset(event: PointerEvent<HTMLButtonElement>, activate: boolean) {
    if (start.current?.id !== event.pointerId) return;
    const dy = event.clientY - start.current.y;
    start.current = null;
    if (activate && dy > 8) {
      swallowClick.current = true;
      if (dy >= detent) toggle();
    }
    if (pref || reducedMotion) offset.set(0);
    else animation.current = animate(offset, 0, { type: "spring", stiffness: 360, damping: 21, mass: .64 });
  }
  return <div data-mx-cord="" data-on={on} className={className}>
    <div aria-hidden="true" className="mx-cord-lamp"><span /></div>
    <motion.button type="button" style={{ y: offset }} aria-pressed={on} aria-label={label} disabled={disabled}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button !== 0) return;
        animation.current?.stop();
        swallowClick.current = false;
        start.current = { id: e.pointerId, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current?.id !== e.pointerId || pref || reducedMotion) return;
        const distance = Math.max(0, e.clientY - start.current.y);
        offset.set(52 * distance / (distance + 52));
      }}
      onPointerUp={(e) => reset(e, true)} onPointerCancel={(e) => reset(e, false)} onLostPointerCapture={(e) => reset(e, false)}
      onClick={(e) => { if (e.detail === 0 || !swallowClick.current) toggle(); swallowClick.current = false; }}>
      <span aria-hidden="true" />
    </motion.button>
  </div>;
}
