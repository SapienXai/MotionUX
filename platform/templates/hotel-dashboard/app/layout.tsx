import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import { project } from "../runtime/project";

export const metadata: Metadata = {
  title: {
    default: project.document.name,
    template: "%s · " + project.document.name,
  },
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={project.document.locale}>
      <body>{children}</body>
    </html>
  );
}
