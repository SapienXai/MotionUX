export const sources = {
  kokonut: {
    provider: "Kokonut UI",
    repo: "https://github.com/kokonut-labs/kokonutui",
    commit: "d8162dfe2c052a796a74d217b1f06511f213e4e0",
    css: "app/globals.css",
    font: "Geist",
    dependencies: {
      react: "19.2.7", "react-dom": "19.2.7", motion: "12.23.25", "framer-motion": "12.23.25",
      "motion-dom": "12.23.23", "motion-utils": "12.23.6",
      "lucide-react": "0.556.0", clsx: "2.1.1", "tailwind-merge": "3.4.0",
      "fumadocs-ui": "16.19.0", "tw-animate-css": "1.4.0", "@fontsource-variable/geist": "5.2.8",
      "class-variance-authority": "0.7.1", "@radix-ui/react-slot": "1.2.4",
    },
    support: { "lib/utils.ts": "lib/utils.ts", "components/ui/button.tsx": "components/ui/button.tsx", "components/ui/card.tsx": "components/ui/card.tsx" },
    items: [
      { slug: "smooth-tab", title: "Swipe Tabs", category: "Navigation", docs: "navigation/smooth-tab", galleryId: "kokonut-smooth-tab" },
      { slug: "wheel-picker", title: "Wheel Picker", category: "Inputs", docs: "inputs/wheel-picker", galleryId: "kokonut-wheel-picker" },
    ],
  },
  smoothui: {
    provider: "SmoothUI",
    repo: "https://github.com/educlopez/smoothui",
    commit: "e4b0b44a5c640ec217800eb664db18879822cd6c",
    css: "apps/docs/app/smoothui.css",
    dependencies: {
      react: "19.2.6", "react-dom": "19.2.6", motion: "12.38.0", "framer-motion": "12.38.0",
      clsx: "2.1.1", "tailwind-merge": "3.5.0", "lucide-react": "0.555.0", "class-variance-authority": "0.7.1",
    },
    support: {
      "packages/smoothui-utils/cn.ts": "lib/utils.ts",
      "packages/smoothui/components/ai-core/index.tsx": "components/smoothui/ai-core/index.tsx",
      "packages/smoothui/components/smooth-button/index.tsx": "components/smoothui/smooth-button/index.tsx",
      "packages/smoothui/components/smooth-button/smooth-button.base.tsx": "components/smoothui/smooth-button/smooth-button.base.tsx",
    },
    items: [
      { slug: "siri-orb", title: "Siri Orb", category: "AI", galleryId: "smoothui-siri-orb", scenes: ["Idle", "Listening", "Thinking", "Streaming", "Done", "Error"] },
      { slug: "scrubber", title: "Scrubber", category: "Inputs", galleryId: "smoothui-scrubber" },
    ],
  },
};

