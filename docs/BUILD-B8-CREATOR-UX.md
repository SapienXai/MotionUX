# Create a site in MotionUX Studio

With workspace dependencies and the local originals prepared, run `npm run studio:build -- --with-gallery` and open the Studio entry. [Studio](http://127.0.0.1:5200/)

1. Open **Gallery** to browse originals, open an original's Playground or revisit My Library. Select **Build** to return to managed projects.
2. Select **New Hotel Marketing** to start with Costa di Sera, or describe the site in Composer and review its Blueprint. The sample covers the home page, room index, two room detail pages, story and contact.
3. Change a heading in **Properties** and add a photo in **Media**. After confirming rights, select the photo in the block's image field and set its alt text and focal point. Use the outline to select FAQ, room and image content.
4. Switch to **Interact** to follow the room links, open the gallery with the keyboard, try disclosures or validate a sample inquiry. The form uses fictional demo content and sends nothing.
5. Save, start **Run** on macOS and scan the saved page with **Inspector**. **Export** downloads the Next.js source. **Export PWA** adds the install manifest and offline snapshot.

Costa di Sera uses responsive page sections, editable editorial content and local imagery. Hotel Desk and Meridian CRM remain separate dashboard templates. The browser preview uses the authoring device width and theme. Exported pages use the configured site theme and system settings.

Discover uses the existing Gallery runtime and preserves its direct links. Build and Gallery currently keep separate search, theme and browser history. Returning to Build from Gallery starts a fresh Build navigation. The editor's originals shortcut opens a separate tab so the draft stays open.
