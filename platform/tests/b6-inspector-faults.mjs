import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { inspectRuntime } from "../apps/preview-host/inspect-browser.mjs";

let unexpected = 0;
const sentinel = createServer((_request, response) => {
  unexpected++;
  response.end();
});
sentinel.listen(0, "127.0.0.1");
await once(sentinel, "listening");
const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/redirect") {
    response
      .writeHead(302, {
        Location: "http://127.0.0.1:" + sentinel.address().port + "/foreign",
      })
      .end();
    return;
  }
  if (request.method !== "GET" || request.url !== "/faults") {
    unexpected++;
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "X-MotionUX-Preview": "fixture",
    "X-MotionUX-Document": "fixture-digest",
  }).end(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Inspector faults</title>
<main>
  <h1>Inspector faults</h1>
  <div id="overflow" style="width:600px">An uncontained fixed-width element</div>
  <div id="clip" style="width:100px;overflow:hidden">
    <button id="cut" style="width:250px">Partly inaccessible</button>
  </div>
  <button style="min-width:32px;min-height:32px" id="unlabelled"></button>
  <p id="low-contrast" style="color:#d0d0d0;background:white">Low contrast sample</p>
  <button>Find a page</button>
</main>
<script>
  fetch("/mutation", { method: "POST" }).catch(() => {});
  fetch("http://127.0.0.1:${sentinel.address().port}/foreign").catch(() => {});
  throw new Error("fixture runtime regression");
</script>
</html>`);
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const origin = "http://127.0.0.1:" + server.address().port;
  const options = {
    origin,
    route: "/faults",
    revision: 7,
    identity: { token: "fixture", digest: "fixture-digest" },
  };
  const report = await inspectRuntime(options);
  assert.deepEqual(
    report.viewports.map(({ width }) => width),
    [390, 768, 1440],
  );
  for (const view of report.viewports) {
    const finding = (rule) => view.findings.find((item) => item.rule === rule);
    assert.equal(Boolean(finding("page-overflow")), view.width === 390);
    if (view.width === 390)
      assert.match(finding("page-overflow").evidence, /#overflow/);
    assert.match(finding("clipped-control").evidence, /#cut inside #clip/);
    assert.match(finding("button-name").evidence, /#unlabelled/);
    assert.match(finding("color-contrast").evidence, /#low-contrast/);
    assert.match(finding("page-search").evidence, /Enter/);
    assert.match(finding("page-error").evidence, /1 error/);
  }
  await assert.rejects(
    inspectRuntime({
      ...options,
      identity: { ...options.identity, token: "stale" },
    }),
    /Preview identity/,
  );
  await assert.rejects(
    inspectRuntime({ ...options, origin: "https://example.com" }),
    /loopback/,
  );
  await assert.rejects(
    inspectRuntime({ ...options, route: "/redirect" }),
    /ERR_FAILED/,
  );
  await assert.rejects(
    inspectRuntime({ ...options, signal: AbortSignal.abort() }),
    { name: "AbortError" },
  );
  assert.equal(unexpected, 0);
  console.log(
    "Inspector found the seeded layout, axe and runtime interaction faults. Identity and network isolation passed.",
  );
} finally {
  await Promise.all(
    [server, sentinel].map(
      (instance) => new Promise((done) => instance.close(done)),
    ),
  );
}
