import { booleanValue, numberValue, stringValue } from "../playground/controls";
import { Bookmark, ImagePlus, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { CardDeck, FanCards } from "../../components/gestures/deck-and-page";
import { DisclosureCard, StatCard } from "../../components/gestures/disclosure-cards";
import { GooMenu, GooMorph, SimulatedUnlock } from "../../components/gestures/goo-studies";
import { GlassLens, ParallaxTicket, PullRefresh } from "../../components/gestures/interactive-surfaces";
import quietHills from "../assets/quiet-hills.webp";
import { usageExample } from "./usage-example";
import type { Specimen } from "../catalog";
import "./demo.css";

const examples = {
  "morph-island": ["DisclosureCard", "disclosure-cards", '<DisclosureCard variant="island" title="Transfer in progress" openLabel="Details" closeLabel="Hide" detail={<p>Waiting for the response.</p>} />', "Keep a single activity identity while revealing detail next to the trigger."],
  "expand-card": ["DisclosureCard", "disclosure-cards", '<DisclosureCard title="The winter field guide" openLabel="Read" closeLabel="Close" detail={<p>Read one field note.</p>} />', "Open inline. Escape closes the panel and returns focus to the trigger."],
  "profile-card": ["DisclosureCard", "disclosure-cards", '<DisclosureCard variant="profile" title="Mira Vale" openLabel="Contact" closeLabel="Close" detail={<a href="mailto:mira@example.com">Email Mira</a>} />', "Access profile actions in the expanded area."],
  "boarding-pass": ["DisclosureCard", "disclosure-cards", '<DisclosureCard variant="boarding" title="Istanbul to Copenhagen" openLabel="Flight details" closeLabel="Fold" detail={<p>Gate B12, seat 14A</p>} />', "Expand a compact pass to reveal boarding and seat details."],
  "stat-card": ["StatCard", "disclosure-cards", '<StatCard title="Weekly activity" windows={windows} value={value} onValueChange={setValue} periodLabel="Period" />', "Switch between caller-supplied samples. Metric and trend remain visible."],
  "swipe-deck": ["CardDeck", "deck-and-page", '<CardDeck cards={cards} index={index} onIndexChange={setIndex} label="Field notes" previousLabel="Previous" nextLabel="Next" describe={(n, total) => `${n} of ${total}`} />', "A horizontal gesture commits after crossing its distance or velocity threshold. Button controls are always available."],
  "page-flip": ["CardDeck", "deck-and-page", '<CardDeck variant="page" cards={pages} index={index} onIndexChange={setIndex} label="Notebook" previousLabel="Previous page" nextLabel="Next page" describe={(n, total) => `${n} of ${total}`} />', "Pages turn around a planar hinge using the previous and next controls."],
  "fan-cards": ["FanCards", "deck-and-page", '<FanCards cards={cards} index={index} onIndexChange={setIndex} label="Journal" spreadLabel="Spread" gatherLabel="Gather" />', "Reveal the set, choose a study and return to a single card."],
  "parallax-ticket": ["ParallaxTicket", "interactive-surfaces", '<ParallaxTicket title="Night train" subtitle="Field study admission" serial="MX 0418" />', "Fine pointer movement tilts the ticket and shifts the foil. The ticket returns to rest on exit."],
  "glass-lens": ["GlassLens", "interactive-surfaces", '<GlassLens image={{ src: imageUrl, alt: "A misty ridge" }} label="Toggle magnification" hint="Use the arrow keys to move the lens." />', "Toggle the magnifier. The pointer and arrow keys move the selected inspection area."],
  "pull-to-refresh": ["PullRefresh", "interactive-surfaces", '<PullRefresh label="Refresh" handleLabel="Pull down here" status={`Revision ${revision}`} pending={false} onRefresh={() => setRevision(revision + 1)}><p>Local feed</p></PullRefresh>', "Pull the dedicated handle past its threshold or activate the labelled button."],
  "goo-morph": ["GooMorph", "goo-studies", '<GooMorph label="Change shape" names={["Tide", "Current"]} index={shape} onIndexChange={setShape} />', "Two compatible paths form a single connected shape. The selected shape has a text label."],
  "goo-menu": ["GooMenu", "goo-studies", '<GooMenu label="Add to journal" actions={actions} onAction={id => console.info(id)} />', "The open action row grows from the trigger. Tab reaches each action and Escape closes it."],
  "unlock-face-id": ["SimulatedUnlock", "goo-studies", '<SimulatedUnlock label="Play simulation" animationLabel="Visual simulation" phase={done ? "done" : "idle"} status={done ? "Simulation finished" : "Ready"} onRun={() => setDone(true)} />', "Visual simulation only. The component has no device or authentication integration."],
} as const;

const exampleSetup: Partial<Record<keyof typeof examples, string>> = {
  "stat-card": "const [value, setValue] = useState(\"week\");\n  const windows = [{ id: \"week\", label: \"Week\", value: \"24\", trend: \"Up 4%\", samples: [1, 3, 2, 4] }, { id: \"month\", label: \"Month\", value: \"108\", trend: \"Up 8%\", samples: [4, 6, 8, 8] }];",
  "swipe-deck": "const [index, setIndex] = useState(0);\n  const cards = [{ id: \"1\", title: \"Ridge\", body: <p>Watch the clouds.</p> }, { id: \"2\", title: \"River\", body: <p>Cross at the bridge.</p> }];",
  "page-flip": "const [index, setIndex] = useState(0);\n  const pages = [{ id: \"1\", title: \"First page\", body: <p>Notes for June.</p> }, { id: \"2\", title: \"Second page\", body: <p>Notes for July.</p> }];",
  "fan-cards": "const [index, setIndex] = useState(0);\n  const cards = [{ id: \"1\", title: \"Ridge\" }, { id: \"2\", title: \"River\" }];",
  "pull-to-refresh": "const [revision, setRevision] = useState(0);",
  "goo-morph": "const [shape, setShape] = useState<0 | 1>(0);",
  "goo-menu": "const actions = [{ id: \"draft\", label: \"New draft\", icon: <span aria-hidden>+</span> }];",
  "unlock-face-id": "const [done, setDone] = useState(false);"
};
const exampleProps: Partial<Record<keyof typeof examples, string>> = {
  "glass-lens": "{ imageUrl }: { imageUrl: string }"
};

type Kind = keyof typeof examples;
export function cardStory(kind: Kind): Specimen {
  const [name, file, snippet, detail] = examples[kind];
  return {
    component: function Study({ language, reduced, config, update }) {
      const tr = language === "tr";
      const t = (en: string, turkish: string) => tr ? turkish : en;
      const label = (en: string, turkish: string) => stringValue(config, "label") ?? t(en, turkish);
      const title = (en: string, turkish: string) => stringValue(config, "title") ?? t(en, turkish);
      const controlled = { open: booleanValue(config, "open"), onOpenChange: (value: boolean) => update?.("open", value) };
      const [index, setIndex] = useState(0);
      const [period, setPeriod] = useState("week");
      const [choice, setChoice] = useState("");
      const [localPhase, setPhase] = useState<"idle" | "preview" | "done">("idle");
      const [revision, setRevision] = useState(0);
      const phase = (stringValue(config, "phase") as typeof localPhase | undefined) ?? localPhase;
      useEffect(() => {
        if (phase !== "preview") return;
        const timer = setTimeout(() => { setRevision((value) => value + 1); setPhase("done"); if (config?.phase !== undefined) update?.("phase", "done"); }, 550);
        return () => clearTimeout(timer);
      }, [phase, config?.phase, update]);
      const cards = [
        { id: "ridge", title: t("Fog on the ridge", "Sırtta sis"), body: <p>{t("A quiet study at the treeline.", "Ağaç sınırında sakin bir çalışma.")}</p> },
        { id: "river", title: t("A slower river", "Daha yavaş bir nehir"), body: <p>{t("The water folds around the bend.", "Su kıvrımın etrafından akıyor.")}</p> },
        { id: "valley", title: t("Valley notes", "Vadi notları"), body: <p>{t("The lower trail opens at dawn.", "Alt patika şafakta açılıyor.")}</p> },
      ];
      const disclosure = { openLabel: t("Details", "Ayrıntılar"), closeLabel: t("Close", "Kapat"), reducedMotion: reduced };
      let widget;
      switch (kind) {
        case "morph-island":
          widget = <DisclosureCard {...disclosure} {...controlled} title={title("Export activity", "Dışa aktarma")} subtitle={title("One file prepared", "Bir dosya hazır")} variant="island"
            detail={<p role="status">{t("Draft export ready for inspection.", "Taslak dışa aktarma incelemeye hazır.")}</p>} />; break;
        case "expand-card":
          widget = <DisclosureCard {...disclosure} {...controlled} title={title("Winter field guide", "Kış arazi rehberi")} subtitle={title("Journal entry", "Günlük kaydı")}
            detail={<p>{t("The lower trail is sheltered after the first junction.", "Alt patika ilk kavşaktan sonra korunaklıdır.")}</p>} />; break;
        case "profile-card":
          widget = <DisclosureCard {...disclosure} {...controlled} title={title("Mira Vale", "Mira Vale")} subtitle={title("Field editor", "Saha editörü")} variant="profile"
            detail={<button className="mx-demo-button" type="button" onClick={() => setChoice(t("Demo contact saved", "Örnek kişi kaydedildi"))}>{choice || t("Save demo contact", "Örnek kişiyi kaydet")}</button>} />; break;
        case "boarding-pass":
          widget = <DisclosureCard {...disclosure} {...controlled} title={title("Istanbul › Copenhagen", "İstanbul › Kopenhag")} subtitle="MX 284" variant="boarding"
            detail={<dl><dt>{t("Boarding", "Biniş")}</dt><dd>18:45</dd><dt>{t("Gate", "Kapı")}</dt><dd>B12</dd><dt>{t("Seat", "Koltuk")}</dt><dd>14A</dd></dl>} />; break;
        case "stat-card":
          widget = <StatCard title={title("Readership", "Okunma")} periodLabel={t("Period", "Dönem")} value={period} onValueChange={setPeriod} reducedMotion={reduced}
            windows={[{ id: "week", label: t("Week", "Hafta"), value: "284", trend: t("Up 12% this week", "Bu hafta %12 artış"), samples: [9,7,12,11,16,13,21] },
              { id: "month", label: t("Month", "Ay"), value: "1,084", trend: t("Up 8% this month", "Bu ay %8 artış"), samples: [6,9,8,14,9,15,17,21,15,18,22,23] }]} />; break;
        case "swipe-deck": case "page-flip":
          widget = <CardDeck cards={cards} index={index} onIndexChange={setIndex} label={label("Field journal", "Arazi günlüğü")}
            variant={kind === "page-flip" ? "page" : "swipe"} dragThreshold={numberValue(config, "dragThreshold")} previousLabel={t("Previous note", "Önceki not")} nextLabel={t("Next note", "Sonraki not")} reducedMotion={reduced}
            describe={(n, total) => t(`${n} of ${total}`, `${total} kayıttan ${n}`)} />; break;
        case "fan-cards":
          widget = <FanCards cards={cards} index={index} onIndexChange={setIndex} label={label("Field notes", "Arazi notları")} reducedMotion={reduced}
            spreadLabel={stringValue(config, "spreadLabel") ?? t("Spread notes", "Notları aç")} gatherLabel={t("Gather notes", "Notları topla")} />; break;
        case "parallax-ticket":
          widget = <ParallaxTicket title={title("Night train", "Gece treni")} subtitle={title("Field study admission", "Saha çalışması bileti")} serial={stringValue(config, "serial") ?? "MX 0418"} reducedMotion={reduced} />; break;
        case "glass-lens":
          widget = <GlassLens image={{ src: quietHills, alt: t("Snowy trees on Hurricane Ridge", "Hurricane Ridge’de karlı ağaçlar") }}
            label={label("Toggle magnification", "Büyütmeyi değiştir")} zoom={numberValue(config, "zoom")} hint={t("Activate, then move the lens with a pointer or arrow keys.", "Etkinleştirin, ardından işaretçi veya ok tuşlarını kullanın.")} />; break;
        case "pull-to-refresh":
          widget = <PullRefresh label={label("Refresh notes", "Notları yenile")} handleLabel={t("Pull down here", "Buradan aşağı çekin")}
            threshold={numberValue(config, "threshold")} status={phase === "preview" ? t("Refreshing demo", "Demo yenileniyor") : t(`Demo revision ${revision}`, `Demo sürümü ${revision}`)}
            pending={phase === "preview"} onRefresh={() => setPhase("preview")} reducedMotion={reduced}>
            <ul>{cards.map(card => <li key={card.id}>{card.title}</li>)}</ul>
          </PullRefresh>; break;
        case "goo-morph":
          widget = <GooMorph label={label("Change shape", "Şekli değiştir")} names={[t("Tide", "Gelgit"), t("Current", "Akıntı")]}
            index={index === 0 ? 0 : 1} onIndexChange={setIndex} reducedMotion={reduced} />; break;
        case "goo-menu": {
          const actions = [{ id: "note", label: t("Add a note", "Not ekle"), icon: <PenLine size={18} aria-hidden="true" /> },
            { id: "photo", label: t("Add a photo", "Fotoğraf ekle"), icon: <ImagePlus size={18} aria-hidden="true" /> },
            { id: "mark", label: t("Add a bookmark", "Yer imi ekle"), icon: <Bookmark size={18} aria-hidden="true" /> }];
          widget = <><GooMenu {...controlled} label={label("Journal actions", "Günlük işlemleri")} actions={actions}
            onAction={(id) => setChoice(actions.find((action) => action.id === id)?.label ?? "")} reducedMotion={reduced} />
            {choice && <p role="status">{choice}</p>}</>; break;
        }
        case "unlock-face-id":
          widget = <SimulatedUnlock label={label("Play simulation", "Simülasyonu oynat")} animationLabel={t("Visual simulation", "Görsel simülasyon")} phase={phase}
            status={phase === "preview" ? t("Playing the animation", "Animasyon oynatılıyor") : phase === "done" ? t("Simulation finished", "Simülasyon bitti") : t("Ready to play", "Oynatmaya hazır")}
            onRun={() => { if (config?.phase !== undefined) update?.("phase", "preview"); else setPhase("preview"); }} reducedMotion={reduced} />; break;
      }
      return <div className="mx-demo mx-demo-center">{widget}</div>;
    },
    usage: usageExample(name, `${file}`, snippet, exampleSetup[kind], exampleProps[kind]),
    states: detail, api: "Pass consumer content, labels and handlers.", accessibility: detail,
    performance: "Motion is scoped to the specimen. The associated reading and action state stays in the DOM.",
  };
}
