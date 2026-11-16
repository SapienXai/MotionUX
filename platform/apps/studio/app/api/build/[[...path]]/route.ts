import { resolve } from "node:path";
import {
  createStore,
  maxDocument,
  BuildError,
} from "@motionux/build-core/store";
import { exportTree, zipTree } from "@motionux/app-export";
import { getPreview, startPreview, stopPreview } from "@motionux/preview-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const studioOrigin = "http://127.0.0.1:5200";
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
type Context = { params: Promise<{ path?: string[] }> };

async function documentBody(request: Request) {
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
      if (size > maxDocument) {
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
    if (!path.length && method === "POST")
      return json(await store.create(), 201);
    if (path.length === 1 && path[0] === "preview") {
      if (method === "GET") return json(getPreview());
      if (method === "DELETE") {
        await stopPreview();
        return json(getPreview());
      }
    }
    const [id, action] = path;
    if (path.length === 1 && method === "GET")
      return json(await store.open(id));
    if (path.length === 1 && method === "PUT")
      return json(await store.save(id, await documentBody(request)));
    if (path.length === 2 && method === "POST" && action === "recover")
      return json(await store.restore(id));
    if (path.length === 2 && method === "POST" && action === "preview")
      return json(startPreview(repo, vault, await store.open(id)), 202);
    if (path.length === 2 && method === "GET" && action === "export") {
      const files = await exportTree(repo, await store.open(id));
      return new Response(Buffer.from(zipTree(files)), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="hotel-desk-source.zip"',
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return json({ message: "Unknown Build action." }, 404);
  } catch (error) {
    if (error instanceof BuildError)
      return json({ message: error.message }, error.status);
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
