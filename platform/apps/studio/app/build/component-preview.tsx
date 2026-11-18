"use client";

import { Layers3, LoaderCircle, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CompositionComponent } from "./component-picker";

function PreviewFrame({ component }: { component: CompositionComponent & { preview: { slug: string; pin: string } } }) {
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
      title={component.title + " interactive preview"} sandbox="allow-scripts" referrerPolicy="no-referrer"
      allow="fullscreen 'none'; camera 'none'; microphone 'none'; geolocation 'none'" hidden={status === "unavailable"} />}
    {status !== "ready" && <div className="compose-preview-placeholder" role="status">
      {status === "loading" && <LoaderCircle size={18} aria-hidden="true" />}
      <span>{status === "loading" ? "Loading original preview…" : "The original preview couldn’t load."}</span>
    </div>}
  </div>;
}

export function ComponentPreview({ components, focused, onFocus }: {
  components: CompositionComponent[]; focused?: string; onFocus: (id: string) => void;
}) {
  const [reload, setReload] = useState(0);
  const component = components.find(({ id }) => id === focused) ?? components.at(-1);
  if (!component) return null;
  return <section className="compose-component-preview" aria-labelledby="compose-preview-title">
    <div className="compose-preview-heading">
      <div className="compose-preview-icon"><Play size={15} aria-hidden="true" /></div>
      <div><h2 id="compose-preview-title">Component preview</h2><p>{component.title} · {component.provider}</p></div>
      {component.preview && <button type="button" className="build-icon-button" aria-label="Reload component preview"
        title="Reload component preview" onClick={() => setReload(reload + 1)}><RotateCcw size={16} aria-hidden="true" /></button>}
    </div>
    <div className="compose-preview-switch" role="group" aria-label="Choose a selected component to preview">
      {components.map(({ id, title }) => <button type="button" key={id} aria-pressed={id === component.id} onClick={() => onFocus(id)}>{title}</button>)}
    </div>
    {component.preview ? <PreviewFrame key={component.id + ":" + reload} component={{ ...component, preview: component.preview }} /> :
      <div className="compose-preview-placeholder">
        <Layers3 size={18} aria-hidden="true" /><span>This source has no prepared interactive preview.</span>
      </div>}
  </section>;
}
