"use client";

import { useEffect, useState, type RefObject } from "react";

export function FrameSize({ frame }: { frame: RefObject<HTMLDivElement | null> }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [frame]);
  return width > 0 && <span className="creator-frame-width" aria-label="Canvas width">{width} px</span>;
}
