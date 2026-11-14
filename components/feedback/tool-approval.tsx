"use client";

import { CircleHelp, ShieldCheck, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import "./tool-approval.css";

export function ToolApproval({ title, description, parameterSummary, state, onDecision, approveLabel = "Allow", denyLabel = "Deny", className }: {
  title: string; description: string; parameterSummary?: ReactNode; state: "pending" | "approved" | "denied" | "error";
  onDecision: (allowed: boolean) => void; approveLabel?: string; denyLabel?: string; className?: string;
}) {
  const Icon = state === "approved" ? ShieldCheck : state === "pending" ? CircleHelp : X;
  return <section data-mx-approval={state} className={className} aria-label={title}>
    <div><Icon size={22} aria-hidden /><strong>{title}</strong></div>
    <p role="status">{description}</p>{parameterSummary}
    {state === "pending" && <div className="mx-approval-actions">
      <button type="button" onClick={() => onDecision(false)}>{denyLabel}</button>
      <button type="button" onClick={() => onDecision(true)}>{approveLabel}</button>
    </div>}
  </section>;
}

export function GooThinking({ label, pending, reducedMotion, className }: { label: string; pending: boolean; reducedMotion?: boolean; className?: string }) {
  const system = useReducedMotion();
  const reduce = system || reducedMotion;
  return <div role="status" className={className} data-mx-thinking="" data-pending={pending}>
    <span className="mx-thinking-shape" aria-hidden="true">
      {[-1, 0, 1].map((sign) => <motion.i key={sign} initial={pending && !reduce ? { x: sign * 7, scale: .75 } : false}
        animate={pending && !reduce ? { x: [sign * 7, sign * 11, sign * 7], scale: [.75, 1, .9] } : { x: sign * 7, scale: .9 }}
        transition={pending && !reduce ? { duration: .65, delay: Math.abs(sign) * .035 } : { duration: 0 }} />)}
    </span><span>{label}</span>
  </div>;
}
