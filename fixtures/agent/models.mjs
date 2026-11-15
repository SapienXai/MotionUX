import { hash, makeIndex } from "../../src/brain/indexer.ts";
import { specimen } from "../brain/synthetic.mjs";

export const booking = "./fixtures/agent/booking-demo";
export const react = "./fixtures/agent/react-entry";
export const confirm = "/bookings/confirmation";
export const bookingGoal = "Show calm confirmed booking feedback.";
export const detailsGoal = "Expandable card disclosure for room details.";
export const request = (route = confirm, goal = bookingGoal, requirements, project = booking) => ({
  schemaVersion: 1, project, route, goal, ...(requirements && { requirements }),
});

const records = [
  specimen("fixture-confirmation-react", {
    intents: ["confirm-action"], patterns: ["toast"], useCases: ["booking"], tested: ["keyboard"], dependencies: { react: "19.0.0" },
  }),
  specimen("fixture-confirmation-motion-conflict", {
    intents: ["confirm-action"], patterns: ["feedback"], useCases: ["task-feedback"], dependencies: { motion: "^14.0.0", react: "19.0.0" },
  }),
  specimen("fixture-disclosure-react", {
    intents: ["reveal-detail"], patterns: ["disclosure", "card"], dependencies: { react: "19.0.0" },
  }),
  specimen("fixture-disclosure-html", {
    intents: ["reveal-detail"], patterns: ["disclosure", "card"], kind: "html-iframe", dependencies: {},
  }),
  specimen("fixture-tabs", {
    intents: ["navigate"], patterns: ["tabs"], useCases: ["section-navigation"],
  }),
  specimen("fixture-select", {
    intents: ["collect-input"], patterns: ["picker"], useCases: ["select-value"],
  }),
  specimen("fixture-progress", {
    intents: ["communicate-progress"], patterns: ["progress"], useCases: ["booking"],
  }),
];
export const index = makeIndex(records, hash("agent-acceptance-v1"), "synthetic");
export const empty = makeIndex([], hash("agent-empty"), "not-prepared");
