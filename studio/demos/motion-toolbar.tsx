import { booleanValue, stringValue } from "../playground/controls";
import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold } from "lucide-react";
import { MotionToolbar } from "../../components/navigation/motion-toolbar";
import type { Specimen } from "../catalog";
import "./demo.css";

const story: Specimen = {
  component: function Example({ language, config }) {
    const [align, setAlign] = useState<"left" | "center" | "right">("left");
    const [bold, setBold] = useState(false);
    const tr = language === "tr";
    return <div className="mx-demo">
      <MotionToolbar label={stringValue(config, "label") ?? (tr ? "Metin biçimi" : "Text formatting")} tools={[
        { id: "left", label: tr ? "Sola hizala" : "Align left", pressed: align === "left", disabled: booleanValue(config, "disabled"), icon: <AlignLeft size={18} /> },
        { id: "center", label: tr ? "Ortala" : "Align center", pressed: align === "center", icon: <AlignCenter size={18} /> },
        { id: "right", label: tr ? "Sağa hizala" : "Align right", pressed: align === "right", icon: <AlignRight size={18} /> },
        { id: "bold", label: tr ? "Kalın" : "Bold", pressed: bold, icon: <Bold size={18} /> },
      ]} onAction={(id) => { if (id === "bold") setBold(!bold); else if (id === "left" || id === "center" || id === "right") setAlign(id); }} />
      <div className="mx-demo-sample" data-testid="formatted-text" style={{ textAlign: align, fontWeight: bold ? 750 : undefined }}>
        <p>{tr ? "Biçim değişikliğini bu metinde deneyin." : "Use the tools to format this specimen."}</p>
      </div>
    </div>;
  },
  usage: `"use client";

import { MotionToolbar } from "@/components/sapienx-motion/motion-toolbar";

export function FormatTools({ bold, toggleBold }: { bold: boolean; toggleBold: () => void }) {
  return <MotionToolbar label="Formatting"
    tools={[{ id: "bold", label: "Bold", icon: <strong>B</strong>, pressed: bold }]}
    onAction={toggleBold} />;
}`,
  states: "Apply alignment or bold to the sample. The selected controls reflect the current formatting.",
  api: "Use icons with accessible labels. Pass pressed for toggle actions. onAction identifies the activated control.",
  accessibility: "A single Tab stop enters the toolbar. Arrow keys, Home and End move between enabled tools.",
  performance: "Formatting state updates are local and immediate. No animation loop is used.",
};
export default story;
