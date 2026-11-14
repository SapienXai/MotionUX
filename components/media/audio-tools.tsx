"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import "./audio-tools.css";

export function TimeScrubber({ label, elapsed, duration, onSeek, format, disabled }: {
  label: string; elapsed: number; duration: number; onSeek: (seconds: number) => void;
  format: (seconds: number) => string; disabled?: boolean;
}) {
  const id = useId();
  const total = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const current = Number.isFinite(elapsed) ? Math.min(total, Math.max(0, elapsed)) : 0;
  return <div data-mx-audio="scrub">
    <label htmlFor={id}>{label}</label>
    <span>{format(current)} / {format(total)}</span>
    <input id={id} type="range" min={0} max={total} value={current} step="0.1" disabled={disabled || total === 0}
      aria-valuetext={format(current)} onChange={(event) => onSeek(event.currentTarget.valueAsNumber)} />
  </div>;
}

type AudioProps = {
  src: string; title: string; subtitle?: string; playLabel: string; pauseLabel: string; errorLabel: string; muted?: boolean;
  seekLabel: string; format: (seconds: number) => string; variant?: "glass" | "toggle";
};
export function AudioControl(props: AudioProps) {
  return <AudioSession key={props.src} {...props} />;
}

function AudioSession({ src, title, subtitle, playLabel, pauseLabel, errorLabel, seekLabel, format, variant = "glass", muted }: AudioProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "starting" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  function activate() {
    const element = audio.current;
    if (!element) return;
    if (state === "starting" || !element.paused) {
      element.pause();
      setState("idle");
      return;
    }
    setState("starting");
    void element.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    });
  }
  const offeringPause = state === "playing" || state === "starting";
  return <section data-mx-audio={variant} aria-label={title}>
    <audio ref={audio} src={src} preload="none" muted={muted} onPlaying={() => setState("playing")} onPause={() => setState("idle")}
      onEnded={() => setState("idle")} onError={() => setState("error")} onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
      onDurationChange={(event) => setDuration(event.currentTarget.duration)} />
    <div className="mx-audio-identity"><Volume2 size={17} aria-hidden="true" /><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span></div>
    <button type="button" onClick={activate} aria-label={offeringPause ? pauseLabel : playLabel}>
      {offeringPause ? <Pause size={19} aria-hidden="true" /> : <Play size={19} aria-hidden="true" />}
    </button>
    {variant === "glass" && <TimeScrubber label={seekLabel} elapsed={elapsed} duration={duration} format={format}
      onSeek={(seconds) => { if (audio.current) { audio.current.currentTime = seconds; setElapsed(seconds); } }} />}
    <span role="status">{state === "error" ? errorLabel : ""}</span>
  </section>;
}

const orbPaths = [
  "M50 20 C67 17 81 31 78 46 C74 65 66 80 48 80 C30 80 17 65 21 50 C24 35 34 23 50 20Z",
  "M47 12 C61 16 84 36 81 49 C80 66 73 84 55 86 C37 87 13 72 16 54 C18 34 33 8 47 12Z",
];
export function SignalOrb({ active, status, reducedMotion, tension = 235 }: { active: boolean; status: string; reducedMotion?: boolean; tension?: number }) {
  const system = useReducedMotion();
  const quiet = system || reducedMotion;
  const stiffness = Number.isFinite(tension) ? Math.min(650, Math.max(120, tension)) : 235;
  const settle = quiet ? { duration: 0 } : { type: "spring" as const, stiffness, damping: 24, mass: .85 };
  return <div data-mx-audio="orb">
    <div className="mx-orb-sphere" data-active={active} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <motion.path initial={false} animate={{ d: orbPaths[active ? 1 : 0] }} transition={settle} />
        <motion.path initial={false} animate={{ d: orbPaths[active ? 0 : 1], rotate: active && !quiet ? -22 : 16 }}
          transition={settle} />
      </svg>
    </div>
    <span role="status">{status}</span>
  </div>;
}
