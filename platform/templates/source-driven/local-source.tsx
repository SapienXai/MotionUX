"use client";

import { useEffect, useRef, useState } from "react";

export function LocalSourceFrame({ src, title, height = 380 }: { src: string; title: string; height?: number }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source === iframe.current?.contentWindow && event.origin === "null" &&
          event.data?.motionuxLocalSource === "ready") setStatus("ready");
    }
    window.addEventListener("message", receive);
    setActive(true);
    const timer = window.setTimeout(() => setStatus((value) => value === "loading" ? "unavailable" : value), 12_000);
    return () => { window.removeEventListener("message", receive); window.clearTimeout(timer); };
  }, []);
  return <div data-local-source-frame={status}>
    {active && <iframe ref={iframe} src={src} title={title} sandbox="allow-scripts" referrerPolicy="no-referrer"
      allow="fullscreen 'none'; camera 'none'; microphone 'none'; geolocation 'none'"
      style={{ display: "block", width: "100%", height: Math.max(240, Math.min(720, Number.isFinite(height) ? height : 380)), border: 0 }} />}
    {status === "unavailable" && <p role="status">Local source unavailable. Check that MotionUX Gallery is running and reopen Run.</p>}
  </div>;
}
