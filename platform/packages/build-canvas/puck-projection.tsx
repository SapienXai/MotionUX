"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Config, Data, Slot } from "@puckeditor/core";
import { RenderBlock } from "@motionux/app-blocks";
import { AppFrame } from "@motionux/app-blocks/frame";
import {
  MarketingBlockView,
  MarketingSurface,
} from "@motionux/app-blocks/marketing";
import {
  blockSchema,
  isMarketing,
  isBlockGroup,
  isSectionChild,
  makeBlock,
  registry,
  type BuildPage,
  type Block,
  type BlockId,
  type BlockProps,
  type Document,
} from "@motionux/build-core";

type Device = "desktop" | "tablet" | "mobile";
const blockList = Object.keys(registry) as BlockId[];
type Runtime = {
  document: Document;
  page: BuildPage;
  device: Device;
  theme?: Document["theme"];
  mediaBase: string;
  navigate: (route: string) => void;
};
export const RuntimeContext = createContext<Runtime | null>(null);
function RuntimeRoot({ children }: { children: ReactNode }) {
  const runtime = useContext(RuntimeContext);
  if (!runtime) return null;
  const { document, page, device, theme, navigate, mediaBase } = runtime;
  if (document.template === "hotel-marketing")
    return (
      <MarketingSurface
        document={document}
        route={page.route}
        navigate={navigate}
        theme={theme}
        mediaBase={mediaBase}
      >
        {children}
      </MarketingSurface>
    );
  return (
    <AppFrame
      document={document}
      route={page.route}
      device={device}
      themeOverride={theme === "system" ? undefined : theme}
      navigate={navigate}
      studio
    >
      {children}
    </AppFrame>
  );
}
type EditorConfig = Config<
  Omit<Record<BlockId, BlockProps>, "SidebarInset" | "CreatorSection"> & Record<"SidebarInset" | "CreatorSection", Omit<BlockProps, "items"> & { items: Slot }>
>;
const staticBlocks = new Set<BlockId>([
  "PageHeader",
  "KpiCard",
  "KpiGrid",
  "ChartCard",
  "RecentActivity",
  "StatusBadge",
]);
function previewBlock(
  type: BlockId,
): EditorConfig["components"]["PageHeader"]["render"] {
  return function CanvasBlock({
    id,
    title,
    description,
    variant,
    motion,
    visibility,
    accessibleLabel,
    dataBinding,
    image,
    imageFit,
    articles,
    items,
    cta,
    destination,
    puck,
  }) {
    const runtime = useContext(RuntimeContext);
    const block: Block = {
      id,
      type,
      version: 1,
      props: {
        title,
        description,
        variant,
        motion,
        visibility,
        accessibleLabel,
        dataBinding,
        image,
        imageFit,
        articles,
        items,
        cta,
        destination,
      },
    };
    // Editing selects the block through Puck. It must not also activate an app control.
    const content =
      runtime?.document.template === "hotel-marketing" ? (
        <MarketingBlockView block={block} nested={runtime.page.blocks.some((entry) => entry.type === "CreatorSection" && entry.children?.some((child) => child.id === id))} />
      ) : (
        <RenderBlock block={block} />
      );
    return puck.isEditing && (!staticBlocks.has(type) || isMarketing(type)) ? (
      <>
        <span className="build-sr">{registry[type].title}</span>
        <div inert>{content}</div>
      </>
    ) : (
      content
    );
  };
}
export const config: EditorConfig = {
  components: {
    ...Object.fromEntries(
      blockList
        .filter((type) => !isBlockGroup(type))
        .map((type) => [
          type,
          {
            label: registry[type].title,
            defaultProps: makeBlock(type, "b-default").props,
            render: previewBlock(type),
          },
        ]),
    ),
    CreatorSection: {
      label: "Section",
      fields: { items: { type: "slot", allow: blockList.filter(isSectionChild) } },
      defaultProps: { ...makeBlock("CreatorSection", "b-default").props, items: [] },
      render: function SectionPreview({ id, items: Items, puck: _puck, ...props }: Parameters<EditorConfig["components"]["CreatorSection"]["render"]>[0]) {
        const runtime = useContext(RuntimeContext);
        const block: Block = { id, type: "CreatorSection", version: 1, props };
        const slot = <Items className="creator-section-grid" minEmptyHeight={64} aria-label="Section blocks" />;
        return runtime?.document.template === "hotel-marketing"
          ? <MarketingBlockView block={block} slot={slot} />
          : <RenderBlock block={block} slot={slot} />;
      },
    },
    SidebarInset: {
      label: registry.SidebarInset.title,
      inline: true,
      fields: { items: { type: "slot", disallow: ["SidebarInset", "CreatorSection"] } },
      defaultProps: {
        ...makeBlock("SidebarInset", "b-default").props,
        items: [],
      },
      render: ({
        id,
        title,
        description,
        variant,
        motion,
        visibility,
        accessibleLabel,
        dataBinding,
        items: Items,
        puck,
      }: Parameters<
        EditorConfig["components"]["SidebarInset"]["render"]
      >[0]) => (
        <RenderBlock
          block={{
            id,
            type: "SidebarInset",
            version: 1,
            props: {
              title,
              description,
              variant,
              motion,
              visibility,
              accessibleLabel,
              dataBinding,
            },
          }}
          edit={puck.isEditing}
          dragRef={puck.dragRef}
          slot={
            <Items
              className="hotel-layout-slot"
              minEmptyHeight={44}
              aria-label="Section blocks"
            />
          }
        />
      ),
    },
  } as unknown as EditorConfig["components"],
  root: { render: ({ children }) => <RuntimeRoot>{children}</RuntimeRoot> },
};
export type PuckItem = Data["content"][number];
export function puckItem(block: Block): PuckItem {
  return {
    type: block.type,
    props: {
      id: block.id,
      ...block.props,
      ...(isBlockGroup(block.type) && {
        items: (block.children ?? []).map(puckItem),
      }),
    },
  };
}
export function toPuck(blocks: Block[]): Data {
  return { content: blocks.map(puckItem), root: { props: {} } };
}
function decode(item: PuckItem, nested = false): unknown {
  const { id, items, ...rest } = item.props;
  const children = isBlockGroup(item.type) ? items : undefined;
  const fields = isBlockGroup(item.type) ? rest : { ...rest, items };
  if (nested && children !== undefined)
    throw new Error("Only one section level is supported.");
  return {
    id,
    type: item.type,
    version: 1,
    props: fields,
    ...(Array.isArray(children) && {
      children: children.map((child) => decode(child, true)),
    }),
  };
}
export function fromPuck(data: Data) {
  return data.content.map((item) => blockSchema.parse(decode(item)));
}
export function sectionItems(item?: PuckItem): PuckItem[] {
  return item && isBlockGroup(item.type) && Array.isArray(item.props.items)
    ? item.props.items
    : [];
}
