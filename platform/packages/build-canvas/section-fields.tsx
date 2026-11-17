"use client";

import { useState } from "react";
import { Columns3, ListPlus } from "lucide-react";
import {
  availableSections, defaultSectionLayout, sectionFromRecipe, sectionModes,
  type Block, type Document, type RecipeId, type SectionLayout,
} from "@motionux/build-core";
import { RenderBlock } from "@motionux/app-blocks";
import { AppFrame } from "@motionux/app-blocks/frame";
import { MarketingBlockView, MarketingSurface } from "@motionux/app-blocks/marketing";

const bands = ["base", "tablet", "mobile"] as const;
type Band = typeof bands[number];
export function SectionLayoutFields({ value, device, onChange }: {
  value: SectionLayout;
  device: "desktop" | "tablet" | "mobile";
  onChange: (value: SectionLayout) => void;
}) {
  const [chosen, select] = useState<Band>();
  const band = chosen ?? (device === "desktop" ? "base" : device);
  const active = value[band];
  const inheritedColumns = band === "base" ? value.base.columns : band === "tablet" ? Math.min(value.base.columns, 2) : 1;
  function update(patch: Partial<SectionLayout["base"]>) {
    onChange({ ...value, [band]: { ...active, ...patch } });
  }
  return (
    <div className="creator-settings-fields">
      <label>Section layout
        <select value={value.mode} onChange={(event) => {
          const mode = sectionModes.find((item) => item === event.target.value);
          if (mode) onChange({ ...value, mode });
        }}>
          <option value="stack">Stack</option><option value="grid">Responsive grid</option>
          <option value="split">Equal split</option><option value="content-aside">Content and aside</option>
        </select>
      </label>
      <div className="creator-field-pair">
        <label>Width
          <select value={value.width} onChange={(event) => {
            const width = (["reading", "content", "wide"] as const).find((item) => item === event.target.value);
            if (width) onChange({ ...value, width });
          }}>
            <option value="reading">Reading</option><option value="content">Content</option><option value="wide">Wide</option>
          </select>
        </label>
        <label>Surface
          <select value={value.surface} onChange={(event) => {
            const surface = (["clear", "raised", "tinted"] as const).find((item) => item === event.target.value);
            if (surface) onChange({ ...value, surface });
          }}>
            <option value="clear">Clear</option><option value="raised">Raised</option><option value="tinted">Tinted</option>
          </select>
        </label>
      </div>
      <fieldset className="creator-responsive-fields">
        <legend><Columns3 size={14} aria-hidden="true" /> Responsive</legend>
        <label>Editing size
          <select value={band} onChange={(event) => select(bands.find((item) => item === event.target.value))}>
            <option value="base">Desktop base · ≥900 px</option>
            <option value="tablet">Tablet · 640–899 px</option>
            <option value="mobile">Mobile · &lt;640 px</option>
          </select>
        </label>
        <label>Columns
          <select
            disabled={value.mode === "stack" || (band === "base" && value.mode !== "grid")}
            value={active?.columns ?? ""}
            onChange={(event) => update({ columns: Number(event.target.value) })}
          >
            {band !== "base" && active?.columns === undefined && <option value="">Automatic · {inheritedColumns}</option>}
            {Array.from({ length: band === "base" ? 4 : band === "tablet" ? 3 : 2 }, (_, index) => index + 1).map((columns) =>
              <option key={columns} value={columns}>{columns}</option>)}
          </select>
        </label>
        <div className="creator-field-pair">
          <label>Gap
            <select value={active?.gap ?? value.base.gap} onChange={(event) => {
              const gap = (["tight", "normal", "loose"] as const).find((item) => item === event.target.value);
              if (gap) update({ gap });
            }}>
              <option value="tight">8 px</option><option value="normal">16 px</option><option value="loose">28 px</option>
            </select>
          </label>
          <label>Align
            <select value={active?.align ?? value.base.align} onChange={(event) => {
              const align = (["start", "center", "stretch"] as const).find((item) => item === event.target.value);
              if (align) update({ align });
            }}>
              <option value="start">Top</option><option value="center">Center</option><option value="stretch">Stretch</option>
            </select>
          </label>
        </div>
        <button type="button" className="build-text-button" disabled={band !== "base" && !active}
          onClick={() => onChange({ ...value, [band]: band === "base" ? defaultSectionLayout.base : undefined })}>
          {band === "base" ? "Reset desktop base" : "Reset this override"}
        </button>
      </fieldset>
    </div>
  );
}
export function SectionLibrary({ document, route, mediaBase, query, insert }: {
  document: Document;
  route: string;
  mediaBase: string;
  query: string;
  insert: (recipe: RecipeId) => void;
}) {
  const [selected, select] = useState<RecipeId>();
  const tr = document.locale === "tr";
  const index = tr ? 1 : 0;
  const matches = availableSections(document.data).filter(([key, recipe]) =>
    [key, ...recipe.name, recipe.purpose].join(" ").toLocaleLowerCase(document.locale).includes(query.toLocaleLowerCase(document.locale).trim()));
  let count = 0;
  const sample = selected && matches.some(([key]) => key === selected) ?
    sectionFromRecipe(document, selected, () => "b-sample-" + ++count) : undefined;
  return (
    <div className="creator-sections">
      {matches.length === 0 && <p role="status" className="build-hint">{tr ? "Eşleşen bölüm yok." : "No matching sections."}</p>}
      {matches.map(([key, recipe]) => (
        <div className="creator-section-card" key={key}>
          <button type="button" className="creator-section-choice" aria-expanded={selected === key}
            onClick={() => select(selected === key ? undefined : key)}>
            <strong>{recipe.name[index]}</strong>
            <span>{recipe.purpose}</span>
          </button>
          {sample && selected === key && <SectionSample document={document} route={route} mediaBase={mediaBase} block={sample} />}
          <button type="button" className="build-button" aria-label={(tr ? "Ekle — " : "Insert ") + recipe.name[index]}
            onClick={() => insert(key)}>
            <ListPlus size={15} aria-hidden="true" /> {tr ? "Ekle" : "Insert"}
          </button>
        </div>
      ))}
    </div>
  );
}

function SectionSample({ document, route, mediaBase, block }: {
  document: Document; route: string; mediaBase: string; block: Block;
}) {
  return <div className="creator-section-sample" aria-hidden="true" inert>
    {document.template === "hotel-marketing" ?
      <MarketingSurface document={document} route={route} mediaBase={mediaBase} thumbnail>
        <MarketingBlockView block={block} />
      </MarketingSurface> :
      <AppFrame document={document} route={route} device="mobile" studio>
        <RenderBlock block={block} />
      </AppFrame>}
  </div>;
}
