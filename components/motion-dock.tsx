import type { ComponentPropsWithoutRef } from "react";
import "./motion-dock.css";

/** Pass the product's links and buttons as direct children. */
export function MotionDock(props: ComponentPropsWithoutRef<"nav"> & { "aria-label": string }) {
  return <nav {...props} data-motion-dock="" />;
}
