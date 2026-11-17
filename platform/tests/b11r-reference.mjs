import { execFileSync } from "node:child_process";
import { performSourceStep } from "../apps/preview-host/source-target.mjs";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { createServer } from "vite";
import ts from "typescript";
import { expect } from "@playwright/test";
import { inspectCodeCatalog } from "../packages/app-export/code-catalog.ts";
import { fingerprint } from "../packages/build-core/store.ts";
import { imageDifference } from "../../scripts/parity-images.mjs";

function runtimeCode(path, code) {
  const output = ts.transpileModule(code, { fileName: path, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, removeComments: true,
  } }).outputText;
  const file = ts.createSourceFile(path, output, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const printer = ts.createPrinter();
  return file.statements.filter((node) => !ts.isImportDeclaration(node)).map((node) => printer.printNode(ts.EmitHint.Unspecified, node, file)).join("\n");
}

export async function compareOriginal(browser, origin, project, work, repo, label, evidence) {
  const root = resolve(work, "raw-reference");
  const raw = resolve(root, "sources");
  const inventory = await inspectCodeCatalog(repo);
  const catalog = JSON.parse(await readFile(resolve(repo, ".motionux-v9/catalog.last-good.json"), "utf8"));
  const providers = JSON.parse(await readFile(resolve(repo, "metadata/v9-provider-candidates.json"), "utf8")).providers;
  const importMaps = new Map();
  const identities = [];
  await mkdir(raw, { recursive: true, mode: 0o700 });
  await symlink(resolve(work, "node_modules"), resolve(root, "node_modules"));
  await cp(resolve(work, "public"), resolve(root, "public"), { recursive: true }).catch((error) => { if (error.code !== "ENOENT") throw error; });
  await cp(resolve(work, ".next/static"), resolve(root, "public/_next/static"), { recursive: true });
  for (const pin of project.document.codeProject.sources) {
    const source = inventory.sources.get(pin.id);
    assert(source && source.pin.closure === pin.closure, "The reference source pin changed.");
    const entry = catalog.find(({ id }) => id === pin.id);
    const registry = JSON.parse(await readFile(resolve(repo, ".motionux-v9/registry", basename(entry.installRecipe)), "utf8"));
    const originals = new Map(registry.files.map(({ path, content }) => [path, content]));
    const provider = providers.find(({ repoURL }) => repoURL === entry.repo);
    assert(provider && /^[a-z0-9-]+$/.test(provider.id));
    const upstreamRoot = resolve(repo, ".motionux-v9/upstream", provider.id);
    for (const [path, adapted] of Object.entries(source.files)) {
      const metadata = entry.codeFiles.find((file) => file.path === path);
      const upstreamPath = metadata?.upstreamPath ?? (path === entry.entry ? entry.sourceURL.split(entry.upstreamCommit + "/")[1] : path);
      let original = originals.get(path) ?? (path === "LICENSE.txt" ? adapted : undefined);
      let gitVerified = false;
      if (path !== "LICENSE.txt" && metadata) {
        const bytes = execFileSync("git", ["--no-pager", "-C", upstreamRoot, "show", entry.upstreamCommit + ":" + upstreamPath], {
          env: { ...process.env, GIT_NO_LAZY_FETCH: "1", GIT_OPTIONAL_LOCKS: "0" }, maxBuffer: 2_000_000,
        });
        assert.equal(fingerprint(bytes), metadata.sha256, "The actual Git blob differs from the declared upstream hash.");
        original = bytes.toString("utf8");
        gitVerified = true;
      }
      assert.equal(typeof original, "string", "Missing source " + path);
      const target = resolve(raw, pin.id, path);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, original, { mode: 0o600 });
      if (/\.tsx?$/.test(path)) {
        const originalImports = ts.preProcessFile(original, true, true).importedFiles.map(({ fileName }) => fileName);
        const adaptedImports = ts.preProcessFile(adapted, true, true).importedFiles.map(({ fileName }) => fileName);
        assert.equal(originalImports.length, adaptedImports.length, "The integration changed the module import topology.");
        importMaps.set(target, new Map(originalImports.map((name, index) => [name, adaptedImports[index]])));
        const originalRuntime = fingerprint(runtimeCode(path, original));
        const adaptedRuntime = fingerprint(runtimeCode(path, adapted));
        assert.equal(adaptedRuntime, originalRuntime, "Source behavior changed during import adaptation.");
        identities.push({ source: pin.id, path, upstreamPath, gitVerified, upstream: fingerprint(original), prepared: source.hashes[path], adapted: fingerprint(adapted), runtime: originalRuntime });
      }
    }
    const imported = "./" + pin.id + "/" + pin.entry.replace(/\.tsx?$/, "");
    await writeFile(resolve(raw, pin.id + ".ts"), "export * from " + JSON.stringify(imported) + ";\n" +
      (source.exports.includes("default") ? "export { default } from " + JSON.stringify(imported) + ";\n" : ""));
  }
  const { readdir } = await import("node:fs/promises");
  const styles = (await readdir(resolve(work, ".next/static"), { recursive: true })).filter((path) => path.endsWith(".css"));
  assert(styles.length);
  await writeFile(resolve(root, "index.html"), '<!doctype html><html lang="' + project.document.locale + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    styles.map((path) => '<link rel="stylesheet" href="/_next/static/' + path + '">').join("") +
    '</head><body><div id="root"></div><script type="module" src="/reference.tsx"></script></body></html>');
  await writeFile(resolve(root, "reference.tsx"), 'import { createRoot } from "react-dom/client";\nimport { MotionConfig } from "motion/react";\nimport App from ' +
    JSON.stringify(resolve(work, "components/app.tsx")) + ';\nimport { settings } from ' + JSON.stringify(resolve(work, "runtime/config.ts")) +
    ';\ncreateRoot(document.getElementById("root")!).render(<MotionConfig reducedMotion="user"><App route={location.pathname} config={settings.values}/></MotionConfig>);');
  const server = await createServer({
    root, configFile: false, appType: "spa", esbuild: { jsx: "automatic" },
    server: { host: "127.0.0.1", port: 0, fs: { allow: [work] }, watch: null, hmr: false, ws: false },
    resolve: { dedupe: ["react", "react-dom"] },
    plugins: [{ name: "raw-pinned-source-reference", resolveId(name, importer) {
      if (!importer) return;
      const clean = importer.split("?")[0];
      const mapped = importMaps.get(clean)?.get(name);
      if (mapped && mapped !== name) {
        if (mapped.startsWith(".")) {
          const target = resolve(dirname(clean), mapped);
          return [target, target + ".tsx", target + ".ts", target + "/index.tsx", target + "/index.ts"]
            .find((path) => [...importMaps.keys()].includes(path));
        }
        return this.resolve(mapped, importer, { skipSelf: true });
      }
      if (name.startsWith(".")) {
        const target = resolve(dirname(clean), name).replace(/\.tsx?$/, "");
        for (const pin of project.document.codeProject.sources)
          if (target === resolve(work, "sources", pin.id)) return resolve(raw, pin.id + ".ts");
      }
      if (name.startsWith("@/")) {
        const pin = project.document.codeProject.sources.find(({ id }) => clean.startsWith(resolve(raw, id) + sep));
        if (!pin) return;
        const source = inventory.sources.get(pin.id);
        const base = name.slice(2);
        const path = [base, base + ".tsx", base + ".ts", base + "/index.tsx", base + "/index.ts"].find((path) => Object.hasOwn(source.files, path));
        assert(path, "An upstream alias has no pinned target.");
        return resolve(raw, pin.id, path);
      }
    } }],
  });
  await server.listen();
  const reference = "http://127.0.0.1:" + server.httpServer.address().port;
  const checks = [];
  try {
    for (const width of [1440, 390]) {
      const contexts = await Promise.all([origin, reference].map(() => browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce", colorScheme: "light" })));
      const pages = await Promise.all(contexts.map((context) => context.newPage()));
      try {
        await Promise.all(pages.map(async (page, index) => {
          await page.clock.setFixedTime(new Date("2026-11-17T18:00:00Z"));
          await page.goto([origin, reference][index], { waitUntil: "networkidle" });
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
        }));
        const images = await Promise.all(pages.map((page, index) => page.locator(".app").screenshot({
          path: resolve(evidence, label + (index ? "-original-" : "-adapted-") + width + ".png"), animations: "disabled",
        })));
        const differentPixels = await imageDifference(pages[0], images[0], images[1]);
        const aria = await Promise.all(pages.map((page) => page.locator(".app").ariaSnapshot()));
        assert.equal(aria[0], aria[1], "Original and adapted semantic output differ.");
        assert(differentPixels <= .025, "Original and adapted pixels differ by " + differentPixels);
        checks.push({ width, differentPixels, ariaMatch: true });
        if (width === 1440) for (const [journeyIndex, journey] of project.document.codeProject.journeys.entries()) {
          await Promise.all(pages.map(async (page, index) => {
            await page.emulateMedia({ reducedMotion: journey.steps.some(({ action }) => ["hover", "drag", "wheel"].includes(action)) ? "no-preference" : "reduce" });
            await page.evaluate(() => localStorage.clear());
            await page.goto([origin, reference][index] + journey.route, { waitUntil: "networkidle" });
          }));
          for (const [stepIndex, step] of journey.steps.entries()) {
            await Promise.all(pages.map(async (page) => {
              const node = await performSourceStep(page, step);
              if (["fill", "select"].includes(step.action)) await expect(node).toHaveValue(step.value);
              await expect(page.locator("body")).toContainText(step.expected, { useInnerText: true });
            }));
            const stage = "flow-" + journeyIndex + "-" + stepIndex;
            const frames = await Promise.all(pages.map((page, index) => page.locator(".app").screenshot({
              path: resolve(evidence, label + (index ? "-original-" : "-adapted-") + stage + ".png"), animations: "disabled",
            })));
            const difference = await imageDifference(pages[0], frames[0], frames[1]);
            const semantics = await Promise.all(pages.map((page) => page.locator(".app").ariaSnapshot()));
            assert.equal(semantics[0], semantics[1], "Upstream behavior differs at " + stage);
            assert(difference <= .025, "Upstream pixels differ at " + stage + " by " + difference);
            checks.push({ width, journey: journey.title, step: step.name, differentPixels: difference, ariaMatch: true });
          }
        }
      } finally { await Promise.all(contexts.map((context) => context.close())); }
    }
    let motion;
    if (project.document.codeProject.sources.some(({ id }) => id === "kokonut-card-stack")) {
      const records = [];
      const endpoints = [];
      for (const [index, endpoint] of [origin, reference].entries()) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference", colorScheme: "light" });
        const page = await context.newPage();
        try {
          await page.clock.setFixedTime(new Date("2026-11-17T18:00:00Z"));
          await page.goto(endpoint, { waitUntil: "networkidle" });
          const mount = page.locator('[data-source="kokonut-card-stack"]');
          const card = mount.locator('button[data-state="rest"]').first();
          await card.waitFor();
          const box = await card.boundingBox();
          assert(box);
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          const trace = page.evaluate(async () => {
            const root = document.querySelector('[data-source="kokonut-card-stack"]');
            const rows = [];
            for (let frame = 0; frame < 75; frame++) {
              const t = await new Promise((done) => requestAnimationFrame(done));
              rows.push({ t, cards: [...root.querySelectorAll('button[data-state]')].map((card) => ({ phase: card.dataset.state, transform: card.style.transform })) });
            }
            return rows;
          });
          await page.mouse.move(box.x + box.width * 1.2, box.y + box.height * .4, { steps: 7 });
          await page.mouse.up();
          await mount.screenshot({ path: resolve(evidence, label + (index ? "-original" : "-adapted") + "-drag-release.png"), animations: "allow" });
          const frames = await trace;
          assert(frames.some(({ cards }) => cards.some(({ phase }) => phase !== "rest")), "The native drag produced no moving frame.");
          assert(new Set(frames.map(({ cards }) => JSON.stringify(cards))).size > 3, "The source poses did not progress.");
          await expect.poll(() => mount.locator('button[data-state]:not([data-state="rest"])').count(), { timeout: 7000 }).toBe(0);
          endpoints.push(await mount.screenshot({ path: resolve(evidence, label + (index ? "-original" : "-adapted") + "-drag-settled.png"), animations: "allow" }));
          const gaps = frames.slice(1).map((frame, i) => frame.t - frames[i].t).sort((a, b) => a - b);
          records.push({ implementation: index ? "raw-upstream" : "adapted-next", frames, p95FrameGapMs: gaps[Math.floor(gaps.length * .95)], maximumFrameGapMs: gaps.at(-1) });
        } finally { await context.close(); }
      }
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(origin);
        const settledDifference = await imageDifference(page, endpoints[0], endpoints[1]);
        assert(settledDifference <= .025, "Original and adapted drag endpoints differ.");
        motion = { gesture: "Real horizontal mouse drag with source RAF physics, followed through rest", records, settledDifference };
      } finally { await context.close(); }
    }
    return { mode: "Git-blob-verified upstream modules in the same generated application, raw TSX via Vite and matched Next CSS", identities, checks, motion };
  } finally { await server.close(); }
}
