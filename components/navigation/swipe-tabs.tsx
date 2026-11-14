"use client";

import { useRef, useState, type ReactNode } from "react";
import { TabPill } from "./motion-selector";
import "./swipe-tabs.css";

type Page = { value: string; label: string; content: ReactNode; disabled?: boolean };

export function SwipeTabs({ label, pages, value, defaultValue, onValueChange, reducedMotion, className }: {
  label: string; pages: readonly Page[]; value?: string; defaultValue?: string;
  onValueChange?: (value: string) => void; reducedMotion?: boolean; className?: string;
}) {
  const enabled = pages.filter((page) => !page.disabled);
  const [internal, setInternal] = useState(defaultValue);
  const requested = value ?? internal;
  const active = enabled.find((page) => page.value === requested)?.value ?? enabled[0]?.value;
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  function select(next: string) {
    if (next === active) return;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  return <div className={className} data-mx-swipe-tabs="">
    <TabPill label={label} reducedMotion={reducedMotion} value={active} onValueChange={select}
      options={pages.map((page) => ({ ...page, panel: <div className="mx-swipe-surface"
        onPointerDown={(event) => {
          if (event.isPrimary && event.pointerType !== "mouse")
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => { drag.current = null; }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start || start.id !== event.pointerId) return;
          const x = event.clientX - start.x;
          const y = event.clientY - start.y;
          if (Math.abs(x) < 42 || Math.abs(x) < 1.5 * Math.abs(y)) return;
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          const step = (x < 0 ? 1 : -1) * (rtl ? -1 : 1);
          const next = enabled[enabled.findIndex((entry) => entry.value === active) + step];
          if (next) select(next.value);
        }}>{page.content}</div> }))} />
  </div>;
}
