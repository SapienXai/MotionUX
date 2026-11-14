"use client";

/* DrawnCheck adapted from Kokonut UI Save Status.
MIT License

Copyright (c) 2025 kokonutUI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { CircleAlert, Clock, LoaderCircle } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { MotionProvider } from "./motion-provider";
import { motionPresets } from "./presets";
import "./motion-status-pill.css";

export type MotionStatus = "neutral" | "loading" | "pending" | "success" | "error";

type MotionStatusPillProps = {
  status?: MotionStatus;
  /** Localized, authoritative status text. */
  label: string;
  className?: string;
  /** Enable for one changing result; keep false in repeated history rows. */
  announce?: boolean;
};

function StatusIcon({ status }: { status: MotionStatus }) {
  const reduce = useReducedMotion() !== false;
  const Icon = status === "pending" ? Clock : status === "loading" ? LoaderCircle : CircleAlert;

  return (
    <AnimatePresence initial={false}>
      <m.span
        key={status}
        data-motion-status-icon=""
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0.6, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? motionPresets.instant : motionPresets.feedback}
      >
        {status === "success" ? (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.8 7.3l2.7 2.6 5.7-5.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        ) : <Icon size={14} />}
      </m.span>
    </AnimatePresence>
  );
}

export function MotionStatusPill({ status, label, className, announce = false }: MotionStatusPillProps) {
  return (
    <span role={announce ? "status" : undefined} aria-atomic={announce || undefined}>
      {status && (
        <span className={className} data-motion-status="" data-tone={status}>
          {status !== "neutral" && <MotionProvider><StatusIcon status={status} /></MotionProvider>}
          <span>{label}</span>
        </span>
      )}
    </span>
  );
}
