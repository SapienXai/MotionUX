
## Install and use offline

Build with `npm run build`, then serve with `npm start`. The build command prepares the service worker for the current app snapshot. Use HTTPS or loopback (`localhost` or `127.0.0.1`), and give each app its own origin. ZIPs contain source and need a production build before installation.

On the first connected visit, wait for **Available offline**. Use **Install app** when the browser offers it, or its install or Add to Home Screen command. Browser support varies.

The saved release includes all exported pages and their assets, so you can revisit or navigate between them offline, even if you have never opened those pages individually. CRM opportunities and preferences use browser-local data. Devices do not sync. Keep a connected tab open for initial setup and if the browser clears its storage. Updates download a separate snapshot while connected and take effect once all tabs and app windows for the old version close.
