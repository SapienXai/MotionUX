import type { Metadata } from "next";
import { EditorLoader } from "./editor-loader";

export const metadata: Metadata = { title: "Build workspace" };
export default function BuildPage() {
  return <EditorLoader />;
}
