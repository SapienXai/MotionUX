export type Row = { id: string; title: string; body: string };
export function DisclosureView({ rows }: { rows: Row[] }) {
  return <section aria-label="Konaklama ayrıntıları">
    {rows.map(row => <details key={row.id}><summary>{row.title}</summary><p>{row.body}</p></details>)}
  </section>;
}
