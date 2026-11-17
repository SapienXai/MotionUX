import { resolve } from "node:path";
import {
  createStore,
  maxDocument,
  BuildError,
  canonical,
  fingerprint,
} from "@motionux/build-core/store";
import { createComposer, type Composer } from "@motionux/build-core/composer";
import { manualDocument, templates, type Document } from "@motionux/build-core";
import { exportTree, zipTree } from "@motionux/app-export";
import { backupMedia, ingestMedia, listMedia, maxMediaBackup, mediaBytes, purgeMedia, restoreMedia, verifyMediaOwnership } from "@motionux/app-export/media";
import {
  getPreview, inspectPreview, startPreview, stopPreview,
  inspectIntegration, withIntegrationSlot,
} from "@motionux/preview-host";
import { approvalKey, createIntegrationLab } from "@motionux/preview-host/integration";

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

const state = globalThis as typeof globalThis & {
  motionuxComposer?: { vault: string; value: Composer };
  motionuxIntegration?: { vault: string; value: ReturnType<typeof createIntegrationLab> };
};
function composerFor(vault: string) {
  if (!state.motionuxComposer || state.motionuxComposer.vault !== vault) state.motionuxComposer = { vault, value: createComposer(vault) };
  return state.motionuxComposer.value;
}
function integrationFor(repo: string, vault: string) {
  if (!state.motionuxIntegration || state.motionuxIntegration.vault !== vault) {
    const key = approvalKey(process.env.MOTIONUX_BUILD_APPROVAL_KEY);
    state.motionuxIntegration = {
      vault,
      value: createIntegrationLab(repo, vault, key, (...args) => inspectIntegration(repo, vault, ...args)),
    };
  }
  return state.motionuxIntegration.value;
}

