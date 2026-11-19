"use client";

import { useLayoutEffect, useRef } from "react";
import { galleryOrigin, isGalleryPath } from "../../../../../lib/studio-bridge";

export function GalleryFrame({ src }: { src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useLayoutEffect(() => {
    const path = "/" + window.location.search;
    if (!frame.current || !isGalleryPath(path)) return;
    // A restored route can reuse its original server payload. The browser URL
    // also records the filters and specimen opened since that payload rendered.
    const restored = new URL(path, galleryOrigin).href;
    if (frame.current.src !== restored) frame.current.src = restored;
  }, [src]);
  return <iframe ref={frame} className="studio-discover" src={src}
    title="MotionUX Gallery, Playground and My Library" referrerPolicy="no-referrer" />;
}
