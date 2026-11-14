import templates from "../../metadata/usage-templates.json";
import type { Config } from "./controls";

type Template = {
  setup: string;
  suffix: string;
  attributes: { key: string; text: string }[];
  component: string;
};
const entries: Record<string, Template | undefined> = templates;

export function configuredUsage(id: string, config: Config) {
  const template = entries[id];
  if (!template || !Object.keys(config).length) return undefined;
  const { attributes, component, setup, suffix } = template;
  const values = new Map(Object.entries(config));
  const next = (key: string) => {
    const value = values.get(key);
    values.delete(key);
    return value;
  };
  let tail = suffix;
  const children = next("children");
  const first = next("firstLabel");
  const optionDisabled = ["designbookmark-tab-pill", "kokonut-morph-popover", "designbookmark-spring-dropdown",
    "designbookmark-dynamic-menu", "kokonut-toolbar"].includes(id) ? next("disabled") : undefined;
  const structured = new Map<string, string>();
  if (id === "designbookmark-tab-pill" && (first !== undefined || optionDisabled !== undefined)) {
    structured.set("options", `[{ value: "0", label: ${JSON.stringify(first ?? "Overview")}, panel: <p>An open studio</p> },
    { value: "1", label: "Notes", disabled: ${optionDisabled ?? false}, panel: <p>Working notes</p> },
    { value: "2", label: "Files", panel: <p>Project files</p> }]`);
  }
  if (id === "designbookmark-rubber-dock" && first !== undefined) structured.set("links",
    `[{href: "#explore", label: ${JSON.stringify(first)}, icon: <span>E</span>}, {href: "#capture", label: "Capture", icon: <span>C</span>}, {href: "#archive", label: "Archive", icon: <span>A</span>}, {href: "#send", label: "Send", icon: <span>S</span>}]`);
  if (id === "kokonut-stack-panel" && first !== undefined) structured.set("panels",
    `[{value: "0", title: ${JSON.stringify(first)}, body: <p>Working notes for the spring collection.</p>}, {value: "1", title: "Release schedule", body: <p>Review takes place on Thursday.</p>}]`);
  if (typeof optionDisabled === "boolean" && id === "kokonut-toolbar") structured.set("tools",
    `[{id: "left", label: "Align left", icon: <span>⇤</span>, disabled: ${optionDisabled}}, {id: "bold", label: "Bold", icon: <strong>B</strong>, pressed: bold}]`);
  if (typeof optionDisabled === "boolean" && id !== "designbookmark-tab-pill" && id !== "kokonut-toolbar") {
    const labels = id === "kokonut-morph-popover" ? ["Copy link", "Open folder", "View access"] :
      id === "designbookmark-dynamic-menu" ? ["Duplicate", "Archive", "Pin to project"] : ["Newest", "Oldest", "Pinned"];
    structured.set("actions", JSON.stringify(labels.map((label, i) => ({ id: String(i), label, disabled: i === 2 && optionDisabled }))));
  }
  if (children !== undefined) {
    if (id === "designbookmark-roll-links" || id === "designbookmark-magnetic-button") tail = `>{${JSON.stringify(children)}}</${component}>;${suffix.slice(suffix.indexOf(";", suffix.indexOf("</")) + 1)}`;
  }
  if (id === "designbookmark-loading-to-success" && values.has("state") && !values.has("label")) {
    const words = { idle: "Ready", pending: "Waiting for response", success: "Demo confirmed", error: "Demo failed" };
    const state = values.get("state");
    if (typeof state === "string" && Object.hasOwn(words, state)) values.set("label", words[state as keyof typeof words]);
  }
  const printed = attributes.filter(attribute => !values.has(attribute.key) && !structured.has(attribute.key)).map(attribute => attribute.text);
  for (const [key, value] of values) printed.push(`${key}={${JSON.stringify(value)}}`);
  for (const [key, source] of structured) printed.push(`${key}={${source}}`);
  return [setup, component, ...printed.map(value => " " + value), tail].join("");
}
