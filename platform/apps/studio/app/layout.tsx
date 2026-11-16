import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@motionux/design-system/tokens.css";
import "@fontsource-variable/inter";
import "./studio.css";

export const metadata: Metadata = {
  title: { default: "MotionUX Studio", template: "%s · MotionUX" },
  description: "A local workspace for shaping apps with verified components.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
