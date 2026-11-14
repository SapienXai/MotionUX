export type Value = string | number | boolean;
export type Config = Readonly<Record<string, Value>>;
export type Field = { key: string; label: string; section: "Props" | "Variants" | "States" } & (
  { type: "text"; default: string; maxLength: number } |
  { type: "number"; default: number; min: number; max: number; step: number } |
  { type: "boolean"; default: boolean } |
  { type: "select"; default: string; options: readonly string[] }
);
export const text = (key: string, label: string, value: string): Field => ({ key, label, section: "Props", type: "text", default: value, maxLength: 96 });
export const number = (key: string, label: string, value: number, min: number, max: number, step = 1): Field => ({ key, label, section: "Props", type: "number", default: value, min, max, step });
export const flag = (key: string, label: string, value = false, section: Field["section"] = "States"): Field => ({ key, label, section, type: "boolean", default: value });
export const select = (key: string, label: string, value: string, options: readonly string[], section: Field["section"] = "States"): Field => ({ key, label, section, type: "select", options, default: value });

export function cleanConfig(fields: readonly Field[], raw: unknown): Config {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const values = raw as Record<string, unknown>;
  const result: Record<string, Value> = {};
  for (const { key, ...field } of fields) {
    if (!Object.hasOwn(values, key)) continue;
    const value = values[key];
    if (field.type === "text" && typeof value === "string" && value.trim()) result[key] = value.slice(0, field.maxLength);
    if (field.type === "boolean" && typeof value === "boolean") result[key] = value;
    if (field.type === "select" && typeof value === "string" && field.options.includes(value)) result[key] = value;
    if (field.type === "number" && typeof value === "number" && Number.isFinite(value)) result[key] = Math.max(field.min, Math.min(field.max, Number((field.min + Math.round((value - field.min) / field.step) * field.step).toFixed(6))));
  }
  return result;
}
export function readConfig(fields: readonly Field[], input: string | null) {
  if (!input || input.length > 1536) return {};
  try { return cleanConfig(fields, JSON.parse(input)); }
  catch { return {}; }
}
export const stringValue = (config: Config | undefined, key: string) => typeof config?.[key] === "string" ? config[key] : undefined;
export const numberValue = (config: Config | undefined, key: string) => typeof config?.[key] === "number" ? config[key] : undefined;
export const booleanValue = (config: Config | undefined, key: string) => typeof config?.[key] === "boolean" ? config[key] : undefined;

export function example(name: string, module: string, props: Record<string, unknown>, runtime?: { setup: string; handlers: Record<string, string> }) {
  const values = Object.entries(props).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}={${JSON.stringify(value)}}`);
  const handlers = Object.entries(runtime?.handlers ?? {}).map(([key, source]) => `${key}={${source}}`);
  return `"use client";\n\n${runtime ? 'import { useState } from "react";\n' : ""}import { ${name} } from "@/components/sapienx-motion/${module}";\n\nexport function Example() {\n${runtime ? `  ${runtime.setup}\n` : ""}  return <${name} ${[...values, ...handlers].join(" ")} />;\n}`;
}
