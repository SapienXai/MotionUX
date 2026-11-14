/** Motion durations are seconds. Prefer CSS for isolated feedback. */
export const motionPresets = {
  feedback: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
  settle: { type: "spring", stiffness: 420, damping: 38 },
  instant: { duration: 0 },
} as const;
