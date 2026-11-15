import { useState } from "react";
import { Picker } from "./Picker";
export function Screen() {
  const [time, setTime] = useState("09");
  return <main><header><p>Atölye Takvimi</p><h1>Başlangıç saatini seç</h1></header>
    <Picker value={time} onChange={setTime} />
    <p aria-live="polite">Seçilen saat <strong>{time}:00</strong></p>
  </main>;
}
