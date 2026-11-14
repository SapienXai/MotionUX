import { stringValue } from "../values";
import { useState } from "react";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { SegmentedControl } from "../../navigation/motion-selector";
import type { Specimen } from "../specimen";
import "./demo.css";

const story: Specimen = {
  component: function Example({ reduced, language, config }) {
    const [value, setValue] = useState("week");
    const tr = language === "tr";
    const cards = {
      day: { label: tr ? "Gün" : "Day", text: tr ? "Bugünkü rezervasyonlar" : "Reservations today", count: 12, Icon: Calendar },
      week: { label: tr ? "Hafta" : "Week", text: tr ? "Bu haftaki rezervasyonlar" : "Reservations this week", count: 48, Icon: CalendarDays },
      month: { label: tr ? "Ay" : "Month", text: tr ? "Bu ayki rezervasyonlar" : "Reservations this month", count: 213, Icon: CalendarRange },
    };
    const active = cards[value as keyof typeof cards];
    return <div className="mx-demo">
      <SegmentedControl name={undefined} label={stringValue(config, "label") ?? (tr ? "Rapor dönemi" : "Reporting period")} value={value} onValueChange={setValue}
        reducedMotion={reduced} options={Object.entries(cards).map(([value, { label, Icon }]) => ({ value, label, icon: <Icon size={14} aria-hidden /> }))} />
      <div className="mx-demo-sample"><p>{active.text}</p><strong>{active.count}</strong></div>
    </div>;
  },
  usage: `"use client";

import { SegmentedControl } from "@/components/sapienx-motion/motion-selector";

export function PeriodControl() {
  return <SegmentedControl name="period" label="Reporting period" defaultValue="week" options={[
    { value: "day", label: "Day" }, { value: "week", label: "Week" },
  ]} />;
}`,
  api: "Use name for form submission and value/onValueChange or defaultValue. Disable individual choices with option.disabled.",
  states: "Change the native radio value to see the reporting window and count update together. Values are synthetic.",
  accessibility: "The fieldset legend names the group. Native radio semantics support Arrow keys and form participation.",
  performance: "The radio state updates synchronously. No observer or continuous animation is needed.",
};
export default story;
