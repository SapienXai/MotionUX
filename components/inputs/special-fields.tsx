"use client";

import { FilePlus2, PenLine, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import "./special-fields.css";

type FileError = { file: File; reason: "type" | "size" | "count" };
function accepted(file: File, accept: string) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return !accept || accept.toLowerCase().split(",").some((part) => {
    const token = part.trim();
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return token === type;
  });
}

export function FileDrop({ label, hint, accept = "", maxBytes = Infinity, multiple = false, disabled, files, onFiles, describeError }: {
  label: string; hint?: string; accept?: string; maxBytes?: number; multiple?: boolean; disabled?: boolean;
  files: readonly File[]; onFiles: (files: File[]) => void; describeError: (error: FileError) => string;
}) {
  const id = useId();
  const [errors, setErrors] = useState<FileError[]>([]);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  function choose(candidates: readonly File[]) {
    if (disabled || !candidates.length) return;
    const next: File[] = [];
    const issues: FileError[] = [];
    for (const file of candidates) {
      if (!accepted(file, accept)) issues.push({ file, reason: "type" });
      else if (file.size > maxBytes) issues.push({ file, reason: "size" });
      else if (!multiple && next.length) issues.push({ file, reason: "count" });
      else next.push(file);
    }
    setErrors(issues);
    if (next.length) onFiles(next);
  }
  return <div data-mx-special="file">
    <label className="mx-file-zone" data-dragging={dragging} data-disabled={Boolean(disabled)}
      onDragEnter={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        depth.current++;
        setDragging(true);
      }} onDragOver={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }} onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false); }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        choose(Array.from(event.dataTransfer.files));
      }}>
      <input type="file" accept={accept} multiple={multiple} disabled={disabled} aria-label={label}
        aria-describedby={hint ? id : undefined} onChange={(event) => {
          choose(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }} />
      <FilePlus2 size={27} aria-hidden="true" /><strong>{label}</strong>{hint && <span id={id}>{hint}</span>}
    </label>
    <div role="status">
      {files.length > 0 && <ul>{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>}
      {errors.length > 0 && <ul className="mx-file-errors">{errors.map((error, index) => <li key={index}>{describeError(error)}</li>)}</ul>}
    </div>
  </div>;
}

export type CardDetails = { number: string; expiry: string; code: string };
export function CardField({ label, labels, value, onValueChange, namePrefix, disabled, formatCard = (digits) => digits.match(/.{1,4}/g)?.join(" ") ?? "" }: {
  label: string; labels: { number: string; expiry: string; code: string }; value: CardDetails; onValueChange: (value: CardDetails) => void;
  namePrefix?: string; disabled?: boolean; formatCard?: (digits: string) => string;
}) {
  const id = useId();
  function update(field: keyof CardDetails, count: number) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange({ ...value, [field]: event.target.value.replace(/[^0-9]/g, "").slice(0, count) });
    };
  }
  return <fieldset data-mx-special="card" disabled={disabled}><legend>{label}</legend>
    <label htmlFor={id + "-number"}>{labels.number}
      <input id={id + "-number"} name={namePrefix && namePrefix + "-number"} inputMode="numeric" autoComplete="cc-number"
        value={formatCard(value.number)} onChange={update("number", 19)} />
    </label>
    <div className="mx-card-fields">
      <label htmlFor={id + "-expiry"}>{labels.expiry}
        <input id={id + "-expiry"} name={namePrefix && namePrefix + "-expiry"} inputMode="numeric" autoComplete="cc-exp"
          value={value.expiry.length > 2 ? value.expiry.slice(0, 2) + "/" + value.expiry.slice(2) : value.expiry}
          onChange={update("expiry", 4)} />
      </label>
      <label htmlFor={id + "-code"}>{labels.code}
        <input id={id + "-code"} name={namePrefix && namePrefix + "-code"} type="password" inputMode="numeric" autoComplete="cc-csc"
          value={value.code} maxLength={4} onChange={update("code", 4)} />
      </label>
    </div>
  </fieldset>;
}

