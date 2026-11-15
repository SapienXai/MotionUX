import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { realpath } from "node:fs/promises";
import { base, directory, entry, file, image, replace, repo, stop } from "./files.mjs";

export const npmCache = resolve(base, "npm-cache");
const nodeDir = dirname(process.execPath);
export const browserCache = resolve(homedir(), "Library/Caches/ms-playwright");

function profile(writable, local) {
  if (process.platform !== "darwin") stop("environment-blocked", "Real V2 fixture commands require the tested macOS process sandbox.");
  const rules = paths => paths.map(path => "(subpath " + JSON.stringify(path) + ")").join(" ");
  const trustedRead = [...writable, dirname(nodeDir), browserCache,
    ...["node_modules", "scripts", "src/brain", "schemas/brain", "metadata/brain"].map(path => resolve(repo, path))];
  const loopback = "localhost:" + local;
  return "(version 1) (allow default) (deny network*) (deny file-write*) " +
    '(deny file-read-data (subpath "/Users")) (allow file-read-data (literal ' + JSON.stringify(resolve(repo, "package.json")) + ") " +
    rules(trustedRead) + ") " +
    "(allow file-write* (literal \"/dev/null\") " + rules(writable) + ") " +
    (local ? "(allow network* (local ip " + JSON.stringify(loopback) + ") (remote ip " + JSON.stringify(loopback) + "))" : "");
}

export async function start(program, args, { cwd, logs, logName, signal, local = 0, cache = false, timeout = 120_000 }) {
  if (signal?.aborted) stop("cancelled", "Fixture transaction cancelled.");
  await directory(cwd);
  await directory(logs, true);
  const support = resolve(cwd, "process-home");
  await directory(support, true);
  if (local) {
    // macOS would add deny-delete ACLs when a browser creates fresh standard home folders.
    for (const folder of ["Downloads", "Library", "Library/Application Support", "Library/Caches", "Library/Preferences"]) {
      await directory(resolve(support, folder), true);
    }
  }
  const writable = [cwd, logs, ...(cache ? [npmCache] : [])];
  const env = {
    HOME: support, CFFIXED_USER_HOME: support, TMPDIR: support, PATH: nodeDir + ":/usr/bin:/bin", LANG: "en_US.UTF-8", CI: "1",
    NEXT_TELEMETRY_DISABLED: "1", npm_config_ignore_scripts: "true", PLAYWRIGHT_BROWSERS_PATH: browserCache,
  };
  let output = "";
  let exceeded = false;
  let category;
  const child = spawn("/usr/bin/sandbox-exec", ["-p", profile(writable, local), process.execPath, program, ...args],
    { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  function kill(reason) {
    if (reason) category ??= reason;
    if (child.pid) {
      try { process.kill(-child.pid, "SIGKILL"); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    }
  }
  function collect(chunk) {
    if (output.length + chunk.length > 1_500_000) {
      exceeded = true;
      kill("output-budget");
    } else output += chunk.toString();
  }
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  const cancel = () => kill("cancelled");
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(() => kill("timeout"), timeout);
  const started = performance.now();
  const done = new Promise(resolveDone => {
    child.on("error", () => { category ??= "subprocess-error"; });
    child.on("close", async (code, killed) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      const path = resolve(logs, logName + ".log");
      const redacted = output.replaceAll(cwd, "[fixture]").replaceAll(homedir(), "[home]");
      let recorded = false;
      try {
        const prior = await file(path);
        await replace(path, entry(redacted, 0o600), image(prior));
        recorded = true;
      } catch { category ??= "log-write-failed"; }
      resolveDone({ code, signal: killed, status: category ?? (code === 0 && recorded && !exceeded ? "passed" : "failed"),
        elapsedMs: +(performance.now() - started).toFixed(2), log: logName + ".log" });
    });
  });
  return { done, kill, exited: () => child.exitCode !== null || child.signalCode !== null };
}

export async function command(program, args, options) {
  const processHandle = await start(program, args, options);
  const result = await processHandle.done;
  if (result.status !== "passed") stop(result.status, "Controlled " + options.logName + " subprocess failed. See its private log.");
  return result;
}

export async function npm(args, options) {
  await directory(npmCache);
  const program = await realpath(resolve(nodeDir, "npm"));
  if (!program.endsWith("/node_modules/npm/bin/npm-cli.js")) stop("environment-blocked", "The Node toolchain must expose its npm CLI beside Node.");
  const flags = ["--offline", "--allow-remote=all", "--ignore-scripts", "--no-audit", "--no-fund", "--strict-peer-deps",
    "--registry=https://registry.npmjs.org/", "--userconfig=" + resolve(options.cwd, "process-home", "empty-userconfig"), "--globalconfig=/dev/null", "--cache=" + npmCache];
  return command(program, [...args, ...flags], { ...options, cache: true, local: false });
}
