import { TabPill } from "../../components/navigation/motion-selector";
import { Columns3, FileText, Layers } from "lucide-react";
import type { Specimen } from "../catalog";
import "./demo.css";

const details = {
  en: [["Overview", "An open studio", "A workspace with natural light and room to spread out."], ["Notes", "Working notes", "Keep the latest sketches close while you review."], ["Files", "Project files", "Everything the team collected, in one place."]],
  tr: [["Genel bakış", "Açık stüdyo", "Doğal ışık alan, geniş bir çalışma alanı."], ["Notlar", "Çalışma notları", "İncelerken son taslakları elinizin altında tutun."], ["Dosyalar", "Proje dosyaları", "Ekibin topladığı her şey bir arada."]],
};

const story: Specimen = {
  component: ({ reduced, language }) => <div className="mx-demo">
    <TabPill label={language === "en" ? "Project sections" : "Proje bölümleri"} reducedMotion={reduced}
      options={details[language].map(([label, title, text], i) => {
        const Icon = [Layers, FileText, Columns3][i];
        return { value: String(i), label, icon: <Icon size={15} aria-hidden />, panel: <div className="mx-demo-sample"><strong>{title}</strong><p>{text}</p></div> };
      })} />
  </div>,
  usage: `"use client";

import { TabPill } from "@/components/sapienx-motion/motion-selector";

export function ProjectTabs() {
  return <TabPill label="Project sections" options={[
    { value: "summary", label: "Summary", panel: <p>Current project.</p> },
    { value: "files", label: "Files", panel: <p>Project files.</p> },
  ]} />;
}`,
  api: "Set value and onValueChange for controlled selection. Options support icons, panels and disabled states.",
  states: "The selected marker follows the active tab while its panel replaces the previous one.",
  accessibility: "Arrow keys, Home and End move focus and selection. Each labelled tab controls one panel. Disabled tabs are skipped.",
  performance: "Only the selected marker uses layout projection. Reduced motion renders a static marker.",
};
export default story;
