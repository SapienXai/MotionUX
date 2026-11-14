import { CircleHelp } from "lucide-react";
import { MorphTooltip } from "../../components/navigation/morph-tooltip";
import type { Specimen } from "../catalog";
import "./demo.css";

const story: Specimen = {
  component: ({ reduced, language }) => <div className="mx-demo mx-demo-center"><h3>{language === "tr" ? "Görüntü kalitesi" : "Image quality"}</h3>
    <MorphTooltip label={language === "tr" ? "Kalite hakkında" : "About image quality"} icon={<CircleHelp size={20} aria-hidden />}
      description={language === "tr" ? "Yüksek kalite dışa aktarılan dosyanın boyutunu artırabilir." : "Higher quality can increase the exported file size."} reducedMotion={reduced} />
  </div>,
  usage: `"use client";

import { MorphTooltip } from "@/components/sapienx-motion/morph-tooltip";

export function ExportHelp() {
  return <MorphTooltip label="About image quality"
    description="Higher quality can increase the exported file size." />;
}`,
  states: "Hover, focus, or tap the help button. Press Escape to leave the button focused while the hint closes.",
  api: "Provide description, and a visible label or an icon with an accessible label.",
  accessibility: "The tooltip adds a description to a native button. Its content does not take keyboard focus.",
  performance: "The hint animates only while visible and installs its escape listener only when open.",
};
export default story;
