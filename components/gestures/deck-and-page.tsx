"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./deck-and-page.css";

export type DeckCard = { id: string; title: string; body?: ReactNode; image?: { src: string; alt: string } };
type Props = {
  cards: readonly DeckCard[]; index: number; onIndexChange: (index: number) => void;
  label: string; previousLabel: string; nextLabel: string; describe: (index: number, total: number) => string;
  reducedMotion?: boolean;
};
const settle = { type: "spring", stiffness: 330, damping: 34, mass: 0.8 } as const;

export function CardDeck({ cards, index, onIndexChange, label, previousLabel, nextLabel, describe, reducedMotion, variant = "swipe", dragThreshold = 52 }: Props & {
  variant?: "swipe" | "page"; dragThreshold?: number;
}) {
  const system = useReducedMotion();
  const quiet = Boolean(system || reducedMotion);
  const [direction, setDirection] = useState(1);
  const [previous, setPrevious] = useState<DeckCard | null>(null);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setPrevious(null), 420);
    return () => clearTimeout(timer);
  }, [previous]);
  const position = Math.max(0, Math.min(cards.length - 1, Math.trunc(index) || 0));
  const current = cards[position];
  function move(by: number) {
    const next = position + by;
    if (!cards[next]) return;
    if (!quiet && current) setPrevious(current);
    setDirection(by);
    onIndexChange(next);
  }
  if (!current) return null;
  const page = variant === "page";
  return <section data-mx-deck={variant} aria-label={label}>
    <div className="mx-deck-stage" data-has-next={position < cards.length - 1}>
      {!quiet && previous && previous.id !== current.id && <motion.div key={previous.id} className="mx-deck-outgoing" aria-hidden="true"
        initial={{ opacity: .76 }}
        animate={page ? { rotateY: direction * 64, opacity: 0, x: direction * -12 } :
          { x: direction * -165, opacity: 0, rotate: direction * -8, scale: .96 }}
        transition={{ duration: .34, ease: [.22, .64, .28, .98] }}>
        <article inert>
          {previous.image && <img src={previous.image.src} alt="" draggable={false} />}
          <h3>{previous.title}</h3>{previous.body}
        </article>
      </motion.div>}
      <motion.article key={current.id} data-deck-card
        drag={page ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={quiet ? 0 : .8} dragMomentum={false}
        onDragEnd={(event, info) => {
          if (event.type === "pointercancel") return;
          const distance = Math.abs(info.offset.x);
          if (distance >= dragThreshold || Math.abs(info.velocity.x) >= 460 && distance >= dragThreshold / 3) move(info.offset.x < 0 ? 1 : -1);
        }}
        initial={quiet || !previous ? false : page ? { rotateY: direction * -58, opacity: .2, x: direction * 14 } :
          { x: direction * 80, opacity: 0, rotate: direction * 4, scale: .94 }}
        animate={page ? { rotateY: 0, opacity: 1, x: 0 } : { x: 0, opacity: 1, rotate: 0, scale: 1 }}
        transition={quiet ? { duration: 0 } : settle}
      >
        {current.image && <img src={current.image.src} alt={current.image.alt} draggable={false} />}
        <h3>{current.title}</h3>{current.body}
      </motion.article>
    </div>
    <div className="mx-deck-controls">
      <button type="button" aria-label={previousLabel} disabled={position === 0} onClick={() => move(-1)}><ArrowLeft size={17} aria-hidden="true" /></button>
      <span role="status">{describe(position + 1, cards.length)}</span>
      <button type="button" aria-label={nextLabel} disabled={position === cards.length - 1} onClick={() => move(1)}><ArrowRight size={17} aria-hidden="true" /></button>
    </div>
  </section>;
}

export function FanCards({ cards, label, index, onIndexChange, spreadLabel, gatherLabel, reducedMotion }: {
  cards: readonly DeckCard[]; label: string; index: number; onIndexChange: (index: number) => void;
  spreadLabel: string; gatherLabel: string; reducedMotion?: boolean;
}) {
  const system = useReducedMotion();
  const quiet = Boolean(system || reducedMotion);
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const active = cards[index] ?? cards[0];
  if (!active) return null;
  return <section data-mx-deck="fan" aria-label={label}>
    <div className="mx-fan-canvas">
      <motion.article animate={{ y: open && !quiet ? -16 : 0 }} transition={quiet ? { duration: 0 } : settle}>
        {active.image && <img src={active.image.src} alt={active.image.alt} draggable={false} />}
        <h3>{active.title}</h3>{active.body}
      </motion.article>
      <div className="mx-fan-options" id={id} hidden={!open}>
        {cards.map((card, i) => <motion.button type="button" key={card.id} aria-pressed={index === i}
          initial={false} animate={{ rotate: open && !quiet ? Math.max(-6, Math.min(6, (i - (cards.length - 1) / 2) * 4)) : 0,
            y: open && !quiet ? Math.min(8, Math.abs(i - (cards.length - 1) / 2) * 8) : 0 }}
          transition={quiet ? { duration: 0 } : settle}
          onClick={() => { onIndexChange(i); setOpen(false); toggle.current?.focus(); }}>{card.title}</motion.button>)}
      </div>
    </div>
    <button type="button" ref={toggle} aria-controls={id} aria-expanded={open}
      onClick={() => setOpen(!open)}>{open ? gatherLabel : spreadLabel}</button>
  </section>;
}
