"use client";

import { Copy, Link2, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { ActionMenu, type MenuAction } from "../navigation/action-menu";
import { PresetFrame } from "./preset-frame";

const defaults = [
  { id: "Create", label: "Create", icon: <Pencil size={17} /> },
  { id: "Share", label: "Share", icon: <Link2 size={17} /> },
  { id: "Duplicate", label: "Duplicate", icon: <Copy size={17} /> },
];

export function MorphDropdown({ label = "New action", actions = defaults, actionLabels, defaultOpen = true, open, onOpenChange, onAction, reducedMotion, stiffness, damping }: {
  label?: string; actions?: readonly MenuAction[]; defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void;
  actionLabels?: Partial<Record<string, string>>; onAction?: (id: string) => void; reducedMotion?: boolean; stiffness?: number; damping?: number;
}) {
  const [choice, setChoice] = useState("");
  const menu = actions.map(action => ({ ...action, label: actionLabels?.[action.id] ?? action.label }));
  return <PresetFrame reducedMotion={reducedMotion}><div className="mx-feature-dropdown">
    <ActionMenu label={label} variant="morph" defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange} inline
      triggerIcon={<Sparkles size={19} aria-hidden="true" />} reducedMotion={reducedMotion} stiffness={stiffness} damping={damping} actions={menu}
      onAction={id => { setChoice(id); onAction?.(id); }} />
    {choice && <span className="mx-feature-choice" role="status">{menu.find(action => action.id === choice)?.label ?? choice} selected</span>}
  </div></PresetFrame>;
}
