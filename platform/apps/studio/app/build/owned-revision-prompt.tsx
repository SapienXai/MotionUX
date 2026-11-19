"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { OwnedRevisionControls } from "@motionux/build-canvas";
import { useStudioCopy } from "./kinetic-ui";
import { sourceRequest, SourceJobStatus, useSourceJob } from "./source-job";

export function OwnedRevisionPrompt({ saved, disabled, accept, pending }: OwnedRevisionControls) {
  const t = useStudioCopy();
  const fieldId = useId();
  const [brief, setBrief] = useState("");
  const operation = useSourceJob(saved.id, async (id) => {
    accept(await sourceRequest("/" + id));
    setBrief("");
  }, ({ brief }) => setBrief(brief));
  useEffect(() => {
    pending(operation.active);
    return () => pending(false);
  }, [pending, operation.active]);

  return <section className="kinetic-revision unified-owned-revision" aria-label={t("Change project content", "Proje içeriğini düzenle")}>
    <SourceJobStatus operation={operation} />
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!disabled && brief.trim().length >= 12 && !operation.active)
        void operation.start(brief, { project: saved.id, revision: saved.revision });
    }}>
      <label htmlFor={fieldId}><Sparkles size={15} aria-hidden="true" />{t("Revise with Codex", "Codex ile düzenle")}</label>
      <div className="kinetic-revision-input">
        <textarea id={fieldId} rows={2} maxLength={3200} minLength={12} required dir="auto"
          aria-describedby={fieldId + "-help"} value={brief} disabled={operation.active}
          placeholder={t("Ask to rename a section or improve its copy…", "Bir bölümü yeniden adlandırmayı veya metnini iyileştirmeyi iste…")}
          onChange={(event) => setBrief(event.target.value)} />
        <button type="submit" className="kinetic-button kinetic-primary" aria-label={t("Revise saved application", "Kayıtlı uygulamayı düzenle")}
          disabled={disabled || operation.active || brief.trim().length < 12}><ArrowRight size={18} aria-hidden="true" /></button>
      </div>
      <p id={fieldId + "-help"}>{disabled ? t("Save the current draft before asking for a revision.", "Revizyon istemeden önce taslağı kaydet.") :
        t("Edit page names, headings, descriptions and existing action labels.", "Sayfa adlarını, başlıkları, açıklamaları ve mevcut düğme metinlerini düzenle.")}</p>
    </form>
  </section>;
}
