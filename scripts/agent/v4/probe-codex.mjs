import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { directory, exists, json, repo, vault } from "../v2/files.mjs";

const folder = resolve(vault, "evidence/agent-v4");
await directory(folder, true);
const target = await mkdtemp(resolve(folder, "native-probe-"));
const marker = resolve(target, "approval-probe.txt");
const report = { schemaVersion: 1, status: "host-user-approval-unverified", manifestAuthority: false, observed: [], targetWrites: null };
let ended;
const child = spawn("codex", ["app-server", "--stdio"], {
  cwd: repo, stdio: ["pipe", "pipe", "ignore"],
});
const completion = new Promise(done => {
  child.once("error", () => done(false));
  child.once("exit", () => done(true));
});
const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
child.stdin.on("error", () => {});
const post = value => child.stdin.write(JSON.stringify(value) + "\n");
const request = (id, method, params) => post({ jsonrpc: "2.0", id, method, params });
const disposition = new Set();
let thread;
const finished = new Promise(done => { ended = done; });
const timeout = setTimeout(() => ended("timeout"), 100_000);

lines.on("line", line => {
  let packet;
  try { packet = JSON.parse(line); }
  catch { ended("invalid-protocol"); return; }
  if (packet.error && [1, 2, 3].includes(packet.id)) { ended("protocol-request-rejected"); return; }
  if (packet.id === 1 && packet.result) {
    report.initialized = true;
    post({ jsonrpc: "2.0", method: "initialized" });
    request(2, "thread/start", { cwd: target, ephemeral: true, sandbox: "read-only", approvalPolicy: "on-request", approvalsReviewer: "user" });
  } else if (packet.id === 2 && packet.result) {
    thread = packet.result.thread?.id;
    report.threadStarted = Boolean(thread);
    request(3, "turn/start", { threadId: thread, input: [{ type: "text", text:
      "This is a read-only sandbox approval protocol probe. Use the native apply_patch tool exactly once to propose adding approval-probe.txt containing 'fixture only' in this current probe directory. The host will decline. Do not use a shell, read any files, call MCP, or retry. Do not approve anything.",
    }] });
  } else if (packet.method === "item/commandExecution/requestApproval" || packet.method === "item/fileChange/requestApproval") {
    const fields = packet.params ?? {};
    // This client intentionally cannot approve an operation.
    disposition.add(packet.id);
    report.observed.push({ method: packet.method, idsPresent: ["threadId", "turnId", "itemId"].every(key => typeof fields[key] === "string"),
      fields: Object.keys(fields).sort(), decisionSent: "decline" });
    post({ jsonrpc: "2.0", id: packet.id, result: { decision: "decline" } });
  } else if (packet.method === "item/permissions/requestApproval") {
    report.observed.push({ method: packet.method, fields: Object.keys(packet.params ?? {}).sort(), decisionSent: "no-permissions" });
    disposition.add(packet.id);
    post({ jsonrpc: "2.0", id: packet.id, result: { permissions: {}, scope: "turn" } });
  } else if (packet.method === "serverRequest/resolved") {
    report.resolved = disposition.has(packet.params?.requestId) || report.resolved === true;
  } else if (packet.method === "item/completed" && ["fileChange", "commandExecution"].includes(packet.params?.item?.type)) {
    report.itemStatus = packet.params.item.status;
  } else if (packet.method === "turn/completed") {
    ended("turn-completed");
  }
});
request(1, "initialize", { clientInfo: { name: "motionux_v4_probe", version: "1.0.0" }, capabilities: {} });
report.probe = await Promise.race([finished, completion.then(() => "server-exited")]);
clearTimeout(timeout);
lines.close();
child.kill();
await completion;
report.targetWrites = await exists(marker) ? 1 : 0;
await rm(target, { recursive: true, force: true });
await json(resolve(folder, "native-approval.json"), report);
process.stdout.write(JSON.stringify(report) + "\n");
if (report.targetWrites !== 0 || !report.observed.length) process.exitCode = 1;
