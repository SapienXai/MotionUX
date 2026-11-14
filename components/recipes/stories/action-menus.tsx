import { booleanValue, stringValue } from "../values";
import { Archive, BookOpen, CalendarDays, Check, Copy, Ellipsis, FolderOpen, Link2, Pin } from "lucide-react";
import { useState } from "react";
import { ActionMenu } from "../../navigation/action-menu";
import type { Specimen } from "../specimen";
import "./demo.css";

type Variant = "dropdown" | "dynamic" | "morph";
const examples = {
  dropdown: { subject: "Schedule", tr: "Takvim", label: "Sort by", trLabel: "Sırala", options: ["Newest", "Oldest", "Pinned"], trOptions: ["En yeni", "En eski", "Sabitlenen"], icons: [CalendarDays, BookOpen, Pin] },
  dynamic: { subject: "Field notes", tr: "Çalışma notları", label: "More actions", trLabel: "Diğer işlemler", options: ["Duplicate", "Archive", "Pin to project"], trOptions: ["Çoğalt", "Arşivle", "Projeye sabitle"], icons: [Copy, Archive, Pin] },
  morph: { subject: "Shared workspace", tr: "Paylaşılan çalışma alanı", label: "Sharing options", trLabel: "Paylaşım seçenekleri", options: ["Copy link", "Open folder", "View access"], trOptions: ["Bağlantıyı kopyala", "Klasörü aç", "Erişimi göster"], icons: [Link2, FolderOpen, Check] },
};

export function menuStory(variant: Variant): Specimen {
  const sample = examples[variant];
  return {
    component: function Example({ reduced, language, config }) {
      const [value, select] = useState(0);
      const tr = language === "tr";
      const names = tr ? sample.trOptions : sample.options;
      const label = stringValue(config, "label") ?? (tr ? sample.trLabel : sample.label);
      return <div className="mx-demo mx-demo-center">
        <div className="mx-demo-sample"><Ellipsis size={19} aria-hidden /><strong>{tr ? sample.tr : sample.subject}</strong>
          <p role="status">{names[value]}</p></div>
        <ActionMenu label={label} variant={(stringValue(config, "variant") ?? variant) as Variant} actions={names.map((name, i) => {
          const Icon = sample.icons[i];
          return { id: String(i), label: name, icon: <Icon size={17} />, disabled: i === 2 && (booleanValue(config, "disabled") ?? variant === "dynamic") };
        })} onAction={(id) => select(Number(id))} reducedMotion={reduced} />
      </div>;
    },
    usage: `"use client";

import { ActionMenu } from "@/components/sapienx-motion/action-menu";

export function Actions({ onSelect }: { onSelect: (id: string) => void }) {
  return <ActionMenu label="${sample.label}" variant="${variant}" actions={[
    { id: "first", label: "${sample.options[0]}" },
    { id: "second", label: "${sample.options[1]}" },
  ]} onAction={onSelect} />;
}`,
    states: "Open the panel and choose an action. The result appears in the demo record above.",
    api: "Pass named actions with optional icons and disabled state. onAction receives the selected identifier.",
    accessibility: "Arrow keys, Home and End navigate actions. Escape closes and restores focus. Clicking outside dismisses the panel.",
    performance: "The panel mounts on demand. Only its transform and opacity animate from the trigger.",
  };
}
