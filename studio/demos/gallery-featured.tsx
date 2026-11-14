import { useEffect, useState } from "react";
import { SlidingTabPill } from "../../components/showcase/sliding-tab-pill";
import { LoadingOutcome, type OutcomeState } from "../../components/showcase/loading-outcome";
import { ExpandableRoom } from "../../components/showcase/expandable-room";
import { MorphDropdown } from "../../components/showcase/morph-dropdown";
import { FeaturedProfile } from "../../components/showcase/featured-profile";
import { DestinationDeck } from "../../components/showcase/destination-deck";

export function LoadingSimulation({ reducedMotion }: { reducedMotion: boolean }) {
  const [state, setState] = useState<OutcomeState>("idle");
  useEffect(() => {
    if (state !== "pending") return;
    const timeout = setTimeout(() => setState("success"), reducedMotion ? 0 : 720);
    return () => clearTimeout(timeout);
  }, [state, reducedMotion]);
  return <LoadingOutcome state={state} simulation onStart={() => setState("pending")} reducedMotion={reducedMotion} />;
}

export default function Featured({ id, reduced, disableAnalytics }: { id: string; reduced: boolean; disableAnalytics?: boolean }) {
  switch (id) {
    case "designbookmark-tab-pill": return <SlidingTabPill reducedMotion={reduced} disableAnalytics={disableAnalytics} />;
    case "designbookmark-loading-to-success": return <LoadingSimulation reducedMotion={reduced} />;
    case "designbookmark-expand-card": return <ExpandableRoom reducedMotion={reduced} />;
    case "kokonut-morph-popover": return <MorphDropdown reducedMotion={reduced} />;
    case "designbookmark-profile-card": return <FeaturedProfile reducedMotion={reduced} />;
    case "designbookmark-swipe-deck": return <DestinationDeck reducedMotion={reduced} />;
    default: throw new Error(`No gallery preset for ${id}`);
  }
}
