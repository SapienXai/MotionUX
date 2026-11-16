/* The production build prepends its immutable route and asset inventory. */
const { namespace, version, documents, assets } = self.motionuxOffline;
const cacheName = namespace + version;
const routes = new Set(documents);
const files = new Set(assets);
const fallback = "/pwa/offline.html";

let preparation;
async function prepareSnapshot() {
  const cache = await caches.open(cacheName);
  const urls = [...documents, ...assets];
  if ((await cache.keys()).length === urls.length) return;
  try {
    await cache.addAll(
      urls.map(
        (path) =>
          new Request(new URL(path, self.location.origin), {
            credentials: "omit",
            cache: "reload",
            redirect: "error",
          }),
      ),
    );
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
}

function prepare() {
  preparation ??= prepareSnapshot().finally(() => {
    preparation = undefined;
  });
  return preparation;
}

self.addEventListener("install", (event) => event.waitUntil(prepare()));

self.addEventListener("message", (event) => {
  if (event.data !== "motionux:prepare-offline" || event.ports.length !== 1)
    return;
  const port = event.ports[0];
  event.waitUntil(
    prepare()
      .then(
        () => port.postMessage(true),
        () => port.postMessage(false),
      )
      .finally(() => port.close()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(namespace) && key !== cacheName)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function navigate(request, path) {
  const cache = await caches.open(cacheName);
  if (routes.has(path)) {
    const page = await cache.match(path);
    if (page) return page;
  }
  try {
    return await fetch(request);
  } catch {
    const page = await cache.match(fallback);
    if (page)
      return new Response(page.body, { status: 503, headers: page.headers });
    return new Response("Offline. Reconnect to prepare this app again.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    request.headers.has("range")
  )
    return;
  const path = url.pathname
    .replace(/\[|%5b/gi, "%5B")
    .replace(/\]|%5d/gi, "%5D");
  if (request.mode === "navigate") {
    event.respondWith(navigate(request, path));
  } else if (files.has(path)) {
    event.respondWith(
      caches
        .open(cacheName)
        .then(async (cache) => (await cache.match(path)) ?? fetch(request)),
    );
  }
});
