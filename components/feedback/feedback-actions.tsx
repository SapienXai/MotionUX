"use client";

import { Bell, Check, CircleAlert, Clipboard, Heart, ShoppingBag, Undo2 } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import "./feedback-actions.css";

export function CopyTextButton({ text, label = "Copy", copiedLabel = "Copied", errorLabel = "Copy failed. Select the text and copy it.", className }: {
  text: string; label?: string; copiedLabel?: string; errorLabel?: string; className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const operation = useRef(0);
  async function copy() {
    const current = ++operation.current;
    try { await navigator.clipboard.writeText(text); if (current === operation.current) setStatus("success"); }
    catch { if (current === operation.current) setStatus("error"); }
  }
  return <div data-mx-action="copy" className={className}>
    <button type="button" onClick={() => void copy()}>{status === "success" ? <Check size={17} aria-hidden /> : <Clipboard size={17} aria-hidden />}{label}</button>
    <span role="status">{status === "success" ? copiedLabel : status === "error" ? errorLabel : ""}</span>
  </div>;
}

export function ReactionButton({ label, pressed, defaultPressed = false, onPressedChange, disabled, reducedMotion, variant = "like", className }: {
  label: string; pressed?: boolean; defaultPressed?: boolean; onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean; reducedMotion?: boolean; variant?: "like" | "bell"; className?: string;
}) {
  const [internal, setInternal] = useState(defaultPressed);
  const selected = pressed ?? internal;
  const pref = useReducedMotion();
  const reduce = pref || reducedMotion;
  const Icon = variant === "like" ? Heart : Bell;
  return <div className={className} data-mx-action={variant} data-reduced={Boolean(reduce)}>
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={() => {
      if (pressed === undefined) setInternal(!selected);
      onPressedChange?.(!selected);
    }}>
      <motion.span key={String(selected)} aria-hidden="true" initial={selected && !reduce ? (variant === "like" ? { scale: .75 } : { rotate: -12 }) : false}
        animate={variant === "like" ? { scale: 1 } : { rotate: selected && !reduce ? [-12, 9, -4, 0] : 0 }}
        transition={variant === "like" ? { type: "spring", stiffness: 455, damping: 17 } : { duration: reduce ? 0 : .32 }}>
        <Icon size={20} fill={selected ? "currentColor" : "none"} />
      </motion.span>{label}
      {selected && variant === "like" && !reduce && <span className="mx-like-rays" aria-hidden="true" />}
    </button>
  </div>;
}

export function MagneticButton({ children, reducedMotion, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> & { reducedMotion?: boolean }) {
  const pref = useReducedMotion();
  const node = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 330, damping: 24 });
  const springY = useSpring(y, { stiffness: 330, damping: 24 });
  return <span ref={node} data-mx-action="magnetic" onPointerMove={(event) => {
    if (event.pointerType !== "mouse" || reducedMotion || pref || props.disabled) return;
    const bounds = node.current!.getBoundingClientRect();
    x.set(Math.max(-9, Math.min(9, (event.clientX - bounds.left - bounds.width / 2) * .22)));
    y.set(Math.max(-6, Math.min(6, (event.clientY - bounds.top - bounds.height / 2) * .22)));
  }} onPointerLeave={() => { x.set(0); y.set(0); }}>
    <motion.button {...props} type={props.type ?? "button"} style={{ ...props.style, x: reducedMotion || pref ? 0 : springX, y: reducedMotion || pref ? 0 : springY }}>{children}</motion.button>
  </span>;
}

export function CartAction({ label, count, onAdd, disabled, reducedMotion, className }: {
  label: string; count: number; onAdd: () => void; disabled?: boolean; reducedMotion?: boolean; className?: string;
}) {
  const pref = useReducedMotion();
  return <div data-mx-action="cart" className={className}><button type="button" disabled={disabled} onClick={onAdd}>
    <ShoppingBag size={18} aria-hidden />{label}
    <motion.span key={count} className="mx-action-count" initial={pref || reducedMotion ? false : { y: 6, opacity: .45 }}
      animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 450, damping: 30 }}>{count}</motion.span>
  </button></div>;
}

export function UndoAction({ label, onUndo, disabled, children, className }: { label: string; onUndo: () => void; disabled?: boolean; children: ReactNode; className?: string }) {
  return <div data-mx-action="undo" className={className}><span role="status">{children}</span>
    <button type="button" onClick={onUndo} disabled={disabled}><Undo2 size={17} aria-hidden />{label}</button>
  </div>;
}

export function ActionOutcome({ state, label, reducedMotion, className }: {
  state: "idle" | "pending" | "success" | "error"; label: string; reducedMotion?: boolean; className?: string;
}) {
  const pref = useReducedMotion();
  const Icon = state === "error" ? CircleAlert : state === "success" ? Check : null;
  return <div role="status" data-mx-outcome={state} className={className} aria-atomic="true">
    {Icon && <motion.span key={state} initial={pref || reducedMotion ? false : { scale: .82, y: 4, opacity: .5 }}
      animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 430, damping: 28 }} aria-hidden="true"><Icon size={18} /></motion.span>}
    {state === "pending" && <span className="mx-outcome-pending" aria-hidden="true" />}{label}</div>;
}
