import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@motionux/design-system/tokens.css";
import "@fontsource-variable/inter";
import "./studio.css";
import "./build/kinetic.css";
import "@motionux/design-system/identity.css";
import { StudioChrome } from "./studio-chrome";
import { appearanceKey } from "../../../../lib/studio-bridge";

export const metadata: Metadata = {
  title: { default: "MotionUX Studio", template: "%s · MotionUX" },
  description: "A local workspace for shaping apps with verified components.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: `try { const value = localStorage.getItem(${JSON.stringify(appearanceKey)}); if (value === "light" || value === "dark") document.documentElement.dataset.studioAppearance = value; } catch {}` }} />
      </head>
      <body><StudioChrome>{children}</StudioChrome></body>
    </html>
  );
}
