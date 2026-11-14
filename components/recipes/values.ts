export type Value = string | number | boolean;
export type Config = Readonly<Record<string, Value>>;

export const stringValue = (config: Config | undefined, key: string) => typeof config?.[key] === "string" ? config[key] : undefined;
export const numberValue = (config: Config | undefined, key: string) => typeof config?.[key] === "number" ? config[key] : undefined;
export const booleanValue = (config: Config | undefined, key: string) => typeof config?.[key] === "boolean" ? config[key] : undefined;
