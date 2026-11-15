import { parseArgs } from "node:util";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import { McpServer, fromJsonSchema } from "@modelcontextprotocol/server";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import Ajv2020 from "ajv/dist/2020.js";
import { descriptions, maxConcurrent, maxRequestBytes, payloadLimit, toolDeadlineMs, toolInputs } from "../../src/mcp/contracts.ts";
import resultSchema from "../../schemas/mcp/result.v1.json" with { type: "json" };
import { canonical } from "../../src/brain/indexer.ts";
import { handlers } from "../../src/mcp/handlers.ts";
import { motionRoot } from "../agent/workspace.mjs";
import { inspectProject } from "../agent/inspect.mjs";
import { localBrain } from "../agent/local-brain.mjs";
import { projectPolicy } from "./projects.mjs";

function frames(diagnostic) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffered = Buffer.alloc(0);
  let stamp = performance.now();
  let rate = 0;
  return new Transform({
    transform(chunk, _encoding, done) {
      try {
        for (let cursor = 0; cursor < chunk.length;) {
          const newline = chunk.indexOf(10, cursor);
          const end = newline < 0 ? chunk.length : newline;
          if (buffered.length + end - cursor > maxRequestBytes) throw new Error();
          const slice = chunk.subarray(cursor, end);
          buffered = buffered.length ? Buffer.concat([buffered, slice]) : Buffer.from(slice);
          cursor = end + 1;
          if (newline < 0) break;
          const line = decoder.decode(buffered);
          const now = performance.now();
          if (now - stamp >= 1000) { stamp = now; rate = 0; }
          if (++rate > 256) throw new Error();
          try {
            JSON.parse(line);
            this.push(Buffer.concat([buffered, Buffer.from("\n")]));
          } catch { diagnostic(); }
          buffered = Buffer.alloc(0);
        }
        done();
      } catch { done(new Error("Invalid or oversize stdio frame.")); }
    },
  });
}

const failure = (status, message) => ({ schemaVersion: 1, status, message });
function result(value) {
  const data = Buffer.byteLength(canonical(value)) > payloadLimit
    ? failure("response-too-large", "Request fewer candidates or inspect one component.") : value;
  return { structuredContent: data, content: [{ type: "text", text: canonical(data) }] };
}
function waitFor(work, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function runServer({ load = localBrain, explicit = [], inspect = inspectProject, deadline = toolDeadlineMs } = {}) {
  process.chdir(motionRoot);
  const policy = await projectPolicy(explicit);
  const run = handlers(load, inspect, policy);
  const validator = new AjvJsonSchemaValidator(new Ajv2020({ strict: false, allErrors: false }));
  const shutdown = new AbortController();
  let active = 0;
  let warnings = 0;
  const diagnostic = () => {
    if (warnings++ < 3) process.stderr.write("MotionUX MCP rejected a protocol frame.\n");
  };
  const stdin = frames(diagnostic);
  const transport = new StdioServerTransport(stdin, process.stdout, { maxBufferSize: maxRequestBytes + 1 });
  const handle = serveStdio(() => {
    const server = new McpServer({ name: "motionux", version: "1.0.0" }, {
      capabilities: { tools: {} },
      instructions: "Read-only motion discovery and planning. Use plan_motion only for an explicitly authorized project and selected screen.",
    });
    for (const [name, schema] of Object.entries(toolInputs)) {
      server.registerTool(name, { description: descriptions[name], inputSchema: fromJsonSchema(schema, validator),
        outputSchema: fromJsonSchema(resultSchema, validator),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
      async (args, ctx) => {
        if (active >= maxConcurrent) return result(failure("busy", "Retry after the active requests finish."));
        const deadlineSignal = AbortSignal.timeout(deadline);
        const signal = AbortSignal.any([deadlineSignal, shutdown.signal, ctx.mcpReq.signal]);
        active++;
        const work = Promise.resolve().then(() => run(name, args, signal)).finally(() => active--);
        try { return result(await waitFor(work, signal)); }
        catch (error) {
          if (deadlineSignal.aborted) return result(failure("deadline-exceeded", "Reduce scope and retry."));
          if (signal.aborted || error?.code === "cancelled") return result(failure("cancelled", "The request was cancelled."));
          if (error?.code === "project-not-authorized") {
            return result(failure("project-not-authorized", "Choose an authorized fixture or configure explicit read scope outside MCP."));
          }
          if (["invalid-selector", "invalid-input"].includes(error?.code)) {
            return result(failure("invalid-input", "Select a bounded route or workspace-relative JS/TS file."));
          }
          return result(failure("internal-error", "The local request did not complete. Check MotionUX readiness."));
        }
      });
    }
    return server;
  }, { transport, onerror: diagnostic, maxSubscriptions: 8 });

  function close() {
    if (shutdown.signal.aborted) return;
    shutdown.abort();
    process.stdin.unpipe(stdin);
    process.stdin.destroy();
    void handle.close();
  }
  stdin.on("error", () => { diagnostic(); close(); });
  process.stdin.once("end", close);
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  process.stdin.pipe(stdin);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { "allow-project": { type: "string", multiple: true } }, strict: true });
    await runServer({ explicit: values["allow-project"] });
  } catch {
    process.stderr.write("MotionUX MCP could not start with the configured read scope.\n");
    process.exitCode = 1;
  }
}
