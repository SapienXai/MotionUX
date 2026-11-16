"use client";
import dynamic from "next/dynamic";
import { ComposerHome } from "./composer";
import "@motionux/app-blocks/styles.css";

const Editor = dynamic(() => import("@motionux/build-canvas").then((module) => module.Editor), {
  ssr: false,
  loading: () => <main className="build-loading"><p role="status">Loading the canvas…</p></main>,
});
export function EditorLoader() {
  return <ComposerHome Canvas={Editor} />;
}
