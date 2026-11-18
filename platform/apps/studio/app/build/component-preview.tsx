"use client";

import { Layers3, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CompositionComponent } from "./component-picker";
import { useStudioCopy } from "./kinetic-ui";

function PreviewFrame({ component }: { component: CompositionComponent & { preview: { slug: string; pin: string } } }) {
  const t = useStudioCopy();
  const iframe = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!iframe.current || event.source !== iframe.current.contentWindow || event.origin !== "null") return;
      if (event.data?.motionuxLocalSource === "ready") setStatus("ready");
      if (event.data?.motionuxLocalSource === "failed") setStatus("unavailable");
    }
    window.addEventListener("message", receive);
    setMounted(true);
    const timeout = window.setTimeout(() => setStatus((value) => value === "loading" ? "unavailable" : value), 12_000);
    return () => {
      window.removeEventListener("message", receive);
      window.clearTimeout(timeout);
    };
  }, []);
  const query = new URLSearchParams({ item: component.preview.slug, pin: component.preview.pin, view: "picker" });
  return <div className="compose-preview-frame" data-preview-status={status}>
    {mounted && <iframe ref={iframe}
      src={`http://127.0.0.1:5199/v10/build-preview/${encodeURIComponent(component.id)}?${query}`}
      title={component.title + t(" interactive preview", " etkileşimli önizleme")} sandbox="allow-scripts" referrerPolicy="no-referrer"
      allow="fullscreen 'none'; camera 'none'; microphone 'none'; geolocation 'none'" hidden={status === "unavailable"} />}
    {status !== "ready" && <div className="compose-preview-placeholder" role="status">
      {status === "loading" && <LoaderCircle size={18} aria-hidden="true" />}
      <span>{status === "loading" ? t("Loading original preview…", "Orijinal önizleme yükleniyor…") : t("The original preview couldn’t load.", "Orijinal önizleme yüklenemedi.")}</span>
    </div>}
  </div>;
}

export function ComponentPreview({ components, focused, onFocus }: {
  components: CompositionComponent[]; focused?: string; onFocus: (id: string) => void;
}) {
  const t = useStudioCopy();
  const [reload, setReload] = useState(0);
  const component = components.find(({ id }) => id === focused) ?? components.at(-1);
  return <section className="kinetic-composition-preview" aria-labelledby="compose-preview-title">
    <header>
      <div><h2 id="compose-preview-title">{t("Composition preview", "Kompozisyon önizlemesi")}</h2>
        {component && <p>{component.title} · {component.provider}</p>}</div>
      {component?.preview && <button type="button" className="kinetic-icon" aria-label={t("Reload component preview", "Bileşen önizlemesini yenile")}
        title={t("Reload component preview", "Bileşen önizlemesini yenile")} onClick={() => setReload(reload + 1)}><RotateCcw size={16} aria-hidden="true" /></button>}
      {!component && <span className="kinetic-badge">{t("Awaiting sources", "Kaynak seçimi")}</span>}
    </header>
    <div className="kinetic-preview-surface">
      {component?.preview ? <PreviewFrame key={component.id + ":" + reload} component={{ ...component, preview: component.preview }} /> :
        <div className="kinetic-preview-empty">
          <div className="kinetic-source-art" aria-hidden="true"><div><Layers3 size={37} strokeWidth={1.15} /></div></div>
          <strong>{component ? t("Preview unavailable", "Önizleme kullanılamıyor") : t("Your sources appear here", "Kaynakların burada görünür")}</strong>
          <p>{component ? t("This source has no prepared preview.", "Bu kaynağın hazır önizlemesi yok.") : t("Select components to explore them before building.", "Üretime başlamadan önce bileşenleri seçip dene.")}</p>
        </div>}
    </div>
    {components.length > 0 ? <div className="kinetic-preview-switch" role="group" aria-label={t("Choose a selected component to preview", "Önizlenecek bileşeni seç")}>
      {components.map(({ id, title }) => <button className="kinetic-button" type="button" key={id} aria-pressed={id === component?.id} onClick={() => onFocus(id)}>{title}</button>)}
    </div> : <p className="kinetic-composition-note"><Sparkles size={14} aria-hidden="true" />{t("Build can also look up sources from your brief.", "Build, fikrine göre kaynak da bulabilir.")}</p>}
  </section>;
}
