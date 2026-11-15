import { useState } from "react";

export function RoomBrowser() {
  const [view, setView] = useState("details");
  return <main>
    <h1>Room browser</h1>
    <button type="button" onClick={() => setView("amenities")}>View amenities</button>
    {view === "amenities" && <details><summary>See room amenities</summary><p>Garden access</p></details>}
  </main>;
}
