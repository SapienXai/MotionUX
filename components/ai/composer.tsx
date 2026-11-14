"use client";

import { ArrowUp, CornerDownLeft, Square } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import "./composer.css";

export function PromptBox({ label, value, onValueChange, onSubmit, onStop, sendLabel, stopLabel, pending, disabled, error, shortcutHint }: {
  label: string; value: string; onValueChange: (value: string) => void; onSubmit: (value: string) => void; onStop: () => void;
  sendLabel: string; stopLabel: string; pending: boolean; disabled?: boolean; error?: string; shortcutHint?: string;
}) {
  const id = useId();
  function send() {
    const trimmed = value.trim();
    if (trimmed && !pending && !disabled && !error) onSubmit(trimmed);
  }
  return <div data-mx-composer="prompt">
    <label htmlFor={id}>{label}</label>
    <textarea id={id} rows={3} value={value} onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error || shortcutHint ? id + "-hint" : undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
          event.preventDefault(); send();
        }
      }} />
    <div className="mx-composer-actions">
      <small id={id + "-hint"}>{error || shortcutHint}</small>
      {pending ? <button type="button" onClick={onStop}><Square size={16} aria-hidden="true" />{stopLabel}</button> :
        <button type="button" disabled={disabled || !value.trim() || Boolean(error)} onClick={send}><ArrowUp size={16} aria-hidden="true" />{sendLabel}</button>}
    </div>
  </div>;
}

export function GhostSuggestion({ label, value, completion, onValueChange, acceptLabel, disabled }: {
  label: string; value: string; completion?: string; onValueChange: (value: string) => void; acceptLabel: string; disabled?: boolean;
}) {
  const id = useId();
  const [atEnd, setAtEnd] = useState(false);
  const [composing, setComposing] = useState(false);
  const available = atEnd && !composing && !disabled && completion;
  function accept() {
    if (available) onValueChange(value + completion);
  }
  function caretAtEnd(input: HTMLInputElement) {
    return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
  }
  function key(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowRight" || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey ||
      event.nativeEvent.isComposing || composing || disabled || !completion || !caretAtEnd(event.currentTarget)) return;
    event.preventDefault();
    onValueChange(value + completion);
  }
  return <div data-mx-composer="ghost">
    <label htmlFor={id}>{label}</label>
    <input id={id} value={value} disabled={disabled}
      onChange={(event) => { onValueChange(event.target.value); setAtEnd(event.target.selectionStart === event.target.value.length); }}
      onSelect={(event) => setAtEnd(caretAtEnd(event.currentTarget))}
      onKeyUp={(event) => setAtEnd(caretAtEnd(event.currentTarget))}
      onClick={(event) => setAtEnd(caretAtEnd(event.currentTarget))}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => setComposing(false)} onKeyDown={key}
      aria-describedby={available ? id + "-suggestion" : undefined} />
    {available && <div className="mx-ghost-suggestion" id={id + "-suggestion"}>
      <span>{completion}</span><button type="button" onClick={accept}><CornerDownLeft size={15} aria-hidden="true" />{acceptLabel}</button>
    </div>}
  </div>;
}