async function handle(request: Request, { params }: Context) {
  const method = request.method;
  const path = (await params).path ?? [];
  const mediaImage = method === "GET" && path[1] === "media" && path.length === 3 &&
    request.headers.get("sec-fetch-dest") === "image";
  if (
    request.headers.get("host") !== "127.0.0.1:5200" ||
    request.headers.get("sec-fetch-site") !== "same-origin" ||
    (!mediaImage && request.headers.get("sec-fetch-dest") !== "empty") ||
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
  try {
    if (!path.length && method === "GET") return json(await store.list());
    if (!path.length && method === "POST") {
      if (!hasBody(request)) return json(await store.create(), 201);
      const value = await documentBody(request);
      const template = templates.find((item) => item === value?.template);
      if (!template || Object.keys(value).some((key) => key !== "template" && (key !== "locale" || template !== "hotel-marketing")) ||
          (value.locale !== undefined && value.locale !== "en" && value.locale !== "tr"))
        throw new BuildError(422, "Choose a supported template.");
      return json(await store.create(manualDocument(template, value.locale)), 201);
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
    const verifyAssets = (document: Document) => verifyMediaOwnership(repo, vault, id, document);
    if (path.length === 1 && method === "PUT") {
      return json(await store.save(id, await documentBody(request), verifyAssets));
    }
    if (path.length === 2 && action === "draft") {
      if (method === "GET") return json(await store.openDraft(id));
      if (method === "PUT") return json(await store.saveDraft(id, await documentBody(request), verifyAssets));
      if (method === "DELETE") {
        const value = await documentBody(request, 128);
        if (!Number.isSafeInteger(value?.updatedAt) || value.updatedAt < 0 || Object.keys(value).length !== 1)
          throw new BuildError(422, "An exact recovery draft timestamp is required.");
        await store.clearDraft(id, value.updatedAt);
        return json({ cleared: true });
      }
    }
    if (action === "media") {
      const project = await store.open(id);
      const seeds = project.document.template === "hotel-marketing";
      if (path.length === 2 && method === "GET") return json(await listMedia(vault, id, seeds));
      if (path.length === 2 && method === "POST")
        return json(await store.withProjectLock(id, () => ingestMedia(vault, id, request)), 201);
      if (path.length === 3 && path[2] === "backup") {
        if (method === "GET") {
          const archive = await store.withProjectLock(id, () => backupMedia(vault, id));
          return Response.json(archive, { headers: {
            "Content-Disposition": 'attachment; filename="motionux-media-' + id + '.json"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          } });
        }
        if (method === "POST") {
          const archive = await documentBody(request, maxMediaBackup);
          return json(await store.withProjectLock(id, () => restoreMedia(vault, id, archive, request.signal)));
        }
      }
      if (path.length === 3 && method === "DELETE")
        return json(await store.withMediaReferences(id, (documents) => purgeMedia(vault, id, path[2], documents)));
      if (path.length === 3 && method === "GET") {
        const image = /^(seed-(?:coast|room|pool)|[a-f0-9]{64})-(360|720)\.webp$/.exec(path[2]);
        if (!image || (!seeds && image[1].startsWith("seed-"))) throw new BuildError(404, "Unknown image.");
        const bytes = await mediaBytes(repo, vault, id, image[1], image[2] === "360" ? 360 : 720);
        return new Response(new Uint8Array(bytes), { headers: {
          "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        } });
      }
      throw new BuildError(404, "Unknown media action.");
    }
    if (action === "integration") {
      const lab = integrationFor(repo, vault);
      const [,, operation] = path;
      if (path.length === 2 && method === "GET")
        return json({
          available: process.platform === "darwin" && Boolean(lab.signer),
          macOS: process.platform === "darwin",
          signer: lab.signer,
        });
      if (path.length !== 3) throw new BuildError(404, "Unknown integration action.");
      if (method === "DELETE" && /^[a-f0-9]{32}$/.test(operation)) {
        await lab.cancel(id, operation);
        return json({ cancelled: true });
      }
      if (process.platform !== "darwin") throw new BuildError(501, "Isolated integration currently requires macOS.");
      if (method === "POST" && operation === "review") {
        const body = await documentBody(request, 256);
        if (!body || typeof body.route !== "string" || !Number.isSafeInteger(body.revision) || Object.keys(body).length !== 2)
          throw new BuildError(422, "Choose a saved page and revision.");
        const project = await store.open(id);
        if (body.revision !== project.revision) throw new BuildError(409, "The saved revision changed. Reopen the project.");
        return json(await lab.prepare(project, body.route));
      }
      if (method === "POST" && operation === "apply") {
        const body = await documentBody(request, 384);
        if (!body || typeof body.id !== "string" || !/^[a-f0-9]{32}$/.test(body.id) ||
            typeof body.signature !== "string" || Object.keys(body).length !== 2)
          throw new BuildError(422, "An exact review ID and host signature are required.");
        return json(await withIntegrationSlot(() =>
          lab.execute(id, body.id, body.signature, () => store.open(id), request.signal),
        ));
      }
      throw new BuildError(404, "Unknown integration action.");
    }
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
    if (path.length === 2 && method === "POST" && action === "inspect") {
      const body = await documentBody(request, 256);
      if (
        !body ||
        typeof body.route !== "string" ||
        !Number.isSafeInteger(body.revision) ||
        Object.keys(body).length !== 2
      )
        throw new BuildError(
          422,
          "Inspection requires a managed page and saved revision.",
        );
      const project = await store.open(id);
      if (body.revision !== project.revision)
        throw new BuildError(
          409,
          "The saved revision changed. Reopen and run it before inspecting.",
        );
      return json(await inspectPreview(repo, project, body.route, request.signal));
    }
    if (path.length === 2 && method === "GET" && (action === "export" || action === "export-pwa")) {
      const project = await store.open(id);
      const requested = request.headers.get("x-motionux-revision");
      if (requested !== null && requested !== String(project.revision))
        throw new BuildError(409, "The saved revision changed. Reopen the project to export it.");
      const pwa = action === "export-pwa";
      const files = await exportTree(repo, project, { pwa, vault });
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
