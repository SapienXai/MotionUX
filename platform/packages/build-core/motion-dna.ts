import { z } from "zod";

export const motionEasings = {
  standard: "cubic-bezier(0.2, 0.75, 0.2, 1)",
  "ease-out": "ease-out",
  "ease-in-out": "ease-in-out",
} as const;

export const feedbackTiming = { min: 60, max: 240, step: 10 } as const;
export const transitionTiming = { min: 100, max: 400, step: 10 } as const;

export const motionDnaSchema = z.strictObject({
  version: z.literal(1),
  feedbackMs: z
    .number()
    .int()
    .min(feedbackTiming.min)
    .max(feedbackTiming.max)
    .multipleOf(feedbackTiming.step),
  transitionMs: z
    .number()
    .int()
    .min(transitionTiming.min)
    .max(transitionTiming.max)
    .multipleOf(transitionTiming.step),
  easing: z.enum(["standard", "ease-out", "ease-in-out"]),
  pageTransition: z.enum(["none", "fade", "slide"]),
  reducedMotion: z.enum(["off", "fade"]),
});

export type MotionDna = z.infer<typeof motionDnaSchema>;

export const defaultMotionDna: Readonly<MotionDna> = {
  version: 1,
  feedbackMs: 150,
  transitionMs: 150,
  easing: "standard",
  pageTransition: "none",
  reducedMotion: "off",
};
