import { randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fingerprint } from "../packages/build-core/store.ts";
import { inspectCodeCatalog } from "../packages/app-export/code-catalog.ts";
import { sealCodeProject, codeDocument } from "../packages/app-export/code-program.ts";
import { newProject } from "../packages/build-core/model.ts";

export const repo = resolve(import.meta.dirname, "../..");
export async function fixtureProgram() {
  const text = (path) => readFile(resolve(repo, "platform/tests/fixtures/source-code", path), "utf8");
  const proposal = {
    name: "Portable code fixture", summary: "Owned compiler test input", locale: "en", direction: "ltr",
    design: { composition: "Test-only notice", typography: "System", mobile: "Intrinsic", motion: "Immediate" },
    pages: [{ id: "home", title: "Compiler fixture", route: "/", firstTask: "Open the source notice" },
      { id: "notes", title: "Notes", route: "/notes", firstTask: "Read notes" }],
    files: [{ path: "components/app.tsx", content: await text("fixture-app.tsx") },
      { path: "styles/app.css", content: ".app { font-family: system-ui; min-block-size: 100vh; } .app button { padding: 12px; }" }],
    controls: [{ key: "heading", label: "Heading", value: "Compiler fixture", kind: "text" },
      { key: "text-color", label: "Text color", value: "#222222", kind: "color" },
      { key: "content-space", label: "Spacing", value: "24px", kind: "spacing" }],
    usages: [{ source: "portable-source", module: "components/app.tsx", instance: "notice", route: "/", reason: "Fixture open interaction", interaction: "Expand source" }],
    generated: [{ file: "components/app.tsx", purpose: "Typed source interaction with a local count", generatedFrom: ["portable-source"] }],
    journeys: [{ title: "Open fixture context", route: "/", steps: [{ role: "button", name: "Show context", action: "click", value: "", expected: "Source expanded" }] }],
    limitations: ["This owned fixture proves compiler behavior only. It is not native upstream generation evidence."],
  };
  return proposal;
}
export async function createCodeFixture() {
  const root = resolve(repo, ".motionux-v9/build-tests");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const fake = await mkdtemp(resolve(root, "b11r-portable-"));
  const vault = resolve(fake, ".motionux-v9");
  await mkdir(resolve(vault, "registry"), { recursive: true, mode: 0o700 });
  await cp(resolve(repo, "platform/templates/hotel-dashboard"), resolve(fake, "platform/templates/hotel-dashboard"), {
    recursive: true, filter: (path) => !path.split("/").some((part) => ["node_modules", ".next"].includes(part)),
  });
  await cp(resolve(repo, "platform/templates/hotel-marketing/media"), resolve(fake, "platform/templates/hotel-marketing/media"), { recursive: true });
  await cp(resolve(repo, "platform/templates/pwa"), resolve(fake, "platform/templates/pwa"), { recursive: true });
  await mkdir(resolve(fake, "platform/templates/source-driven"), { recursive: true });
  await cp(resolve(repo, "platform/templates/source-driven/project-state.ts"), resolve(fake, "platform/templates/source-driven/project-state.ts"));
  await cp(resolve(repo, "LICENSE"), resolve(fake, "LICENSE"));
  const source = await readFile(resolve(repo, "platform/tests/fixtures/source-code/expanding-notice.tsx"), "utf8");
  const license = await readFile(resolve(repo, "LICENSE"), "utf8");
  const revision = "a".repeat(40);
  const entry = { id: "portable-source", provider: "MotionUX owned test fixture", title: "Portable source fixture",
    repo: "https://github.com/SapienXai/MotionUX", entry: "component.tsx", upstreamHash: fingerprint(source), upstreamCommit: revision,
    sourceURL: "https://github.com/SapienXai/MotionUX/blob/" + revision + "/platform/tests/fixtures/source-code/expanding-notice.tsx",
    installRecipe: "portable-source.json", licenseNoticePath: "LICENSE.txt",
    codeFiles: [{ path: "component.tsx", sha256: fingerprint(source) }, { path: "LICENSE.txt", sha256: fingerprint(license) }], assets: [] };
  await writeFile(resolve(vault, "catalog.last-good.json"), JSON.stringify([entry]));
  const recipe = { name: entry.id, files: [{ path: "component.tsx", content: source }, { path: "LICENSE.txt", content: license }] };
  await writeFile(resolve(vault, "registry/portable-source.json"), JSON.stringify(recipe));
  const inventory = await inspectCodeCatalog(fake);
  const sources = [...inventory.sources.values()];
  const proposal = await fixtureProgram();
  const code = await sealCodeProject(fake, proposal, sources);
  const project = newProject(randomBytes(16).toString("hex"), codeDocument(code));
  return { fake, vault, sources, proposal, project, close: () => rm(fake, { recursive: true, force: true }) };
}
