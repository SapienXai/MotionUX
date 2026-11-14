# Registry checkpoint and parity evidence

`metadata/parity-manifest.json` maps inventory IDs to a base item and, where available, a Gallery preset. The five Gallery recipe families are keyed separately so their hashes are stored once. Each package records its expected registry definition and the SHA-256 of every file in the installed package. Nested paths preserve relative imports. Presets package the primitive implementation and fixture assets they depend on, so an unversioned upstream registry dependency cannot change the installed result.

When the Studio bundles, the Vite resolver checks the registry definition and all referenced files against the recorded hashes. A mismatch disables the Install command while Code remains available as working-tree source. The base, selected preset and recipe family are resolved independently. Historical inventory pins stay available as provenance.

1. Push the source changes to a candidate commit.
2. Install that exact SHA with `node scripts/registry-smoke.mjs` and run `node scripts/fixture-parity.mjs`. Set `MOTIONUX_REGISTRY_REF` when verifying a specific published checkpoint.
3. Use `node scripts/update-parity.mjs <full-published-sha>` to emit the pin and file records into a follow-up commit. Attach the evidence for this exact candidate.
4. Preserve `not-tested` for packages that match bytes without paired visual evidence. Use `parity-broken` when the measured preview and consumer differ and `blocked` when the matching artifact is unavailable. `parity-ok` records the specific measured scope in the report.

This process keeps the pinned artifact immutable and avoids a commit referring to its own hash. See the [release checklist](RELEASE.md) for the additional craft gates.
