"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

export type BillingPeriodValue = "monthly" | "yearly";

export interface BillingPeriodProps {
  value: BillingPeriodValue;
  onChange: (value: BillingPeriodValue) => void;
  label: string;
  monthlyLabel: string;
  yearlyLabel: string;
  className?: string;
}

export default function BillingPeriod({ value, onChange, label, monthlyLabel, yearlyLabel, className }: BillingPeriodProps) {
  const name = useId();
  const reduce = useReducedMotion();
  const options = [{ value: "monthly", label: monthlyLabel }, { value: "yearly", label: yearlyLabel }] as const;
  return <fieldset className={["mx-billing-period", className].filter(Boolean).join(" ")}>
    <legend>{label}</legend>
    <div className="mx-billing-options">
      {options.map((option) => <label className="mx-billing-option" key={option.value}>
        <input type="radio" name={name} value={option.value} checked={value === option.value}
          onChange={() => onChange(option.value)} />
        {value === option.value && <motion.span aria-hidden="true" className="mx-billing-indicator" layoutId={name}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 39 }} />}
        <span className="mx-billing-label">{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}
