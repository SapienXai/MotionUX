"use client";

import { Heart, RotateCcw } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { CardDeck, type DeckCard } from "../gestures/deck-and-page";
import { aegeanImage, hotelImage, santoriniImage } from "./deck-fixtures";
import { PresetFrame } from "./preset-frame";

const defaults = [
  { id: "santorini", title: "Santorini", body: <p>Greece</p>, image: { src: santoriniImage, alt: "Volcanic islands at dusk" } },
  { id: "aegean", title: "Aegean Sea", body: <p>Greece</p>, image: { src: aegeanImage, alt: "The sea beneath a rose sky" } },
  { id: "coast", title: "Coastal retreat", body: <p>Greece</p>, image: { src: hotelImage, alt: "Modern coastal hotel" } },
];

export function DestinationDeck({ cards = defaults, label = "Greek destinations", reducedMotion, index, onIndexChange, dragThreshold,
  onSavedChange }: {
  cards?: readonly DeckCard[]; label?: string; reducedMotion?: boolean; index?: number; onIndexChange?: (index: number) => void;
  dragThreshold?: number; onSavedChange?: (id: string, saved: boolean) => void;
}) {
  const [local, setLocal] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const note = useId();
  const position = Math.max(0, Math.min(cards.length - 1, Math.trunc(index ?? local) || 0));
  const current = cards[position];
  function change(next: number) {
    if (index === undefined) setLocal(next);
    onIndexChange?.(next);
  }
  if (!current) return <PresetFrame reducedMotion={reducedMotion}><p>No destinations</p></PresetFrame>;
  const selected = saved.includes(current.id);
  const nextImage = cards[position + 1]?.image;
  return <PresetFrame reducedMotion={reducedMotion}><div className="mx-feature-deck" data-active-card={position}
    style={(nextImage ? { "--mx-deck-back": `url(${JSON.stringify(nextImage.src)})` } : {}) as CSSProperties}>
    <CardDeck cards={cards} index={position} onIndexChange={change} label={label} previousLabel="Previous destination"
      nextLabel="Next destination" describe={(current, total) => `${current} of ${total}`} reducedMotion={reducedMotion} dragThreshold={dragThreshold} />
    <button type="button" className="mx-feature-heart" aria-label="Save destination" aria-pressed={selected} aria-describedby={note}
      onClick={() => {
        setSaved(list => selected ? list.filter(item => item !== current.id) : [...list, current.id]);
        onSavedChange?.(current.id, !selected);
      }}><Heart size={16} aria-hidden="true" /></button>
    <span className="mx-feature-sr" id={note}>{current.title}</span>
    {position > 0 && position === cards.length - 1 && <button className="mx-feature-replay" type="button"
      aria-label="Restart destinations" onClick={() => change(0)}><RotateCcw size={14} /></button>}
  </div></PresetFrame>;
}
