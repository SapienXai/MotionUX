import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { sources } from "./pilots.mjs";
import { catalogSummary, loadCatalog, preparation, vault } from "../studio/catalog.mjs";

import { createLibraryAPI, createLibraryStore, catalogID } from "../studio/v11/library.mjs";
import { describeKit, kitArchive } from "../studio/v11/kits.mjs";
import { loadThumbnails } from "../studio/v11/thumbnail-cache.mjs";
import { requestURL, safeFile } from "../studio/v11/paths.mjs";

const shell = resolve(process.env.MOTIONUX_STUDIO_SHELL ?? "dist");
const fixture = process.env.MOTIONUX_LIBRARY_FIXTURE;
const port = fixture ? Number(process.env.MOTIONUX_FIXTURE_PORT) : 5199;
if (!Number.isInteger(port) || port < 1024 || port > 65535 || fixture && port === 5199) throw new Error("Invalid fixture port.");
const host = `127.0.0.1:${port}`;
const origin = "http://" + host;
const byId = await loadCatalog();
const store = createLibraryStore(fixture || resolve(vault, "user"), byId);
const libraryAPI = createLibraryAPI(store, origin);
let thumbnails = await loadThumbnails(vault, byId);
let thumbnailFiles = new Map([...thumbnails.values()].flat().map(({ key, file }) => [key, file]));
let thumbTime = Date.now();
async function refreshThumbnails() {
  if (Date.now() - thumbTime < 5000) return;
  thumbTime = Date.now();
  thumbnails = await loadThumbnails(vault, byId);
  thumbnailFiles = new Map([...thumbnails.values()].flat().map(({ key, file }) => [key, file]));
}
const catalog = [...byId.values()];
const ready = catalog.filter(item => item.availability === "ready");
if (!ready.length) throw new Error(preparation);
const studio = (await readFile(await safeFile(shell, "index.html", shell), "utf8")).replace("<html ", '<html data-original-sources="local" ');
const detailCatalog = new Map(catalog.map(item => {
  const { installRecipe, ...record } = item;
  return [item.id, { ...record, installURL: installRecipe && "/v9/registry/" + item.id + ".json" }];
}));
const visibleCatalog = catalog.map(catalogSummary);
const previewStyle = `<style>
html { overscroll-behavior: contain auto; }
#specimen { grid-template-columns: minmax(0, 1fr); justify-items: safe center; }
</style>`;

async function studioPreview(response, item, options) {
  if (item?.availability !== "ready" || options.get("item") !== item.slug) return response.writeHead(404).end();
  response.setHeader("Content-Type", types[".html"]);
  if (item.sourceKind === "react") {
    const upstream = await readFile(await safeFile(resolve(vault, "runtime", item.group, "original", "dist"), "index.html", vault), "utf8");
    response.end(upstream.replace("<html ", '<html data-studio-preview="react" ').replace("</head>", previewStyle + "</head>"));
    return;
  }
  const src = "/v9/live/designbookmark/original/" + encodeURIComponent(item.slug) + ".html";
  // Validate existence at request time, since the local vault can be removed while the Studio is running.
  await safeFile(resolve(vault, "runtime", item.group, "original", "dist"), item.slug + ".html", vault);
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'self'");
  response.end(`<!doctype html><html lang="en" data-studio-preview="html"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Studio HTML preview</title>
<style>body { margin: 0; } iframe { display:block; inline-size: 100%; block-size: 100dvh; border: 0; }</style>
</head><body><iframe title="Interactive original HTML" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${src}"
onload="document.documentElement.dataset.previewLoaded='true'"></iframe></body></html>`);
}

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4",
};

async function sendFile(response, root, relative, boundary = vault) {
  const file = await safeFile(root, relative, boundary);
  response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
  const stream = createReadStream(file);
  stream.on("error", error => response.destroy(error));
  stream.pipe(response);
}

