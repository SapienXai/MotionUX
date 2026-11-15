import type { ReactNode } from "react";
import "./layout.css";
export const metadata = { title: "Kıyı Evi — Konaklama bilgileri" };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="tr"><body><main>{children}</main></body></html>;
}
