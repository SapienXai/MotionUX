"use client";

import { Check, Mic, Square, Waves } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import "./async-feedback.css";

export function StreamingReply({ label, summary, text, pending, onStop, stopLabel }: {
  label: string; summary: string; text: string; pending: boolean; stopLabel: string; onStop: () => void;
}) {
  return <section data-mx-async="reply" aria-label={label}>
    <div className="mx-async-header"><strong>{label}</strong><span role="status">{summary}</span></div>
    <p className="mx-reply-copy" aria-busy={pending}>{text}</p>
    {pending && <button type="button" onClick={onStop}><Square size={15} aria-hidden="true" />{stopLabel}</button>}
  </section>;
}

export function VoiceInput({ state, status, startLabel, stopLabel, onStart, onStop, disabled, reducedMotion }: {
  state: "idle" | "recording" | "processing"; status: string; startLabel: string; stopLabel: string;
  onStart: () => void; onStop: () => void; disabled?: boolean; reducedMotion?: boolean;
}) {
  const system = useReducedMotion();
  const active = state === "recording";
  return <div data-mx-async="voice">
    <div className="mx-waveform" aria-hidden="true">
      {[.32,.74,.45,.88,.57,.98,.54,.83,.48,.61,.29].map((height, index) =>
        <motion.i key={index} initial={false} animate={{ scaleY: active ? height : .18 }}
          transition={system || reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 25, delay: index * .022 }} />)}
    </div>
    <span role="status">{status}</span>
    <button type="button" disabled={disabled || state === "processing"} onClick={active ? onStop : onStart}>
      {active ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}{active ? stopLabel : startLabel}
    </button>
  </div>;
}

export function ThinkingText({ phase, status, pending }: { phase: string; status: string; pending: boolean }) {
  return <div data-mx-async="thinking">
    <Waves size={19} aria-hidden="true" /><span data-pending={pending}>{phase}</span><span className="mx-async-assist" role="status">{status}</span>
  </div>;
}

export function TaskList({ label, tasks, onToggle, describe }: {
  label: string; tasks: readonly { id: string; label: string; complete: boolean; disabled?: boolean }[];
  onToggle: (id: string, complete: boolean) => void; describe: (complete: number, total: number) => string;
}) {
  const id = useId();
  return <fieldset data-mx-async="tasks" aria-describedby={id}>
    <legend>{label}</legend>
    <ul>{tasks.map((task) => <li key={task.id}><label data-complete={task.complete}>
      <input type="checkbox" checked={task.complete} disabled={task.disabled} onChange={(event) => onToggle(task.id, event.target.checked)} />
      <span>{task.label}</span><Check size={16} aria-hidden="true" />
    </label></li>)}</ul>
    <p id={id}>{describe(tasks.filter((task) => task.complete).length, tasks.length)}</p>
  </fieldset>;
}
