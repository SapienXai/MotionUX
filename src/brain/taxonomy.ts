import taxonomy from "../../metadata/brain/taxonomy.v1.json" with { type: "json" };
import { semanticKeys, type SemanticKey, type Signals } from "./contracts.ts";
import { assertTaxonomy } from "./validation.ts";

assertTaxonomy(taxonomy);
export { taxonomy };
export function normalize(text: string) {
  return text.replace(/[Iİı]/g, "i").toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/['’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const englishPlural: Record<string, string> = {
  animations: "animation", gestures: "gesture", dialogs: "dialog", menus: "menu", cards: "card",
  sliders: "slider", lists: "list", approvals: "approval", notifications: "notification",
  backgrounds: "background", effects: "effect", transitions: "transition", sections: "section",
};
const turkishTerms: Record<string, string> = {
  rezervasyonun: "rezervasyon", rezervasyondan: "rezervasyon", rezervasyonu: "rezervasyon",
  odeme: "odeme", odemenin: "odeme", odemeden: "odeme", sekmelerde: "sekmeler", sekmelerdeki: "sekmeler",
  sekmelerin: "sekmeler", sekmeyi: "sekme", kaydirarak: "kaydirma", surukleyerek: "surukleme",
  surukleyince: "surukleme", yuklenirken: "yukleniyor", yuklemede: "yukleme", tamamlaninca: "tamamlandi",
  onayini: "onay", klavyeyle: "klavye", klavyenin: "klavye", hata: "hata", hatayi: "hata", hatasini: "hata",
  ayrintiyi: "ayrinti", ayrintilari: "ayrinti", detaylari: "detay", gecisini: "gecis",
};
const words = (s: string) => normalize(s).split(" ").filter(Boolean).map(word => englishPlural[word] ?? turkishTerms[word] ?? word);
export function tokens(text: string) { return new Set(words(text)); }
const phraseText = (text: string) => " " + words(text).join(" ") + " ";
type Definitions = Record<string, { definition: string; phrases: string[] }>;
const vocabulary = Object.fromEntries(semanticKeys.map(key => [key, compile(taxonomy[key] as Definitions)])) as Record<SemanticKey, [string, string[]][]>;
const qualifiers = Object.entries(taxonomy.qualifiers).map(([key, phrases]) => [key, phrases.map(phraseText)] as const);
const policies = Object.fromEntries(Object.entries(taxonomy.policies).map(([key, phrases]) => [key, phrases.map(phraseText)]));
function compile(group: Definitions): [string, string[]][] {
  return Object.entries(group).map(([key, value]) => [key, [...value.phrases, key].map(phraseText)]);
}
const find = (entries: Iterable<readonly [string, string[]]>, text: string) =>
  [...entries].filter(([, phrases]) => phrases.some(phrase => text.includes(phrase))).map(([name]) => name);

export function translate(query: string): Signals {
  const text = phraseText(query);
  return Object.assign(Object.fromEntries(semanticKeys.map(key => [key, find(vocabulary[key], text)])), {
    qualifiers: find(qualifiers, text),
  }) as Signals;
}

export function policySignals(query: string) {
  const text = phraseText(query);
  const matched = new Set(find(Object.entries(policies), text));
  for (const key of ["physical", "keyboard", "touch", "screenReader", "reduced", "rtl", "lowCost", "native"]) {
    if (!matched.has(key)) continue;
    const requiredPhrase = policies[key].some(phrase => {
      const start = text.indexOf(phrase);
      return start >= 0 && !/\b(?:prefer|optional|preferably|tercihen|tercihim|olursa iyi)\s*$/.test(text.slice(0, start + 1));
    });
    if (!requiredPhrase) matched.delete(key);
  }
  if (matched.has("fraud") && /\b(?:do not|dont|never|avoid) show success before\b/.test(text)) matched.delete("fraud");
  return matched;
}
