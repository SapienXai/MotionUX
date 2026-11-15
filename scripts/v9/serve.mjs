import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { sources } from "./pilots.mjs";
import { catalogSummary, loadCatalog, preparation, vault } from "../studio/catalog.mjs";

const shell = resolve("dist");
const port = 5199;
const host = `127.0.0.1:${port}`;
const byId = await loadCatalog();
const catalog = [...byId.values()];
const ready = catalog.filter(item => item.availability === "ready");
if (!ready.length) throw new Error(preparation);
const studio = (await readFile(resolve(shell, "index.html"), "utf8")).replace("<html ", '<html data-original-sources="local" ');
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
    const upstream = await readFile(resolve(vault, "runtime", item.group, "original", "dist", "index.html"), "utf8");
    response.end(upstream.replace("<html ", '<html data-studio-preview="react" ').replace("</head>", previewStyle + "</head>"));
    return;
  }
  const src = "/v9/live/designbookmark/original/" + encodeURIComponent(item.slug) + ".html";
  // Validate existence at request time, since the local vault can be removed while the Studio is running.
  if (!(await stat(resolve(vault, "runtime", item.group, "original", "dist", item.slug + ".html"))).isFile()) {
    return response.writeHead(404).end();
  }
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
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp4": "video/mp4",
};

async function sendFile(response, root, relative) {
  const base = await realpath(root);
  const file = await realpath(resolve(base, relative));
  if (!file.startsWith(base + sep)) throw Object.assign(new Error("Outside served directory"), { code: "ENOENT" });
  if (!(await stat(file)).isFile()) throw Object.assign(new Error("Path is not a file"), { code: "ENOENT" });
  response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
  const stream = createReadStream(file);
  stream.on("error", error => response.destroy(error));
  stream.pipe(response);
}

createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  if (request.headers.host !== host || request.method !== "GET") {
    response.writeHead(403).end("The original-source workspace is local to MotionUX.");
    return;
  }
  try {
    const url = new URL(request.url, "http://" + host);
    const path = decodeURIComponent(url.pathname);
    if (path === "/") {
      response.setHeader("X-MotionUX-Studio", "v10");
      response.setHeader("Content-Type", types[".html"]);
      response.end(studio);
    } else if (path.startsWith("/v10/preview/")) {
      await studioPreview(response, byId.get(path.slice("/v10/preview/".length)), url.searchParams);
    } else if (path === "/v9/catalog.json") {
      const id = url.searchParams.get("id");
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
      const content = await readFile(resolve(root, file), "utf8");
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end(content);
    } else if (path.startsWith("/v9/registry/")) {
      const item = byId.get(path.slice("/v9/registry/".length).replace(/\.json$/, ""));
      if (!item) return response.writeHead(404).end();
      response.setHeader("Content-Type", types[".json"]);
      response.setHeader("Content-Disposition", `attachment; filename="${item.id}.json"`);
      response.end(await readFile(item.installRecipe));
    } else if (path.startsWith("/v9/evidence/")) {
      const stem = path.slice("/v9/evidence/".length);
      const evidence = resolve(vault, "evidence");
      if (stem.endsWith(".json")) {
        const id = stem.slice(0, -5);
        if (!byId.has(id)) return response.writeHead(404).end();
        const [visual, verified, v10] = await Promise.all(["normalized.json", "verification.json", "v10/report.json"].map(async file => {
          try { return JSON.parse(await readFile(resolve(evidence, file), "utf8")); }
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
      await sendFile(response, shell, path.slice(1));
    }
  } catch (error) {
    if (response.headersSent) return response.destroy();
    if (error.code !== "ENOENT") console.error(error.message);
    response.writeHead(error.code === "ENOENT" ? 404 : 500).end();
  }
}).listen(port, "127.0.0.1", () => console.log(`MotionUX Studio with ${ready.length}/${catalog.length} prepared original sources at http://${host}/`));
