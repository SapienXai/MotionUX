// Added only to exports with a pinned local video.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const range = request.headers.get("range");
  if (request.method !== "GET" || url.origin !== self.location.origin || url.search ||
    !range || !url.pathname.endsWith(".mp4") || !files.has(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(cacheName)).match(url.pathname);
    if (!cached) return fetch(request);
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    const body = await cached.blob();
    const start = match ? Number(match[1]) : body.size;
    const end = match && match[2] ? Math.min(Number(match[2]), body.size - 1) : body.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end)
      return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + body.size } });
    return new Response(body.slice(start, end + 1), { status: 206, headers: {
      "Content-Type": "video/mp4", "Accept-Ranges": "bytes",
      "Content-Range": "bytes " + start + "-" + end + "/" + body.size,
      "Content-Length": String(end - start + 1),
    } });
  })());
});
