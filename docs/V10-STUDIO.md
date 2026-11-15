# MotionUX Studio · Originals Gallery

Install the repository dependencies once with `npm ci`. A checkout with the prepared local vault starts with one command.

```sh
npm run studio
```

Open [MotionUX Studio](http://127.0.0.1:5199/) on the same computer. The server checks the local runtime, builds the Studio shell, and reuses the prepared upstream and consumer fixtures. A fresh workspace needs `npm run sources:inspect` followed by `npm run sources:prepare`. See the source preparation and refresh details. [V9 source preparation](V9-ORIGINAL-SOURCE-ENGINE.md)

## Gallery and Playground

The main Gallery contains 140 upstream specimens from the currently prepared vault. Search the entire collection or combine provider, category, and source-format filters. The default order features examples from several providers. Each preview runs upstream code in an isolated document at its native scale. The Studio shell follows the system appearance until you select a theme. Captured HTML retains its own presentation and controls.

- **Playground** opens the matching original and supports its available scenes.
- **Code** exposes the original file and the actual installed file. **Usage** shows the registry package example.
- **Install** supplies a shadcn command and the registry JSON from the same loopback server.
- **Compare** shows a captured upstream fixture, the exact Studio preview host, and a separately built consumer using the installed registry package. The capture and Studio share upstream source bytes. Studio applies responsive host sizing. Reset the three scenes together and repeat the gesture independently in each lane.
- **Legacy V8** opens the separate collection of 82 earlier MotionUX previews. Old `?item=<id>` bookmarks open the original in the private Studio when available. `?item=<id>&collection=legacy` opens the V8 version. Discovery links to upstream candidates outside the installed collection.

| Provider | Prepared originals |
| --- | ---: |
| DesignBookmark | 51 |
| Kokonut UI | 25 |
| SmoothUI | 38 |
| React Bits | 7 |
| Motion Primitives | 10 |
| Magic UI | 9 |

The vault has **90 React sources** and **50 standalone HTML sources**. The HTML installs include a static copy of the document and a sandboxed React iframe host. The public shadcn registry and prior pins still work with the public Studio on `npm run dev`.

## Verification

Keep the private Studio running and use the browser gate from a second terminal.

```sh
npx playwright install chromium firefox webkit
npm run studio:verify
```

The gate scrolls through every original card and opens every direct Playground route. It covers source filters, code and install, recovery, browser history, viewport layout and selected comparisons. Private screenshots and the JSON report stay in `.motionux-v9/evidence/v10/`. The legacy and public CI suite runs independently with `npm run verify`.

The original-source server binds to `127.0.0.1`. Registry payloads and captured source files stay inside the ignored local workspace. The public build and GitHub Actions run without those files. Full visual, motion, assistive technology and device acceptance are tracked separately from browser mounts and sampled comparisons.
