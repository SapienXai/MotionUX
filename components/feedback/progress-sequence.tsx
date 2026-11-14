"use client";

import { Check, ChevronDown, CircleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import "./progress-sequence.css";

export type ProgressStage = { id: string; label: string; detail?: ReactNode; state: "complete" | "current" | "upcoming" | "error" };
export function ProgressSequence({ label, stages, variant = "linear", reducedMotion, className }: {
  label: string; stages: readonly ProgressStage[]; variant?: "linear" | "expandable"; reducedMotion?: boolean; className?: string;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const [open, setOpen] = useState<string>();
  const portion = stages.length > 1 ? Math.min(1, stages.filter((item) => item.state === "complete").length / (stages.length - 1)) : Number(stages[0]?.state === "complete");
  return <div className={className} data-mx-sequence={variant}>
    {variant === "linear" && <div className="mx-sequence-track" aria-hidden="true">
      {pref || reducedMotion ? <span style={{ transform: `scaleX(${portion})` }} />
        : <motion.span initial={false} animate={{ scaleX: portion }} transition={{ type: "spring", stiffness: 390, damping: 32 }} />}
    </div>}
    <ol aria-label={label}>
      {stages.map((stage, index) => {
        const detailId = `${id}-${index}`;
        return <li key={stage.id} data-state={stage.state} aria-current={stage.state === "current" ? "step" : undefined}>
          <span className="mx-sequence-node" aria-hidden="true">{stage.state === "complete" ? <Check size={15} /> : stage.state === "error" ? <CircleAlert size={15} /> : index + 1}</span>
          {variant === "expandable" && stage.detail ? <div>
            <button type="button" aria-expanded={open === stage.id} aria-controls={detailId} onClick={() => setOpen(open === stage.id ? undefined : stage.id)}>
              {stage.label}<ChevronDown size={15} aria-hidden />
            </button>
            <div id={detailId} hidden={open !== stage.id}>{stage.detail}</div>
          </div> : <span>{stage.label}</span>}
        </li>;
      })}
    </ol>
  </div>;
}
