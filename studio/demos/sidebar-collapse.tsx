import { FolderOpen, House, Settings } from "lucide-react";
import { SidebarCollapse } from "../../components/navigation/sidebar-collapse";
import type { Specimen } from "../catalog";
import "./demo.css";

const story: Specimen = {
  component: ({ reduced, language }) => {
    const tr = language === "tr";
    return <div className="mx-demo">
      <SidebarCollapse label={tr ? "Yan menü" : "Workspace sidebar"} toggleLabel={tr ? "Menü etiketlerini göster veya gizle" : "Toggle labels"} activeHref="#home"
        links={[House, FolderOpen, Settings].map((Icon, i) => ({
          href: ["#home", "#files", "#settings"][i],
          label: (tr ? ["Ana sayfa", "Dosyalar", "Ayarlar"] : ["Home", "Files", "Settings"])[i],
          icon: <Icon size={18} />,
        }))} reducedMotion={reduced} />
    </div>;
  },
  usage: `import { SidebarCollapse } from "@/components/sapienx-motion/sidebar-collapse";

export function Sidebar() {
  return <SidebarCollapse label="Workspace" activeHref="/files" links={[
    { href: "/files", label: "Files", icon: <span>F</span> },
  ]} />;
}`,
  states: "Collapse the rail and expand it again. Link names remain available in the narrow version.",
  api: "Set expanded and onExpandedChange for controlled layouts, or use defaultExpanded.",
  accessibility: "Named links retain their accessible name when their visual labels disappear.",
  performance: "Layout projection applies to the rail only. No transform runs under reduced motion.",
};
export default story;
