"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import "./motion-selector.css";

type Option = { value: string; label: string; icon?: ReactNode; disabled?: boolean; panel?: ReactNode };
type Common = {
  label: string;
  options: readonly Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  reducedMotion?: boolean;
};
const spring = { type: "spring", stiffness: 420, damping: 38 } as const;

function useSelection({ options, defaultValue, value, onValueChange }: Common) {
  const [internal, setInternal] = useState(defaultValue);
  const requested = value ?? internal;
  const selected = options.some((item) => item.value === requested && !item.disabled)
    ? requested : options.find((item) => !item.disabled)?.value;
  function select(next: string) {
    if (next === selected) return;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }
  return { selected, select };
}

function Indicator({ id, reduced }: { id: string; reduced?: boolean }) {
  const pref = useReducedMotion();
  return reduced || pref
    ? <span className="mx-selector-indicator" aria-hidden="true" />
    : <motion.span className="mx-selector-indicator" layoutId={id} initial={false} transition={spring} aria-hidden="true" />;
}

export function TabPill(props: Common) {
  const { options, label, className, reducedMotion } = props;
  const id = useId();
  const { selected, select } = useSelection(props);

  function keydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const enabled = options.map((option, i) => option.disabled ? -1 : i).filter((i) => i >= 0);
    const position = enabled.indexOf(index);
    const direction = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
    const next = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) :
      enabled[(position + direction + enabled.length) % enabled.length];
    if (next === undefined) return;
    const control = document.getElementById(`${id}-tab-${next}`);
    control?.focus();
    select(options[next].value);
  }

  return <div className={className} data-mx-selector="tabs">
    <div className="mx-selector-track" role="tablist" aria-label={label}>
      {options.map((item, i) => <button type="button" role="tab" id={`${id}-tab-${i}`} key={item.value}
        aria-controls={`${id}-panel-${i}`} aria-selected={selected === item.value}
        tabIndex={selected === item.value ? 0 : -1} disabled={item.disabled}
        onClick={() => select(item.value)} onKeyDown={(event) => keydown(event, i)}>
        {selected === item.value && <Indicator id={id} reduced={reducedMotion} />}
        <span>{item.icon}{item.label}</span>
      </button>)}
    </div>
    {options.map((item, i) => <div key={item.value} role="tabpanel" aria-labelledby={`${id}-tab-${i}`}
      id={`${id}-panel-${i}`} hidden={selected !== item.value} tabIndex={selected === item.value ? 0 : undefined}
      className="mx-selector-panel">{item.panel}</div>)}
  </div>;
}

export function SegmentedControl(props: Common & { name?: string }) {
  const id = useId();
  const { selected, select } = useSelection(props);
  return <fieldset data-mx-selector="radio" className={props.className}>
    <legend>{props.label}</legend>
    <div className="mx-selector-track">
      {props.options.map((item) => <label key={item.value} data-checked={selected === item.value} data-disabled={item.disabled}>
        <input type="radio" name={props.name ?? id} value={item.value} disabled={item.disabled}
          checked={selected === item.value} onChange={() => select(item.value)} />
        {selected === item.value && <Indicator id={id} reduced={props.reducedMotion} />}
        <span>{item.icon}{item.label}</span>
      </label>)}
    </div>
  </fieldset>;
}

type Destination = { href: string; label: string; icon: ReactNode };
export function BottomBar({ label, links, activeHref, className, reducedMotion, onNavigate }: {
  label: string; links: readonly Destination[]; activeHref: string; className?: string; reducedMotion?: boolean; onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const id = useId();
  return <nav aria-label={label} data-mx-selector="dock" className={className}>
    <div className="mx-selector-track">
      {links.map((item) => <a key={item.href} href={item.href} aria-current={activeHref === item.href ? "page" : undefined}
        onClick={(event) => onNavigate?.(event, item.href)}>
        {activeHref === item.href && <Indicator id={id} reduced={reducedMotion} />}
        <span><span aria-hidden="true">{item.icon}</span>{item.label}</span>
      </a>)}
    </div>
  </nav>;
}
