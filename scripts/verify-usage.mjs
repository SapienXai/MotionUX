import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const root = process.cwd();
const config = JSON.parse(await readFile("registry.json", "utf8"));
const scratch = await mkdtemp(join(tmpdir(), "motionux-usage-"));
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
try {
  const { previews, references } = await server.ssrLoadModule("/studio/catalog.ts");
  const { baseFields } = await server.ssrLoadModule("/studio/playground/base.ts");
  const { configuredUsage } = await server.ssrLoadModule("/studio/playground/base-usage.ts");
  const { featuredDefinition, featuredUsage } = await server.ssrLoadModule("/studio/playground/featured.ts");
  const paths = {};
  let examples = 0;
  function sample(field) {
    if (field.type === "text") return "Verified copy";
    if (field.type === "select") return field.options.find(option => option !== field.default);
    if (field.type === "boolean") return !field.default;
    return field.max;
  }
  async function save(id, entry, sourceCode) {
    const imports = Array.from(sourceCode.matchAll(/from "(@\/components\/sapienx-motion\/(.+?))"/g));
    if (imports.length !== 1) throw new Error(`Expected one installed component import in ${id}`);
    const [, alias, file] = imports[0];
    const source = entry.files.find(({ target }) => target === `@components/sapienx-motion/${file}.tsx`);
    if (!source) throw new Error(`Usage imports ${file}, which is missing from ${id}'s install`);
    paths[alias] = [resolve(root, source.path)];
    const code = sourceCode.startsWith('"use client"') ? sourceCode : `"use client";\n\n${sourceCode}`;
    await writeFile(join(scratch, `${id}.tsx`), code + "\n");
    examples++;
  }
  for (const item of references) {
    const { default: preview } = await previews[item.id]();
    const entry = config.items.find(({ name }) => name === item.registryItem);
    await save(item.id, entry, preview.usage);
    const fields = baseFields(item.registryItem);
    if (!fields.length) throw new Error(`Missing controls for ${item.id}`);
    const configured = configuredUsage(item.id, Object.fromEntries(fields.map(field => [field.key, sample(field)])));
    if (!configured) throw new Error(`Missing customized example for ${item.id}`);
    await save(item.id + "-custom", entry, configured);
    const featured = featuredDefinition(item.id);
    if (featured) {
      const preset = config.items.find(({ name }) => name === featured.entry + "-gallery");
      const code = featuredUsage(item.id, Object.fromEntries(featured.fields.map(field => [field.key, sample(field)])), true, true);
      await save(item.id + "-gallery", preset, code);
    }
  }
  await symlink(resolve(root, "node_modules"), join(scratch, "node_modules"), "dir");
  await writeFile(join(scratch, "tsconfig.json"), JSON.stringify({
    compilerOptions: { jsx: "react-jsx", module: "ESNext", moduleResolution: "Bundler", target: "ES2022", strict: true, skipLibCheck: true, noEmit: true, paths },
    include: ["*.tsx"],
  }));
  const result = spawnSync(resolve(root, "node_modules/.bin/tsc"), ["-p", join(scratch, "tsconfig.json")], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
  else console.log(`Typechecked ${examples} copyable Studio examples (base, customized and Gallery).`);
} finally {
  await server.close();
  await rm(scratch, { recursive: true, force: true });
}
