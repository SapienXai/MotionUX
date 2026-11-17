"use client";
import { useEffect, useState } from "react";
import { settings } from "./config";

// A stable application ID survives visual revisions. Each component owns its typed state.
export function useProjectState<T>(key: string, initial: T, accept: (value: unknown) => value is T) {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<T[]>([]);
  const storage = "motionux:code:" + settings.id + ":" + key;
  useEffect(() => {
    try {
      const bytes = localStorage.getItem(storage);
      if (bytes && bytes.length <= 100_000) {
        const saved = JSON.parse(bytes);
        if (saved.version === 1 && accept(saved.value)) setState(saved.value);
      }
    } catch { /* Invalid data falls back to the declared fictional records. */ }
    setReady(true);
    // The caller's validation function can be inline. Reopen only when its scoped key changes.
  }, [storage]);
  function save(next: T | ((current: T) => T)) {
    setState((current) => {
      const updated = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      if (!accept(updated)) return current;
      const serialized = JSON.stringify({ version: 1, value: updated });
      if (serialized.length > 100_000) return current;
      setHistory((history) => [...history.slice(-19), current]);
      try { localStorage.setItem(storage, serialized); } catch { /* Current view remains usable. */ }
      return updated;
    });
  }
  function undo() {
    const last = history.at(-1);
    if (last === undefined) return;
    setHistory(history.slice(0, -1));
    setState(last);
    try { localStorage.setItem(storage, JSON.stringify({ version: 1, value: last })); } catch { /* Local view is retained. */ }
  }
  return { state, setState: save, undo, canUndo: Boolean(history.length), ready };
}
