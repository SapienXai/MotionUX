"use client";

import { ArrowUpRight, ChevronDown, Plane, UserRound } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type ReactNode } from "react";
import "./disclosure-cards.css";

const settle = { type: "spring", stiffness: 365, damping: 36, mass: .88 } as const;
type Variant = "expand" | "profile" | "boarding" | "island";

export function DisclosureCard({ title, subtitle, detail, variant = "expand", open, onOpenChange, openLabel, closeLabel, reducedMotion, image, layoutStiffness = settle.stiffness }: {
  title: string; subtitle?: string; detail: ReactNode; variant?: Variant; open?: boolean; onOpenChange?: (open: boolean) => void;
  openLabel: string; closeLabel: string; reducedMotion?: boolean; image?: { src: string; alt: string }; layoutStiffness?: number;
}) {
  const [local, setLocal] = useState(false);
  const expanded = open ?? local;
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const system = useReducedMotion();
  const quiet = system || reducedMotion;
  const stiffness = Number.isFinite(layoutStiffness) ? Math.min(700, Math.max(150, layoutStiffness)) : settle.stiffness;
  const transition = quiet ? { duration: 0 } : { ...settle, stiffness };
  const island = variant === "island";
  const Icon = variant === "boarding" ? Plane : variant === "profile" ? UserRound : variant === "island" ? ArrowUpRight : ChevronDown;
  function change(next: boolean) {
    if (!next) toggle.current?.focus({ preventScroll: true });
    if (open === undefined) setLocal(next);
    onOpenChange?.(next);
  }
  return <LayoutGroup id={id}>
    <motion.section data-mx-disclosure-card={variant} data-open={expanded} layout={quiet ? false : island ? true : "position"} transition={transition}
      onKeyDown={(event) => {
        if (expanded && event.key === "Escape" && !event.defaultPrevented) {
          event.stopPropagation();
          change(false);
        }
      }}>
      <motion.button layout={quiet ? false : "position"} transition={transition} type="button" ref={toggle} aria-controls={id} aria-expanded={expanded}
        className="mx-disclosure-card-toggle" onClick={() => change(!expanded)}>
        <motion.span className="mx-disclosure-card-icon" layoutId={quiet ? undefined : "emblem"} transition={transition}>
          {image ? <img src={image.src} alt={image.alt} /> : <Icon size={19} aria-hidden="true" />}
        </motion.span>
        <span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span>
        <span className="mx-disclosure-card-action">{expanded ? closeLabel : openLabel}</span>
      </motion.button>
      <div id={id} inert={!expanded}>
        <AnimatePresence initial={false}>
          {expanded && <motion.div className="mx-disclosure-card-detail"
            initial={quiet ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={transition}><div>{detail}</div></motion.div>}
        </AnimatePresence>
      </div>
    </motion.section>
  </LayoutGroup>;
}

export type MetricWindow = { id: string; label: string; value: string; trend: string; samples: readonly number[] };
export function StatCard({ title, windows, value, onValueChange, periodLabel, reducedMotion }: {
  title: string; windows: readonly MetricWindow[]; value: string; onValueChange: (id: string) => void; periodLabel: string; reducedMotion?: boolean;
}) {
  const group = useId();
  const system = useReducedMotion();
  const current = windows.find((window) => window.id === value) ?? windows[0];
  if (!current) return null;
  const samples = current.samples.filter(Number.isFinite).slice(0, 24);
  const max = Math.max(1, ...samples);
  return <section data-mx-disclosure-card="stats" aria-label={title}>
    <div className="mx-stat-heading"><strong>{title}</strong><span>{current.value}</span><small>{current.trend}</small></div>
    <div className="mx-stat-marks" aria-hidden="true">
      {samples.map((sample, index) => <motion.i key={index} initial={false} animate={{ scaleY: Math.max(.05, sample / max) }}
        transition={system || reducedMotion ? { duration: 0 } : settle} />)}
    </div>
    <fieldset className="mx-stat-period"><legend>{periodLabel}</legend>
      {windows.map((window) => <label key={window.id}>
        <input type="radio" name={group} checked={window.id === current.id} onChange={() => onValueChange(window.id)} /><span>{window.label}</span>
      </label>)}
    </fieldset>
  </section>;
}
