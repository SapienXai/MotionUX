import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { motionRoot } from "../agent/workspace.mjs";

export const serverPath = fileURLToPath(new URL("server.mjs", import.meta.url));

export async function connect({ entry = serverPath, args = [], roots = [], jail = false } = {}) {
  const parameters = ["--permission", ...[motionRoot, ...roots].map(root => "--allow-fs-read=" + root), entry, ...args];
  const confined = jail && process.platform === "darwin";
  const transport = new StdioClientTransport({ command: confined ? "/usr/bin/sandbox-exec" : process.execPath,
    args: confined ? ["-p", "(version 1) (allow default) (deny network*) (deny file-write*) (deny process-fork)",
      process.execPath, ...parameters] : parameters, stderr: "pipe" });
  let diagnostics = "";
  transport.stderr?.on("data", chunk => { if (diagnostics.length < 2048) diagnostics += chunk.toString().slice(0, 2048); });
  const client = new Client({ name: "motionux-verification", version: "1.0.0" });
  try { await client.connect(transport); }
  catch (error) { await client.close(); throw error; }
  return {
    client, diagnostics: () => diagnostics, close: () => client.close(),
    async call(name, args = {}, options) {
      const result = await client.callTool({ name, arguments: args }, options);
      if (result.isError) throw new Error("MCP rejected the tool request.");
      return result.structuredContent;
    },
  };
}
