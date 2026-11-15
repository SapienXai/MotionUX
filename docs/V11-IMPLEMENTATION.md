# MotionUX V11 implementation

- Record V10 browser evidence and hash the original source, installed payloads and preview builds.
- Add local Favorites, collections, personal notes and library import/export.
- Capture private thumbnails from the existing original preview host and retain focused previews.
- Improve Playground sizing, installation and portable Project Kit exports.
- Validate the local server, doctor and backup/restore with disposable fixtures.
- Verify matched performance samples, browser regressions and public CI before reporting completion.

The V10 source engine is the baseline for all V11 checks. The Studio reports what mounted, what installed and what has sampled parity. Full component acceptance is a separate review.

## Daily use

Install dependencies with `npm ci` using Node.js 24. With the local source vault prepared, run `npm run studio` and open the address printed in the terminal. The server binds to `127.0.0.1:5199`. A repeat launch reuses the running build. If the server is older, stop that process and rerun the same command. Existing captured runtimes open offline. Upstream demos that use external assets still depend on those providers. [Studio](http://127.0.0.1:5199/) · [Prepare or refresh originals](V9-ORIGINAL-SOURCE-ENGINE.md)

- **Gallery** keeps the installed originals as the default. Save a favorite from a card, add it to one or more collections, or open its original Playground.
- **My Library** contains favorites and named collections. Add a personal note and tags for search. Save a scene when the source offers one, or a preview theme for React demos. Unavailable items retain their saved details.
- **Use in your project** shows the original file, usage example, same-Mac install command and portable package. A standalone HTML install includes the original document and a sandboxed React iframe wrapper. The parent controls frame sizing and frame policy. Styles, accessibility and callbacks inside the document have their own boundary.
- **Project Kit** bundles a collection of registry files with dependency notes. It flags conflicting package pins and lists unavailable entries. Check shared CSS and file targets before installing multiple upstream packages in one app.

The thumbnail command captures the actual preview host in two widths and both themes. Cached images are keyed by source and package identity, dimensions and theme. Initial setup runs with or without a cache. Use `--force` to replace existing images. Browsing unmounts offscreen frames when their focus or pointer interaction has ended. Reentering starts the original document in a fresh frame.

```sh
npm run studio:thumbnails
npm run studio:doctor
npm run studio:verify
```

The doctor checks hashes, prepared artifacts, upstream link format, the library, the thumbnail cache and the listening process. Install Playwright Chromium, Firefox and WebKit before running browser verification. V11 browser evidence is saved to `.motionux-v9/evidence/v11/current/`. The source regression suite refreshes its report in `.motionux-v9/evidence/v10/`. Existing V10 evidence was recorded separately before the change. On another verified V10 workspace, record the private source identity before testing with `node scripts/studio/v11/identity.mjs --record`.

## Library and recovery

Your personal library lives in `.motionux-v9/user/library.v1.json`. Imports save a previous copy under `.motionux-v9/user/history/` before applying changes. The UI export contains favorites, collections and personal notes and preferences.

Backup and restore use Python 3.9 or newer. Choose an ignored local vault path or a private location outside the repository. The `all` archive includes prepared original and installed runtime files, registry packages, captured material, thumbnails and the current library when it exists. Dependency caches, Git checkouts and local verification artifacts can be regenerated. Prepared previews can start from the restored archive without re-fetching upstream sources.

```sh
npm run studio:backup -- .motionux-v9/backups/my-workspace.tar.gz --scope all
npm run studio:restore -- .motionux-v9/backups/my-workspace.tar.gz --check
```

Use `--scope library` for just the current personal library, or `--scope vault` for prepared components. For a restore, stop Studio and repeat the restore command without `--check`. Restore stages and verifies all archive files before switching them into place. The previous data is retained under `.motionux-v9/recovery/`. Source payloads, previews, library files and archives belong in the local workspace.
