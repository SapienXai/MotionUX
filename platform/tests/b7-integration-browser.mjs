import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

if (process.platform !== "darwin")
  throw new Error("The integration browser lane requires the macOS Run host.");
const repo = resolve(import.meta.dirname, "../..");
const tests = resolve(repo, ".motionux-v9/build-tests");
const evidence = resolve(repo, ".motionux-v9/evidence/build-b7");
const origin = "http://127.0.0.1:5200";
await mkdir(tests, { recursive: true, mode: 0o700 });
await mkdir(evidence, { recursive: true, mode: 0o700 });
const vault = await mkdtemp(resolve(tests, "build-browser-"));
const fixture = vault.split("/").at(-1).toLowerCase();
// The launcher accepts only lowercase fixture IDs, so move temporary key files
// into a separate workspace and let the server create its own generated vault.
const runVault = resolve(tests, fixture + "b7");
const publicKey = resolve(vault, "approver-public.pem");
const privateKey = resolve(vault, "approver-private.pem");
const pair = generateKeyPairSync("ed25519");
await writeFile(
  publicKey,
  pair.publicKey.export({ format: "pem", type: "spki" }),
  { mode: 0o600 },
);
await writeFile(
  privateKey,
  pair.privateKey.export({ format: "pem", type: "pkcs8" }),
  { mode: 0o600 },
);

