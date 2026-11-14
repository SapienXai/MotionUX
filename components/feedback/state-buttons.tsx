"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import "./state-buttons.css";

type SwitchProps = { label: string; name?: string; checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean; reducedMotion?: boolean; className?: string };

export function ToggleSwitch({ label, name, checked, defaultChecked = false, onCheckedChange, disabled, reducedMotion, className }: SwitchProps) {
  const pref = useReducedMotion();
  const [internal, setInternal] = useState(defaultChecked);
  const active = checked ?? internal;
  return <label className={className} data-mx-switch="" data-active={active}>
    <input type="checkbox" role="switch" name={name} checked={active} disabled={disabled} onChange={(event) => {
      if (checked === undefined) setInternal(event.target.checked);
      onCheckedChange?.(event.target.checked);
    }} /><span className="mx-switch-track" aria-hidden="true">
      {pref || reducedMotion ? <span className="mx-switch-thumb" /> :
        <motion.span className="mx-switch-thumb" layout initial={false} transition={{ type: "spring", stiffness: 455, damping: 30 }} />}
    </span><span>{label}</span>
  </label>;
}

export function PlanSwitch({ label, name = "billing-cycle", annual, defaultAnnual = false, onAnnualChange, monthlyLabel = "Monthly", annualLabel = "Annual", reducedMotion, children, className }: {
  label: string; name?: string; annual?: boolean; defaultAnnual?: boolean; onAnnualChange?: (annual: boolean) => void;
  monthlyLabel?: string; annualLabel?: string; reducedMotion?: boolean; children: (annual: boolean) => ReactNode; className?: string;
}) {
  const pref = useReducedMotion();
  const [internal, setInternal] = useState(defaultAnnual);
  const active = annual ?? internal;
  return <fieldset className={className} data-mx-plan="" data-annual={active}><legend>{label}</legend>
    <div className="mx-plan-switch">
      {pref || reducedMotion ? <span className="mx-plan-highlight" aria-hidden="true" /> :
        <motion.span className="mx-plan-highlight" layout initial={false} transition={{ type: "spring", stiffness: 435, damping: 35 }} aria-hidden="true" />}
      {[monthlyLabel, annualLabel].map((text, index) => <label key={index}>
        <input type="radio" name={name} value={index ? "annual" : "monthly"} checked={Boolean(index) === active} onChange={() => {
          if (annual === undefined) setInternal(Boolean(index));
          onAnnualChange?.(Boolean(index));
        }} /><span>{text}</span>
      </label>)}
    </div>
    <div className="mx-plan-content">{children(active)}</div>
  </fieldset>;
}

export function CommandButton({ label, shortcutLabel, chord, onExecute, variant = "engraved", disabled, className }: {
  label: string; shortcutLabel: string;
  chord?: { key: string; modifier: "ctrl" | "meta" | "alt"; shift?: boolean };
  onExecute: () => void; variant?: "engraved" | "tile"; disabled?: boolean; className?: string;
}) {
  useEffect(() => {
    if (!chord || disabled) return;
    function keydown(event: KeyboardEvent) {
      if (!chord || event.defaultPrevented || event.repeat || event.isComposing) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest("input, textarea, select"))) return;
      if (event.key.toLowerCase() !== chord.key.toLowerCase() || event.ctrlKey !== (chord.modifier === "ctrl") ||
          event.metaKey !== (chord.modifier === "meta") || event.altKey !== (chord.modifier === "alt") ||
          event.shiftKey !== Boolean(chord.shift)) return;
      event.preventDefault();
      onExecute();
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [chord, disabled, onExecute]);
  const shortcut = chord ? `${{ ctrl: "Control", meta: "Meta", alt: "Alt" }[chord.modifier]}${chord.shift ? "+Shift" : ""}+${chord.key}` : undefined;
  return <button type="button" className={className} data-mx-command-button={variant} aria-keyshortcuts={shortcut}
    onClick={onExecute} disabled={disabled}>{label}<kbd aria-hidden="true">{shortcutLabel}</kbd></button>;
}
