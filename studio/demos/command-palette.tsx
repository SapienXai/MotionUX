import { useState } from "react";
import { CommandPalette } from "../../components/navigation/command-palette";
import type { Specimen } from "../catalog";
import "./demo.css";

const story: Specimen = {
  component: function Example({ language }) {
    const [chosen, setChosen] = useState("");
    const tr = language === "tr";
    const commands = (tr ? ["Projeyi aç", "Not oluştur", "Ayarları göster"] : ["Open project", "Create note", "Show settings"]).map((label, i) => ({ id: String(i), label }));
    return <div className="mx-demo mx-demo-center"><CommandPalette label={tr ? "Komutlar" : "Commands"}
      triggerLabel={tr ? "Komutları ara" : "Search commands"} searchLabel={tr ? "Ara" : "Search"} emptyLabel={tr ? "Sonuç yok" : "No matching commands"} closeLabel={tr ? "Kapat" : "Close"} commands={commands} onSelect={setChosen} />
      <p role="status">{commands.find((command) => command.id === chosen)?.label ?? (tr ? "Bir komut seçin." : "Choose a command.")}</p></div>;
  },
  usage: `"use client";

import { CommandPalette } from "@/components/sapienx-motion/command-palette";

export function WorkspaceCommands({ onOpen }: { onOpen: () => void }) {
  return <CommandPalette label="Workspace commands" commands={[
    { id: "open", label: "Open workspace", keywords: "project" },
  ]} onSelect={(id) => { if (id === "open") onOpen(); }} />;
}`,
  api: "Pass commands with stable ids, labels, optional keywords and disabled flags. onSelect receives the chosen id.",
  states: "Type to filter. Navigate with arrows or choose by tap. Search terms with no match show an empty state.",
  accessibility: "Native dialog supplies the modal layer, Escape, focus containment and return. The search receives initial focus.",
  performance: "Opening is immediate. Filtering is local and no effect runs once the dialog is closed.",
};
export default story;
