import { setTimeout as delay } from "node:timers/promises";
import { loadReview } from "../../../scripts/agent/v3/review.mjs";
import { apply } from "../../../scripts/agent/v3/transaction.mjs";
import { fixtureAuthority } from "../../../scripts/agent/v3/authority.mjs";

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());
const run = await loadReview(process.argv[2]);
const authority = fixtureAuthority();
await apply(run.runId, authority, authority.mint(run), { signal: controller.signal, check: async () => {},
  fault: async () => { process.stdout.write("mutated\n"); await delay(2000); } });
