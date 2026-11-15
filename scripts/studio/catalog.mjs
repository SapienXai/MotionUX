import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { safeFile, safeRelative } from "./v11/paths.mjs";
import { extendSources, sources } from "../v9/pilots.mjs";

export const vault = resolve(".motionux-v9");
export const lastCatalog = resolve(vault, "catalog.last-good.json");
extendSources(JSON.parse(await readFile("metadata/v9-provider-candidates.json", "utf8")));
const groups = [...Object.keys(sources), "designbookmark"];
const references = new Set(JSON.parse(await readFile("metadata/v9-reference.json", "utf8")).items.map(item => item.id));

export const preparation = "Run npm run sources:inspect, then npm run sources:prepare and retry npm run studio.";

const labelGroups = {
  navigation: "Navigation", button: "Buttons", buttons: "Buttons", cards: "Cards", inputs: "Inputs",
  gestures: "Gestures", feedback: "Feedback", text: "Text", texts: "Text", textanimations: "Text", ai: "AI", media: "Media",
};
const featured = [
  ["designbookmark-morph-island", "Gestures", 300], ["smoothui-siri-orb", "AI", 300], ["kokonut-wheel-picker", "Inputs", 300],
  ["magicui-animated-beam", "Effects", 326], ["smoothui-scrubber", "Inputs", 300], ["designbookmark-goo-menu", "Gestures", 300],
  ["kokonut-smooth-tab", "Navigation", 300], ["reactbits-electric-border", "Effects", 460], ["designbookmark-swipe-deck", "Cards", 350],
  ["motionprimitives-morphing-dialog", "Cards", 330], ["designbookmark-glass-lens", "Gestures", 330], ["smoothui-new-book", "Cards", 330],
  ["designbookmark-jelly-slider", "Inputs", 320], ["kokonut-morph-popover", "Navigation", 320], ["designbookmark-pull-cord", "Gestures", 320],
  ["designbookmark-spring-dropdown", "Navigation", 320], ["magicui-spinning-text", "Text", 320], ["kokonut-glass-player", "Media", 320],
  ["smoothui-new-liquid-metal", "Effects", 656], ["motionprimitives-text-morph", "Text", 320], ["smoothui-new-duration-picker", "Inputs", 400],
];
const classifications = new Map(featured.map(([id, category, height], index) => [id, { category, height, rank: index }]));
const relatedCategories = {
  Cards: "expand-card fan-cards stat-card profile-card notifications glow-hover-card parallax-layers transition-panel switchboard-card animated-list",
  Buttons: "command-button hold-to-publish magnetic-button copy-button like-burst interactive-hover-button ripple-button",
  Navigation: "file-tree social-selector toolbar animated-background",
  Inputs: "exposure-slider task-list float-input animated-tags pixel-brush-canvas",
  AI: "agent-avatar ai-approval ai-context-meter",
  Text: "animated-shiny-text number-ticker text-reveal animated-number text-roll gravity-letters perspective-text-3d scroll-reveal-paragraph wave-text",
  Media: "music-toggle infinite-slider",
  Gestures: "magnetic magnet power-off-slide drawing-cursor cursor-image-trail",
  Feedback: "dither-chart contribution-graph unlock-face-id mac-terminal morph-icon morph-toggle",
};
for (const [category, slugs] of Object.entries(relatedCategories)) {
  for (const slug of slugs.split(" ")) classifications.set(slug, { category });
}

const tallPreviews = {
  "smoothui-new-glow-hover-card": 580, "smoothui-new-ai-approval": 554, "smoothui-new-pixel-brush-canvas": 550,
  "kokonut-page-flip": 542, "smoothui-new-parallax-layers": 532, "smoothui-new-svg-clip-mask": 532,
  "magicui-animated-list": 532, "magicui-orbiting-circles": 532, "smoothui-new-agent-avatar": 468,
  "smoothui-new-switchboard-card": 442, "smoothui-unlock-face-id": 446, "smoothui-new-perspective-text-3d": 436,
  "smoothui-new-animated-tags": 432, "smoothui-new-magnetic-field": 406,
};

