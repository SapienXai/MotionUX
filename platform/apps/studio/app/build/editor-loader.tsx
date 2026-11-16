"use client";
import dynamic from "next/dynamic";
import "@motionux/app-blocks/styles.css";

const Build = dynamic(
  () => import("@motionux/build-canvas").then((module) => module.Editor),
  {
    ssr: false,
    loading: () => (
      <main className="build-loading">
        <p role="status">Loading the Build workspace…</p>
      </main>
    ),
  },
);
export function EditorLoader() {
  return <Build />;
}
