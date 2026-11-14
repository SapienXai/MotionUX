import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const original = process.cwd();
const git = (...args) => {
  const result = spawnSync("git", args, { encoding: "utf8", cwd: original });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
};
const pin = process.env.MOTIONUX_REGISTRY_REF ?? git("rev-parse", "HEAD");
if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error("Provide the full published registry SHA.");
const registry = JSON.parse(readFileSync("registry.json", "utf8"));
const addresses = registry.items.map((item) => `SapienXai/MotionUX/${item.name}#${pin}`);
const scratch = mkdtempSync(join(tmpdir(), "motionux-registry-"));
const cli = resolve("node_modules/.bin/shadcn");

function run(command, args, silent = false, cwd = scratch) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: silent ? "pipe" : "inherit", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `${command} ${args.join(" ")} exited with ${result.status}`);
  return result.stdout;
}
try {
  mkdirSync(join(scratch, "src"));
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ name: "motionux-registry-smoke", private: true, dependencies: { react: "19.3.1", "react-dom": "19.3.1" }, devDependencies: { "@types/react": "19.3.0", "@types/react-dom": "19.3.0" } }));
  writeFileSync(join(scratch, "components.json"), JSON.stringify({
    $schema: "https://ui.shadcn.com/schema.json", style: "new-york", rsc: true, tsx: true,
    tailwind: { config: "", css: "src/index.css", baseColor: "neutral", cssVariables: true, prefix: "" },
    aliases: { components: "@/components", ui: "@/components/ui", utils: "@/lib/utils", lib: "@/lib", hooks: "@/hooks" },
  }));
  writeFileSync(join(scratch, "src/index.css"), "");
  writeFileSync(join(scratch, "tsconfig.json"), JSON.stringify({
    compilerOptions: { jsx: "react-jsx", module: "ESNext", moduleResolution: "Bundler", target: "ES2022", strict: true, skipLibCheck: true, noEmit: true, paths: { "@/*": ["./src/*"] } },
    include: ["src"],
  }));

  for (const offset of Array.from({ length: Math.ceil(addresses.length / 12) }, (_, index) => index * 12)) {
    run(cli, ["view", ...addresses.slice(offset, offset + 12)], true);
  }
  console.log(`Viewed ${addresses.length} registry items at ${pin}`);
  run("npm", ["install", "--no-audit", "--no-fund"]);
  for (let i = 0; i < addresses.length; i += 12) {
    const batch = addresses.slice(i, i + 12);
    run(cli, ["add", "--dry-run", ...batch], true);
    run(cli, ["add", "--yes", ...batch]);
  }
  for (const item of registry.items) {
    for (const file of item.files) {
      const target = resolve(scratch, file.target.replace(/^@components\//, "src/components/"));
      if (!existsSync(target)) throw new Error(`Missing installed file: ${file.target}`);
    }
  }
  run(resolve("node_modules/.bin/tsc"), ["-p", join(scratch, "tsconfig.json")]);
  console.log(`Installed and typechecked ${addresses.length} items in a clean consumer.`);
} finally {
  rmSync(scratch, { recursive: true });
}
