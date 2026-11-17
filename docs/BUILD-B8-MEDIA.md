# Managed media and export rights

Images belong to a managed project. The library accepts JPEG, PNG and WebP up to 4 MiB, 5,000 pixels on an edge and 12 megapixels in total. The uploader explicitly confirms rights for export. The service validates the bytes with a pinned Sharp decoder, rejects unsupported content and animated inputs, applies orientation, strips metadata and creates 360 and 720 pixel WebP renditions.

Each upload has content-derived identity, an original display name, dimensions, normalized hashes and a rights record. Files are staged in the private Build vault, then renamed into place. Cancellation releases the active upload slot and removes staging. Project and directory identity checks, private permissions and hash validation protect reads. A project accepts up to 24 uploaded images. Its saved document may reference only its own verified media and the permitted starter assets.

In the editor, use the Media panel to import, search and preview images. In Properties, choose an image and provide meaningful alt text when the image carries information. Used images must be removed from referencing blocks before their project association can be removed. Removing an unused image from the project document retains the local copy for reuse or recovery, and does not free the vault slot.

Use **Media backup** to download a project-bound JSON archive containing the normalized WebP files, hashes and rights records for uploaded images. **Restore media backup** validates the entire archive, checks each image and checksum, and merges missing files into the same managed project. Restoring the same archive again leaves existing copies untouched. Bundled demonstration images are supplied by the template. The archive covers media presence and metadata. Saved page layout and image placement stay in the project document.

**Delete image permanently** frees the upload slot. Detach the image first. The server also checks the current saved project, the previous saved revision and the vault recovery draft under the project write lock. An image held by the previous revision becomes eligible for deletion after a subsequent save of a document without it. Keep a backup to recover the file after deletion.

Source exports include the WebP renditions referenced by the saved document, with each file covered by the export manifest. An optional PWA export includes those same files in its precache. Upload bytes are decoded locally and only verified renditions remain in the vault. The demonstration images were created for this template and ship with the repository. [Sample asset provenance](../platform/templates/hotel-marketing/ASSETS.md)

Per-site external image URLs, SVG uploads, original downloads and video are outside the current library workflow.
