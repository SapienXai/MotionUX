"use client";
import { useState } from "react";
import ExpandingNotice from "../sources/portable-source";
export default function App({ route, config }: { route: string; config: Record<string,string> }) {
  const [opened, setOpened] = useState(0);
  return <main className="app" style={{ color: config["text-color"], padding: config["content-space"] }}>
    <h1>{route === "/" ? config["heading"] : "Notes"}</h1>
    <a href={route === "/" ? "/notes" : "/"}>{route === "/" ? "Notes" : "Home"}</a>
    <section data-instance="notice" data-source="portable-source">
      <ExpandingNotice title="Show context" detail="Source expanded" onOpen={() => setOpened((value) => value + 1)} />
      <output aria-label="Opens">{opened}</output>
    </section>
  </main>;
}
