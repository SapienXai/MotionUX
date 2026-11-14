import { stringValue } from "../values";
import { useState } from "react";
import { Aperture, Compass, FolderOpen, Send } from "lucide-react";
import { RubberDock } from "../../navigation/rubber-dock";
import type { Specimen } from "../specimen";
import "./demo.css";

const story: Specimen = {
  component: function Example({ reduced, language, config }) {
    const [active, setActive] = useState("#explore");
    const labels = language === "tr" ? ["Keşfet", "Çekim", "Arşiv", "Gönder"] : ["Explore", "Capture", "Archive", "Send"];
    const hrefs = ["#explore", "#capture", "#archive", "#send"];
    return <div className="mx-demo mx-demo-center">
      <div className="mx-demo-sample"><p>{language === "tr" ? "Çalışma alanı" : "Workspace"}</p><strong>{labels[hrefs.indexOf(active)]}</strong></div>
      <RubberDock label={stringValue(config, "label") ?? (language === "tr" ? "Kamera menüsü" : "Camera workspace")} activeHref={active} reducedMotion={reduced}
        links={[Compass, Aperture, FolderOpen, Send].map((Icon, i) => ({ href: hrefs[i], label: i === 0 ? stringValue(config, "firstLabel") ?? labels[0] : labels[i], icon: <Icon size={21} /> }))}
        onNavigate={(event, href) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); setActive(href);
        }} />
    </div>;
  },
  usage: `"use client";

import { RubberDock } from "@/components/sapienx-motion/rubber-dock";

export function Dock({ activeHref }: { activeHref: string }) {
  return <RubberDock label="Workspace" activeHref={activeHref} links={[
    { href: "/workspace", label: "Workspace", icon: <span>W</span> },
    { href: "/archive", label: "Archive", icon: <span>A</span> },
  ]} />;
}`,
  states: "Move the pointer across the dock to feel adjacent icons lift. Select an item to see the destination label.",
  api: "Use native hrefs and set activeHref from your router. onNavigate is optional.",
  accessibility: "Every destination is a keyboard-focusable link with aria-current on the active route. Magnification is decorative.",
  performance: "Pointer input updates MotionValues. Resize and scroll measurements are removed on unmount.",
};
export default story;
