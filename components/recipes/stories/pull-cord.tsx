import { booleanValue, stringValue } from "../values";
import { useState } from "react";
import { PullCord } from "../../navigation/pull-cord";
import type { Specimen } from "../specimen";
import "./demo.css";

const story: Specimen = {
  component: function Example({ reduced, language, config }) {
    const [on, setOn] = useState(false);
    const tr = language === "tr";
    return <div className="mx-demo mx-demo-center">
      <PullCord label={stringValue(config, "label") ?? (tr ? "Stüdyo ışığı" : "Studio light")} disabled={booleanValue(config, "disabled")} checked={on} onCheckedChange={setOn} reducedMotion={reduced} />
      <p>{on ? (tr ? "Işık açık" : "Light on") : (tr ? "Işık kapalı" : "Light off")}</p>
      <p>{tr ? "İpi çekin veya düğmeye basın." : "Pull the cord or press its handle."}</p>
    </div>;
  },
  usage: `"use client";

import { PullCord } from "@/components/sapienx-motion/pull-cord";

export function LightControl() {
  return <PullCord label="Studio light" defaultChecked={false} />;
}`,
  states: "A short drag returns to rest. Pull past the detent to switch the lamp. A click also toggles it.",
  api: "Use checked/onCheckedChange or defaultChecked. disabled prevents both dragging and button activation.",
  accessibility: "The handle is a real toggle button. Space and Enter work without a gesture, and pressed state is announced.",
  performance: "Pointer moves update a MotionValue. A single damped spring returns the handle and stops on interruption.",
};
export default story;
