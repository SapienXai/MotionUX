import type { CSSProperties, ReactNode } from "react";
import { defaultSectionLayout, type BlockProps, type SectionLayout } from "@motionux/build-core";

const gaps = { tight: "8px", normal: "16px", loose: "28px" } as const;
function styleFor(layout: SectionLayout) {
  return {
    "--section-columns-base": layout.base.columns,
    "--section-columns-tablet": layout.tablet?.columns ?? Math.min(layout.base.columns, 2),
    "--section-columns-mobile": layout.mobile?.columns ?? 1,
    "--section-gap-base": gaps[layout.base.gap],
    "--section-gap-tablet": gaps[layout.tablet?.gap ?? layout.base.gap],
    "--section-gap-mobile": gaps[layout.mobile?.gap ?? layout.base.gap],
    "--section-align-base": layout.base.align,
    "--section-align-tablet": layout.tablet?.align ?? layout.base.align,
    "--section-align-mobile": layout.mobile?.align ?? layout.base.align,
  } as CSSProperties;
}

export function CreatorSection({ id, props, children, editorSlot }: {
  id: string;
  props: BlockProps;
  children: ReactNode;
  editorSlot?: boolean;
}) {
  const layout = props.layout ?? defaultSectionLayout;
  return (
    <section className="creator-section" aria-label={props.accessibleLabel || props.title || undefined}
      data-block="CreatorSection" data-block-id={id} data-recipe={props.sectionRecipe?.id}
      data-variant={props.variant} data-motion={props.motion} data-block-motion={props.motion} data-visibility={props.visibility}
      data-layout={layout.mode} data-width={layout.width} data-surface={layout.surface}
      style={styleFor(layout)}>
      {editorSlot && <div className="creator-section-handle">{props.title || "Section"}</div>}
      {editorSlot ? children : <div className="creator-section-grid">{children}</div>}
    </section>
  );
}
