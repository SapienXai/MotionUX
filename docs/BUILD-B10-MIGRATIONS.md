# B10 document compatibility

Project envelope v2 remains readable, including the existing migration from v1. B10 adds optional versioned identity, layout, section provenance, article collection and task collection fields. The absence of those fields retains the starter appearance, original B9 blocks and fallback records. Opening old documents performs validation in memory. It does not create new asset ownership, advance the revision or rewrite source bytes.

The first content edit converts a legacy article block into its own versioned collection using deterministic IDs for the old entries. Guides added later receive independent stable IDs. The first authored Relay task change writes a versioned collection, retaining the four legacy task IDs unless the author removes an entry. Both Run and export derive their queue and totals from the same records. Browser status overrides are scoped to the exact saved revision. A known legacy array of completed task IDs remains readable.

The store checks optimistic revision conflicts and writes a validated replacement atomically. Save preserves the exact previous on-disk document. Managed media ownership and backup semantics are unchanged, and reference scanning includes the one-level section slot.

Run `pnpm --dir platform test` for prior fixtures, adapter/field denial, stale Save and explicit read/save/recovery assertions. The B10 independent export test verifies document digests, every manifest file and ZIP checksums for normal Next and PWA.
