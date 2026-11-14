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

export function MorphDropdown({ label = "New action", actions = defaults, defaultOpen = true, open, onOpenChange, onAction, reducedMotion }: {
  label?: string; actions?: readonly MenuAction[]; defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void;
  onAction?: (id: string) => void; reducedMotion?: boolean;
}) {
  const [choice, setChoice] = useState("");
  return <PresetFrame reducedMotion={reducedMotion}><div className="mx-feature-dropdown">
    <ActionMenu label={label} variant="morph" defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange} inline
      triggerIcon={<Sparkles size={19} aria-hidden="true" />} reducedMotion={reducedMotion} actions={actions}
      onAction={id => { setChoice(actions.find(action => action.id === id)?.label ?? id); onAction?.(id); }} />
    {choice && <span className="mx-feature-choice" role="status">{choice} selected</span>}
  </div></PresetFrame>;
}
