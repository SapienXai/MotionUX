import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { extendSources, sources } from "./pilots.mjs";

const vault = resolve(".motionux-v9");
const shell = resolve("dist");
const port = 5199;
const host = `127.0.0.1:${port}`;
extendSources(JSON.parse(await readFile("metadata/v9-provider-candidates.json", "utf8")));
const catalog = [];
for (const provider of Object.keys(sources)) {
  try {
    catalog.push(...JSON.parse(await readFile(resolve(vault, "runtime", provider, "catalog.json"), "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
try {
  catalog.push(...JSON.parse(await readFile(resolve(vault, "runtime", "designbookmark", "catalog.json"), "utf8")));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!catalog.length) throw new Error("Run npm run sources:prepare before starting the private Studio.");
const studio = (await readFile(resolve(shell, "index.html"), "utf8")).replace("<html ", '<html data-original-sources="local" ');
const byId = new Map(catalog.map(item => [item.id, item]));
const detailCatalog = new Map(catalog.map(item => {
  const record = { ...item, installURL: "/v9/registry/" + item.id + ".json" };
  delete record.installRecipe;
  return [item.id, record];
}));
const visibleCatalog = catalog.map(({ id, slug, group, provider, title, category, format, height, demoURL, fidelityStatus }) =>
  ({ id, slug, group, provider, title, category, format, height, demoURL, fidelityStatus }));

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
      response.setHeader("Content-Type", types[".html"]);
      response.end(studio);
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
        const [visual, verified] = await Promise.all(["normalized.json", "verification.json"].map(async file => {
          try { return JSON.parse(await readFile(resolve(evidence, file), "utf8")); }
          catch (error) { if (error.code !== "ENOENT") throw error; return null; }
        }));
        const comparisons = visual?.find(item => item.id === id)?.comparisons ?? [];
        const trajectories = verified?.pilots.filter(item => item.id === id) ?? [];
        response.setHeader("Content-Type", types[".json"]);
        response.end(JSON.stringify({ comparisons, trajectories }));
      } else {
        const icon = stem.match(/^([a-z0-9-]+)-(light|dark|original)-diff\.png$/);
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
}).listen(port, "127.0.0.1", () => console.log(`MotionUX Studio with ${catalog.length} local original sources at http://${host}/?view=sources`));