export function extendSources(discovery) {
  const kokonut = [
    ["detent-dial"], ["ai-loading", "agent-steps"], ["hold-button"], ["marker-text"],
    ["slide-to-confirm"], ["notification-stack"], ["ai-voice", "voice-input"],
    ["ai-tool-approval", "tool-approval"], ["page-flip"], ["signature-pad"], ["undo-button"],
    ["card-field"], ["stack-panel"], ["type-writer", "typewriter"], ["ai-text-loading", "thinking-text"],
    ["bell-button"], ["morph-popover"], ["command-button"],
    ["boarding-pass"], ["dynamic-text"], ["toolbar"], ["cart-button"], ["liquid-glass-card", "glass-player"],
  ];
  const smoothui = [
    ["exposure-slider", "smoothui-exposure-slider"], ["ai-task-list", "smoothui-task-list"], ["music-toggle", "smoothui-music-toggle"],
    ["unlock-face-id", "smoothui-unlock-face-id"],
    ["agent-avatar"], ["ai-approval"], ["ai-context-meter"], ["animated-tags"], ["book"], ["contribution-graph"],
    ["cursor-image-trail"], ["dither-chart"], ["drawing-cursor"], ["duration-picker"], ["emboss-surface"],
    ["file-tree"], ["float-input"], ["folder-reveal"], ["glow-hover-card"], ["gravity-letters"],
    ["liquid-metal"], ["mac-terminal"], ["magnetic-field"], ["morph-icon"], ["morph-toggle"],
    ["parallax-layers"], ["perspective-text-3d"], ["pixel-brush-canvas"], ["power-off-slide"],
    ["progressive-blur"], ["scroll-reveal-paragraph"], ["social-selector"], ["squircle"],
    ["svg-clip-mask"], ["switchboard-card"], ["wave-text"],
  ];
  for (const [id, entries] of Object.entries({ kokonut, smoothui })) {
    const provider = discovery.providers.find(entry => entry.id === id);
    if (provider.revision !== sources[id].commit) throw new Error("Provider catalog must match the pinned source revision: " + id);
    for (const [slug, legacyId] of entries) {
      const candidate = provider.candidates.find(item => item.id === slug);
      if (!candidate) throw new Error("Missing official candidate: " + slug);
      const prefix = id === "kokonut" ? "https://kokonutui.com/docs/" : "https://smoothui.dev/docs/components/";
      sources[id].items.push({
        slug, title: candidate.title, category: candidate.category, docs: candidate.demo?.replace(prefix, ""),
        example: id === "kokonut" && slug === "dynamic-text" ? "components/mdx/demos/dynamic-text-demo.tsx" : undefined,
        galleryId: id === "kokonut" ? "kokonut-" + (legacyId ?? slug) : legacyId ?? "smoothui-new-" + slug,
      });
    }
  }
  addProvider(discovery, "magicui", {
    css: "apps/www/styles/globals.css", license: "LICENSE.md", font: "Geist",
    dependencies: {
      react: "19.3.1", "react-dom": "19.3.1", motion: "12.43.0", "framer-motion": "12.43.0",
      "motion-dom": "12.43.0", "motion-utils": "12.39.0", clsx: "2.1.1", "tailwind-merge": "3.7.0",
      "lucide-react": "0.544.0", "@radix-ui/react-icons": "1.3.2", "tw-animate-css": "1.4.0", "@fontsource-variable/geist": "5.2.8",
    },
    support: { "apps/www/registry/lib/utils.ts": "lib/utils.ts" },
  }, [
    ["animated-shiny-text"], ["animated-beam"], ["animated-list"], ["interactive-hover-button"],
    ["number-ticker"], ["orbiting-circles"], ["ripple-button"], ["spinning-text"], ["text-reveal"],
  ]);
  addProvider(discovery, "reactbits", {
    license: "LICENSE.md",
    dependencies: {
      react: "19.1.1", "react-dom": "19.1.1", motion: "12.23.21", "framer-motion": "12.23.21",
      "motion-dom": "12.23.21", "motion-utils": "12.23.6",
    },
    support: {},
  }, [
    ["electric-border", "Animations/ElectricBorder"], ["glare-hover", "Animations/GlareHover"], ["magnet", "Animations/Magnet"],
    ["star-border", "Animations/StarBorder"], ["shiny-text", "TextAnimations/ShinyText"],
    ["decrypted-text", "TextAnimations/DecryptedText"], ["blur-text", "TextAnimations/BlurText"],
  ]);
  addProvider(discovery, "motionprimitives", {
    css: "app/globals.css", license: null, font: "Inter",
    types: { "@types/react": "18.3.6", "@types/react-dom": "18.3.0" },
    dependencies: {
      react: "18.3.1", "react-dom": "18.3.1", motion: "11.12.0", "framer-motion": "11.12.0",
      clsx: "2.1.1", "tailwind-merge": "2.6.0", "lucide-react": "0.400.0", "react-use-measure": "2.1.1",
      "@tailwindcss/typography": "0.5.16", "tailwindcss-animate": "1.0.7", "@fontsource-variable/inter": "5.3.0",
    },
    support: { "lib/utils.ts": "lib/utils.ts", "hooks/useClickOutside.tsx": "hooks/useClickOutside.tsx" },
  }, [
    ["animated-number", "animated-number-counter"], ["spotlight", "spotlight-basic"], ["text-morph", "text-morph-button"],
    ["text-roll", "text-roll-basic"], ["morphing-dialog", "morphing-dialog-basic-1"], ["infinite-slider", "infinite-slider-basic"],
    ["magnetic", "magnetic-basic"], ["border-trail", "border-trail-card-1"], ["animated-background", "animated-tabs"],
    ["transition-panel", "transition-panel-tabs"],
  ]);
}

function addProvider(discovery, id, spec, entries) {
  if (sources[id]) return;
  const provider = discovery.providers.find(entry => entry.id === id);
  sources[id] = {
    ...spec, provider: provider.name, repo: provider.repoURL, commit: provider.revision,
    items: entries.map(([slug, example]) => {
      const candidate = provider.candidates.find(item => item.id === slug);
      if (id === "reactbits") {
        const name = example.split("/").at(-1);
        const usage = name[0].toLowerCase() + name.slice(1);
        return { slug, original: `src/ts-default/${example}/${name}.tsx`, target: `components/reactbits/${slug}/${name}.tsx`,
          usageSource: `src/constants/code/${example.split("/")[0]}/${usage}Code.js`,
          title: candidate.title, category: candidate.category, demoURL: candidate.demo, galleryId: id + "-" + slug };
      }
      const original = candidate.source.split("/blob/" + provider.revision + "/")[1];
      return {
        slug, original, target: original.replace(/^apps\/www\//, ""),
        example: id === "magicui" ? `apps/www/registry/example/${slug}-demo.tsx` : `app/docs/${slug}/${example}.tsx`,
        title: candidate.title, category: candidate.category, demoURL: candidate.demo, galleryId: id + "-" + slug,
      };
    }),
  };
}

export const originalEntry = (provider, slug) => provider === "kokonut"
  ? `components/kokonutui/${slug}.tsx` : `packages/smoothui/components/${slug}/index.tsx`;
export const destination = (provider, slug) => provider === "kokonut"
  ? originalEntry(provider, slug) : `components/smoothui/${slug}/index.tsx`;
