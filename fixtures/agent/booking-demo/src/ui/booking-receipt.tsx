"use client";

import { useId, useRef, useState } from "react";
import type { Booking } from "@/lib/booking-ledger";

export function BookingReceipt({ booking }: { booking: Booking }) {
  const [compact, setCompact] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  return <article className="receipt grid gap-4 rounded-receipt border p-5 sm:p-8" aria-labelledby={headingId}>
    <h1 className="font-heading text-3xl text-house" id={headingId} tabIndex={-1} ref={heading}>Your reservation</h1>
    {booking.status === "confirmed" && <p role="status">Your room is confirmed.</p>}
    {booking.status === "pending" && <p>We are waiting for the reservation to be confirmed.</p>}
    {booking.status === "failed" && <p role="alert">We could not find your reservation.</p>}
    {booking.status === "cancelled" && <p role="status">This reservation was cancelled.</p>}
    <details>
      <summary>Room details</summary>
      <p>{booking.room}</p>
      {!compact && <p>Check-in starts at 3 pm.</p>}
      <button type="button" aria-pressed={compact} onClick={() => setCompact(value => !value)}>Compact room details</button>
    </details>
    <button type="button" onClick={() => heading.current?.focus()}>Return to reservation heading</button>
  </article>;
}
