import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const pin = process.env.MOTIONUX_REGISTRY_REF ?? spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
if (!/^[a-f0-9]{40}$/.test(pin)) throw new Error("Use a published full MotionUX commit SHA.");
const cli = resolve("node_modules/.bin/shadcn");
const presets = ["sliding-tab-pill-gallery", "loading-outcome-gallery", "expandable-room-gallery", "morph-dropdown-gallery", "featured-profile-gallery", "destination-deck-gallery"];
const entries = ["tab-pill", "loading-to-success", "letter-limit", "swipe-deck", "prompt-box", "glass-player", "motion-disclosure", "gallery-recipes-inputs", ...presets];
const configs = [
  { next: "16.3.0", tailwindcss: "3.4.17", plugin: "tailwindcss" },
  { next: "16.4.3", tailwindcss: "4.3.3", plugin: "@tailwindcss/postcss" },
];
const render = `"use client";

import { useState } from "react";
import { InputsExample } from "@/components/sapienx-motion/recipes/inputs";
import { TabPill } from "@/components/sapienx-motion/motion-selector";
import { ActionOutcome } from "@/components/sapienx-motion/feedback-actions";
import { LetterLimit } from "@/components/sapienx-motion/text-fields";
import { CardDeck } from "@/components/sapienx-motion/deck-and-page";
import { PromptBox } from "@/components/sapienx-motion/composer";
import { TimeScrubber } from "@/components/sapienx-motion/audio-tools";
import { MotionDisclosure } from "@/components/sapienx-motion/motion-disclosure";

import { SlidingTabPill } from "@/components/sapienx-motion/presets/showcase/sliding-tab-pill";
import { LoadingOutcome } from "@/components/sapienx-motion/presets/showcase/loading-outcome";
import { ExpandableRoom } from "@/components/sapienx-motion/presets/showcase/expandable-room";
import { MorphDropdown } from "@/components/sapienx-motion/presets/showcase/morph-dropdown";
import { FeaturedProfile } from "@/components/sapienx-motion/presets/showcase/featured-profile";
import { DestinationDeck } from "@/components/sapienx-motion/presets/showcase/destination-deck";

export function Specimens() {
  const [caption, setCaption] = useState("");
  const [prompt, setPrompt] = useState("");
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  return <div>
    <TabPill label="Notes" options={[{ value: "today", label: "Today", panel: <p>Field report</p> }]} />
    <ActionOutcome state="idle" label="Waiting" />
    <LetterLimit label="Caption" value={caption} onValueChange={setCaption} limit={10} describe={n => n + " remaining"} />
    <CardDeck label="Records" cards={[{ id: "one", title: "Ridge" }, { id: "two", title: "River" }]} index={index} onIndexChange={setIndex}
      previousLabel="Previous" nextLabel="Next" describe={(n, total) => n + " of " + total} />
    <PromptBox label="Prompt" value={prompt} onValueChange={setPrompt} onSubmit={() => setPrompt("")} pending={false}
      onStop={() => {}} sendLabel="Send" stopLabel="Stop" />
    <TimeScrubber label="Seek" duration={120} elapsed={seconds} format={n => n + " seconds"} onSeek={setSeconds} />
    <InputsExample id="designbookmark-jelly-slider" initialConfig={{ elasticity: .44 }} />
    <SlidingTabPill /><LoadingOutcome state="idle" onStart={() => {}} /><ExpandableRoom /><MorphDropdown /><FeaturedProfile /><DestinationDeck />
    <MotionDisclosure label="Read more"><p>Full field notes.</p></MotionDisclosure>
  </div>;
}
`;

for (const { next, tailwindcss, plugin } of configs) {
  const scratch = await mkdtemp(join(tmpdir(), "motionux-next-"));
  const write = (file, data) => writeFile(join(scratch, file), data);
  const run = (bin, args) => {
    const result = spawnSync(bin, args, { cwd: scratch, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
    if (result.status !== 0) throw new Error(`${bin} ${args.join(" ")} exited with ${result.status}`);
  };
  try {
    await mkdir(join(scratch, "app"));
    await write("package.json", JSON.stringify({ name: "motionux-next-consumer", private: true, dependencies: {
      next, react: "19.3.1", "react-dom": "19.3.1",
    }, devDependencies: {
      typescript: "5.9.3", "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/node": "24.19.2",
      tailwindcss, postcss: "^8.5.0", ...(plugin === "tailwindcss" ? {} : { [plugin]: tailwindcss }),
    } }));
    await write("components.json", JSON.stringify({ $schema: "https://ui.shadcn.com/schema.json", style: "new-york", rsc: true, tsx: true,
      tailwind: { config: tailwindcss.startsWith("3.") ? "tailwind.config.cjs" : "", css: "app/globals.css", baseColor: "neutral", cssVariables: true, prefix: "" },
      aliases: { components: "@/components", ui: "@/components/ui", lib: "@/lib", utils: "@/lib/utils", hooks: "@/hooks" },
    }));
    await write("tsconfig.json", JSON.stringify({ compilerOptions: { strict: true, paths: { "@/*": ["./*"] } } }));
    await write("postcss.config.mjs", `export default { plugins: { "${plugin}": {} } };\n`);
    if (plugin === "tailwindcss") await write("tailwind.config.cjs", 'module.exports = { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"] };\n');
    await write("app/globals.css", plugin === "tailwindcss" ? "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" : '@import "tailwindcss";\n');
    await write("app/layout.tsx", 'import "./globals.css";\nimport type { ReactNode } from "react";\nexport default function Layout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n');
    await write("app/page.tsx", 'import { Specimens } from "./specimens";\nexport default function Page() { return <main><h1 className="text-lg">MotionUX consumer smoke</h1><Specimens /></main>; }\n');
    await write("app/specimens.tsx", render);
    run("npm", ["install", "--no-audit", "--no-fund"]);
    const addresses = entries.map(id => `SapienXai/MotionUX/${id}#${pin}`);
    run(cli, ["add", "--dry-run", ...addresses]);
    run(cli, ["add", "--yes", ...addresses]);
    run(join(scratch, "node_modules/.bin/next"), ["build"]);
    const html = await readFile(join(scratch, ".next/server/app/index.html"), "utf8");
    if (!html.includes("MotionUX consumer smoke") || !html.includes("Field report") || !["Emma Carter", "Premium Room", "Santorini"].every(text => html.includes(text))) throw new Error("Missing SSR output.");
    console.log(`Next ${next} / Tailwind ${tailwindcss}: installed and prerendered ${entries.length} registry items.`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
