import { stringValue } from "../playground/controls";
import { StackPanel } from "../../components/navigation/stack-panel";
import type { Specimen } from "../catalog";
import "./demo.css";

const story: Specimen = {
  component: ({ reduced, language, config }) => {
    const tr = language === "tr";
    const cards = tr ? [["Proje özeti", "Koleksiyon için çalışma notları."], ["Yayın takvimi", "İnceleme perşembe günü."]] :
      [["Project brief", "Working notes for the spring collection."], ["Release schedule", "Review takes place on Thursday."]];
    return <div className="mx-demo"><StackPanel label={stringValue(config, "label") ?? (tr ? "Proje ayrıntıları" : "Project details")} defaultValue="0" reducedMotion={reduced}
      panels={cards.map(([title, text], i) => ({ value: String(i), title: i === 0 ? stringValue(config, "firstLabel") ?? title : title, body: <p>{text}</p> }))} /></div>;
  },
  usage: `"use client";

import { StackPanel } from "@/components/sapienx-motion/stack-panel";

export function ProjectNotes() {
  return <StackPanel label="Project notes" panels={[
    { value: "brief", title: "Brief", body: <p>Working notes</p> },
    { value: "release", title: "Schedule", body: <p>Release review on Thursday</p> },
  ]} />;
}`,
  states: "Opening the next record closes the previous one and brings its contents into the stack.",
  api: "Use value/onValueChange for controlled mode. An empty string closes every panel.",
  accessibility: "Each named button controls one region. Hidden content is outside the focus order.",
  performance: "Layout projection keeps movement at the stack level, with no geometry observer.",
};
export default story;
