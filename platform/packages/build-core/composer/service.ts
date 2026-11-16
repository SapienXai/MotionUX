import { z } from "zod";
import { BuildError, createStore } from "../store.ts";
import {
  compileDocument,
  editsFor,
  normalizeBrief,
  resolveBlueprint,
  type ResolvedProposal,
} from "./blueprint.ts";
import { runCodex } from "./codex.ts";

const id = z.string().regex(/^[a-f0-9]{32}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const generateBody = z.strictObject({ job: id, brief: z.string() });
const receipt = z.strictObject({ job: id, digest });
const reviseBody = receipt.extend({ edits: z.unknown() });
type Review = {
  job: string;
  expires: number;
  proposal: ResolvedProposal;
  claimed: boolean;
  compiled: ReturnType<typeof compileDocument>;
  usage: Awaited<ReturnType<typeof runCodex>>["usage"];
};
const ttl = 15 * 60_000;
export function createComposer(
  vault: string,
  planner = runCodex,
  clock = Date.now,
) {
  const store = createStore(vault);
  const reviews = new Map<string, Review>();
  let active: { job: string; controller: AbortController } | undefined;
  const attempts = new Map<string, number>();
  function prune() {
    const now = clock();
    for (const [job, entry] of reviews)
      if (!entry.claimed && entry.expires <= now) reviews.delete(job);
    for (const [job, expires] of attempts)
      if (expires <= now) attempts.delete(job);
  }
  function reviewed(value: unknown) {
    const input = receipt.safeParse(value);
    if (!input.success) throw new BuildError(422, "Invalid review reference.");
    prune();
    const found = reviews.get(input.data.job);
    if (!found || found.claimed)
      throw new BuildError(409, "This review has expired or was already used.");
    if (found.compiled.plan.digest !== input.data.digest)
      throw new BuildError(
        409,
        "The review changed. Open the currently reviewed blueprint.",
      );
    return found;
  }
  const present = (review: Review) => ({
    job: review.job,
    plan: review.compiled.plan,
    usage: review.usage,
  });
  return {
    async generate(value: unknown, signal?: AbortSignal) {
      const input = generateBody.safeParse(value);
      if (!input.success)
        throw new BuildError(422, "Invalid blueprint request.");
      const brief = normalizeBrief(input.data.brief);
      prune();
      if (active)
        throw new BuildError(
          409,
          "A blueprint is already generating. Wait or cancel it first.",
        );
      if (attempts.has(input.data.job) || reviews.has(input.data.job))
        throw new BuildError(409, "This generation request was already used.");
      if (attempts.size >= 12 || reviews.size >= 12)
        throw new BuildError(
          429,
          "Too many recent requests. Try again in a few minutes.",
        );
      attempts.set(input.data.job, clock() + ttl);
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      active = { job: input.data.job, controller };
      try {
        const result = await planner(vault, brief, controller.signal);
        if (controller.signal.aborted)
          throw new BuildError(409, "Blueprint generation was cancelled.");
        const proposal = resolveBlueprint(result.proposal, brief);
        const review = {
          job: input.data.job,
          expires: clock() + ttl,
          proposal,
          compiled: compileDocument(proposal),
          usage: result.usage,
          claimed: false,
        };
        reviews.set(review.job, review);
        return present(review);
      } finally {
        signal?.removeEventListener("abort", abort);
        active = undefined;
      }
    },
    cancel(value: unknown) {
      const parsed = id.safeParse(value);
      if (!parsed.success)
        throw new BuildError(422, "Invalid generation reference.");
      prune();
      if (active?.job === parsed.data) active.controller.abort();
      else if (!attempts.has(parsed.data) && attempts.size < 12)
        attempts.set(parsed.data, clock() + ttl);
      const review = reviews.get(parsed.data);
      if (review && !review.claimed) reviews.delete(parsed.data);
      return { cancelled: true };
    },
    revise(value: unknown) {
      const parsed = reviseBody.safeParse(value);
      if (!parsed.success)
        throw new BuildError(422, "Invalid blueprint edits.");
      const review = reviewed({
        job: parsed.data.job,
        digest: parsed.data.digest,
      });
      review.compiled = compileDocument(
        review.proposal,
        parsed.data.edits ?? editsFor(review.proposal),
      );
      return present(review);
    },
    async create(value: unknown) {
      const review = reviewed(value);
      review.claimed = true;
      try {
        const project = await store.create(
          review.compiled.document,
          review.compiled.blueprint,
        );
        reviews.delete(review.job);
        return project;
      } catch (error) {
        review.claimed = false;
        throw error;
      }
    },
  };
}
export type Composer = ReturnType<typeof createComposer>;
