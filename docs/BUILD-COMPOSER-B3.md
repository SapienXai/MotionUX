# Build an app from a brief

Start the local Studio:

```sh
pnpm --dir platform install --frozen-lockfile --ignore-scripts
pnpm --dir platform studio
```

Open [Build](http://127.0.0.1:5200/build). For Generate on macOS, the verified bridge uses the Codex CLI bundled with ChatGPT Desktop and the existing Codex sign-in. This path is verified with `codex-cli 0.169.0-alpha.11.1`; it uses the native `codex exec` structured stream. The [TypeScript SDK](https://github.com/openai/codex/tree/main/sdk/typescript) also wraps the CLI and provides `startThread`, `run`, `runStreamed` and `outputSchema`; direct CLI avoids an extra dependency and lets the host control the exact process, OS policy and environment. No separate API key is needed. If the bridge is unavailable, choose **New Sales CRM**, **New Hotel Desk**, or **New Blank workspace**.

Example briefs:

> Create a premium sales CRM with contact filters, a sales pipeline with editable local stages, activity details, settings and mobile bottom navigation. Use fictional records.

> Satış ekibimiz için sade bir CRM oluştur. Kişi rehberi, satış hattı, aktiviteler ve ayarlar olsun. Mobilde alt menü kullan. Gerçek müşteri verisi kullanma.

Choose **Generate blueprint** and review the app name, ordered pages, planned blocks and limitations. Edit the name, page selection, order, theme or navigation; choose **Validate changes** to review the new revision. **Create App in MotionUX** makes a new managed project and opens the canvas. No project is created while planning, reviewing or cancelling.

In the canvas, choose a page, edit its blocks and Save. **Run** launches a production-mode preview of the saved revision on macOS. **Export** downloads an independent Next project. Extract it and run `npm ci --ignore-scripts`, `npm run typecheck`, `npm run build` and `npm start`. The exported `motionux-manifest.json` records the adapter, pins, rights, document digest and source file hashes.

CRM stage edits and workspace preferences use browser-local storage. The demo cannot sign in users, send emails, accept payments, access customer records or produce a native binary. Source requests, URLs or credentials should stay out of briefs. If a generation times out or is refused, try a shorter brief with one workflow or open a manual template. After a save conflict, reopen the project before applying your edits to the new revision.
