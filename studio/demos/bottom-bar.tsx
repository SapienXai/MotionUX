import { useId, useState } from "react";
import { CalendarDays, Compass, Inbox, UserRound } from "lucide-react";
import { BottomBar } from "../../components/navigation/motion-selector";
import type { Specimen } from "../catalog";
import "./demo.css";

const destinations = [
  { name: "Explore", tr: "Keşfet", desc: "Find a space for your next project.", trDesc: "Sonraki projeniz için bir yer keşfedin.", Icon: Compass },
  { name: "Schedule", tr: "Takvim", desc: "Review upcoming visits and events.", trDesc: "Yaklaşan ziyaret ve etkinlikleri inceleyin.", Icon: CalendarDays },
  { name: "Inbox", tr: "Gelen kutusu", desc: "Review new messages from the team.", trDesc: "Ekipten gelen yeni mesajları inceleyin.", Icon: Inbox },
  { name: "Account", tr: "Hesap", desc: "Find your contact and profile details.", trDesc: "Profil ve iletişim bilgilerinizi görün.", Icon: UserRound },
];

const story: Specimen = {
  component: function Example({ reduced, language }) {
    const id = useId();
    const [active, setActive] = useState(0);
    const routes = destinations.map((_, index) => `#dock-${id}-${index}`);
    const entry = destinations[active];
    return <div className="mx-demo">
      <div className="mx-demo-sample" id={routes[active].slice(1)}><strong>{language === "tr" ? entry.tr : entry.name}</strong><p>{language === "tr" ? entry.trDesc : entry.desc}</p></div>
      <BottomBar label={language === "en" ? "Workspace navigation" : "Çalışma alanı menüsü"}
        links={destinations.map(({ name, tr, Icon }, i) => ({ label: language === "tr" ? tr : name, href: routes[i], icon: <Icon size={19} /> }))}
        reducedMotion={reduced} activeHref={routes[active]} onNavigate={(event, href) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          event.preventDefault();
          setActive(routes.indexOf(href));
        }} />
    </div>;
  },
  usage: `import { BottomBar } from "@/components/sapienx-motion/motion-selector";

export function AccountNavigation({ pathname }: { pathname: string }) {
  return <BottomBar label="Account navigation" activeHref={pathname} links={[
    { href: "/account", label: "Account", icon: null },
    { href: "/inbox", label: "Inbox", icon: null },
  ]} />;
}`,
  api: "Supply real hrefs, labels and icons. Feed the router’s active href to the component.",
  states: "The active route carries an indicator that springs to the next destination.",
  accessibility: "Uses native navigation links with aria-current=page; standard link activation and open-in-new-tab work.",
  performance: "Only the indicator animates. Routing, content loading and the safe-area container belong to the consumer.",
};
export default story;
