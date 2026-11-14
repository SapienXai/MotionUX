"use client";

import { BedDouble, Coffee, Wifi } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DisclosureCard } from "../gestures/disclosure-cards";
import { hotelImage } from "./room-fixtures";
import { PresetFrame } from "./preset-frame";

const icons = [BedDouble, Wifi, Coffee];

export function ExpandableRoom({ title = "Premium Room", subtitle = "Sea view · 42 m²", image = { src: hotelImage, alt: "" },
  amenities = ["King bed", "Wi-Fi", "Breakfast"], children, expanded, defaultExpanded = "second", onExpandedChange, reducedMotion }: {
  title?: string; subtitle?: string; image?: { src: string; alt: string }; amenities?: readonly string[]; children?: ReactNode;
  expanded?: "first" | "second" | "none"; defaultExpanded?: "first" | "second" | "none"; onExpandedChange?: (value: "first" | "second" | "none") => void; reducedMotion?: boolean;
}) {
  const [local, setLocal] = useState(defaultExpanded);
  const open = expanded ?? local;
  const detail = children ?? <div className="mx-room-features">{amenities.map((label, i) => {
    const Icon = icons[i % icons.length];
    return <span key={i}><Icon size={15} aria-hidden="true" />{label}</span>;
  })}</div>;
  return <PresetFrame reducedMotion={reducedMotion}><div className="mx-feature-room">
    {(["first", "second"] as const).map((room, i) => <DisclosureCard key={room} title={title} subtitle={subtitle} image={image}
      detail={detail} open={open === room} onOpenChange={value => {
        const next = value ? room : "none";
        if (expanded === undefined) setLocal(next);
        onExpandedChange?.(next);
      }} openLabel={i === 0 ? "Expand room" : "Expand amenities"} closeLabel={i === 0 ? "Collapse room" : "Collapse amenities"}
      reducedMotion={reducedMotion} />)}
  </div></PresetFrame>;
}