const server = spawn(
  process.execPath,
  [
    "platform/start.mjs",
    "--built",
    "--fixture=" + fixture + "b7",
    "--approval-key=" + publicKey,
  ],
  {
    cwd: repo,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const closed = once(server, "close");
let diagnostic = "";
for (const stream of [server.stdout, server.stderr])
  stream.on("data", (chunk) => {
    diagnostic = (diagnostic + chunk).slice(-2000);
  });

async function operatorSign(payloadPath, digest) {
  const operator = spawn(
    "/usr/bin/python3",
    [
      "-c",
      `import errno, os, pty, sys
pid, terminal = pty.fork()
if pid == 0:
    os.execv(sys.argv[2], sys.argv[2:])
output = b""
confirmed = False
while True:
    try:
        chunk = os.read(terminal, 4096)
    except OSError as error:
        if error.errno != errno.EIO:
            raise
        break
    if not chunk:
        break
    output += chunk
    if not confirmed and b"\\n> " in output:
        os.write(terminal, (sys.argv[1] + "\\n").encode())
        confirmed = True
sys.stdout.buffer.write(output)
sys.exit(os.waitstatus_to_exitcode(os.waitpid(pid, 0)[1]))`,
      digest,
      process.execPath,
      "platform/apps/preview-host/sign-integration.mjs",
      payloadPath,
      privateKey,
    ],
    { cwd: repo, stdio: ["ignore", "pipe", "pipe"] },
  );
  const ended = once(operator, "close");
  let output = "";
  for (const stream of [operator.stdout, operator.stderr])
    stream.on("data", (chunk) => {
      output += chunk;
    });
  const timeout = setTimeout(() => operator.kill(), 8000);
  try {
    assert.equal((await ended)[0], 0, output);
    const signature = output.match(
      /(?:\r?\n)([A-Za-z0-9_-]{86})(?:\r?\n|$)/,
    )?.[1];
    assert(
      signature,
      "The separate interactive signer produced no signature: " + output,
    );
    return signature;
  } finally {
    clearTimeout(timeout);
  }
}

let browser;
const results = [];
try {
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(diagnostic);
    if (
      await fetch(origin + "/build").then(
        (response) => response.ok,
        () => false,
      )
    )
      break;
    if (i === 149) throw new Error(diagnostic);
    await delay(100);
  }
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const button = (name, scope = page) =>
    scope.getByRole("button", { name, exact: true });
  for (const [template, route] of [
    ["New Sales CRM", "/contacts"],
    ["New Hotel Desk", "/bookings"],
  ]) {
    await page.goto(origin + "/build");
    await button(template).click();
    await page
      .getByRole("button", {
        name: route === "/contacts" ? /Contacts/ : /Bookings/,
      })
      .first()
      .click();
    await button("Integration Lab").click();
    const dialog = page.getByRole("dialog", { name: "Integration Lab" });
    const requestReview = async () => {
      const waited = page.waitForResponse((response) =>
        response.url().endsWith("/integration/review"),
      );
      await button("Prepare review", dialog).click();
      const response = await waited;
      const review = await response.json();
      assert.equal(response.status(), 200, JSON.stringify(review));
      assert.equal(review.challenge.project.route, route);
      const download = page.waitForEvent("download");
      await button("Download approval request", dialog).click();
      const saved = resolve(vault, review.challenge.id + ".json");
      await (await download).saveAs(saved);
      const payload = await readFile(saved);
      assert.equal(
        createHash("sha256").update(payload).digest("hex"),
        review.digest,
      );
      const signature = await operatorSign(saved, review.digest);
      await dialog.getByLabel("Host signature").fill(signature);
      return { signature, review };
    };
    const { signature, review } = await requestReview();
    const managed = resolve(
      runVault,
      "build/projects",
      review.challenge.project.id,
      "project.json",
    );
    const before = await readFile(managed);
    const applyUrl =
      "/api/build/" + review.challenge.project.id + "/integration/apply";
    const post = (body) =>
      page.evaluate(
        async ({ url, body }) => {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-MotionUX-Build": "1",
            },
            body: JSON.stringify(body),
          });
          return response.status;
        },
        { url: applyUrl, body },
      );
    assert.equal(await post({ id: review.challenge.id, approved: true }), 422);
    assert.equal(
      await post({ id: review.challenge.id, signature: "a".repeat(86) }),
      403,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await new AxeBuilder({ page })
      .include(".build-integration-dialog")
      .analyze();
    assert.deepEqual(
      axe.violations.map(({ id, nodes }) => [
        id,
        nodes.map((node) => node.target),
      ]),
      [],
    );
    await page.screenshot({
      path: resolve(evidence, route.slice(1) + "-review.png"),
    });
    const applied = page.waitForResponse(
      (response) => response.url().endsWith("/integration/apply"),
      { timeout: 170_000 },
    );
    await button("Apply, verify and restore", dialog).click();
    const response = await applied;
    const result = await response.json();
    assert.equal(
      response.status(),
      200,
      JSON.stringify(result) + "\n" + diagnostic,
    );
    assert.equal(
      result.status,
      "verified-and-restored",
      JSON.stringify(result) + "\n" + diagnostic,
    );
    assert.equal(result.approval, review.digest);
    assert.equal(result.restored, result.baseline);
    assert.equal(result.integrated.viewports.length, 3);
    assert.equal(result.rollback.viewports.length, 3);
    assert.deepEqual(await readFile(managed), before);
    assert.equal(await post({ id: review.challenge.id, signature }), 409);
    const root = resolve(runVault, "build/integrations");
    assert.deepEqual(await readdir(root), ["receipts"]);
    const receipt = JSON.parse(
      await readFile(resolve(root, "receipts", result.id + ".json"), "utf8"),
    );
    assert.deepEqual(receipt.result, result);
    await expect(dialog.getByRole("status")).toHaveText(
      "Integration and rollback verified.",
    );
    await page.screenshot({
      path: resolve(evidence, route.slice(1) + "-rollback.png"),
    });
    results.push(result);
    await page.setViewportSize({ width: 1440, height: 900 });
    if (route === "/contacts") {
      await button("New review", dialog).click();
      await requestReview();
      const pending = page.waitForResponse(
        (reply) => reply.url().endsWith("/integration/apply"),
        { timeout: 170_000 },
      );
      await button("Apply, verify and restore", dialog).click();
      await delay(500);
      await button("Cancel integration", dialog).click();
      const cancelled = await (await pending).json();
      assert.equal(
        cancelled.status,
        "cancelled-and-restored",
        JSON.stringify(cancelled),
      );
      assert.equal(cancelled.restored, cancelled.baseline);
      assert.equal(cancelled.rollback.viewports.length, 3);
      assert.deepEqual(await readFile(managed), before);
      results.push(cancelled);
    }
    await button("Close", dialog).click();
    await expect(button("Integration Lab")).toBeFocused();
    console.log(
      template,
      route,
      "host approval, isolated install, and rollback verified",
    );
  }
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  if (
    !(await Promise.race([
      closed.then(() => true),
      delay(4000).then(() => false),
    ]))
  ) {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await closed;
  }
  await rm(runVault, { recursive: true, force: true });
  await rm(vault, { recursive: true, force: true });
  await writeFile(
    resolve(evidence, "browser.json"),
    JSON.stringify(results, null, 2) + "\n",
    { mode: 0o600 },
  );
}
