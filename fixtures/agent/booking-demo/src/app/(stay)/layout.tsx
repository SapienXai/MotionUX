import type { ReactNode } from "react";

export default function StayLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-8">
    <header className="mb-6 font-heading text-xl text-house">Juniper House</header>
    {children}
  </div>;
}
