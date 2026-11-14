"use client";

import { Check, Minus, Plus, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type CSSProperties, type PointerEvent } from "react";
import "./value-controls.css";

type RangeProps = {
  label: string; value: number; onValueChange: (value: number) => void;
  min?: number; max?: number; step?: number; disabled?: boolean; name?: string;
  format?: (value: number) => string;
};

function bounds(min: number, max: number) {
  const low = Number.isFinite(min) ? min : 0;
  return [low, Number.isFinite(max) ? Math.max(low, max) : Math.max(low, 100)] as const;
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.max(min, Math.min(value, max)) : min;
}

export function ValueSlider({ label, value, onValueChange, min = 0, max = 100, step = 1, disabled, name, format = String, variant = "jelly", reducedMotion, elasticity = .32 }: RangeProps & {
  variant?: "jelly" | "exposure" | "dial"; reducedMotion?: boolean; elasticity?: number;
}) {
  const id = useId();
  const system = useReducedMotion();
  const [active, setActive] = useState(false);
  const [low, high] = bounds(min, max);
  const current = clamp(value, low, high);
  const fraction = high === low ? 0 : (current - low) / (high - low);
  const text = format(current);
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const squeeze = Number.isFinite(elasticity) ? clamp(elasticity, 0, .5) : .32;
  const spring = system || reducedMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 24, mass: .65 };
  function rotate(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = rect.top + rect.height / 2 - event.clientY;
    if (Math.hypot(x, y) < 8) return;
    const angle = Math.atan2(x, y) * 180 / Math.PI;
    const raw = (clamp(angle, -125, 125) + 125) / 250 * (high - low);
    onValueChange(clamp(low + Math.round(raw / increment) * increment, low, high));
  }
  return <div data-mx-values={variant}>
    <div className="mx-value-heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{text}</output></div>
    {variant === "dial" && <div className="mx-value-dial" aria-hidden="true" data-disabled={disabled || high === low}
      onPointerDown={(event) => {
        if (disabled || high === low || !event.isPrimary || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        rotate(event);
      }} onPointerMove={(event) => {
        if (!disabled && event.currentTarget.hasPointerCapture(event.pointerId)) rotate(event);
      }}>
      <motion.i initial={false} animate={{ rotate: fraction * 250 - 125 }} transition={spring} />
    </div>}
    <div className="mx-value-track" style={{ "--mx-value-progress": `${fraction * 100}%` } as CSSProperties}>
      <input id={id} name={name} type="range" disabled={disabled || high === low} min={low} max={high} step={increment}
        value={current} aria-valuetext={text} onChange={(event) => onValueChange(event.target.valueAsNumber)}
        onPointerDown={() => setActive(true)} onPointerUp={() => setActive(false)} onPointerCancel={() => setActive(false)}
        onPointerLeave={() => setActive(false)} onLostPointerCapture={() => setActive(false)} onBlur={() => setActive(false)} />
      {variant === "jelly" && <span className="mx-jelly-guide" aria-hidden="true">
        <motion.i initial={false} animate={{ scaleX: active && !(system || reducedMotion) ? 1 + squeeze : 1, scaleY: active && !(system || reducedMotion) ? 1 - squeeze * .625 : 1 }} transition={spring} />
      </span>}
    </div>
  </div>;
}

export function RangePair({ label, low, high, onValueChange, min = 0, max = 100, step, disabled, minimumLabel, maximumLabel, format, minimumName, maximumName }: {
  label: string; low: number; high: number; onValueChange: (value: [number, number]) => void;
  min?: number; max?: number; step?: number; disabled?: boolean; minimumLabel: string; maximumLabel: string;
  format?: (value: number) => string; minimumName?: string; maximumName?: string;
}) {
  const [start, end] = bounds(min, max);
  const first = clamp(low, start, end);
  const last = clamp(high, first, end);
  return <fieldset data-mx-values="pair"><legend>{label}</legend>
    <PairEndpoint label={minimumLabel} min={start} max={end} step={step} disabled={disabled} name={minimumName}
      value={first} format={format} onValueChange={(value) => onValueChange([Math.min(value, last), last])} />
    <PairEndpoint label={maximumLabel} min={start} max={end} step={step} disabled={disabled} name={maximumName}
      value={last} format={format} onValueChange={(value) => onValueChange([first, Math.max(value, first)])} />
  </fieldset>;
}

