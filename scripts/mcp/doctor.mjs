import { execFile } from "node:child_process";
import { promisify } from "node:util";
import manifest from "../../package.json" with { type: "json" };
import { toolInputs } from "../../src/mcp/contracts.ts";
import { connect, serverPath } from "./client.mjs";

let registration = "unavailable";
let connection;
let status;
let tools = [];
try {
  const { stdout } = await promisify(execFile)("codex", ["mcp", "get", "motionux", "--json"], { timeout: 5000, maxBuffer: 16384 });
  const { enabled, transport } = JSON.parse(stdout);
  registration = enabled && transport?.type === "stdio" && transport.args?.includes(serverPath) &&
    transport.args?.includes("--permission") ? "configured" : "check-config";
} catch { /* The SDK check remains useful on machines without Codex. */ }
try {
  connection = await connect({ jail: true });
  tools = (await connection.client.listTools()).tools.map(tool => tool.name);
  status = await connection.call("motionux_status");
} catch {
  status = { status: "connection-failed", instructions: ["Use Node 24 and install the pinned packages with npm ci."] };
} finally { await connection?.close(); }
process.stdout.write(JSON.stringify({ node: process.version, sdk: manifest.devDependencies["@modelcontextprotocol/server"],
  transport: "stdio", registration, tools, motionux: status }) + "\n");
if (status.status !== "ready" || tools.length !== Object.keys(toolInputs).length) process.exitCode = 1;
