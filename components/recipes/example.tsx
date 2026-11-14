"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { Specimen } from "./specimen";
import type { Config } from "./values";
import "./theme.css";

export type RecipeOptions = {
  initialConfig?: Config;
  compact?: boolean;
  language?: "en" | "tr";
  reducedMotion?: boolean;
  theme?: "neutral" | "bookplace" | "dinewallet";
  scheme?: "light" | "dark";
};

export function RecipeExample({ load, initialConfig, compact, language = "en", reducedMotion, theme = "neutral", scheme = "light" }: RecipeOptions & {
  load: () => Promise<{ default: Specimen }>;
}) {
  const [story, setStory] = useState<Specimen>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [edits, setEdits] = useState<Config>(initialConfig ?? {});
  const reduced = useReducedMotion() === true || reducedMotion === true;

  useEffect(() => {
    let active = true;
    void load().then(({ default: specimen }) => {
      if (active) setStory(specimen);
    }, () => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [load, attempt]);

  return <div className="mx-recipe-frame" data-theme={theme} data-scheme={scheme} data-compact={compact} lang={language}>
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      {error ? <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>
        {language === "tr" ? "Tekrar dene" : "Retry example"}
      </button> : story ? <story.component reduced={reduced} language={language} comparison config={edits}
        update={(key, value) => setEdits(current => ({ ...current, [key]: value }))} /> :
        <span role="status">{language === "tr" ? "Örnek yükleniyor…" : "Loading example…"}</span>}
    </MotionConfig>
  </div>;
}
