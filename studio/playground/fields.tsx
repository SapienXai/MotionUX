import { useId } from "react";
import type { Config, Field, Value } from "./controls";

export function Fields({ fields, config, update, heading }: {
  fields: readonly Field[]; config: Config; update: (key: string, value: Value) => void; heading: string;
}) {
  const id = useId();
  return <fieldset className="mx-config"><legend>{heading}</legend>{fields.map(field => {
    const key = `${id}-${field.key}`;
    const value = config[field.key] ?? field.default;
    if (field.type === "boolean") return <div className="mx-config-check" key={key}>
      <input id={key} type="checkbox" checked={Boolean(value)} onChange={event => update(field.key, event.target.checked)} />
      <label htmlFor={key}>{field.label}</label>
    </div>;
    return <div className="mx-config-field" key={key}><label htmlFor={key}>{field.label}</label>
      {field.type === "select" ? <select id={key} value={String(value)} onChange={event => update(field.key, event.target.value)}>
        {field.options.map(option => <option key={option}>{option}</option>)}
      </select> : field.type === "number" ? <input id={key} type="number" min={field.min} max={field.max} step={field.step}
        value={typeof value === "number" ? value : field.default} onChange={event => update(field.key, event.target.valueAsNumber)} /> :
        <input id={key} type="text" maxLength={field.maxLength} value={String(value)} onChange={event => update(field.key, event.target.value)} />}
    </div>;
  })}</fieldset>;
}
