import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createPublicKey } from "node:crypto";

const repo = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "");
const app = resolve(repo, "platform/apps/studio");
const fixture = process.argv
  .find((arg) => arg.startsWith("--fixture="))
  ?.slice(10);
if (fixture && !/^build-browser-[a-z0-9]{8,24}$/.test(fixture))
  throw new Error("Invalid browser fixture ID.");
const approvalPath = process.argv
  .find((arg) => arg.startsWith("--approval-key="))
  ?.slice(15);
let approvalKey = "";
if (approvalPath) {
  approvalKey = readFileSync(approvalPath, "utf8");
  if (
    !approvalKey.startsWith("-----BEGIN PUBLIC KEY-----") ||
    createPublicKey(approvalKey).asymmetricKeyType !== "ed25519"
  )
    throw new Error("Expected an Ed25519 public PEM for the Integration Lab.");
}
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  MOTIONUX_BUILD_REPO: repo,
  MOTIONUX_BUILD_FIXTURE: fixture ?? "",
  MOTIONUX_BUILD_APPROVAL_KEY: approvalKey,
};
const runner = resolve(app, "node_modules/next/dist/bin/next");
if (!process.argv.includes("--built")) {
  const built = spawnSync(process.execPath, [runner, "build", "--webpack"], {
    cwd: app,
    env,
    stdio: "inherit",
  });
  if (built.status !== 0) process.exit(built.status ?? 1);
}
const child = spawn(
  process.execPath,
  [runner, "start", "-H", "127.0.0.1", "-p", "5200"],
  { cwd: app, env, stdio: "inherit" },
);
const gallery = process.argv.includes("--with-gallery") ? spawn(
  process.execPath, [resolve(repo, "scripts/studio/start.mjs")],
  { cwd: repo, stdio: "inherit" },
) : undefined;
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    const origin = "http://127.0.0.1:5200";
    void fetch(origin + "/api/build/preview", {
      method: "DELETE",
      signal: AbortSignal.timeout(3000),
      headers: {
        Origin: origin,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Dest": "empty",
        "X-MotionUX-Build": "1",
      },
    })
      .catch(() => {})
      .finally(() => {
        gallery?.kill(signal);
        child.kill(signal);
      });
  });
child.once("exit", (code, signal) => {
  gallery?.kill();
  process.exitCode = code ?? (signal ? 1 : 0);
});
