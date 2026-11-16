"use client";
import { useRouter } from "next/navigation";
import type { BuildPage, Document } from "./model";
import { HotelFrame } from "./frame";
import { RenderBlock } from "./blocks";

export function AppScreen({
  document,
  page,
  id,
}: {
  document: Document;
  page: BuildPage;
  id: string;
}) {
  const router = useRouter();
  return (
    <HotelFrame
      document={document}
      storageKey={"motionux-" + id}
      route={page.route}
      navigate={(route) => router.push(route)}
    >
      {page.blocks.length ? (
        page.blocks.map((block) => <RenderBlock key={block.id} block={block} />)
      ) : (
        <div className="hotel-card">
          <h1>{page.title}</h1>
          <p>No blocks have been added to this page.</p>
        </div>
      )}
    </HotelFrame>
  );
}
