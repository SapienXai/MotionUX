"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { BuildPage, Document } from "./model";
import { AppFrame } from "./frame";
import { RenderBlock } from "./blocks";

export function AppScreen({
  document,
  page,
  id,
  revision,
  documentNavigation = false,
  status,
}: {
  document: Document;
  page: BuildPage;
  id: string;
  revision: number;
  documentNavigation?: boolean;
  status?: ReactNode;
}) {
  const router = useRouter();
  return (
    <AppFrame
      document={document}
      storageKey={"motionux-" + id}
      route={page.route}
      revision={revision}
      navigate={documentNavigation ? undefined : (route) => router.push(route)}
      status={status}
    >
      {page.blocks.length ? (
        page.blocks.map((block) => <RenderBlock key={block.id} block={block} />)
      ) : (
        <div className="hotel-card">
          <h1>{page.title}</h1>
          <p>No blocks have been added to this page.</p>
        </div>
      )}
    </AppFrame>
  );
}