export type InkPoint = { x: number; y: number };
export function SignaturePad({ label, typeLabel, undoLabel, clearLabel, value, onValueChange, disabled }: {
  label: string; typeLabel: string; undoLabel: string; clearLabel: string; disabled?: boolean;
  value: { typed: string; strokes: readonly (readonly InkPoint[])[] };
  onValueChange: (value: { typed: string; strokes: readonly (readonly InkPoint[])[] }) => void;
}) {
  const id = useId();
  const stroke = useRef<{ pointer: number; points: InkPoint[] } | null>(null);
  const [draft, setDraft] = useState<readonly InkPoint[]>([]);
  function point(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(300, (event.clientX - rect.left) / rect.width * 300)),
      y: Math.max(0, Math.min(120, (event.clientY - rect.top) / rect.height * 120)) };
  }
  function finish(commit: boolean) {
    const current = stroke.current;
    if (!current) return;
    stroke.current = null;
    setDraft([]);
    if (commit && !disabled) onValueChange({ typed: "", strokes: [...value.strokes, current.points] });
  }
  return <fieldset data-mx-special="signature" disabled={disabled}><legend>{label}</legend>
    <div className="mx-signature-surface">
      <PenLine size={14} aria-hidden="true" />
      <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true"
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const points = [point(event)];
          stroke.current = { pointer: event.pointerId, points };
          setDraft(points);
        }}
        onPointerMove={(event) => {
          const current = stroke.current;
          if (!current || current.pointer !== event.pointerId || current.points.length >= 1500) return;
          current.points = [...current.points, point(event)];
          setDraft(current.points);
        }}
        onPointerUp={(event) => { if (stroke.current?.pointer === event.pointerId) finish(true); }}
        onPointerCancel={(event) => { if (stroke.current?.pointer === event.pointerId) finish(false); }}
        onLostPointerCapture={(event) => { if (stroke.current?.pointer === event.pointerId) finish(false); }}>
        {[...value.strokes, draft].map((points, index) => {
          if (!points.length) return null;
          if (points.length === 1) return <circle key={index} cx={points[0].x} cy={points[0].y} r={1.2} fill="currentColor" />;
          return <polyline key={index} points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
            fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
    </div>
    <div className="mx-signature-actions">
      <button type="button" aria-label={undoLabel} disabled={value.strokes.length === 0}
        onClick={() => onValueChange({ ...value, strokes: value.strokes.slice(0, -1) })}><Undo2 size={17} aria-hidden="true" /></button>
      <button type="button" aria-label={clearLabel} disabled={value.strokes.length === 0 && !value.typed}
        onClick={() => onValueChange({ typed: "", strokes: [] })}><RotateCcw size={17} aria-hidden="true" /></button>
    </div>
    <label htmlFor={id}>{typeLabel}<input id={id} value={value.typed} onChange={(event) => onValueChange({ typed: event.target.value, strokes: [] })} /></label>
  </fieldset>;
}

export function WheelPicker({ label, values, value, onValueChange, disabled, name }: {
  label: string; values: readonly { id: string; label: string }[]; value: string; onValueChange: (id: string) => void; disabled?: boolean; name?: string;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const index = values.findIndex((option) => option.id === value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touching = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const element = viewport.current;
    const row = element?.children[index] as HTMLElement | undefined;
    if (element && row && !touching.current) element.scrollTop = row.offsetTop - row.offsetHeight;
  }, [index]);
  return <fieldset data-mx-special="wheel" disabled={disabled}><legend>{label}</legend>
    <div className="mx-wheel-viewport" ref={viewport} onScroll={(event) => {
        if (disabled || !values.length) return;
        const element = event.currentTarget;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          if (touching.current) return;
          const rows = Array.from(element.children) as HTMLElement[];
          const nearest = rows.reduce((best, row, i) =>
            Math.abs(row.offsetTop - row.offsetHeight - element.scrollTop) < Math.abs(rows[best].offsetTop - rows[best].offsetHeight - element.scrollTop) ? i : best, 0);
          if (nearest !== index) onValueChange(values[nearest].id);
        }, 155);
      }} onTouchStart={() => { touching.current = true; }}
      onTouchEnd={() => { touching.current = false; }} onTouchCancel={() => { touching.current = false; }}
      onKeyDown={(event) => {
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || disabled || !values.length) return;
        const next = event.key === "Home" ? 0 : event.key === "End" ? values.length - 1 :
          Math.max(0, Math.min(values.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
        const button = viewport.current?.querySelectorAll("input")[next];
        if (!button) return;
        event.preventDefault();
        onValueChange(values[next].id);
        button.focus({ preventScroll: true });

      }}>
      {values.map((option) => <label key={option.id}>
        <input type="radio" name={name ?? id} value={option.id} checked={value === option.id} onChange={() => onValueChange(option.id)} />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}
