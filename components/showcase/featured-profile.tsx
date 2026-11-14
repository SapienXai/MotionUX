"use client";

import { Ellipsis } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DisclosureCard } from "../gestures/disclosure-cards";
import { profileImage } from "./profile-fixtures";
import { PresetFrame } from "./preset-frame";

const metrics = [{ value: "128", label: "Projects" }, { value: "24K", label: "Followers" }, { value: "312", label: "Following" }];

export function FeaturedProfile({ title = "Emma Carter", subtitle = "Product Designer", image = { src: profileImage, alt: "" },
  stats = metrics, detail, detailText = "Designs welcoming, usable products for small teams.", followerCount,
  expanded, defaultExpanded = false, onExpandedChange, reducedMotion }: {
  title?: string; subtitle?: string; image?: { src: string; alt: string }; stats?: readonly { label: string; value: string }[]; detail?: ReactNode;
  detailText?: string; followerCount?: string; expanded?: boolean; defaultExpanded?: boolean;
  onExpandedChange?: (open: boolean) => void; reducedMotion?: boolean;
}) {
  const [local, setLocal] = useState(defaultExpanded);
  return <PresetFrame reducedMotion={reducedMotion}><div className="mx-feature-profile">
    <DisclosureCard variant="profile" title={title} subtitle={subtitle} image={image} open={expanded ?? local}
      onOpenChange={value => { if (expanded === undefined) setLocal(value); onExpandedChange?.(value); }}
      openLabel="Show profile details" closeLabel="Hide profile details" reducedMotion={reducedMotion} detail={detail ?? <p>{detailText}</p>} />
    {!!stats.length && <dl aria-label="Profile statistics">{stats.map(({ value, label }, i) =>
      <div key={i}><dt>{label}</dt><dd>{stats === metrics && i === 1 ? followerCount ?? value : value}</dd></div>)}</dl>}
    <Ellipsis className="mx-profile-dots" size={20} aria-hidden="true" />
  </div></PresetFrame>;
}
