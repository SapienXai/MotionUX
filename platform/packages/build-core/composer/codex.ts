import { spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { BuildError } from "../store.ts";
import { composerPrompt, responseSchema } from "./blueprint.ts";

const cli =
  "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex";
const seatbelt = "/usr/bin/sandbox-exec";

const responseLimit = 192 * 1024;
const scratchLimit = 32 * 1024 * 1024;
const unavailable = () =>
  new BuildError(
    503,
    "Codex unavailable. Sign in to the desktop Codex client or start from a manual template.",
  );
const canceled = () =>
  new BuildError(409, "Blueprint generation was cancelled.");
type Usage = Partial<
  Record<"input_tokens" | "cached_input_tokens" | "output_tokens", number>
>;
export type PlanningResult = {
  proposal: unknown;
  usage: Usage;
  peakScratchBytes?: number;
};

function profile(scratch: string, auth: string) {
  // Allow only the native client to exec. File access is a second boundary even with every host tool disabled.
  const protectedPaths = [
    homedir(),
    "/Users",
    "/Volumes",
    "/opt",
    "/usr/local",
    "/cores",
    "/private/var/folders",
    "/private/tmp",
  ]
    .map((path) => "(subpath " + JSON.stringify(path) + ")")
    .join(" ");
  return `(version 1) (allow default)
    (deny file-read-data (require-all (require-any ${protectedPaths}) (require-not (subpath ${JSON.stringify(scratch)})) (require-not (literal ${JSON.stringify(auth)}))))
    (deny file-write* (require-all (require-not (subpath ${JSON.stringify(scratch)})) (require-not (literal "/dev/null"))))
    (deny process-exec (require-not (literal ${JSON.stringify(cli)})))
    (allow file-read* (subpath ${JSON.stringify(scratch)}) (literal ${JSON.stringify(auth)}))
    (allow file-write* (subpath ${JSON.stringify(scratch)}) (literal "/dev/null"))
    (allow process-exec (literal ${JSON.stringify(cli)}))
    (deny network*) (allow network-outbound (remote tcp "*:443"))
    (allow network-outbound (remote unix-socket (path-literal "/private/var/run/mDNSResponder")))`;
}
async function scratchSize(root: string) {
  let total = 0;
  let entries = 0;
  for await (const path of await readdir(root, {
    recursive: true,
    withFileTypes: true,
  })) {
    entries += 1;
    if (entries > 512) return scratchLimit + 1;
    if (!path.isFile()) continue;
    const stat = await lstat(resolve(path.parentPath, path.name)).catch(
      (error) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      },
    );
    total += stat?.size ?? 0;
    if (total > scratchLimit) return total;
  }
  return total;
}
export async function runCodex(
  vault: string,
  brief: string,
  signal?: AbortSignal,
  operation?: { prompt: string; schema: object; deadlineMs: number },
): Promise<PlanningResult> {
  if (signal?.aborted) throw canceled();
  if (process.platform !== "darwin") throw unavailable();
  const auth = resolve(homedir(), ".codex/auth.json");
  try {
    const stat = await lstat(auth);
    const program = await lstat(cli);
    if (
      !stat.isFile() ||
      stat.nlink !== 1 ||
      stat.mode & 0o077 ||
      stat.uid !== process.getuid?.() ||
      !program.isFile() ||
      (await realpath(auth)) !== auth
    )
      throw unavailable();
  } catch {
    throw unavailable();
  }
  const root = resolve(vault, "build", "composer");
  for (const path of [vault, resolve(vault, "build"), root]) {
    await mkdir(path, { mode: 0o700 }).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
    const stat = await lstat(path);
    if (
      !stat.isDirectory() ||
      stat.uid !== process.getuid?.() ||
      (stat.mode & 0o777) !== 0o700 ||
      (await realpath(path)) !== path
    )
      throw new BuildError(403, "Composer workspace identity failed.");
  }
  const scratch = await mkdtemp(resolve(root, "plan-"));
  try {
    const codexHome = resolve(scratch, "codex");
    const temp = resolve(scratch, "tmp");
    const schema = resolve(scratch, "output.json");
    await mkdir(codexHome, { mode: 0o700 });
    await mkdir(temp, { mode: 0o700 });
    await symlink(auth, resolve(codexHome, "auth.json"));
    await writeFile(schema, JSON.stringify(operation?.schema ?? responseSchema), {
      flag: "wx",
      mode: 0o600,
    });
    if (signal?.aborted) throw canceled();
    return await new Promise((done, fail) => {
      const child = spawn(
        seatbelt,
        [
          "-p",
          profile(scratch, auth),
          cli,
          "--ask-for-approval",
          "never",
          "exec",
          "--ignore-user-config",
          "--ignore-rules",
          ...(operation ? ["-c", 'model_reasoning_effort="low"'] : []),
          "--ephemeral",
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--color",
          "never",
          "--disable",
          "shell_tool",
          "--disable",
          "shell_snapshot",
          "--disable",
          "hooks",
          "--disable",
          "apps",
          "--disable",
          "multi_agent",
          "--disable",
          "multi_agent_v2",
          "--disable",
          "plugins",
          "--disable",
          "remote_plugin",
          "--disable",
          "skill_search",
          "-c",
          'web_search="disabled"',
          "-c",
          "mcp_servers={}",
          "-c",
          "analytics.enabled=false",
          "-c",
          "skills.include_instructions=false",
          "-c",
          "skills.bundled.enabled=false",
          "-c",
          "sqlite_home=" + JSON.stringify(scratch),
          "--json",
          "--output-schema",
          schema,
          "-",
        ],
        {
          cwd: scratch,
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            NODE_ENV: "production",
            PATH: "/usr/bin:/bin",
            HOME: scratch,
            CFFIXED_USER_HOME: scratch,
            TMPDIR: temp,
            CODEX_HOME: codexHome,
          },
        },
      );
      let bytes = 0;
      let buffer = "";
      let message: string | undefined;
      let completed = false;
      let backendFailed = false;
      let rejection: BuildError | undefined;
      const usage: Usage = {};
      function stop(error: BuildError) {
        rejection ??= error;
        if (child.pid)
          try {
            child.kill("SIGKILL");
          } catch {
            /* Already closed. */
          }
      }
      const abort = () => stop(canceled());
      const timer = setTimeout(
        () =>
          stop(
            new BuildError(504, "Codex took too long. Try a shorter brief."),
          ),
        operation?.deadlineMs ?? 75_000,
      );
      let measuring = false;
      let peakScratchBytes = 0;
      const monitor = setInterval(() => {
        if (measuring) return;
        measuring = true;
        void scratchSize(scratch)
          .then(
            (size) => {
              peakScratchBytes = Math.max(peakScratchBytes, size);
              if (size > scratchLimit)
                stop(
                  new BuildError(
                    507,
                    "The planning workspace exceeded its storage limit.",
                  ),
                );
            },
            () => {},
          )
          .finally(() => {
            measuring = false;
          });
      }, 2500);
      process.once("exit", abort);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      child.once("error", () => stop(unavailable()));
      child.stdin.on("error", () => {});
      child.stdin.end(operation?.prompt ?? composerPrompt(brief));
      child.stderr.on("data", (chunk: Buffer) => {
        bytes += chunk.byteLength;
        if (bytes > responseLimit)
          stop(new BuildError(422, "Codex output exceeded its limit."));
      });
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        bytes += Buffer.byteLength(chunk);
        if (rejection) return;
        if (bytes > responseLimit)
          return stop(new BuildError(422, "Codex output exceeded its limit."));
        buffer += chunk;
        for (
          let index = buffer.indexOf("\n");
          index >= 0;
          index = buffer.indexOf("\n")
        ) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 1);
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (
              event.item &&
              !["agent_message", "reasoning"].includes(event.item.type)
            )
              return stop(
                new BuildError(
                  422,
                  "Codex attempted a tool or an unsupported action.",
                ),
              );
            if (
              event.type === "item.completed" &&
              event.item?.type === "agent_message" &&
              typeof event.item.text === "string"
            )
              message = event.item.text;
            if (event.type === "turn.failed") backendFailed = true;
            if (event.type === "turn.completed") {
              completed = true;
              for (const key of [
                "input_tokens",
                "cached_input_tokens",
                "output_tokens",
              ] as const) {
                const value = event.usage?.[key];
                if (Number.isSafeInteger(value) && value >= 0)
                  usage[key] = value;
              }
            }
          } catch {
            return stop(
              new BuildError(422, "Codex returned an invalid event stream."),
            );
          }
        }
      });
      child.once("close", async (code) => {
        clearTimeout(timer);
        clearInterval(monitor);
        process.removeListener("exit", abort);
        signal?.removeEventListener("abort", abort);
        if (rejection) return fail(rejection);
        if (code !== 0 || backendFailed) return fail(unavailable());
        if (
          !completed ||
          !message ||
          buffer.trim() ||
          Buffer.byteLength(message) > 32 * 1024
        )
          return fail(
            new BuildError(422, "Codex did not return a complete blueprint."),
          );
        try {
          peakScratchBytes = Math.max(
            peakScratchBytes,
            await scratchSize(scratch),
          );
          if (peakScratchBytes > scratchLimit)
            return fail(
              new BuildError(
                507,
                "The planning workspace exceeded its storage limit.",
              ),
            );
          done({ proposal: JSON.parse(message), usage, peakScratchBytes });
        } catch {
          fail(new BuildError(422, "Codex did not return structured JSON."));
        }
      });
    });
  } finally {
    await rm(scratch, { recursive: true, force: true, maxRetries: 3 });
  }
}
