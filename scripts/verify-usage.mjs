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
  const paths = {};
  for (const item of references) {
    const { default: preview } = await previews[item.id]();
    const entry = config.items.find(({ name }) => name === item.registryItem);
    const imports = Array.from(preview.usage.matchAll(/from "(@\/components\/sapienx-motion\/(.+?))"/g));
    if (imports.length !== 1) throw new Error(`Expected one installed component import in ${item.id}`);
    const [, alias, file] = imports[0];
    const source = entry.files.find(({ target }) => target.endsWith(`/${file}.tsx`));
    if (!source) throw new Error(`Usage imports ${file}, which is missing from ${item.id}'s install`);
    paths[alias] = [resolve(root, source.path)];
    const code = preview.usage.startsWith('"use client"') ? preview.usage : `"use client";\n\n${preview.usage}`;
    await writeFile(join(scratch, `${item.id}.tsx`), code + "\n");
  }
  await symlink(resolve(root, "node_modules"), join(scratch, "node_modules"), "dir");
  await writeFile(join(scratch, "tsconfig.json"), JSON.stringify({
    compilerOptions: { jsx: "react-jsx", module: "ESNext", moduleResolution: "Bundler", target: "ES2022", strict: true, skipLibCheck: true, noEmit: true, paths },
    include: ["*.tsx"],
  }));
  const result = spawnSync(resolve(root, "node_modules/.bin/tsc"), ["-p", join(scratch, "tsconfig.json")], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
  else console.log(`Typechecked ${references.length} copyable Studio examples.`);
} finally {
  await server.close();
  await rm(scratch, { recursive: true, force: true });
}
