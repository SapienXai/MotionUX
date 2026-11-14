"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type ReactNode } from "react";
import "./morph-tooltip.css";

export function MorphTooltip({ label, description, icon, reducedMotion, className }: {
  label: string; description: string; icon?: ReactNode; reducedMotion?: boolean; className?: string;
}) {
  const id = useId();
  const system = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [press, setPress] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hover || focus || press) && !dismissed;
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setDismissed(true); setPress(false); }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return <span className={className} data-mx-tooltip="" onPointerEnter={(e) => {
    if (e.pointerType === "mouse") { setHover(true); setDismissed(false); }
  }} onPointerLeave={() => setHover(false)}>
    <button type="button" aria-label={icon ? label : undefined} aria-describedby={id} onFocus={() => { setFocus(true); setDismissed(false); }}
      onBlur={() => { setFocus(false); setPress(false); }}
      onClick={() => { setDismissed(press && open); setPress(!press); }}>
      {icon ?? label}
    </button>
    <span id={id} role="tooltip" hidden={!open}>
      {open && <motion.span initial={reducedMotion || system ? false : { y: 4, scale: .94, opacity: .65 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={reducedMotion || system ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 32 }}>{description}</motion.span>}
    </span>
  </span>;
}
