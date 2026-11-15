import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { toolInputs } from "../../src/mcp/contracts.ts";
import { motionRoot } from "../agent/workspace.mjs";

const exec = promisify(execFile);
const prompt = `Use the native MotionUX MCP tools in order, waiting for each result before calling the next tool:
1. motionux_status with {}
2. search_motion with query "keyboard tab navigation", maxResults 1
3. inspect_component with id "kokonut-wheel-picker"
4. recommend_motion with query "Show the error without animation and preserve focus", maxResults 1
5. plan_motion with project "fixtures/agent/booking-demo", route "/details", goal "Expandable card disclosure for room details."
The MotionUX fixture and selected screen are explicitly authorized for this call. Use only these native MCP tools. Do not use the shell, read any files yourself, or change anything. Briefly summarize the five results.`;

function collect(stdout) {
  let threadId;
  let completed = false;
  const calls = [];
  for (const line of stdout.split("\n").filter(Boolean)) {
    const event = JSON.parse(line);
    if (event.type === "thread.started") threadId = event.thread_id;
    if (event.type === "turn.completed") completed = true;
    const item = event.item;
    if (event.type !== "item.completed" || item?.type !== "mcp_tool_call" || item.server !== "motionux" ||
        !Object.hasOwn(toolInputs, item.tool)) continue;
    const data = item.result?.structured_content ?? item.result?.structuredContent;
    calls.push({ tool: item.tool, execution: item.status, result: data?.status ?? "missing",
      catalogReady: data?.catalogReady, sourceId: data?.id ?? data?.candidates?.[0]?.id ?? data?.recommendations?.[0]?.id,
      route: data?.target?.route, fingerprint: data?.planFingerprint ?? data?.brainIndexFingerprint });
  }
  return { threadId, completed, calls };
}

const valid = {
  motionux_status: row => row.result === "ready" && row.catalogReady > 0,
  search_motion: row => row.result === "candidates" && Boolean(row.sourceId),
  inspect_component: row => row.result === "indexed" && row.sourceId === "kokonut-wheel-picker",
  recommend_motion: row => row.result === "no-motion",
  plan_motion: row => row.result === "candidates" && row.route === "/details" && /^[a-f\d]{64}$/.test(row.fingerprint),
};
const folder = fileURLToPath(new URL("../../.motionux-v9/evidence/mcp-v1/", import.meta.url));
const settings = { cwd: motionRoot, timeout: 150_000, maxBuffer: 2 * 1024 * 1024 };
let report = { status: "CODEX_SESSION_BLOCKED", calls: [] };
try {
  const { stdout } = await exec("codex", ["mcp", "list", "--json"], settings);
  const servers = JSON.parse(stdout);
  if (!servers.some(row => row.name === "motionux" && row.enabled && row.transport.type === "stdio")) throw new Error();
  const invocation = exec("codex", ["exec", "--ephemeral", "--json", "--color", "never", "-s", "read-only",
    "-c", 'approval_policy="never"', "-C", motionRoot, prompt], settings);
  invocation.child.stdin.end();
  const { stdout: events } = await invocation;
  const native = collect(events);
  const verified = Object.entries(valid).filter(([tool, check]) => native.calls.some(row =>
    row.tool === tool && row.execution === "completed" && check(row))).map(([tool]) => tool);
  report = { status: native.threadId && native.completed && verified.length === 5 ? "native-verified" : "CODEX_SESSION_BLOCKED",
    ...native, verified };
} catch (error) {
  report.reason = error.code === "ENOENT" ? "Codex CLI unavailable." : "Native Codex invocation or configured transport failed.";
}
await mkdir(folder, { recursive: true, mode: 0o700 });
await writeFile(folder + "native-codex.json", JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
process.stdout.write(JSON.stringify(report) + "\n");
if (report.status !== "native-verified") process.exitCode = 1;
