"use client";

import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";
import { DisclosureCard } from "../gestures/disclosure-cards";
import { profileImage } from "./profile-fixtures";
import { PresetFrame } from "./preset-frame";

const metrics = [{ value: "128", label: "Projects" }, { value: "24K", label: "Followers" }, { value: "312", label: "Following" }];

export function FeaturedProfile({ title = "Emma Carter", subtitle = "Product Designer", image = { src: profileImage, alt: "" },
  stats = metrics, detail = <p>Designs welcoming, usable products for small teams.</p>, expanded, onExpandedChange, reducedMotion }: {
  title?: string; subtitle?: string; image?: { src: string; alt: string }; stats?: readonly { label: string; value: string }[]; detail?: ReactNode;
  expanded?: boolean; onExpandedChange?: (open: boolean) => void; reducedMotion?: boolean;
}) {
  return <PresetFrame reducedMotion={reducedMotion}><div className="mx-feature-profile">
    <DisclosureCard variant="profile" title={title} subtitle={subtitle} image={image} open={expanded}
      onOpenChange={onExpandedChange} openLabel="Show profile details" closeLabel="Hide profile details" reducedMotion={reducedMotion} detail={detail} />
    {!!stats.length && <dl aria-label="Profile statistics">{stats.map(({ value, label }, i) =>
      <div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    <Ellipsis className="mx-profile-dots" size={20} aria-hidden="true" />
  </div></PresetFrame>;
}
