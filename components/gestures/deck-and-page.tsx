"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type ReactNode } from "react";
import "./deck-and-page.css";

export type DeckCard = { id: string; title: string; body?: ReactNode; image?: { src: string; alt: string } };
type Props = {
  cards: readonly DeckCard[]; index: number; onIndexChange: (index: number) => void;
  label: string; previousLabel: string; nextLabel: string; describe: (index: number, total: number) => string;
  reducedMotion?: boolean;
};
const settle = { type: "spring", stiffness: 330, damping: 34, mass: 0.8 } as const;

export function CardDeck({ cards, index, onIndexChange, label, previousLabel, nextLabel, describe, reducedMotion, variant = "swipe" }: Props & {
  variant?: "swipe" | "page";
}) {
  const system = useReducedMotion();
  const quiet = Boolean(system || reducedMotion);
  const [direction, setDirection] = useState(1);
  const position = Math.max(0, Math.min(cards.length - 1, Math.trunc(index) || 0));
  const current = cards[position];
  function move(by: number) {
    const next = position + by;
    if (!cards[next]) return;
    setDirection(by);
    onIndexChange(next);
  }
  if (!current) return null;
  const page = variant === "page";
  return <section data-mx-deck={variant} aria-label={label}>
    <div className="mx-deck-stage">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.article key={current.id} data-deck-card
          drag={page || quiet ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={.8} dragMomentum={false}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) >= 52 || Math.abs(info.velocity.x) >= 460 && Math.abs(info.offset.x) >= 18) move(info.offset.x < 0 ? 1 : -1);
          }}
          initial="arrive" animate="rest" exit="leave"
          variants={quiet ? { arrive: { opacity: 1 }, rest: { opacity: 1 }, leave: { opacity: 0 } } : page ? {
            arrive: (dir: number) => ({ rotateY: dir * -58, opacity: .2, x: dir * 14 }),
            rest: { rotateY: 0, opacity: 1, x: 0 },
            leave: (dir: number) => ({ rotateY: dir * 64, opacity: 0, x: dir * -12 }),
          } : {
            arrive: (dir: number) => ({ x: dir * 80, opacity: 0, rotate: dir * 4, scale: .94 }),
            rest: { x: 0, opacity: 1, rotate: 0, scale: 1 },
            leave: (dir: number) => ({ x: dir * -180, opacity: 0, rotate: dir * -8, scale: .96 }),
          }} transition={quiet ? { duration: 0 } : settle}
        >
          {current.image && <img src={current.image.src} alt={current.image.alt} draggable={false} />}
          <h3>{current.title}</h3>{current.body}
        </motion.article>
      </AnimatePresence>
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
