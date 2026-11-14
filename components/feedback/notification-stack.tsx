"use client";

import { Bell, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import "./notification-stack.css";

type Notification = { id: string; title: string; detail?: ReactNode };
export function NotificationStack({ label, items, onDismiss, dismissLabel = "Dismiss", emptyLabel = "No notifications", reducedMotion, className }: {
  label: string; items: readonly Notification[]; onDismiss: (id: string) => void; dismissLabel?: string; emptyLabel?: string;
  reducedMotion?: boolean; className?: string;
}) {
  const id = useId();
  const pref = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 1);
  return <section className={className} data-mx-notifications="" aria-label={label}>
    <button type="button" className="mx-notice-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      <Bell size={17} aria-hidden />{label}<span aria-label={`${items.length}`}>{items.length}</span>
    </button>
    <ul id={id} data-expanded={expanded && items.length > 1} data-stacked={!expanded && items.length > 1}>
      {visible.map((item) => <motion.li layout={!pref && !reducedMotion} key={item.id} initial={false}
        transition={{ type: "spring", stiffness: 390, damping: 31 }}>
        <div><strong>{item.title}</strong>{item.detail && <div>{item.detail}</div>}</div>
        <button type="button" aria-label={`${dismissLabel} ${item.title}`} onClick={(event) => {
          event.currentTarget.closest("section")?.querySelector<HTMLButtonElement>(".mx-notice-toggle")?.focus();
          onDismiss(item.id);
        }}><X size={17} aria-hidden /></button>
      </motion.li>)}
    </ul>
    {!items.length && <p role="status">{emptyLabel}</p>}
  </section>;
}
