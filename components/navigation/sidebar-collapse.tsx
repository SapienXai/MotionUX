"use client";

import { PanelLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import "./sidebar-collapse.css";

type Link = { href: string; label: string; icon: ReactNode };
export function SidebarCollapse({ label, toggleLabel = "Toggle labels", links, activeHref, expanded, defaultExpanded = true, onExpandedChange, reducedMotion, className }: {
  label: string; toggleLabel?: string; links: readonly Link[]; activeHref?: string;
  expanded?: boolean; defaultExpanded?: boolean; onExpandedChange?: (expanded: boolean) => void;
  reducedMotion?: boolean; className?: string;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const [internal, setInternal] = useState(defaultExpanded);
  const open = expanded ?? internal;
  return <motion.aside layout={!pref && !reducedMotion} transition={{ type: "spring", stiffness: 420, damping: 38 }}
    data-mx-sidebar="" data-expanded={open} className={className}>
    <button type="button" aria-expanded={open} aria-controls={id} aria-label={toggleLabel} onClick={() => {
      if (expanded === undefined) setInternal(!open);
      onExpandedChange?.(!open);
    }}><PanelLeft size={19} aria-hidden /></button>
    <nav id={id} aria-label={label}>
      {links.map(({ href, label, icon }) => <a href={href} key={href} aria-label={label} aria-current={activeHref === href ? "page" : undefined}>
        <span aria-hidden="true">{icon}</span>{open && <span>{label}</span>}
      </a>)}
    </nav>
  </motion.aside>;
}
