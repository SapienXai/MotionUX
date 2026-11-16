import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  statfs,
  symlink,
} from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import type { BuildProject } from "@motionux/build-core";
import type { InspectionReport } from "@motionux/build-core/inspection";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import { exportTree, writeTree } from "@motionux/app-export";

type PreviewState = {
  status: "idle" | "building" | "starting" | "ready" | "failed";
  id?: string;
  revision?: number;
  documentDigest?: string;
  message?: string;
  url?: string;
  peakBytes?: number;
  peakRssBytes?: number;
};
type Session = {
  running: boolean;
  internal?: boolean;
  inspecting?: boolean;
  token: string;
  state: PreviewState;
  abort: AbortController;
  pid?: number;
  ended: Promise<void>;
  expiry?: ReturnType<typeof setTimeout>;
};
const exec = promisify(execFile);
const origin = "http://127.0.0.1:5202";
const maxBytes = 850 * 1024 ** 2;
const maxMemory = 1300 * 1024 ** 2;
const globalState = globalThis as typeof globalThis & {
  motionuxPreview?: Session;
  motionuxPreviewHooks?: boolean;
  motionuxIntegrationSlot?: boolean;
};
const killGroup = (pid?: number) => {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
};
async function ensurePort() {
  await new Promise<void>((done, fail) => {
    const socket = createServer();
    socket.once("error", () =>
      fail(
        new BuildError(
          409,
          "Port 5202 is occupied. Stop that listener before launching Preview.",
        ),
      ),
    );
    socket.listen(5202, "127.0.0.1", () => socket.close(() => done()));
  });
}
async function prepareRoot(vault: string) {
  let root = vault;
  for (const name of ["", "build", "preview"]) {
    if (name) root = resolve(root, name);
    await mkdir(root, { mode: 0o700 }).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
    const stat = await lstat(root);
    if (
      !stat.isDirectory() ||
      (stat.mode & 0o777) !== 0o700 ||
      (await realpath(root)) !== root
    )
      throw new BuildError(403, "Preview storage identity failed.");
  }
  return root;
}
function runNext(
  repo: string,
  cwd: string,
  next: string,
  args: string[],
  token: string,
  session: Session,
  network: boolean,
) {
  const unrestricted = [
    cwd,
    resolve(repo, "platform/node_modules"),
    resolve(repo, "platform/templates/hotel-dashboard/node_modules"),
    dirname(dirname(process.execPath)),
  ];
  const subpaths = unrestricted
    .map((folder) => "(subpath " + JSON.stringify(folder) + ")")
    .join(" ");
  const profile =
    "(version 1) (allow default) (deny network*) (deny file-write*) " +
    '(deny file-read-data (subpath "/Users")) (allow file-read-data ' +
    subpaths +
    ") " +
    '(allow file-write* (literal "/dev/null") (subpath ' +
    JSON.stringify(cwd) +
    ")) " +
    (network
      ? '(allow network* (local ip "localhost:5202") (remote ip "localhost:5202"))'
      : "");
  const child = spawn(
    "/usr/bin/sandbox-exec",
    ["-p", profile, process.execPath, next, ...args],
    {
      cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        NODE_ENV: "production",
        PATH: dirname(process.execPath) + ":/usr/bin:/bin",
        HOME: cwd,
        CFFIXED_USER_HOME: cwd,
        TMPDIR: cwd,
        NEXT_TELEMETRY_DISABLED: "1",
        NODE_OPTIONS: "--max-old-space-size=768",
        MOTIONUX_GENERATED_PREVIEW: "1",
        MOTIONUX_PREVIEW_KEY: token,
        MOTIONUX_PREVIEW_DOCUMENT: session.state.documentDigest ?? "",
      },
    },
  );
  session.pid = child.pid;
  let diagnostic = "";
  const add = (chunk: Buffer) => {
    diagnostic = (diagnostic + chunk.toString()).slice(-2600);
  };
  child.stdout?.on("data", add);
  child.stderr?.on("data", add);
  return {
    child,
    diagnostic: () =>
      diagnostic.replaceAll(cwd, "[preview]").replaceAll(repo, "[repo]"),
  };
}
function waitForExit(child: ChildProcess) {
  return new Promise<number | null>((done, fail) => {
    child.once("error", fail);
    child.once("close", done);
  });
}
async function run(
  repo: string,
  vault: string,
  project: BuildProject,
  session: Session,
  source?: Awaited<ReturnType<typeof exportTree>>,
) {
  const signal = session.abort.signal;
  let cwd: string | undefined;
  let monitor: ReturnType<typeof setInterval> | undefined;
  let tracked: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const started = performance.now();
  try {
    const root = await prepareRoot(vault);
    const space = await statfs(root);
    if (space.bavail * space.bsize < 1024 ** 3)
      throw new BuildError(
        507,
        "At least 1 GiB of free disk is required for a preview.",
      );
    await ensurePort();
    cwd = await mkdtemp(resolve(root, "replica-"));
    const tree = source ?? await exportTree(repo, project);
    if (JSON.parse(String(tree["motionux-manifest.json"])).documentDigest !== session.state.documentDigest)
      throw new BuildError(409, "Preview document changed.");
    await writeTree(cwd, tree);
    const dependencies = resolve(
      repo,
      "platform/templates/hotel-dashboard/node_modules",
    );
    const next = await realpath(resolve(dependencies, "next/dist/bin/next"));
    if (!next.startsWith(resolve(repo, "platform/node_modules") + "/"))
      throw new BuildError(403, "Preview dependency identity failed.");
    await symlink(dependencies, resolve(cwd, "node_modules"), "dir");
    const token = session.token;
    const checkSize = async () => {
      if (!cwd) return;
      const [{ stdout: disk }, { stdout: usage }] = await Promise.all([
        exec("/usr/bin/du", ["-sk", cwd]),
        exec("/bin/ps", ["-axo", "pgid=,rss="]),
      ]);
      const bytes = Number(disk.trim().split(/\s+/)[0]) * 1024;
      session.state.peakBytes = Math.max(session.state.peakBytes ?? 0, bytes);
      const group = usage
        .trim()
        .split("\n")
        .map((line) => line.trim().split(/\s+/))
        .filter((row) => Number(row[0]) === session.pid);
      const rssBytes = group.reduce(
        (sum, [, rss]) => sum + Number(rss) * 1024,
        0,
      );
      if (group.length)
        session.state.peakRssBytes = Math.max(
          session.state.peakRssBytes ?? 0,
          rssBytes,
        );
      if (bytes > maxBytes || rssBytes > maxMemory)
        session.abort.abort(
          new Error("Preview exceeded the storage or memory limit."),
        );
    };
    const stop = () => killGroup(session.pid);
    signal.addEventListener("abort", stop, { once: true });
    signal.throwIfAborted();
    timer = setTimeout(
      () =>
        session.abort.abort(new Error("Preview build exceeded 120 seconds.")),
      120_000,
    );
    monitor = setInterval(() => {
      if (!tracked)
        tracked = checkSize()
          .catch(() => {})
          .finally(() => {
            tracked = undefined;
          });
    }, 3000);
    const build = runNext(
      repo,
      cwd,
      next,
      ["build", "--webpack"],
      token,
      session,
      false,
    );
    const code = await waitForExit(build.child);
    signal.throwIfAborted();
    if (code !== 0) throw new Error("Next build failed. " + build.diagnostic());
    await checkSize();
    signal.throwIfAborted();
    clearTimeout(timer);
    session.state.status = "starting";
    const service = runNext(
      repo,
      cwd,
      next,
      ["start", "-H", "127.0.0.1", "-p", "5202"],
      token,
      session,
      true,
    );
    const exited = waitForExit(service.child).catch(() => null);
    for (let attempt = 0; attempt < 52; attempt++) {
      signal.throwIfAborted();
      if (service.child.exitCode !== null || service.child.signalCode) break;
      const response = await fetch(origin, {
        signal: AbortSignal.timeout(700),
        redirect: "manual",
      }).catch(() => null);
      if (
        response?.ok &&
        response.headers.get("x-motionux-preview") === token &&
        response.headers.get("x-motionux-document") === session.state.documentDigest
      ) {
        await response.body?.cancel();
        session.state = {
          ...session.state,
          status: "ready",
          url: origin,
          message:
            "Ready in " +
            ((performance.now() - started) / 1000).toFixed(1) +
            " s",
        };
        await exited;
        return;
      }
      await response?.body?.cancel();
      await delay(250);
    }
    throw new Error("Local runtime could not start. " + service.diagnostic());
  } catch (error) {
    const result = signal.aborted ? signal.reason : error;
    if (result?.message === "Stopped") session.state = { status: "idle" };
    else
      session.state = {
        ...session.state,
        status: "failed",
        url: undefined,
        message:
          result instanceof Error
            ? result.message.slice(0, 2700)
            : "Preview failed.",
      };
  } finally {
    if (monitor) clearInterval(monitor);
    await tracked;
    if (timer) clearTimeout(timer);
    if (session.expiry) clearTimeout(session.expiry);
    killGroup(session.pid);
    session.pid = undefined;
    if (cwd)
      await rm(cwd, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    if (session.state.status === "ready") {
      session.state =
        signal.reason?.message === "Stopped"
          ? { status: "idle" }
          : {
              ...session.state,
              status: "failed",
              url: undefined,
              message: signal.reason?.message ?? "Preview process exited.",
            };
    }
  }
}

export function getPreview(): PreviewState {
  const session = globalState.motionuxPreview;
  return session && !session.internal ? session.state : { status: "idle" };
}
export async function inspectPreview(
  repo: string,
  project: BuildProject,
  route: string,
  signal: AbortSignal,
) {
  const session = globalState.motionuxPreview;
  const digest = fingerprint(canonical(project.document));
  if (
    !session || session.internal ||
    session.state.status !== "ready" ||
    session.state.id !== project.id ||
    session.state.revision !== project.revision ||
    session.state.documentDigest !== digest
  )
    throw new BuildError(409, "Run this saved revision before inspecting it.");
  if (!project.document.pages.some((page) => page.route === route))
    throw new BuildError(422, "Choose a page from this project.");
  if (session.inspecting)
    throw new BuildError(409, "An inspection is already running.");
  session.inspecting = true;
  try {
    return await auditSession(repo, session, route, signal);
  } finally {
    session.inspecting = false;
  }
}

async function auditSession(
  repo: string,
  session: Session,
  route: string,
  signal: AbortSignal,
  integration?: { title: string; present: boolean },
) {
  const cancellation = AbortSignal.any([signal, session.abort.signal]);
  try {
    const { stdout } = await exec(
      process.execPath,
      [resolve(repo, "platform/apps/preview-host/inspect-browser.mjs")],
      {
        cwd: repo,
        env: {
          NODE_ENV: "production",
          PATH: dirname(process.execPath) + ":/usr/bin:/bin",
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
          PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
          MOTIONUX_INSPECTION: JSON.stringify({
            origin,
            route,
            revision: session.state.revision,
            identity: { token: session.token, digest: session.state.documentDigest },
            integration,
          }),
        },
        signal: cancellation,
        timeout: 45_000,
        maxBuffer: 256 * 1024,
      },
    );
    cancellation.throwIfAborted();
    return JSON.parse(stdout) as InspectionReport;
  } catch (error) {
    if (cancellation.aborted)
      throw new BuildError(409, "The inspection was stopped.");
    const diagnostic = (error as { stderr?: string })?.stderr;
    if (diagnostic?.includes("ERR_MODULE_NOT_FOUND"))
      throw new BuildError(
        503,
        "Install the workspace browser tools from the repository root with npm ci.",
      );
    if (diagnostic?.includes("Executable doesn't exist"))
      throw new BuildError(
        503,
        "Install the local Chromium browser with npx playwright install chromium.",
      );
    throw new BuildError(
      503,
      "Chromium could not complete the inspection. Check the preview and try again.",
    );
  }
}

export async function stopPreview(internal = false) {
  const session = globalState.motionuxPreview;
  if (!session || (session.internal && !internal)) return;
  session.abort.abort(new Error("Stopped"));
  await session.ended;
  if (globalState.motionuxPreview === session)
    globalState.motionuxPreview = undefined;
}
export function startPreview(
  repo: string,
  vault: string,
  project: BuildProject,
): PreviewState {
  if (globalState.motionuxIntegrationSlot)
    throw new BuildError(409, "The Integration Lab is using the isolated Run host.");
  return beginPreview(repo, vault, project).state;
}

function beginPreview(
  repo: string,
  vault: string,
  project: BuildProject,
  source?: Awaited<ReturnType<typeof exportTree>>,
): Session {
  if (process.platform !== "darwin")
    throw new BuildError(
      501,
      "Isolated live preview currently requires macOS. Standalone export is available.",
    );
  const old = globalState.motionuxPreview;
  if (old?.running) throw new BuildError(409, "Stop the active preview first.");
  if (!globalState.motionuxPreviewHooks) {
    globalState.motionuxPreviewHooks = true;
    process.once("SIGTERM", () => {
      void stopPreview(true);
    });
    process.once("SIGINT", () => {
      void stopPreview(true);
    });
    process.once("exit", () => killGroup(globalState.motionuxPreview?.pid));
  }
  const session: Session = {
    running: true,
    internal: Boolean(source),
    token: randomBytes(12).toString("hex"),
    state: { status: "building", id: project.id, revision: project.revision, documentDigest: fingerprint(canonical(project.document)) },
    abort: new AbortController(),
    ended: Promise.resolve(),
  };
  globalState.motionuxPreview = session;
  session.expiry = setTimeout(
    () =>
      session.abort.abort(new Error("Preview expired after eight minutes.")),
    480_000,
  );
  session.ended = run(repo, vault, project, session, source)
    .catch(() => {
      session.state = { status: "failed", message: "Preview cleanup failed." };
    })
    .finally(() => {
      session.running = false;
    });
  return session;
}

export async function withIntegrationSlot<T>(work: () => Promise<T>): Promise<T> {
  if (process.platform !== "darwin")
    throw new BuildError(501, "Isolated integration currently requires macOS.");
  if (globalState.motionuxIntegrationSlot || globalState.motionuxPreview?.running)
    throw new BuildError(409, "Stop the active Run preview before starting the isolated integration.");
  globalState.motionuxIntegrationSlot = true;
  try {
    return await work();
  } finally {
    globalState.motionuxIntegrationSlot = false;
  }
}

export async function inspectIntegration(
  repo: string, vault: string, project: BuildProject,
  tree: Awaited<ReturnType<typeof exportTree>>,
  route: string, title: string, phase: "integrated" | "restored", signal: AbortSignal,
): Promise<InspectionReport> {
  if (!globalState.motionuxIntegrationSlot)
    throw new BuildError(409, "The isolated integration has no preview lease.");
  signal.throwIfAborted();
  const session = beginPreview(repo, vault, project, tree);
  try {
    while (session.state.status === "building" || session.state.status === "starting") {
      await delay(150, undefined, { signal });
    }
    if (session.state.status !== "ready") throw new BuildError(503, "The isolated Next.js build did not start.");
    const report = await auditSession(repo, session, route, signal, {
      title, present: phase === "integrated",
    });
    if (report.viewports.length !== 3 || report.viewports.some((view) => view.findings.some(
      (finding) => finding.category !== "accessibility" || ["serious", "critical"].includes(finding.impact ?? ""),
    ))) throw new BuildError(422, "The isolated app did not pass the browser checks.");
    return report;
  } finally {
    await stopPreview(true);
  }
}