function PairEndpoint({ label, min, max, step, value, name, disabled, onValueChange, format = String }: RangeProps) {
  const id = useId();
  return <label htmlFor={id} className="mx-pair-endpoint"><span>{label}</span><output htmlFor={id}>{format(value)}</output>
    <input id={id} type="range" name={name} min={min} max={max} step={step} value={value} disabled={disabled}
      aria-valuetext={format(value)} onChange={(event) => onValueChange(event.target.valueAsNumber)} />
  </label>;
}

export function NumberStepper({ label, value, onValueChange, min = 0, max = 99, step = 1, name, disabled, minusLabel = "Decrease", plusLabel = "Increase" }: Omit<RangeProps, "format"> & {
  minusLabel?: string; plusLabel?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [low, high] = bounds(min, max);
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const current = clamp(value, low, high);
  return <div data-mx-values="stepper">
    <label htmlFor={id}>{label}</label>
    <div className="mx-stepper">
      <button type="button" aria-label={minusLabel} disabled={disabled || current <= low}
        onClick={() => { setDraft(null); onValueChange(clamp(current - increment, low, high)); }}><Minus size={17} aria-hidden="true" /></button>
      <input id={id} type="number" name={name} min={low} max={high} step={increment} disabled={disabled}
        value={draft ?? current} onChange={(event) => {
          setDraft(event.target.value);
          if (event.currentTarget.validity.valid && Number.isFinite(event.target.valueAsNumber)) onValueChange(event.target.valueAsNumber);
        }} onBlur={() => setDraft(null)} />
      <button type="button" aria-label={plusLabel} disabled={disabled || current >= high}
        onClick={() => { setDraft(null); onValueChange(clamp(current + increment, low, high)); }}><Plus size={17} aria-hidden="true" /></button>
    </div>
  </div>;
}

export type Choice = { value: string; label: string; disabled?: boolean };
export function CheckboxList({ label, choices, value, onValueChange, name, disabled, describe }: {
  label: string; choices: readonly Choice[]; value: readonly string[]; onValueChange: (value: string[]) => void;
  name?: string; disabled?: boolean; describe: (count: number) => string;
}) {
  const id = useId();
  return <fieldset data-mx-values="checkbox" disabled={disabled} aria-describedby={id}>
    <legend>{label}</legend>
    {choices.map((choice) => <label key={choice.value} className="mx-check-option">
      <input name={name} type="checkbox" value={choice.value} checked={value.includes(choice.value)} disabled={choice.disabled}
        onChange={(event) => onValueChange(event.target.checked ? [...value, choice.value] : value.filter((item) => item !== choice.value))} />
      <span>{choice.label}</span><Check size={16} aria-hidden="true" />
    </label>)}
    <p id={id}>{describe(value.length)}</p>
  </fieldset>;
}

export function StarRating({ label, value, onValueChange, describe, max = 5, disabled, name }: {
  label: string; value: number; onValueChange: (value: number) => void; describe: (value: number) => string; max?: number;
  disabled?: boolean; name?: string;
}) {
  const id = useId();
  const count = Number.isFinite(max) ? Math.max(1, Math.min(10, Math.floor(max))) : 5;
  return <fieldset data-mx-values="rating" disabled={disabled}><legend>{label}</legend>
    <div className="mx-stars">
      {Array.from({ length: count }, (_, index) => index + 1).map((rating) => <label key={rating} data-lit={rating <= value}>
        <input name={name ?? id} type="radio" value={rating} checked={rating === value} aria-label={describe(rating)}
          onChange={() => onValueChange(rating)} /><Star aria-hidden="true" size={24} />
      </label>)}
    </div>
  </fieldset>;
}