async function sendKit(request, response, path) {
  if (request.headers["sec-fetch-site"] === "cross-site") return response.writeHead(403).end();
  const collection = path.match(/^\/v11\/kits\/([a-f0-9-]{36})(\.zip)?$/);
  const single = path.match(/^\/v11\/export\/([a-z0-9-]{1,96})\.zip$/);
  if (!collection && !single) return response.writeHead(404).end();
  let selection;
  if (collection) selection = (await store.read()).collections.find(entry => entry.id === collection[1]);
  else {
    const entry = byId.get(single[1]);
    if (entry?.availability === "ready") selection = { name: entry.title, items: [entry.id] };
  }
  if (!selection) return response.writeHead(404).end();
  const plan = describeKit(selection.items, byId);
  if (collection && !collection[2]) {
    return response.writeHead(200, { "Content-Type": types[".json"] }).end(JSON.stringify(plan));
  }
  const packages = [];
  let size = 0;
  for (const item of plan.items) {
    const spec = byId.get(item.id);
    const file = await safeFile(resolve(vault, "registry"), basename(spec.installRecipe), vault);
    size += (await stat(file)).size;
    if (size > 32 * 1024 * 1024) return response.writeHead(413).end("Download this kit in smaller collections.");
    packages.push({ id: item.id, bytes: await readFile(file) });
  }
  const name = single ? single[1] : "motionux-project-kit";
  const archive = kitArchive(selection.name, plan, packages);
  response.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}.zip"` }).end(archive);
}

