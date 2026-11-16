"use client";

import {
  defaultMotionDna,
  feedbackTiming,
  transitionTiming,
  type Document,
  type MotionDna,
} from "@motionux/build-core";

export function MotionDnaFields({
  document,
  onChange,
}: {
  document: Document;
  onChange: (edit: (previous: Document) => Document) => void;
}) {
  const dna = document.motionDna ?? defaultMotionDna;

  function tune(patch: Partial<MotionDna>) {
    onChange((previous) => ({
      ...previous,
      motionDna: { ...defaultMotionDna, ...previous.motionDna, ...patch },
    }));
  }

  return (
    <section
      className="build-panel-section build-motion-dna"
      aria-label="Motion DNA"
    >
      <div className="build-panel-title">
        <h2>Motion DNA</h2>
      </div>
      <label>
        Project motion
        <select
          value={document.motionProfile}
          onChange={(event) => {
            const motionProfile =
              event.target.value === "none" ? "none" : "system";
            onChange((previous) => ({ ...previous, motionProfile }));
          }}
        >
          <option value="system">Follow device preference</option>
          <option value="none">No motion</option>
        </select>
      </label>
      <label>
        Feedback duration
        <span className="build-motion-range">
          <input
            type="range"
            {...feedbackTiming}
            value={dna.feedbackMs}
            aria-valuetext={dna.feedbackMs + " milliseconds"}
            onChange={(event) =>
              tune({ feedbackMs: event.target.valueAsNumber })
            }
          />
          <span aria-hidden="true">{dna.feedbackMs} ms</span>
        </span>
      </label>
      <label>
        Transition duration
        <span className="build-motion-range">
          <input
            type="range"
            {...transitionTiming}
            value={dna.transitionMs}
            aria-valuetext={dna.transitionMs + " milliseconds"}
            onChange={(event) =>
              tune({ transitionMs: event.target.valueAsNumber })
            }
          />
          <span aria-hidden="true">{dna.transitionMs} ms</span>
        </span>
      </label>
      <label>
        Easing
        <select
          value={dna.easing}
          onChange={(event) =>
            tune({ easing: event.target.value as MotionDna["easing"] })
          }
        >
          <option value="standard">MotionUX standard</option>
          <option value="ease-out">Ease out</option>
          <option value="ease-in-out">Ease in and out</option>
        </select>
      </label>
      <label>
        Page transition
        <select
          value={dna.pageTransition}
          onChange={(event) =>
            tune({
              pageTransition: event.target.value as MotionDna["pageTransition"],
            })
          }
        >
          <option value="none">Instant</option>
          <option value="fade">Fade in</option>
          <option value="slide">Slide in</option>
        </select>
      </label>
      <label>
        With reduced motion
        <select
          value={dna.reducedMotion}
          onChange={(event) =>
            tune({
              reducedMotion: event.target.value as MotionDna["reducedMotion"],
            })
          }
        >
          <option value="off">Instant</option>
          <option value="fade">Short fade</option>
        </select>
      </label>
    </section>
  );
}
