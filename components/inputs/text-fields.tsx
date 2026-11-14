"use client";

import { Check, Hash, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import "./text-fields.css";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onCompositionStart" | "onCompositionEnd"> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
};

export function SpringField({ label, value, onValueChange, hint, error, className, id: suppliedId, ...props }: FieldProps) {
  const id = useId();
  const fieldId = suppliedId ?? id;
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  return <div className={className} data-mx-field>
    <label htmlFor={fieldId}>{label}</label>
    <div className="mx-field-spring" data-invalid={Boolean(error)}>
      <input {...props} id={fieldId} value={value} aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? fieldId + "-note" : props["aria-describedby"]}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} />
      <motion.i aria-hidden="true" initial={false} animate={{ scaleX: focused ? 1 : 0.78, opacity: focused ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 35, mass: 0.6 }} />
    </div>
    {(error || hint) && <span id={fieldId + "-note"}>{error || hint}</span>}
  </div>;
}

function graphemes(value: string, locale: string | undefined) {
  if (typeof Intl.Segmenter !== "function") return [...value];
  return Array.from(new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(value), ({ segment }) => segment);
}

export function LetterLimit({ label, value, onValueChange, limit, locale, name, disabled, required, describe }: {
  label: string; value: string; onValueChange: (value: string) => void; limit: number; locale?: string;
  name?: string; disabled?: boolean; required?: boolean; describe: (remaining: number) => string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const cap = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;
  const remaining = cap - graphemes(draft ?? value, locale).length;
  return <div data-mx-field>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} name={name} disabled={disabled} required={required} rows={3} aria-describedby={id + "-count"}
      value={draft ?? value}
      onCompositionStart={(event) => setDraft(event.currentTarget.value)}
      onCompositionEnd={(event) => { setDraft(null); onValueChange(graphemes(event.currentTarget.value, locale).slice(0, cap).join("")); }}
      onChange={(event) => {
        if (draft !== null) setDraft(event.target.value);
        else onValueChange(graphemes(event.target.value, locale).slice(0, cap).join(""));
      }} />
    <span id={id + "-count"} data-at-limit={remaining <= 0}>{describe(Math.max(0, remaining))}</span>
  </div>;
}

export function OtpCode({ label, value, onValueChange, length = 6, name, disabled, required }: {
  label: string; value: string; onValueChange: (value: string) => void; length?: number;
  name?: string; disabled?: boolean; required?: boolean;
}) {
  const id = useId();
  const count = Math.min(12, Math.max(1, Math.floor(length) || 6));
  return <div data-mx-field>
    <label htmlFor={id}>{label}</label>
    <div className="mx-otp-field">
      <Hash aria-hidden="true" size={18} />
      <input id={id} name={name} value={value} type="text" inputMode="numeric" autoComplete="one-time-code"
        disabled={disabled} required={required} pattern={`[0-9]{${count}}`}
        onChange={(event) => onValueChange(event.target.value.replace(/[^0-9]/g, "").slice(0, count))} />
    </div>
    <div className="mx-otp-track" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <span key={index} data-filled={index < value.length} />)}
    </div>
  </div>;
}

export function TagInput({ label, value, onValueChange, removeLabel, name, disabled, limit = 6, addLabel = "Add" }: {
  label: string; value: readonly string[]; onValueChange: (value: string[]) => void; removeLabel: (tag: string) => string;
  name?: string; disabled?: boolean; limit?: number; addLabel?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const next = draft.trim();
  const canAdd = next.length > 0 && value.length < limit && !value.includes(next);
  function commit() {
    if (!canAdd) return;
    onValueChange([...value, next]);
    setDraft("");
  }
  return <div data-mx-field>
    <label htmlFor={id}>{label}</label>
    {value.length > 0 && <ul className="mx-tag-list">
      {value.map((tag) => <li key={tag}>
        {name && <input type="hidden" name={name} value={tag} disabled={disabled} />}
        <span>{tag}</span>
        <button type="button" aria-label={removeLabel(tag)} disabled={disabled}
          onClick={() => { onValueChange(value.filter((item) => item !== tag)); input.current?.focus(); }}><X size={14} aria-hidden="true" /></button>
      </li>)}
    </ul>}
    <div className="mx-field-inline">
      <input id={id} ref={input} value={draft} disabled={disabled} maxLength={60}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          commit();
        }} />
      <button type="button" disabled={disabled || !canAdd} onClick={commit}>{addLabel}</button>
    </div>
  </div>;
}

export type PasswordRule = { id: string; label: string; test: (value: string) => boolean };
export function PasswordStrength({ rules, describeRule, ...props }: Omit<FieldProps, "type" | "autoComplete"> & { rules: readonly PasswordRule[]; describeRule: (met: boolean) => string }) {
  return <SpringField {...props} type="password" autoComplete="new-password" hint={<span className="mx-password-rules">
    {rules.map((rule) => {
      const met = rule.test(props.value);
      return <span key={rule.id} data-met={met}><Check size={14} aria-hidden="true" />
        <span>{rule.label}</span><span className="mx-rule-semantics">{describeRule(met)}</span>
      </span>;
    })}
  </span>} />;
}
