"use client";

import { useState } from "react";

export default function RoomHold() {
  const [selected, setSelected] = useState("morning");
  return <main><h1>Arrival window</h1>
    <label htmlFor="window">Arrival window</label>
    <select id="window" value={selected} onChange={event => setSelected(event.target.value)}>
      <option value="morning">Morning</option><option value="afternoon">Afternoon</option>
    </select>
  </main>;
}
