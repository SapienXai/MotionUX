"use client";
import dynamic from "next/dynamic";
import { ComposerHome } from "./composer";
import "@motionux/app-blocks/styles.css";

const loadEditor = () => import("@motionux/build-canvas").then((module) => module.Editor);
const Editor = dynamic(loadEditor, {
  ssr: false,
  loading: () => <main className="build-loading"><p role="status">Loading the canvas…</p></main>,
});
const SourceEditor = dynamic(() => import("./source-editor").then((module) => module.SourceEditor), {
  ssr: false,
  loading: () => <main className="build-loading"><p role="status">Loading the source editor…</p></main>,
});
export function EditorLoader() {
  return <ComposerHome Canvas={Editor} SourceCanvas={SourceEditor} prepareCanvas={loadEditor} />;
}
