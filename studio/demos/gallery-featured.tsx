import { BedDouble, ChartNoAxesColumn, Coffee, Copy, Ellipsis, Heart, House, Link2, Pencil, RotateCcw, Sparkles, Users, Wifi } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { TabPill } from "../../components/navigation/motion-selector";
import { ActionMenu } from "../../components/navigation/action-menu";
import { ActionOutcome } from "../../components/feedback/feedback-actions";
import { DisclosureCard } from "../../components/gestures/disclosure-cards";
import { CardDeck } from "../../components/gestures/deck-and-page";
import hotel from "../assets/hotel-study.webp";
import portrait from "../assets/profile-study.webp";
import santorini from "../assets/santorini-study.webp";
import aegean from "../assets/aegean-study.webp";
import "./gallery-featured.css";

function Tabs({ reduced, disableAnalytics }: { reduced: boolean; disableAnalytics?: boolean }) {
  return <div className="mx-feature-tab"><TabPill label="Project sections" reducedMotion={reduced} options={[
    { value: "overview", label: "Overview", icon: <House size={16} aria-hidden="true" />, panel: <span className="mx-sr">Workspace overview</span> },
    { value: "analytics", label: "Analytics", disabled: disableAnalytics, icon: <ChartNoAxesColumn size={15} aria-hidden="true" />, panel: <span className="mx-sr">Workspace analytics</span> },
    { value: "members", label: "Members", icon: <Users size={16} aria-hidden="true" />, panel: <span className="mx-sr">Workspace members</span> },
  ]} /></div>;
}

function Loading({ reduced }: { reduced: boolean }) {
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  useEffect(() => {
    if (state !== "pending") return;
    const timeout = setTimeout(() => setState("success"), reduced ? 0 : 720);
    return () => clearTimeout(timeout);
  }, [state, reduced]);
  return <div className="mx-feature-loading" data-outcome={state}>
    <button className="mx-feature-process" type="button" aria-label={state === "success" ? "Processing… completed. Run again" : "Processing… start simulation"}
      aria-disabled={state === "pending"} onClick={() => { if (state !== "pending") setState("pending"); }}>
      <span className="mx-processing-ring" aria-hidden="true" />Processing…
    </button>
    <svg className="mx-feature-transition-arrow" aria-hidden="true" width="45" height="29" viewBox="0 0 45 29" fill="none"><path d="M2 3h13c11 0 16 8 18 20m-8-4 9 6 6-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <motion.div className="mx-feature-result" initial={false}
      animate={{ opacity: state === "pending" ? .32 : 1, y: state === "pending" && !reduced ? 6 : 0 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 32 }}>
      <div aria-hidden={state === "idle" ? true : undefined}><ActionOutcome state={state === "pending" ? "idle" : "success"} label={state === "pending" ? "Waiting…" : "Completed"} reducedMotion={reduced} /></div>
    </motion.div>
  </div>;
}
const amenities = [[BedDouble, "King bed"], [Wifi, "Wi-Fi"], [Coffee, "Breakfast"]] as const;
function Room({ reduced }: { reduced: boolean }) {
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(true);
  const detail = <div className="mx-room-features">
    {amenities.map(([Icon, label]) => <span key={label}><Icon size={15} aria-hidden="true" />{label}</span>)}
  </div>;
  return <div className="mx-feature-room">
    <DisclosureCard title="Premium Room" subtitle="Sea view · 42 m²" image={{ src: hotel, alt: "" }} detail={detail}
      open={first} onOpenChange={value => { setFirst(value); if (value) setSecond(false); }} openLabel="Expand room" closeLabel="Collapse room" reducedMotion={reduced} />
    <DisclosureCard title="Premium Room" subtitle="Sea view · 42 m²" image={{ src: hotel, alt: "" }} detail={detail}
      open={second} onOpenChange={value => { setSecond(value); if (value) setFirst(false); }} openLabel="Expand amenities" closeLabel="Collapse amenities" reducedMotion={reduced} />
  </div>;
}
function Dropdown({ reduced }: { reduced: boolean }) {
  const [choice, setChoice] = useState("");
  return <div className="mx-feature-dropdown">
    <ActionMenu label="New action" variant="morph" defaultOpen inline triggerIcon={<Sparkles size={19} aria-hidden="true" />}
      reducedMotion={reduced} actions={[
        { id: "Create", label: "Create", icon: <Pencil size={17} /> },
        { id: "Share", label: "Share", icon: <Link2 size={17} /> },
        { id: "Duplicate", label: "Duplicate", icon: <Copy size={17} /> },
      ]} onAction={setChoice} />
    {choice && <span className="mx-feature-choice" role="status">{choice} selected</span>}
  </div>;
}
function Profile({ reduced }: { reduced: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="mx-feature-profile">
    <DisclosureCard variant="profile" title="Emma Carter" subtitle="Product Designer" image={{ src: portrait, alt: "" }}
      open={expanded} onOpenChange={setExpanded} openLabel="Show profile details" closeLabel="Hide profile details" reducedMotion={reduced}
      detail={<p>Designs welcoming, usable products for small teams.</p>} />
    <dl aria-label="Profile statistics">{[["128", "Projects"], ["24K", "Followers"], ["312", "Following"]].map(([value, name]) =>
      <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    <Ellipsis className="mx-profile-dots" size={20} aria-hidden="true" />
  </div>;
}
function Deck({ reduced }: { reduced: boolean }) {
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const note = useId();
  const cards = [
    { id: "santorini", title: "Santorini", body: <p>Greece</p>, image: { src: santorini, alt: "Volcanic islands at dusk" } },
    { id: "aegean", title: "Aegean Sea", body: <p>Greece</p>, image: { src: aegean, alt: "The sea beneath a rose sky" } },
    { id: "coast", title: "Coastal retreat", body: <p>Greece</p>, image: { src: hotel, alt: "Modern coastal hotel" } },
  ];
  const id = cards[index].id;
  return <div className="mx-feature-deck" data-active-card={index}>
    <CardDeck cards={cards} index={index} onIndexChange={setIndex} label="Greek destinations" previousLabel="Previous destination"
      nextLabel="Next destination" describe={(current, total) => `${current} of ${total}`} reducedMotion={reduced} />
    <button type="button" className="mx-feature-heart" aria-label="Save destination" aria-pressed={saved.includes(id)} aria-describedby={note}
      onClick={() => setSaved(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id])}><Heart size={16} aria-hidden="true" /></button>
    <span className="mx-sr" id={note}>{cards[index].title}</span>
    {index === 2 && <button className="mx-feature-replay" type="button" aria-label="Restart destinations" onClick={() => setIndex(0)}><RotateCcw size={14}/></button>}
  </div>;
}
const specimens = {
  "designbookmark-tab-pill": Tabs, "designbookmark-loading-to-success": Loading, "designbookmark-expand-card": Room,
  "kokonut-morph-popover": Dropdown, "designbookmark-profile-card": Profile, "designbookmark-swipe-deck": Deck,
};
export default function Featured({ id, reduced, disableAnalytics }: { id: string; reduced: boolean; disableAnalytics?: boolean }) {
  const Demo = specimens[id as keyof typeof specimens];
  return <div className="mx-feature"><Demo reduced={reduced} disableAnalytics={disableAnalytics} /></div>;
}
