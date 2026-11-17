"use client";

import type { BuildPage, Document } from "@motionux/build-core";
import { RenderBlock } from "@motionux/app-blocks";
import { AppFrame } from "@motionux/app-blocks/frame";
import { MarketingPage } from "@motionux/app-blocks/marketing";

export function InteractPreview({
  document,
  page,
  navigate,
  device,
  theme,
  mediaBase,
}: {
  document: Document;
  page: BuildPage;
  navigate: (route: string) => void;
  device: "desktop" | "tablet" | "mobile";
  theme: Document["theme"];
  mediaBase: string;
}) {
  if (document.template === "hotel-marketing")
    return (
      <MarketingPage
        document={document}
        page={page}
        navigate={navigate}
        theme={theme}
        mediaBase={mediaBase}
        studio
      />
    );
  return (
    <AppFrame
      document={document}
      route={page.route}
      navigate={navigate}
      device={device}
      themeOverride={theme === "system" ? undefined : theme}
      studio
    >
      {page.blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </AppFrame>
  );
}
