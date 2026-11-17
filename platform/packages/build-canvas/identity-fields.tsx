"use client";

import { useState } from "react";
import { Paintbrush } from "lucide-react";
import {
  designDensity, designPresets, designRadius, designType, identityAttributes,
  identityFor, presetDetails, type DesignIdentity, type Document,
} from "@motionux/build-core";

export function IdentityFields({ document, onChange, preview }: {
  document: Document;
  onChange: (edit: (document: Document) => Document) => void;
  preview: (identity?: DesignIdentity) => void;
}) {
  const tr = document.locale === "tr";
  const copy = (en: string, turkish: string) => tr ? turkish : en;
  const [preset, pick] = useState<DesignIdentity["preset"]>(document.identity?.preset ?? "editorial");
  const identity = document.identity;
  const sample = identityFor(preset);
  const update = (next?: DesignIdentity) => {
    preview();
    onChange((previous) => ({ ...previous, identity: next }));
  };
  return (
    <details className="build-panel-section creator-settings">
      <summary><Paintbrush size={15} aria-hidden="true" /> {copy("Design identity", "Tasarım kimliği")}</summary>
      <div className="creator-settings-fields">
        <label>{copy("Design preset", "Tasarım stili")}
          <select value={preset} onChange={(event) => {
            const next = designPresets.find((value) => value === event.target.value);
            if (next) pick(next);
          }}>
            {designPresets.map((value) => <option key={value} value={value}>{presetDetails[value].name[tr ? 1 : 0]}</option>)}
          </select>
        </label>
        <div className="identity-sample" {...identityAttributes(sample)} data-theme="system">
          <strong>{presetDetails[preset].name[tr ? 1 : 0]}</strong>
          <span>{presetDetails[preset].detail[tr ? 1 : 0]}</span>
        </div>
        <div className="creator-field-actions">
          <button className="build-button" type="button" onClick={() => preview(sample)}>{copy("Preview preset", "Stili önizle")}</button>
          <button className="build-button" type="button" onClick={() => update(sample)}>{copy("Apply preset", "Stili uygula")}</button>
        </div>
        {identity && <>
          <label>{copy("Density", "Yoğunluk")}
            <select value={identity.density} onChange={({ target }) => {
              const density = designDensity.find((value) => value === target.value);
              if (density) update({ ...identity, density });
            }}>{designDensity.map((value) => <option key={value}>{value}</option>)}</select>
          </label>
          <label>{copy("Typography", "Tipografi")}
            <select value={identity.typography} onChange={({ target }) => {
              const typography = designType.find((value) => value === target.value);
              if (typography) update({ ...identity, typography });
            }}>{designType.map((value) => <option key={value}>{value}</option>)}</select>
          </label>
          <label>{copy("Corners", "Köşeler")}
            <select value={identity.radius} onChange={({ target }) => {
              const radius = designRadius.find((value) => value === target.value);
              if (radius) update({ ...identity, radius });
            }}>{designRadius.map((value) => <option key={value}>{value}</option>)}</select>
          </label>
          <button type="button" className="build-text-button" onClick={() => update()}>{copy("Use starter appearance", "Başlangıç görünümünü kullan")}</button>
        </>}
      </div>
    </details>
  );
}
