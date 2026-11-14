"use client";

import { motion, useMotionValue, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode, type PointerEvent } from "react";
import "./confirmation-controls.css";

type Props = {
  label: string; onConfirm: () => void; disabled?: boolean; reducedMotion?: boolean;
  confirmLabel?: string; cancelLabel?: string; className?: string; description?: ReactNode;
};

export function HoldConfirm({ label, onConfirm, disabled, reducedMotion, confirmLabel = "Confirm", cancelLabel = "Cancel", className, description, duration = 850, variant = "hold" }: Props & {
  duration?: number; variant?: "hold" | "publish";
}) {
  const id = useId();
  const system = useReducedMotion();
  const progress = useMotionValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);
  const gesture = useRef<{ id: number; started: number; shortTap: boolean } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
  }, []);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimationFrame(frame.current);
    progress.set(0);
  }
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || disabled || timer.current) return;
    gesture.current = { id: event.pointerId, started: performance.now(), shortTap: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    const length = Number.isFinite(duration) ? Math.max(350, duration) : 850;
    const { started } = gesture.current;
    function tick(now: number) {
      progress.set(Math.min(1, (now - started) / length));
      if (now - started < length) frame.current = requestAnimationFrame(tick);
    }
    if (!(system || reducedMotion)) frame.current = requestAnimationFrame(tick);
    timer.current = setTimeout(() => {
      stop();
      if (variant === "hold") onConfirm();
      else openDialog();
    }, length);
  }
  function openDialog() {
    trigger.current?.focus({ preventScroll: true });
    dialog.current?.showModal();
    cancel.current?.focus();
  }
  return <div className={className} data-mx-confirm={variant}>
    <button type="button" className="mx-confirm-button" disabled={disabled} aria-haspopup="dialog" ref={trigger}
      onPointerDown={start} onPointerUp={(event) => {
        const active = gesture.current;
        if (active?.id !== event.pointerId) return;
        active.shortTap = timer.current !== null && performance.now() - active.started <= 180;
        stop();
      }} onPointerCancel={() => { stop(); gesture.current = null; }}
      onLostPointerCapture={stop}
      onClick={(event) => {
        const active = gesture.current;
        gesture.current = null;
        if (event.detail === 0 || active?.shortTap) openDialog();
      }}>
      <motion.span className="mx-confirm-fill" style={{ scaleX: progress }} aria-hidden="true" />
      <span>{label}</span><ChevronRight size={17} aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="mx-confirm-dialog" aria-labelledby={id}>
      <h2 id={id}>{label}</h2>{description}
      <form method="dialog">
        <button type="submit" ref={cancel}>{cancelLabel}</button>
        <button type="submit" onClick={onConfirm}>{confirmLabel}</button>
      </form>
    </dialog>
  </div>;
}

export function SlideConfirm({ label, onConfirm, disabled, className, confirmLabel = "Confirm", cancelLabel = "Cancel", description }: Props) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; width: number; direction: number } | null>(null);
  const moved = useRef(false);
  const x = useMotionValue(0);
  function finish(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    const dist = (event.clientX - start.x) * start.direction;
    moved.current = commit && Math.abs(dist) > 6;
    x.set(0);
    if (commit && dist >= start.width * .84 && !disabled) onConfirm();
  }
  return <div className={className} data-mx-confirm="slide">
    <div className="mx-slide-track" ref={track}><span aria-hidden="true">{label}</span>
      <motion.button type="button" style={{ x }} disabled={disabled} aria-label={label} aria-haspopup="dialog"
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary || disabled || !track.current) return;
          moved.current = false;
          drag.current = { id: event.pointerId, x: event.clientX, width: Math.max(1, track.current.clientWidth - event.currentTarget.offsetWidth - 8),
            direction: getComputedStyle(track.current).direction === "rtl" ? -1 : 1 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={(event) => {
          const start = drag.current;
          if (start?.id === event.pointerId) x.set(start.direction * Math.max(0, Math.min(start.width, (event.clientX - start.x) * start.direction)));
        }} onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)}
        onLostPointerCapture={(event) => finish(event, false)}
        onClick={(event) => {
          if (event.detail === 0 || !moved.current) {
            event.currentTarget.focus({ preventScroll: true });
            dialog.current?.showModal();
            cancel.current?.focus();
          }
          moved.current = false;
        }}><ArrowRight size={20} aria-hidden="true" /></motion.button>
    </div>
    <dialog ref={dialog} className="mx-confirm-dialog" aria-labelledby={id}>
      <h2 id={id}>{label}</h2>{description}
      <form method="dialog"><button type="submit" ref={cancel}>{cancelLabel}</button><button type="submit" onClick={onConfirm}>{confirmLabel}</button></form>
    </dialog>
  </div>;
}
