export const hours = ["08", "09", "10", "11", "12", "13", "14"];
export const label = "Atölye için tercih ettiğiniz başlama saati";
export function Picker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div><label htmlFor="hours">{label}</label>
    <select id="hours" value={value} onChange={event => onChange(event.currentTarget.value)}>
      {hours.map(hour => <option value={hour} key={hour}>{hour}:00</option>)}
    </select>
  </div>;
}
