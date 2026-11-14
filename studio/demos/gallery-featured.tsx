import { useEffect, useState } from "react";
import { SlidingTabPill } from "../../components/showcase/sliding-tab-pill";
import { LoadingOutcome, type OutcomeState } from "../../components/showcase/loading-outcome";
import { ExpandableRoom } from "../../components/showcase/expandable-room";
import { MorphDropdown } from "../../components/showcase/morph-dropdown";
import { FeaturedProfile } from "../../components/showcase/featured-profile";
import { DestinationDeck } from "../../components/showcase/destination-deck";
import { deckProps, menuProps, outcomeLabels, profileProps, roomProps, tabProps } from "../playground/featured";
import { booleanValue, numberValue, stringValue, type Config, type Value } from "../playground/controls";

function LoadingSimulation({ reducedMotion, config, update, onStateChange, tr }: {
  reducedMotion: boolean; config: Config; update?: (key: string, value: Value) => void; onStateChange?: (key: string, value: Value) => void; tr: boolean;
}) {
  const [local, setState] = useState<OutcomeState>(() => (stringValue(config, "state") ?? "idle") as OutcomeState);
  const state = (update ? stringValue(config, "state") ?? local : local) as OutcomeState;
  useEffect(() => {
    if (state !== "pending") return;
    const timeout = setTimeout(() => {
      if (update) update("state", "success");
      else setState("success");
      onStateChange?.("state", "success");
    }, reducedMotion ? 0 : 720);
    return () => clearTimeout(timeout);
  }, [state, reducedMotion, update, onStateChange]);
  return <LoadingOutcome state={state} labels={outcomeLabels(config, tr)} simulation
    onStart={() => { if (update) update("state", "pending"); else setState("pending"); onStateChange?.("state", "pending"); }} reducedMotion={reducedMotion} />;
}

export default function Featured({ id, reduced, config = {}, update, onStateChange, language }: {
  id: string; reduced: boolean; config?: Config; update?: (key: string, value: Value) => void; onStateChange?: (key: string, value: Value) => void; language?: "en" | "tr";
}) {
  const tr = language === "tr";
  const report = update ?? onStateChange;
  switch (id) {
    case "designbookmark-tab-pill": return <SlidingTabPill reducedMotion={reduced} {...tabProps(config, tr)}
      value={update ? stringValue(config, "value") ?? "overview" : undefined} defaultValue={update ? undefined : stringValue(config, "value")} onValueChange={report ? value => report("value", value) : undefined} />;
    case "designbookmark-loading-to-success": return <LoadingSimulation reducedMotion={reduced} config={config} update={update} onStateChange={onStateChange} tr={tr} />;
    case "designbookmark-expand-card": return <ExpandableRoom reducedMotion={reduced} {...roomProps(config, tr)}
      expanded={update ? (stringValue(config, "expanded") ?? "second") as "first" | "second" | "none" : undefined}
      defaultExpanded={update ? undefined : stringValue(config, "expanded") as "first" | "second" | "none" | undefined}
      onExpandedChange={report ? value => report("expanded", value) : undefined} />;
    case "kokonut-morph-popover": return <MorphDropdown reducedMotion={reduced} {...menuProps(config, tr)}
      open={update ? booleanValue(config, "open") ?? true : undefined} defaultOpen={update ? undefined : booleanValue(config, "open")} onOpenChange={report ? value => report("open", value) : undefined} />;
    case "designbookmark-profile-card": return <FeaturedProfile reducedMotion={reduced} {...profileProps(config, tr)}
      expanded={update ? booleanValue(config, "expanded") ?? false : undefined} defaultExpanded={update ? undefined : booleanValue(config, "expanded")} onExpandedChange={report ? value => report("expanded", value) : undefined} />;
    case "designbookmark-swipe-deck": return <DestinationDeck reducedMotion={reduced} {...deckProps(config, tr)}
      index={update ? numberValue(config, "index") ?? 0 : undefined} defaultIndex={update ? undefined : numberValue(config, "index")} onIndexChange={report ? value => report("index", value) : undefined} />;
    default: throw new Error(`No gallery preset for ${id}`);
  }
}
