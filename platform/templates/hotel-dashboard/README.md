# Hotel Desk

A fictional hotel operations application exported from MotionUX. All reservations, occupancy and room states are local demonstration data.

With Node 24 and npm installed, run:

```sh
npm ci --ignore-scripts --allow-remote=all
npm run typecheck
npm run build
npm start
```

Open http://127.0.0.1:3000. The routes and mounted blocks are defined in `runtime/project.ts`. Edit React sources freely in this independent export. MotionUX Build edits the managed document separately. Source hashes are listed in `motionux-manifest.json`.
