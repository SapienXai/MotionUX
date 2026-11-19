"use client";

import { useEffect, type RefObject } from "react";

export function useRevisionViewport(prompt: RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    const field = prompt.current;
    const group = field?.parentElement;
    if (!field || !group) return;
    const workspace = field.closest(".kinetic-editor, .kinetic-puck");
    const viewport = window.visualViewport;
    let frame = 0;
    const reveal = () => {
      if (document.activeElement !== field) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== field) return;
        const bar = workspace?.querySelector<HTMLElement>(".unified-source-mobile-nav, .unified-mobile-workspace-nav");
        if (!bar?.offsetHeight) return;
        const viewBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
        const clearance = viewBottom - bar.offsetHeight - 8;
        const hidden = group.getBoundingClientRect().bottom - clearance;
        if (hidden > 0) window.scrollBy({ top: hidden, behavior: "instant" });
      });
    };
    field.addEventListener("focus", reveal);
    window.addEventListener("resize", reveal);
    viewport?.addEventListener("resize", reveal);
    return () => {
      field.removeEventListener("focus", reveal);
      window.removeEventListener("resize", reveal);
      viewport?.removeEventListener("resize", reveal);
      cancelAnimationFrame(frame);
    };
  }, [prompt]);
}
