const additions = {
  kokonut: [
    { slug: "seat-map", category: "Inputs", height: 550 },
    { slug: "marking-menu", category: "Navigation", height: 420 },
    { slug: "receipt-printer", category: "Cards", height: 500 },
    { slug: "slot-picker", category: "Inputs", height: 530 },
    { slug: "timezone-planner", category: "Inputs", height: 535 },
  ],
  smoothui: [
    { slug: "emoji-reaction", category: "Feedback", height: 440 },
    { slug: "pinned-list", category: "Navigation", height: 510 },
    { slug: "animated-stepper", category: "Inputs", height: 535 },
  ],
  magicui: [
    { slug: "interactive-grid-pattern", category: "Effects", height: 460 },
    { slug: "animated-circular-progress-bar", category: "Feedback", height: 320 },
    { slug: "code-comparison", category: "Text", height: 545 },
    { slug: "confetti", category: "Feedback", height: 525 },
  ],
};

export const editionIDs = Object.entries(additions).flatMap(([provider, items]) => items.map(item => provider + "-" + item.slug));
export const editionGroups = Object.keys(additions).map(provider => "v12-" + provider);

export function editionSources(discovery, providers) {
  return Object.fromEntries(Object.entries(additions).map(([upstreamId, entries]) => {
    const spec = providers[upstreamId];
    const official = discovery.providers.find(provider => provider.id === upstreamId);
    if (official?.revision !== spec.commit || official?.repoURL !== spec.repo) {
      throw new Error("V12 source revision does not match the official inventory: " + upstreamId);
    }
    const support = { ...spec.support };
    if (upstreamId === "magicui") support["apps/www/components/ui/button.tsx"] = "components/ui/button.tsx";
    const extraDependencies = upstreamId === "magicui" ? {
      "canvas-confetti": "1.9.4", "shiki": "4.6.0", "@shikijs/transformers": "4.6.0",
      "@radix-ui/react-slot": "1.5.0", "class-variance-authority": "0.7.1", "@types/canvas-confetti": "1.9.0",
    } : {};
    return ["v12-" + upstreamId, {
      ...spec, upstreamId, support, dependencies: { ...spec.dependencies, ...extraDependencies },
      items: entries.map(entry => {
        const match = official.candidates.find(candidate => candidate.id === entry.slug);
        const galleryId = upstreamId + "-" + entry.slug;
        const sourcePrefix = spec.repo + "/blob/" + spec.commit + "/";
        if (!match?.source?.startsWith(sourcePrefix) || !match.demo?.startsWith("https:") ||
          spec.items.some(item => item.galleryId === galleryId || item.slug === entry.slug)) {
          throw new Error("Official V12 source missing or previously installed: " + galleryId);
        }
        const original = match.source.slice(sourcePrefix.length);
        const target = upstreamId === "smoothui" ? original.replace(/^packages\/smoothui\/components\//, "components/smoothui/") : original.replace(/^apps\/www\//, "");
        return { ...entry, galleryId, original, target, title: match.title, demoURL: match.demo,
          example: upstreamId === "magicui" ? `apps/www/registry/example/${entry.slug}-demo.tsx`
            : upstreamId === "smoothui" ? `apps/docs/examples/${entry.slug}.tsx` : undefined,
          support: upstreamId === "smoothui" ? ["lib/utils.ts", ...Object.values(spec.support).filter(file => file.includes("/smooth-button/"))] :
            upstreamId === "magicui" && entry.slug === "confetti" ? ["lib/utils.ts", "components/ui/button.tsx"] : ["lib/utils.ts"],
          dependencies: upstreamId === "magicui" && entry.slug !== "confetti" && entry.slug !== "code-comparison" ? spec.dependencies :
            upstreamId === "magicui" && entry.slug === "code-comparison" ? { ...spec.dependencies, shiki: "4.6.0", "@shikijs/transformers": "4.6.0" } :
            { ...spec.dependencies, ...extraDependencies },
        };
      }),
    }];
  }));
}
