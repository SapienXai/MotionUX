"use client";

import { Layers3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import "./stack-panel.css";

type Panel = { value: string; title: string; body: ReactNode };
export function StackPanel({ label, panels, value, defaultValue, onValueChange, reducedMotion, className }: {
  label: string; panels: readonly Panel[]; value?: string; defaultValue?: string;
  onValueChange?: (value: string) => void; reducedMotion?: boolean; className?: string;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const [active, setActive] = useState(defaultValue);
  const selected = value ?? active;
  return <section aria-label={label} data-mx-stack="" className={className}>
    {panels.map(({ title, value: key, body }, index) => {
      const open = selected === key;
      return <motion.div key={key} layout={!(pref || reducedMotion)}
        transition={{ type: "spring", stiffness: 365, damping: 32 }} data-open={open}>
        <button type="button" aria-expanded={open} aria-controls={`${id}-${index}`} onClick={() => {
          const next = open ? "" : key;
          if (value === undefined) setActive(next);
          onValueChange?.(next);
        }}><Layers3 size={17} aria-hidden />{title}</button>
        <div className="mx-stack-body" id={`${id}-${index}`} hidden={!open}>
          {open && <motion.div initial={pref || reducedMotion ? false : { opacity: .6, y: -4 }} animate={{ opacity: 1, y: 0 }}>{body}</motion.div>}
        </div>
      </motion.div>;
    })}
  </section>;
}
