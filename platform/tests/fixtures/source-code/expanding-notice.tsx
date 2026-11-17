"use client";
import { useState } from "react";

export type ExpandingNoticeProps = { title: string; detail: string; onOpen?: () => void };
export default function ExpandingNotice({ title, detail, onOpen }: ExpandingNoticeProps) {
  const [open, setOpen] = useState(false);
  return <div className="fixture-source">
    <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) onOpen?.(); }}>{title}</button>
    {open && <p>{detail}</p>}
  </div>;
}
