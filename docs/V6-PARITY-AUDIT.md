# V6 parity audit

Baseline Studio and remote main were both at `3e813117c2f89c758f196695fd79526967c24b62`. GitHub CI installed and typechecked all 86 items from that exact commit. The historical inventory pins are retained for provenance.

- Spring Dropdown, Dynamic Menu and Morph Popover shared a current `ActionMenu` with an older install pin. Git identified a source mismatch for all three. The verified baseline SHA includes the newer API.
- The first six Gallery cards used components with Studio-local markup, CSS and fixtures. Their generic base installations could never reproduce those Gallery views.
- Loading to Success drew a completed result before activation. Its replacement must use a neutral idle response and only display completion after a caller-confirmed result or an explicitly marked simulation.
- The original Playground shipped current source in Code, historical pins in Install, and mostly static Props and States panels. Matching installed source does not certify visual or behavior parity.

The [manifest](../metadata/parity-manifest.json) records the expected content hash and destination of each packed file, its registry contract, provenance, browser test, consumer evidence and parity status. Vite resolves pins at build time and disables installation if the current package differs. Updating the manifest is a follow-up commit after publishing and verifying a source checkpoint. This avoids a commit hash referring to itself.
