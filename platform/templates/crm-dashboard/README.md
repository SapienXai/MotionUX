# Meridian CRM · Next.js source

Run `npm ci --ignore-scripts`, then `npm run typecheck`, `npm run build` and `npm start`.

The route manifest and editable composition live in `runtime/project.ts`. The shared blocks and shell render those same pages on the server and client. See `runtime/crm-data.ts` for the editable demo dataset and stage derivation.

This app uses fictional records. Contacts are view-only. Pipeline changes and appearance preferences stay in this browser, and deal changes are scoped to the exported project revision. There is no account, email, payment, customer database or real sales integration.

See `LICENSE` and `motionux-manifest.json` for ownership, runtime pins and source hashes.
