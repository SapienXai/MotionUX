"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import "./pagination-dots.css";

export function PaginationDots({ count, value, defaultValue = 0, onValueChange, label = "Pagination", pageLabel = "Page", previousLabel = "Previous", nextLabel = "Next", className, reducedMotion }: {
  count: number; value?: number; defaultValue?: number; onValueChange?: (page: number) => void;
  label?: string; pageLabel?: string; previousLabel?: string; nextLabel?: string; className?: string; reducedMotion?: boolean;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const [localValue, setLocalValue] = useState(defaultValue);
  const pages = Number.isSafeInteger(count) ? Math.max(0, count) : 0;
  const input = value ?? localValue;
  const active = Math.min(pages - 1, Math.max(0, Number.isFinite(input) ? Math.trunc(input) : 0));
  function select(page: number) {
    if (page === active || page < 0 || page >= pages) return;
    if (value === undefined) setLocalValue(page);
    onValueChange?.(page);
  }
  if (!pages) return null;
  return <div className={className} role="group" aria-label={label} data-mx-pagination="">
    <button type="button" aria-label={previousLabel} disabled={active === 0} onClick={() => select(active - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
    <div className="mx-page-dots">
      {Array.from({ length: pages }, (_, i) => <button type="button" key={i} aria-label={`${pageLabel} ${i + 1}`}
        aria-current={active === i ? "true" : undefined} onClick={() => select(i)}>
        <span className="mx-page-seed" aria-hidden="true" />
        {active === i && (pref || reducedMotion ? <span className="mx-page-current" aria-hidden="true" /> :
          <motion.span className="mx-page-current" layoutId={id} initial={false} transition={{ type: "spring", stiffness: 420, damping: 38 }} aria-hidden="true" />)}
      </button>)}
    </div>
    <button type="button" aria-label={nextLabel} disabled={active === pages - 1} onClick={() => select(active + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
  </div>;
}
