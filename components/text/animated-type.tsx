"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import "./animated-type.css";

type MotionTextProps = { text: string; trigger?: number; reducedMotion?: boolean };
const serifEase = [.21, .76, .25, 1] as const;
const glyphs = "0123456789#?*+";

function segments(text: string) {
  return typeof Intl.Segmenter !== "function" ? [...text] :
    Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), ({ segment }) => segment);
}

export function PhraseSwap({ text, reducedMotion, variant = "roll", direction = 1 }: MotionTextProps & {
  variant?: "roll" | "dynamic"; direction?: 1 | -1;
}) {
  const system = useReducedMotion();
  const quiet = system || reducedMotion;
  if (quiet) return <span data-mx-type="swap">{text}</span>;
  const parts = variant === "dynamic" ? text.split(/(\s+)/) : [text];
  return <span data-mx-type="swap">
    <span className="mx-type-assist">{text}</span>
    <AnimatePresence initial={false} mode="popLayout" custom={direction}>
      <motion.span key={text} aria-hidden="true" className="mx-type-visible"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .19 }}>
        {parts.map((word, index) => /^\s+$/.test(word) ? word : <motion.span key={index}
          initial={{ y: direction * 19, rotateX: variant === "dynamic" ? 0 : -35 }} animate={{ y: 0, rotateX: 0 }}
          transition={{ duration: .37, ease: serifEase, delay: Math.min(index * .022, .14) }}>{word}</motion.span>)}
      </motion.span>
    </AnimatePresence>
  </span>;
}

export function EmphasisText({ text, trigger = 0, reducedMotion, variant }: MotionTextProps & { variant: "weight" | "marker" }) {
  const system = useReducedMotion();
  const animated = trigger > 0 && !system && !reducedMotion;
  const words = text.split(/(\s+)/);
  return <span data-mx-type={variant}>
    <span className="mx-type-assist">{text}</span>
    <span key={trigger} aria-hidden="true">
      {variant === "marker" ? <span className="mx-marker-phrase">
        <motion.span initial={animated ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ duration: animated ? .55 : 0, ease: serifEase }} />
        {text}
      </span> : words.map((word, index) => /^\s+$/.test(word) ? word : <motion.span key={index}
        initial={false} animate={animated ? { scale: [1, 1.055, 1], fontVariationSettings: ['"wght" 550', '"wght" 810', '"wght" 550'] } : undefined}
        transition={{ duration: .43, delay: Math.min(.18, index * .032), ease: serifEase }}>{word}</motion.span>)}
    </span>
  </span>;
}

export function TextReveal({ text, trigger = 0, reducedMotion, variant }: MotionTextProps & { variant: "scramble" | "typewriter" }) {
  const system = useReducedMotion();
  const [frame, setFrame] = useState<{ text: string; trigger: number; value: string } | null>(null);
  const animated = trigger > 0 && !system && !reducedMotion;
  useEffect(() => {
    if (!animated) return;
    const chars = segments(text);
    if (!chars.length) return;
    const total = Math.min(1300, Math.max(320, chars.length * 32));
    const start = performance.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / total);
      if (progress >= 1) clearInterval(timer);
      const shown = Math.floor(progress * chars.length);
      const value = variant === "typewriter" ? chars.slice(0, shown).join("") :
        chars.map((char, i) => i < shown || /^\s$/.test(char) ? char : glyphs[(i + Math.floor(progress * 35)) % glyphs.length]).join("");
      setFrame({ text, trigger, value });
    }, 42);
    return () => clearInterval(timer);
  }, [animated, text, trigger, variant]);
  return <span data-mx-type={variant}>
    <span className="mx-type-assist">{text}</span>
    <span aria-hidden="true" className="mx-type-measure">{text}</span>
    <span aria-hidden="true" className="mx-type-display">{animated && frame?.text === text && frame.trigger === trigger ? frame.value : text}</span>
  </span>;
}

export function ReadAlong({ phrases, current }: { phrases: readonly string[]; current: number }) {
  return <ol data-mx-type="read">
    {phrases.map((phrase, index) => <li key={index} aria-current={current === index ? "step" : undefined}>{phrase}</li>)}
  </ol>;
}

export function RollLink({ children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { children: string }) {
  return <a {...props} data-mx-type="link"><span>{children}</span><span aria-hidden="true">{children}</span></a>;
}