const server = createServer({ requestTimeout: 15000, headersTimeout: 5000, maxHeaderSize: 16384 }, async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  if (request.socket.remoteAddress !== "127.0.0.1" || request.headers.host !== host) {
    response.writeHead(403).end("The original-source workspace is local to MotionUX.");
    return;
  }
  try {
    const { url, path } = requestURL(request.url, origin);
    if (path === "/v11/library" && !url.search) return await libraryAPI(request, response);
    if (request.method !== "GET") return response.writeHead(405, { Allow: "GET" }).end();
    const id = url.searchParams.get("id");
    if (id !== null && !catalogID.test(id)) return response.writeHead(400).end();
    if (path === "/") {
      response.setHeader("X-MotionUX-Studio", "v11");
      response.setHeader("X-MotionUX-Build", process.env.MOTIONUX_STUDIO_BUILD ?? "manual");
      response.setHeader("Content-Type", types[".html"]);
      response.end(studio);
    } else if (path.startsWith("/v11/kits/") || path.startsWith("/v11/export/")) {
      await sendKit(request, response, path);
    } else if (path === "/v11/thumbnails.json") {
      await refreshThumbnails();
      const index = Object.fromEntries([...thumbnails].map(([source, options]) => [source, options.map(({ url, width, height, scheme }) => ({ url, width, height, scheme }))]));
      response.writeHead(200, { "Content-Type": types[".json"] }).end(JSON.stringify(index));
    } else if (path.startsWith("/v11/thumbnails/")) {
      const match = path.match(/^\/v11\/thumbnails\/([a-f0-9]{32})\.jpeg$/);
      const file = match && thumbnailFiles.get(match[1]);
      if (!file) return response.writeHead(404).end();
      response.setHeader("Cache-Control", "private, max-age=86400, immutable");
      await sendFile(response, resolve(vault, "thumbnails"), basename(file));
    } else if (path.startsWith("/v10/preview/")) {
      await studioPreview(response, byId.get(path.slice("/v10/preview/".length)), url.searchParams);
    } else if (path === "/v9/catalog.json") {
      const payload = id ? detailCatalog.get(id) : visibleCatalog;
      if (!payload) return response.writeHead(404).end();
      response.setHeader("Content-Type", types[".json"]);
      response.end(JSON.stringify(payload));
    } else if (path === "/v9/source") {
      const item = byId.get(url.searchParams.get("id"));
      const file = url.searchParams.get("file");
      if (!item?.codeFiles.some(entry => entry.path === file)) return response.writeHead(404).end();
      const lane = url.searchParams.get("lane") === "installed" ? "installed" : "original";
      const root = resolve(vault, "runtime", item.group, lane);
      const content = await readFile(await safeFile(root, file, vault), "utf8");
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end(content);
    } else if (path.startsWith("/v9/registry/")) {
      const match = path.match(/^\/v9\/registry\/([a-z0-9-]{1,96})\.json$/);
      const item = match && byId.get(match[1]);
      if (!item || item.availability !== "ready") return response.writeHead(404).end();
      response.setHeader("Content-Type", types[".json"]);
      response.setHeader("Content-Disposition", `attachment; filename="${item.id}.json"`);
      response.end(await readFile(await safeFile(resolve(vault, "registry"), basename(item.installRecipe), vault)));
    } else if (path.startsWith("/v9/evidence/")) {
      const stem = path.slice("/v9/evidence/".length);
      const evidence = resolve(vault, "evidence");
      if (stem.endsWith(".json")) {
        const id = stem.slice(0, -5);
        if (!byId.has(id)) return response.writeHead(404).end();
        const [visual, verified, v10] = await Promise.all(["normalized.json", "verification.json", "v10/report.json"].map(async file => {
          try { return JSON.parse(await readFile(await safeFile(evidence, file, vault), "utf8")); }
          catch (error) { if (error.code !== "ENOENT") throw error; return null; }
        }));
        const comparisons = visual?.find(item => item.id === id)?.comparisons ?? [];
        const trajectories = verified?.pilots.filter(item => item.id === id) ?? [];
        response.setHeader("Content-Type", types[".json"]);
        const source = byId.get(id);
        const galleryMount = Boolean(v10?.gallery.some(row => row.id === id && row.sourceHash === source.upstreamHash && !row.error));
        const deepLink = Boolean(v10?.deepLinks.some(row => row.id === id && row.sourceHash === source.upstreamHash && !row.error));
        const latest = v10?.comparisons.find(row => row.id === id && row.sourceHash === source.upstreamHash && !row.error);
        const studio = latest ? { image: `v10/${id}-comparison.png`, pixelDiffs: latest.pixelDiffs,
          interactionSampled: latest.interactionSampled, statesMatch: latest.statesMatch } : undefined;
        response.end(JSON.stringify({ comparisons, trajectories, galleryMount, deepLink, studio }));
      } else {
        const icon = stem.match(/^([a-z0-9-]+)-(light|dark|original)-diff\.png$/) ??
          stem.match(/^v10\/([a-z0-9-]+)-comparison\.png$/);
        if (!icon || !byId.has(icon[1])) return response.writeHead(404).end();
        await sendFile(response, evidence, stem);
      }
    } else if (path.startsWith("/v9/live/")) {
      const [, , , provider, lane, ...asset] = path.split("/");
      if (!Object.hasOwn(sources, provider) && provider !== "designbookmark" || !["original", "installed"].includes(lane)) return response.writeHead(404).end();
      if (provider === "designbookmark" && asset.at(-1)?.endsWith(".html") && asset.at(-1) !== "index.html") {
        response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob: https://designbookmark.com; media-src data: blob:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
      }
      await sendFile(response, resolve(vault, "runtime", provider, lane, "dist"), asset.join("/") || "index.html");
    } else {
      await sendFile(response, shell, path.slice(1), shell);
    }
  } catch (error) {
    if (response.headersSent) return response.destroy();
    if (["ENOENT", "ENOTDIR"].includes(error.code)) return response.writeHead(404).end();
    if (error.code === "TOO_LARGE") return response.writeHead(414).end();
    if (error.code === "INVALID_URL") return response.writeHead(400).end();
    if (error.status === 503) return response.writeHead(503).end(error.message);
    console.error("Private Studio request failed:", error.code ?? error.name);
    response.writeHead(500).end();
  }
});
server.on("error", error => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is occupied. Stop its listener and retry npm run studio.` : "Local Studio server could not start: " + error.code);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => console.log(`MotionUX Studio with ${ready.length}/${catalog.length} prepared original sources at http://${host}/`));
