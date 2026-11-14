"use client";

import { Fingerprint, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useId, useRef, useState, type ReactNode } from "react";
import "./goo-studies.css";

const settle = { type: "spring", stiffness: 350, damping: 28, mass: .7 } as const;
const shapes = [
  "M12 40 C12 22 25 13 44 13 C57 13 60 24 72 24 C84 24 90 16 103 18 C123 21 133 30 133 46 C133 61 119 73 100 72 C84 72 83 61 68 61 C53 61 50 73 35 70 C20 68 12 57 12 40Z",
  "M12 40 C13 24 31 18 47 20 C62 22 67 9 82 9 C95 9 103 24 107 34 C112 45 129 50 129 63 C129 76 111 80 96 73 C80 66 77 58 65 60 C51 62 48 74 34 74 C18 74 11 58 12 40Z",
];

export function GooMorph({ label, names, index, onIndexChange, reducedMotion, duration = .42 }: {
  label: string; names: readonly [string, string]; index: 0 | 1; onIndexChange: (index: 0 | 1) => void; reducedMotion?: boolean; duration?: number;
}) {
  const system = useReducedMotion();
  return <div data-mx-goo="morph">
    <svg viewBox="0 0 144 84" aria-hidden="true">
      <motion.path initial={false} animate={{ d: shapes[index] }} transition={system || reducedMotion ? { duration: 0 } : { duration: Number.isFinite(duration) ? Math.max(.16, Math.min(.9, duration)) : .42, ease: [.2,.83,.26,1] }} />
    </svg>
    <button type="button" aria-label={label} onClick={() => onIndexChange(index === 0 ? 1 : 0)}>{label}</button>
    <span role="status">{names[index]}</span>
  </div>;
}

export function GooMenu({ label, actions, onAction, reducedMotion, open: controlledOpen, onOpenChange, layout = "row" }: {
  label: string; actions: readonly { id: string; label: string; icon: ReactNode }[]; onAction: (id: string) => void; reducedMotion?: boolean;
  open?: boolean; onOpenChange?: (open: boolean) => void; layout?: "arc" | "row";
}) {
  const [local, setLocal] = useState(false);
  const open = controlledOpen ?? local;
  function setOpen(value: boolean) {
    if (controlledOpen === undefined) setLocal(value);
    onOpenChange?.(value);
  }
  const button = useRef<HTMLButtonElement>(null);
  const options = useRef<HTMLDivElement>(null);
  const requestFocus = useRef(false);
  useLayoutEffect(() => {
    if (open && requestFocus.current) {
      requestFocus.current = false;
      options.current?.querySelector("button")?.focus();
    }
  }, [open]);
  const id = useId();
  const system = useReducedMotion();
  const quiet = system || reducedMotion;
  const filter = "goo-" + id.replace(/[^a-z0-9]/gi, "");
  const arc = layout === "arc" && actions.length <= 4;
  const positions = actions.map((_, index) => {
    if (!arc) return { x: (index + 1) * 48, y: 0 };
    const angle = Math.PI * (1.12 + .76 * (actions.length === 1 ? .5 : index / (actions.length - 1)));
    return { x: Math.cos(angle) * 94, y: Math.sin(angle) * 94 };
  });
  function close() { setOpen(false); button.current?.focus(); }
  return <div data-mx-goo="menu" data-layout={arc ? "arc" : "row"} data-open={open} data-reduced={quiet || undefined} onKeyDown={(event) => {
    if (open && event.key === "Escape") { event.stopPropagation(); close(); }
  }}>
    <button type="button" ref={button} className="mx-goo-trigger" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" || !actions.length) return;
        event.preventDefault();
        if (open) options.current?.querySelector("button")?.focus();
        else { requestFocus.current = true; setOpen(true); }
      }}>
      <motion.span animate={{ rotate: open && !quiet ? 45 : 0 }} transition={quiet ? { duration: 0 } : settle}><Plus aria-hidden="true" size={22} /></motion.span>
    </button>
    {!quiet && actions.length > 0 && actions.length <= 4 && <svg className="mx-goo-lobes" aria-hidden="true" width={arc ? 256 : 52 + 48 * actions.length} height={arc ? 174 : 54}>
      <defs><filter id={filter}><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
      </filter></defs>
      <g filter={`url(#${filter})`}>
        <circle cx={arc ? 128 : 22} cy={arc ? 134 : 27} r={arc ? 29 : 21} />
        {actions.map(({ id: actionID }, i) => <motion.circle key={actionID} cx={arc ? 128 : 22} cy={arc ? 134 : 27} r="21" initial={false}
          animate={open ? positions[i] : { x: 0, y: 0 }} transition={{ ...settle, delay: open ? i * .035 : (actions.length - i - 1) * .02 }} />)}
      </g>
    </svg>}
    <div id={id} ref={options} inert={!open} className="mx-goo-options">
      <AnimatePresence initial={false}>{open && actions.map((action, index) => <motion.button type="button" key={action.id}
        initial={quiet ? false : { x: arc ? 0 : -30, y: 0, scale: .6, opacity: 0 }}
        animate={{ ...(arc ? positions[index] : { x: 0, y: 0 }), scale: 1, opacity: 1 }}
        exit={{ x: quiet || arc ? 0 : -20, y: 0, scale: quiet ? 1 : .75, opacity: 0 }}
        transition={quiet ? { duration: 0 } : { ...settle, delay: index * .03 }}
        aria-label={action.label} onClick={() => { close(); onAction(action.id); }}>{action.icon}</motion.button>)}</AnimatePresence>
    </div>
  </div>;
}

export function SimulatedUnlock({ label, animationLabel, status, phase, onRun, reducedMotion }: {
  label: string; animationLabel: string; status: string; phase: "idle" | "preview" | "done"; onRun: () => void; reducedMotion?: boolean;
}) {
  const system = useReducedMotion();
  const quiet = system || reducedMotion;
  return <div data-mx-goo="unlock">
    <motion.div className="mx-unlock-art" aria-hidden="true" initial={false}
      animate={{ scale: !quiet && phase === "preview" ? 1.14 : 1, rotate: !quiet && phase === "preview" ? -6 : 0 }}
      transition={quiet ? { duration: 0 } : settle}><Fingerprint size={37} /></motion.div>
    <strong>{animationLabel}</strong>
    <span role="status">{status}</span>
    <button type="button" disabled={phase === "preview"} onClick={onRun}>{label}</button>
  </div>;
}
