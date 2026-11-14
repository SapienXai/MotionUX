"use client";

import { ChartNoAxesColumn, House, Users } from "lucide-react";
import type { ComponentProps } from "react";
import { TabPill } from "../navigation/motion-selector";
import { PresetFrame } from "./preset-frame";

type Props = ComponentProps<typeof TabPill> & { labels?: readonly string[]; disableAnalytics?: boolean };

export function SlidingTabPill({ labels = ["Overview", "Analytics", "Members"], disableAnalytics, label = "Project sections",
  options, ...props }: Omit<Props, "label" | "options"> & Partial<Pick<Props, "label" | "options">>) {
  const defaults = [House, ChartNoAxesColumn, Users].slice(0, labels.length).map((Icon, i) => ({
    value: ["overview", "analytics", "members"][i], label: labels[i], disabled: i === 1 && disableAnalytics,
    icon: <Icon size={16} aria-hidden="true" />,
    panel: <span className="mx-feature-sr">{labels[i]}</span>,
  }));
  return <PresetFrame reducedMotion={props.reducedMotion}><div className="mx-feature-tab">
    <TabPill label={label} options={options ?? defaults} {...props} />
  </div></PresetFrame>;
}
