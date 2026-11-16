# Export an installable app

Open a project in [MotionUX Build](http://127.0.0.1:5200/build) and choose **Export PWA**. Unpack the ZIP and run these commands in the exported directory.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm start
```

Use `http://127.0.0.1:3000` for the local app. A hosted installation requires HTTPS. Each exported app needs its own origin. The production build generates its service worker and its snapshot of routes and assets, so use `npm run build` whenever you change the source.

Open the app while connected and wait for **Available offline**. Use **Install app** when the browser offers it or use your browser's install or Add to Home Screen command. The normal **Export** button still gives you a standard Next.js source ZIP.

The offline snapshot includes all saved pages. CRM contacts, activities and opportunity stages and Hotel bookings and rooms are available as fictional data. CRM stage changes and theme preferences live in the browser. Unknown pages offline show a recovery link to the app's home. A connected visit can prepare the snapshot again if browser storage was cleared. A new build downloads separately and becomes active after existing app windows close.

Production previews in Studio retain their existing behavior. For offline testing, run the exported app independently. Local coverage and browser limitations are listed in the [Build quality gates](BUILD-QUALITY-GATES.md).
