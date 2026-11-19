"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import type { CompositionComponent } from "./component-picker";
import { StudioSheet, useStudioCopy } from "./kinetic-ui";
import { attachmentIssue } from "./source-attachment";
import { sourceRequest } from "./source-job";

type Project = { id: string; name: string; revision: number | null; codeSources?: string[]; updatedAt?: number };

export function ProjectSourceHandoff({ dialog, selected, onDismiss, onOpen }: {
  dialog: RefObject<HTMLDialogElement | null>;
  selected: CompositionComponent[];
  onDismiss: () => void;
  onOpen: (id: string, sources: string[]) => void;
}) {
  const t = useStudioCopy();
  const [projects, setProjects] = useState<Project[]>();
  const [unavailable, setUnavailable] = useState(false);
  const [retry, setRetry] = useState(0);
  const open = selected.length > 0;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void sourceRequest<Project[]>("", "GET", undefined, controller.signal).then((rows) => {
      setProjects(rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
    }, () => { if (!controller.signal.aborted) setUnavailable(true); });
    return () => controller.abort();
  }, [open, retry]);
  const messages = {
    format: t("This project cannot add original sources.", "Bu proje orijinal kaynak eklemeyi desteklemiyor."),
    rights: t("This selection includes a local-only source or design reference.", "Seçimde yalnızca yerel kullanım için bir kaynak ya da tasarım referansı var."),
    installed: t("A selected component is already in this project.", "Seçilen bileşenlerden biri bu projede zaten var."),
    limit: t("This selection exceeds the remaining source slots.", "Seçim kalan kaynak yuvalarını aşıyor."),
  };
  return <div className="kinetic"><StudioSheet dialog={dialog} title={t("Use in project", "Projede kullan")} onDismiss={() => {
    setProjects(undefined);
    setUnavailable(false);
    onDismiss();
  }}>
    <div className="unified-handoff">
      <p>{t("Open a compatible project and attach your selection to its next revision.", "Uyumlu bir projeyi aç ve seçimini sonraki revizyona ekle.")}</p>
      {open && <ul className="unified-handoff-sources" aria-label={t("Selected components", "Seçilen bileşenler")}>
        {selected.map(({ id, title }) => <li key={id}>{title}</li>)}
      </ul>}
      {unavailable ? <p role="alert">{t("Projects could not load.", "Projeler yüklenemedi.")} <button type="button" className="kinetic-button"
        onClick={() => { setUnavailable(false); setRetry((value) => value + 1); }}>{t("Retry", "Yeniden dene")}</button></p> :
        !projects ? <p role="status">{t("Loading projects…", "Projeler yükleniyor…")}</p> :
        !projects.length ? <p>{t("You have no saved projects yet.", "Henüz kayıtlı bir projen yok.")}</p> :
        <ul className="unified-handoff-projects" aria-label={t("Saved projects", "Kayıtlı projeler")}>
          {projects.map(({ id, name, revision, codeSources }) => {
            const issue = attachmentIssue(selected, codeSources);
            return <li key={id}>
              <span><strong dir="auto">{name}</strong>
                <small>{revision === null ? t("Needs recovery", "Kurtarma gerekiyor") :
                  issue ? messages[issue] : t("Saved revision ", "Kayıtlı revizyon ") + revision}</small></span>
              {!issue && <button type="button" className="kinetic-button" aria-label={t("Open ", "Aç ") + name}
                onClick={() => {
                  dialog.current?.close();
                  onOpen(id, selected.map(({ id }) => id));
                }}>{t("Open", "Aç")} <ArrowRight size={15} aria-hidden="true" /></button>}
            </li>;
          })}
        </ul>}
    </div>
  </StudioSheet></div>;
}