export async function loadCatalog({ diagnostics = [] } = {}) {
  const catalog = new Map();
  let previous = [];
  try {
    const value = JSON.parse(await readFile(lastCatalog, "utf8"));
    if (Array.isArray(value)) previous = value;
  } catch (error) { if (error.code !== "ENOENT") diagnostics.push("Saved catalog recovery index could not be read."); }
  for (const group of groups) {
    let items;
    try {
      items = JSON.parse(await readFile(resolve(vault, "runtime", group, "catalog.json"), "utf8"));
      if (!Array.isArray(items)) throw new Error("Invalid catalog");
    } catch {
      diagnostics.push(group + ": prepared catalog missing or unreadable");
      items = [];
    }
    const present = new Set(items.flatMap(item => typeof item?.id === "string" ? [item.id] : []));
    for (const item of [...items, ...previous.filter(item => item?.group === group && !present.has(item.id))]) {
      if (item?.group !== group || typeof item.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(item.id) ||
        catalog.has(item.id) || typeof item.slug !== "string" || !/^[a-z0-9-]+$/.test(item.slug) ||
        !safeRelative(item.entry) || typeof item.installRecipe !== "string" || !Array.isArray(item.codeFiles) ||
        !item.codeFiles.every(file => file && safeRelative(file.path) && /^[0-9a-f]{64}$/.test(file.sha256)) ||
        !Array.isArray(item.scenes) || !item.dependencies || Array.isArray(item.dependencies) ||
        typeof item.category !== "string" || typeof item.title !== "string" || !/^[0-9a-f]{64}$/.test(item.upstreamHash)) {
        diagnostics.push(group + ": ignored malformed or duplicate catalog entry");
        continue;
      }
      const sourceKind = item.format === "html" ? "html" : "react";
      const root = resolve(vault, "runtime", group);
      const installRecipe = resolve(vault, "registry", basename(item.installRecipe));
      const installed = await isFile(installRecipe) && await isFile(resolve(root, "installed", "dist", "index.html"));
      const rawDocument = sourceKind === "html" ? item.slug + ".html" : "index.html";
      const available = present.has(item.id) && installed && await isFile(resolve(root, "original", "dist", rawDocument)) &&
        await hashMatches(resolve(root, "original"), item.entry, item.upstreamHash);
      const style = classifications.get(item.id) ?? classifications.get(item.slug);
      const category = style?.category ?? labelGroups[item.category.toLowerCase()] ?? "Effects";
      catalog.set(item.id, {
        ...item, installRecipe, category, sourceKind, installed, availability: available ? "ready" : "unavailable",
        legacyId: references.has(item.id) ? item.id : undefined,
        tags: [...new Set([category, item.category, sourceKind === "html" ? "HTML demo" : "React"])],
        preview: { height: style?.height ?? tallPreviews[item.id] ?? item.height ?? 360, rank: style?.rank },
        visualAcceptance: "pending",
      });
    }
  }
  return catalog;
}

async function hashMatches(root, file, expected) {
  try {
    const bytes = await readFile(await safeFile(root, file, vault));
    return createHash("sha256").update(bytes).digest("hex") === expected;
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error.code)) return false;
    throw error;
  }
}

async function isFile(path) {
  try { return (await lstat(path)).isFile(); }
  catch (error) { if (["ENOENT", "ENOTDIR"].includes(error.code)) return false; throw error; }
}

export function catalogSummary(item) {
  const { id, slug, group, provider, title, category, format, height, demoURL, sourceURL, upstreamHash, upstreamCommit,
    fidelityStatus, sourceKind, installed, availability, legacyId, tags, preview, visualAcceptance } = item;
  return { id, slug, group, provider, title, category, format, height, demoURL, sourceURL, upstreamHash, upstreamCommit,
    fidelityStatus, sourceKind, installed, availability, legacyId, tags, preview, visualAcceptance };
}
