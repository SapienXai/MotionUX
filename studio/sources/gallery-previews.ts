import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const previewLimit = 8;

const same = (left: ReadonlySet<string>, right: ReadonlySet<string>) =>
  left.size === right.size && [...left].every(id => right.has(id));

function findStage(element: Element | null, grid: HTMLElement) {
  const stage = element?.closest<HTMLElement>("[data-original-stage]");
  return stage && grid.contains(stage) ? stage : undefined;
}

export function useGalleryPreviews(grid: RefObject<HTMLDivElement | null>, ready: boolean) {
  const [mounted, setMounted] = useState<ReadonlySet<string>>(new Set());
  const [retained, setRetained] = useState<ReadonlySet<string>>(new Set());
  const [rapidScroll, setRapidScroll] = useState(false);
  const stages = useRef(new Map<string, HTMLElement>());
  const observer = useRef<IntersectionObserver | undefined>(undefined);
  const intersecting = useRef(new Set<HTMLElement>());
  const planned = useRef<ReadonlySet<string>>(new Set());
  const schedule = useRef<() => void>(() => {});
  const refresh = useCallback(() => schedule.current(), []);
  const register = useCallback((id: string, node: HTMLDivElement | null) => {
    const previous = stages.current.get(id);
    if (previous) {
      observer.current?.unobserve(previous);
      intersecting.current.delete(previous);
      stages.current.delete(id);
    }
    if (node) {
      stages.current.set(id, node);
      observer.current?.observe(node);
    }
    schedule.current();
  }, []);

  useLayoutEffect(() => {
    const container = grid.current;
    setRapidScroll(false);
    if (!container || !ready) return;
    let ticket = 0;
    let restTimer: ReturnType<typeof setTimeout> | undefined;
    let scrolling = false;
    let movingFast = false;
    let lastScroll = 0;
    let lastPosition = window.scrollY;
    let primed = Boolean(container.querySelector('[data-preview-state="ready"]'));
    const cost = (id: string) => Number(stages.current.get(id)?.dataset.previewCost ?? 0);
    const update = () => {
      if (ticket) return;
      ticket = requestAnimationFrame(() => {
        ticket = 0;
        const active = findStage(document.activeElement, container);
        const focusCard = document.activeElement?.closest<HTMLElement>("[data-original-card]");
        const engaged = new Set<HTMLElement>();
        if (active && document.activeElement instanceof HTMLIFrameElement) engaged.add(active);
        for (const frame of container.querySelectorAll('[data-preview-gesture="true"]')) {
          const stage = findStage(frame, container);
          if (stage) engaged.add(stage);
        }
        const keep = new Set([...engaged].map(stage => stage.dataset.originalStage!));
        if (focusCard?.dataset.originalCard && container.contains(focusCard)) keep.add(focusCard.dataset.originalCard);
        setRetained(previous => same(previous, keep) ? previous : keep);
        const next = new Set<string>();
        if (!document.hidden) {
          const eligible = [...new Set([...engaged, ...intersecting.current])].map(stage => {
            const rect = stage.getBoundingClientRect();
            const overlap = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
            return { id: stage.dataset.originalStage!, coverage: engaged.has(stage) ? Infinity : overlap / rect.height };
          }).filter(candidate => candidate.coverage > 0 && (!scrolling || planned.current.has(candidate.id) || candidate.coverage === Infinity));
          eligible.sort((a, b) => b.coverage - a.coverage);
          let remaining = previewLimit;
          for (const { id } of eligible) {
            const units = cost(id);
            if (!units || units > remaining) continue;
            next.add(id);
            remaining -= units;
            if (!primed && !engaged.size) break;
          }
        }
        if (same(planned.current, next)) return;
        // Commit removals before admissions when both generations would exceed the budget.
        const union = new Set([...planned.current, ...next]);
        const nextCommit = [...union].reduce((sum, id) => sum + cost(id), 0) > previewLimit
          ? new Set([...next].filter(id => planned.current.has(id))) : next;
        planned.current = nextCommit;
        setMounted(nextCommit);
        if (next !== nextCommit) update();
      });
    };
    schedule.current = update;
    observer.current = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const stage = entry.target as HTMLElement;
        if (stages.current.get(stage.dataset.originalStage!) !== stage) continue;
        if (entry.isIntersecting) intersecting.current.add(stage);
        else intersecting.current.delete(stage);
      }
      update();
    });
    for (const stage of stages.current.values()) observer.current.observe(stage);

    const warmup = new MutationObserver(() => {
      if (!container.querySelector('[data-preview-state="ready"], [data-preview-state="failed"]')) return;
      primed = true;
      warmup.disconnect();
      update();
    });
    if (!primed) warmup.observe(container, { childList: true, attributes: true, subtree: true, attributeFilter: ["data-preview-state"] });
    const onRest = () => {
      clearTimeout(restTimer);
      scrolling = false;
      if (movingFast) {
        movingFast = false;
        setRapidScroll(false);
      }
      update();
    };
    const onScrollEnd = () => {
      // Programmatic scroll updates can each emit scrollend, even in a sustained sweep.
      if (performance.now() - lastScroll >= 80) onRest();
    };
    const onScroll = () => {
      scrolling = true;
      lastScroll = performance.now();
      if (!movingFast && Math.abs(window.scrollY - lastPosition) > innerHeight * .4) {
        movingFast = true;
        setRapidScroll(true);
      }
      lastPosition = window.scrollY;
      clearTimeout(restTimer);
      restTimer = setTimeout(onRest, 110);
      update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("blur", update);
    document.addEventListener("focusin", update);
    window.addEventListener("mx-preview-interaction", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.current?.disconnect();
      observer.current = undefined;
      intersecting.current.clear();
      schedule.current = () => {};
      warmup.disconnect();
      clearTimeout(restTimer);
      cancelAnimationFrame(ticket);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("blur", update);
      document.removeEventListener("focusin", update);
      window.removeEventListener("mx-preview-interaction", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [grid, ready]);

  return { mounted, retained, register, refresh, rapidScroll: ready && rapidScroll };
}
