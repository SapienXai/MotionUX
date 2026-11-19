import type { Metadata } from "next";
import { EditorLoader } from "./build/editor-loader";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <EditorLoader />;
}
