import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "./motion-disclosure.css";

type MotionDisclosureProps = ComponentPropsWithoutRef<"details"> & {
  /** Text or other non-interactive phrasing content. */
  label: ReactNode;
  hideChevron?: boolean;
};

// Chevron treatment adapted from SmoothUI Collapsible; MIT notice in the companion CSS.
export function MotionDisclosure({ label, hideChevron, children, ...props }: MotionDisclosureProps) {
  return (
    <details {...props} data-motion-disclosure="">
      <summary>
        <span>{label}</span>
        {hideChevron ? null : <ChevronDown aria-hidden="true" data-motion-disclosure-icon="" size={16} />}
      </summary>
      <div data-motion-disclosure-panel="">{children}</div>
    </details>
  );
}
