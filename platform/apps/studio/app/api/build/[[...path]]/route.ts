import { resolve } from "node:path";
import {
  createStore,
  maxDocument,
  BuildError,
  canonical,
  fingerprint,
} from "@motionux/build-core/store";
import { createComposer, type Composer } from "@motionux/build-core/composer";
import { manualDocument, templates } from "@motionux/build-core";
import { exportTree, zipTree } from "@motionux/app-export";
import { getPreview, startPreview, stopPreview } from "@motionux/preview-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const studioOrigin = "http://127.0.0.1:5200";
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
type Context = { params: Promise<{ path?: string[] }> };

function hasBody(request: Request) {
  return request.headers.has("content-type") || request.headers.has("transfer-encoding") ||
    Number(request.headers.get("content-length")) > 0;
}

async function documentBody(request: Request, limit = maxDocument) {
  if (
    !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    throw new BuildError(415, "Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new BuildError(400, "Missing document.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BuildError(413, "Project document exceeds the limit.");
      }
      parts.push(part.value);
    }
    try {
      return JSON.parse(Buffer.concat(parts).toString("utf8"));
    } catch {
      throw new BuildError(400, "Invalid JSON.");
    }
  } finally {
    reader.releaseLock();
  }
}

const state = globalThis as typeof globalThis & { motionuxComposer?: { vault: string; value: Composer } };
function composerFor(vault: string) {
  if (!state.motionuxComposer || state.motionuxComposer.vault !== vault) state.motionuxComposer = { vault, value: createComposer(vault) };
  return state.motionuxComposer.value;
}

async function handle(request: Request, { params }: Context) {
  const method = request.method;
  if (
    request.headers.get("host") !== "127.0.0.1:5200" ||
    request.headers.get("sec-fetch-site") !== "same-origin" ||
    request.headers.get("sec-fetch-dest") !== "empty" ||
    (method !== "GET" &&
      (request.headers.get("origin") !== studioOrigin ||
        request.headers.get("x-motionux-build") !== "1"))
  )
    return json(
      {
        message: "This API accepts requests from MotionUX Studio on loopback.",
      },
      403,
    );
  const repo = process.env.MOTIONUX_BUILD_REPO;
  if (!repo)
    return json(
      { message: "Start Studio with pnpm --dir platform studio." },
      503,
    );
  const fixture = process.env.MOTIONUX_BUILD_FIXTURE;
  const vault =
    fixture && /^build-browser-[a-z0-9]{8,24}$/.test(fixture)
      ? resolve(repo, ".motionux-v9", "build-tests", fixture)
      : resolve(repo, ".motionux-v9");
  const store = createStore(vault);
  const path = (await params).path ?? [];
  try {
    if (!path.length && method === "GET") return json(await store.list());
    if (!path.length && method === "POST") {
      if (!hasBody(request)) return json(await store.create(), 201);
      const value = await documentBody(request);
      const template = templates.find((item) => item === value?.template);
      if (!template || Object.keys(value).length !== 1) throw new BuildError(422, "Choose a supported template.");
      return json(await store.create(manualDocument(template)), 201);
    }
    if (path.length === 1 && path[0] === "preview") {
      if (method === "GET") return json(getPreview());
      if (method === "DELETE") {
        await stopPreview();
        return json(getPreview());
      }
    }
    const [id, action] = path;
    if (id === "compose" && path.length === 2) {
      const composer = composerFor(vault);
      if (method === "DELETE") return json(composer.cancel(action));
      if (method === "POST" && action === "generate")
        return json(await composer.generate(await documentBody(request, 8192), request.signal));
      if (method === "POST" && action === "review")
        return json(composer.revise(await documentBody(request, 4096)));
      if (method === "POST" && action === "create")
        return json(await composer.create(await documentBody(request, 512)), 201);
      return json({ message: "Unknown Composer action." }, 404);
    }
    if (path.length === 1 && method === "GET")
      return json(await store.open(id));
    if (path.length === 1 && method === "PUT")
      return json(await store.save(id, await documentBody(request)));
    if (path.length === 2 && method === "POST" && action === "recover")
      return json(await store.restore(id));
    if (path.length === 2 && method === "POST" && action === "preview") {
      const project = await store.open(id);
      if (hasBody(request)) {
        const body = await documentBody(request, 160);
        if (body?.revision !== project.revision || Object.keys(body).length !== 1)
          throw new BuildError(409, "The saved revision changed. Reopen the project to preview it.");
      }
      return json(startPreview(repo, vault, project), 202);
    }
    if (path.length === 2 && method === "GET" && (action === "export" || action === "export-pwa")) {
      const project = await store.open(id);
      const requested = request.headers.get("x-motionux-revision");
      if (requested !== null && requested !== String(project.revision))
        throw new BuildError(409, "The saved revision changed. Reopen the project to export it.");
      const pwa = action === "export-pwa";
      const files = await exportTree(repo, project, { pwa });
      const name = project.document.template === "hotel-dashboard" ? "hotel-desk" : project.document.template;
      const filename = name + (pwa ? "-pwa" : "") + "-source.zip";
      return new Response(Buffer.from(zipTree(files)), {
        headers: {
          "Content-Type": "application/zip",
          "X-MotionUX-Document": fingerprint(canonical(project.document)),
          "Content-Disposition": 'attachment; filename="' + filename + '"' ,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return json({ message: "Unknown Build action." }, 404);
  } catch (error) {
    if (error instanceof BuildError)
      return json({
        message: error.message,
        ...(path[0] === "compose" && error.status === 503 ? { code: "codex-unavailable" } : {}),
      }, error.status);
    console.error(
      "Build operation failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      { message: "Build operation failed. The current project was preserved." },
      500,
    );
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
