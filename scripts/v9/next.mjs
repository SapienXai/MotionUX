import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "http://127.0.0.1:5199";
const cli = resolve("node_modules/.bin/shadcn");
const specs = [
  { provider: "kokonut", specimens: ["smooth-tab", "wheel-picker"], checks: ["Overview", "Hours"] },
  { provider: "smoothui", specimens: ["siri-orb", "scrubber"], checks: ["siri-orb", "Opacity"] },
];
for (const { provider, specimens, checks } of specs) {
  const folder = resolve(".motionux-v9/next", provider);
  await mkdir(resolve(folder, "app"), { recursive: true });
  const put = (path, value) => writeFile(resolve(folder, path), typeof value === "string" ? value : JSON.stringify(value));
  const run = (bin, args) => execFileSync(bin, args, { cwd: folder, stdio: "inherit",
    env: { ...process.env, npm_config_ignore_scripts: "true", NEXT_TELEMETRY_DISABLED: "1" } });
  const entry = await fetch(`${origin}/v9/catalog.json?id=${provider}-${specimens[0]}`).then(response => response.json());
  await put("package.json", { name: "motionux-v9-next-" + provider, private: true, dependencies: {
    ...entry.dependencies, next: "16.4.6", typescript: "5.9.3", "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3", "@types/node": "24.19.2",
    tailwindcss: "4.3.0", "@tailwindcss/postcss": "4.3.0", postcss: "8.5.16",
  } });
  await put("tsconfig.json", { compilerOptions: { strict: true, paths: { "@/*": ["./*"] } } });
  await put("components.json", { $schema: "https://ui.shadcn.com/schema.json", style: "new-york", rsc: true, tsx: true,
    tailwind: { config: "", css: "app/host.css", baseColor: "neutral", cssVariables: true, prefix: "" },
    aliases: { components: "@/components", ui: "@/components/ui", lib: "@/lib", utils: "@/lib/utils", hooks: "@/hooks" },
  });
  await put("postcss.config.mjs", 'export default { plugins: { "@tailwindcss/postcss": {} } };\n');
  await put("next.config.mjs", 'import { fileURLToPath } from "node:url";\nexport default { outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)) };\n');
  await put("app/host.css", "main { max-width: 460px; margin-inline: auto; padding: 16px; }");
  await put("app/layout.tsx", `import "../upstream.css";
import "./host.css";
import type { ReactNode } from "react";
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><main>{children}</main></body></html>;
}
`);
  await put("app/page.tsx", specimens.map((item, index) => `import Demo${index} from "../demos/${item}";`).join("\n") +
    "\nexport default function Page() { return <>" + specimens.map((_, index) => `<Demo${index} />`).join("") + "</>; }\n");
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  run(cli, ["add", "--yes", ...specimens.map(item => `${origin}/v9/registry/${provider}-${item}.json`)]);
  run(resolve(folder, "node_modules/.bin/next"), ["build", "--webpack"]);
  const prerendered = await readFile(resolve(folder, ".next/server/app/index.html"), "utf8");
  if (!checks.every(text => prerendered.includes(text))) throw new Error("Missing rendered original specimen for " + provider);
  console.log(`Next 16.4.6 / Tailwind 4.3.0: ${provider} originals installed from the private registry and prerendered.`);
}
