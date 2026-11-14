"use client";

import { motion } from "motion/react";
import { ActionOutcome } from "../feedback/feedback-actions";
import { PresetFrame } from "./preset-frame";

export type OutcomeState = "idle" | "pending" | "success" | "error";
export function LoadingOutcome({ state, onStart, reducedMotion, labels, simulation = false }: {
  state: OutcomeState; onStart: () => void; reducedMotion?: boolean;
  labels?: Partial<Record<OutcomeState | "start" | "rerun" | "simulation", string>>; simulation?: boolean;
}) {
  const words = { idle: "Ready", pending: "Waiting…", success: "Completed", error: "Failed. Try again.",
    start: "Processing… start simulation", rerun: "Processing… completed. Run again", simulation: "Simulation", ...labels };
  return <PresetFrame reducedMotion={reducedMotion}>
    <div className="mx-feature-loading" data-outcome={state}>
      <button className="mx-feature-process" type="button" aria-label={simulation ? state === "success" ? words.rerun : words.start : undefined}
        aria-disabled={state === "pending"} onClick={() => { if (state !== "pending") onStart(); }}>
        <span className="mx-processing-ring" aria-hidden="true" />{labels?.start && !simulation ? labels.start : simulation ? "Processing…" : "Run action"}
      </button>
      {simulation && <small>{words.simulation}</small>}
      <svg className="mx-feature-transition-arrow" aria-hidden="true" width="45" height="29" viewBox="0 0 45 29" fill="none"><path d="M2 3h13c11 0 16 8 18 20m-8-4 9 6 6-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <motion.div className="mx-feature-result" initial={false}
        animate={{ opacity: state === "pending" ? .75 : 1, y: state === "pending" && !reducedMotion ? 6 : 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 32 }}>
        <ActionOutcome state={state} label={words[state]} reducedMotion={reducedMotion} />
      </motion.div>
    </div>
  </PresetFrame>;
}
