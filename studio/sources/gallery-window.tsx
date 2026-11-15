import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from "react";
import type { OriginalCard } from "./local";

const rowGap = 14;
const minimumOverscan = 280;
const maximumOverscan = 640;

export type GalleryReturn = { id: string; top: number; offset?: number };
export type GalleryJump = { index: number; edge: "first" | "last" };
type Row = { key: string; items: OriginalCard[]; top: number; height: number };
type Range = { first: number; last: number };

function rowAt(rows: Row[], point: number) {
  let first = 0;
  let last = rows.length - 1;
  while (first < last) {
    const middle = Math.floor((first + last + 1) / 2);
    if (rows[middle].top <= point) first = middle;
    else last = middle - 1;
  }
  return first;
}

function windowRange(grid: HTMLElement, rows: Row[]): Range {
  const top = -grid.getBoundingClientRect().top;
  const overscan = Math.max(minimumOverscan, Math.min(maximumOverscan, window.innerHeight * .55));
  return { first: rowAt(rows, top - overscan), last: rowAt(rows, top + window.innerHeight + overscan) };
}

export function useGalleryWindow(grid: RefObject<HTMLDivElement | null>, items: OriginalCard[], retained: ReadonlySet<string>, restore?: GalleryReturn) {
  const [size, setSize] = useState({ width: 0, columns: 1, extra: 106 });
  const [range, setRange] = useState<Range>({ first: 0, last: 5 });
  const [measurements, setMeasurements] = useState(() => ({ width: 0, rows: new Map<string, number>() }));
  const [keyboardRow, setKeyboardRow] = useState<GalleryJump>();
  const restored = useRef<GalleryReturn | undefined>(undefined);
  const rowNodes = useRef(new Map<string, HTMLElement>());
  const rowObserver = useRef<ResizeObserver | undefined>(undefined);
  const adjustment = useRef(0);
  const resizeAnchor = useRef<{ id: string; offset: number } | undefined>(undefined);
  const reported = useRef({ width: 0, heights: new Map<string, number>() });
  const layout = useMemo(() => {
    const rows: Row[] = [];
    const byId = new Map<string, number>();
    let height = 0;
    for (let index = 0; index < items.length; index += size.columns) {
      const entries = items.slice(index, index + size.columns);
      const key = entries.map(item => item.id).join(" ");
      for (const item of entries) byId.set(item.id, rows.length);
      const measured = measurements.width === size.width ? measurements.rows.get(key) : undefined;
      const rowHeight = measured ?? Math.max(...entries.map(item => item.preview.height)) + size.extra;
      rows.push({ key, items: entries, top: height, height: rowHeight });
      height += rowHeight + rowGap;
    }
    return { rows, byId, height: Math.max(0, height - rowGap) };
  }, [items, size, measurements]);
  const visibleLayout = useRef(layout);

  useLayoutEffect(() => {
    const container = grid.current;
    if (!container) return;
    let previousWidth = 0;
    const measure = () => {
      const width = Math.round(container.getBoundingClientRect().width);
      if (!width || width === previousWidth) return;
      const columns = Number(getComputedStyle(container).getPropertyValue("--mx-original-columns")) || 1;
      const extra = matchMedia("(pointer: coarse), (max-width: 600px)").matches ? 116 : 96;
      const top = -container.getBoundingClientRect().top;
      const rows = visibleLayout.current.rows;
      const row = rows[rowAt(rows, top)];
      if (previousWidth && top > 0 && row) resizeAnchor.current = { id: row.items[0].id, offset: row.top - top };
      previousWidth = width;
      setSize(current => current.width === width && current.columns === columns && current.extra === extra ? current : { width, columns, extra });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [grid, items.length > 0]);

  const updateRange = useCallback(() => {
    if (!grid.current || !visibleLayout.current.rows.length) return;
    const next = windowRange(grid.current, visibleLayout.current.rows);
    setRange(previous => previous.first === next.first && previous.last === next.last ? previous : next);
  }, [grid]);

  useLayoutEffect(() => {
    visibleLayout.current = layout;
    const anchor = resizeAnchor.current;
    if (anchor) {
      const row = layout.byId.get(anchor.id);
      const container = grid.current;
      if (row !== undefined && container) window.scrollBy({
        top: container.getBoundingClientRect().top + layout.rows[row].top - anchor.offset,
        behavior: "instant",
      });
      resizeAnchor.current = undefined;
      adjustment.current = 0;
    }
    if (adjustment.current) {
      window.scrollBy({ top: adjustment.current, behavior: "instant" });
      adjustment.current = 0;
    }
    updateRange();
  }, [grid, layout, updateRange]);

  useLayoutEffect(() => {
    let ticket = 0;
    const schedule = () => {
      if (ticket) return;
      ticket = requestAnimationFrame(() => { ticket = 0; updateRange(); });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    rowObserver.current = new ResizeObserver(entries => {
      const container = grid.current;
      if (!container) return;
      if (Math.round(container.getBoundingClientRect().width) !== size.width) return;
      if (reported.current.width !== size.width) reported.current = { width: size.width, heights: new Map() };
      const current = visibleLayout.current;
      const firstVisible = rowAt(current.rows, -container.getBoundingClientRect().top);
      let changed = false;
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const index = Number(node.dataset.galleryRow);
        const row = current.rows[index];
        if (!row || rowNodes.current.get(row.key) !== node) continue;
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (Math.abs((reported.current.heights.get(row.key) ?? row.height) - height) < .25) continue;
        if (index < firstVisible) adjustment.current += height - row.height;
        reported.current.heights.delete(row.key);
        reported.current.heights.set(row.key, height);
        changed = true;
      }
      // Filter and sort combinations can produce a different grouping of the same cards.
      while (reported.current.heights.size > 1200) reported.current.heights.delete(reported.current.heights.keys().next().value!);
      if (changed) setMeasurements({ width: size.width, rows: new Map(reported.current.heights) });
    });
    for (const node of rowNodes.current.values()) rowObserver.current.observe(node);
    return () => {
      rowObserver.current?.disconnect();
      rowObserver.current = undefined;
      cancelAnimationFrame(ticket);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [grid, size.width, updateRange]);

  const registerRow = useCallback((key: string, node: HTMLDivElement | null) => {
    const previous = rowNodes.current.get(key);
    if (previous) rowObserver.current?.unobserve(previous);
    if (node) {
      rowNodes.current.set(key, node);
      rowObserver.current?.observe(node);
    } else rowNodes.current.delete(key);
  }, []);

  const restoreRow = restored.current !== restore && restore?.id ? layout.byId.get(restore.id) : undefined;
  const rendered = new Set<number>();
  for (let index = range.first; index <= range.last && index < layout.rows.length; index++) rendered.add(index);
  for (const id of retained) {
    const row = layout.byId.get(id);
    if (row !== undefined) rendered.add(row);
  }
  if (restoreRow !== undefined) rendered.add(restoreRow);
  if (keyboardRow && layout.rows[keyboardRow.index]) rendered.add(keyboardRow.index);

  useLayoutEffect(() => {
    const container = grid.current;
    if (!container || !restore || restored.current === restore || !layout.rows.length || !size.width) return;
    const link = container.querySelector<HTMLElement>(`[data-original-card="${CSS.escape(restore.id)}"] .mx-open-playground`);
    // The saved card's viewport offset survives unmeasured rows and different column counts.
    const target = link?.closest("[data-original-card]");
    const top = target && restore.offset !== undefined ? window.scrollY + target.getBoundingClientRect().top - restore.offset : restore.top;
    window.scrollTo({ top, behavior: "instant" });
    link?.focus({ preventScroll: true });
    restored.current = restore;
    updateRange();
  }, [grid, layout, restore, size.width, updateRange]);

  useLayoutEffect(() => {
    if (!keyboardRow) return;
    const row = layout.rows[keyboardRow.index];
    const element = row && rowNodes.current.get(row.key);
    const controls = element?.querySelectorAll<HTMLElement>(
      '[data-original-card] a[href], [data-original-card] button:not(:disabled, [data-gallery-jump]), [data-original-card] [data-preview-state="ready"] iframe',
    );
    const control = controls?.[keyboardRow.edge === "first" ? 0 : controls.length - 1];
    control?.focus();
    updateRange();
    setKeyboardRow(undefined);
  }, [keyboardRow, layout, updateRange]);

  return {
    height: layout.height, rendered: [...rendered].sort((a, b) => a - b).map(index => ({ index, ...layout.rows[index] })),
    rowCount: layout.rows.length, columns: size.columns, registerRow, focusRow: setKeyboardRow,
  };
}

export function GalleryRow({ row, register, children }: {
  row: Row & { index: number }; register: (key: string, node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const ref = useCallback((node: HTMLDivElement | null) => register(row.key, node), [row.key, register]);
  return <div role="presentation" className="mx-originals-row" ref={ref} data-gallery-row={row.index} style={{ top: row.top }}>
    {children}
  </div>;
}
