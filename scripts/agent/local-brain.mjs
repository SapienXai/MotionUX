import { hash, makeIndex } from "../../src/brain/indexer.ts";

export async function localBrain() {
  // Existing Brain reads its trusted MotionUX-side paths. It does not prepare or refresh artifacts here.
  try {
    const { openLocal } = await import("../brain/index-store.mjs");
    return await openLocal();
  } catch {
    return { index: makeIndex([], hash("unreadable-local-brain"), "not-prepared"), invalidIndex: true, indexPresent: false };
  }
}
