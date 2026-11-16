import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import "../runtime/pwa.css";
import { project } from "../runtime/project";

const { name, locale, template, theme } = project.document;
const dark = theme === "dark";
const themeColor =
  template === "hotel-dashboard"
    ? dark
      ? "#171e19"
      : "#f7f8f4"
    : dark
      ? "#151727"
      : "#f6f7fc";
export const metadata: Metadata = {
  title: { default: name, template: "%s · " + name },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pwa/icon-192.png", apple: "/pwa/icon-192.png" },
  appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
};
export const viewport: Viewport = { viewportFit: "cover", themeColor };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={locale}>
      <body className="motionux-pwa">{children}</body>
    </html>
  );
}
