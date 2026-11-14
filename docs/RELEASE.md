# Release MotionUX

`v1.0.0` remains the stable tag. Studio previews use full commit SHAs. In a consumer, inspect the exact pin before changing vendored source.

```sh
npx shadcn@4.23.0 view 'SapienXai/MotionUX/tab-pill#055bb63e20c9ed77d3f1c2ec5c4ae913529914c4'
```

Copy the current exact pin from Studio or the reference ledger. Run `add --dry-run` with the same address and review the real install diff. Preserve product adapters and committed local overrides.

For a release candidate, run `npm ci`, install the browser engines with `npx playwright install chromium webkit`, and run `npm run verify`. Push the candidate commit and run `node scripts/registry-smoke.mjs` against its full published SHA. Review GitHub Checks and record audit results for runtime and development separately.

Check both [quality reviews](QUALITY-GATES.md) for each reference. Resolve remaining gaps in visual and gesture craft, accessibility, supported consumers and source provenance. Preserve reviewed snapshots. Compare pinned v1 files before release. Update the changelog and adoption notes. Tag and publish `v2.0.0` only when every item meets the agreed acceptance criteria.
