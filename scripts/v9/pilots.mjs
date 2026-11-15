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
      "class-variance-authority": "0.7.1",
    },
    support: { "lib/utils.ts": "lib/utils.ts" },
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
      clsx: "2.1.1", "tailwind-merge": "3.5.0", "lucide-react": "0.555.0",
    },
    support: {
      "packages/smoothui-utils/cn.ts": "lib/utils.ts",
      "packages/smoothui/components/ai-core/index.tsx": "components/smoothui/ai-core/index.tsx",
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
  ];
  const smoothui = [
    ["exposure-slider", "smoothui-exposure-slider"], ["ai-task-list", "smoothui-task-list"], ["music-toggle", "smoothui-music-toggle"],
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
        galleryId: id === "kokonut" ? "kokonut-" + (legacyId ?? slug) : legacyId ?? "smoothui-new-" + slug,
      });
    }
  }
}

export const originalEntry = (provider, slug) => provider === "kokonut"
  ? `components/kokonutui/${slug}.tsx` : `packages/smoothui/components/${slug}/index.tsx`;
export const destination = (provider, slug) => provider === "kokonut"
  ? originalEntry(provider, slug) : `components/smoothui/${slug}/index.tsx`;
