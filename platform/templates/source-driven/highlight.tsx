import { createElement, type CSSProperties, type ReactNode } from "react";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import javascript from "@shikijs/langs/javascript";
import typescript from "@shikijs/langs/typescript";
import tsx from "@shikijs/langs/tsx";
import json from "@shikijs/langs/json";
import light from "@shikijs/themes/github-light";
import dark from "@shikijs/themes/github-dark";
import { transformerNotationDiff, transformerNotationFocus, transformerNotationHighlight } from "@shikijs/transformers";

type Node = ReturnType<HighlighterCore["codeToHast"]>["children"][number];
const languages: Record<string, string> = { js: "javascript", javascript: "javascript", ts: "typescript", typescript: "typescript", tsx: "tsx", json: "json" };
let highlighter: Promise<HighlighterCore> | undefined;

function render(node: Node, key: number): ReactNode {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || !["pre", "code", "span"].includes(node.tagName)) return null;
  const classes = node.properties.class ?? node.properties.className;
  const className = typeof classes === "string" ? classes : Array.isArray(classes) ? classes.join(" ") : undefined;
  const style: Record<string, string> = {};
  for (const declaration of String(node.properties.style ?? "").split(";")) {
    const [name, value] = declaration.split(":");
    if (!value || !/^(?:#[\da-f]{3,8}|bold|normal|italic|underline|line-through)$/i.test(value.trim())) continue;
    if (name === "color" || name.startsWith("--shiki-")) style[name] = value;
    if (name === "background-color") style.backgroundColor = value;
    if (name === "font-weight") style.fontWeight = value;
    if (name === "font-style") style.fontStyle = value;
    if (name === "text-decoration") style.textDecoration = value;
  }
  return createElement(node.tagName, {
    key, className, style: style as CSSProperties, tabIndex: node.tagName === "pre" ? 0 : undefined,
  }, node.children.map(render));
}

export async function highlight(code: string, language: string) {
  const lang = Object.hasOwn(languages, language) ? languages[language] : null;
  if (!lang || code.length > 32_000) return null;
  highlighter ??= createHighlighterCore({
    langs: [javascript, typescript, tsx, json], themes: [light, dark], engine: createJavaScriptRegexEngine(),
  });
  const tree = (await highlighter).codeToHast(code, {
    lang, themes: { light: "github-light", dark: "github-dark" },
    transformers: [transformerNotationHighlight({ matchAlgorithm: "v3" }), transformerNotationDiff({ matchAlgorithm: "v3" }),
      transformerNotationFocus({ matchAlgorithm: "v3" })],
  });
  return tree.children.map(render);
}
