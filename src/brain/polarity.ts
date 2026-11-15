type Scope = "failure" | "confirmation" | "pending" | "disclosure" | "tabs" | "picker" | "button";
type Polarity = "still" | "motion" | "unclear";
const scopes: [Scope, RegExp][] = [
  ["failure", /\b(?:error\w*|fail\w*|invalid|hata\w*|basarisiz\w*|gecersiz\w*)\b/],
  ["confirmation", /\b(?:confirm\w*|bookings?|reservations?|receipt\w*|settled|success\w*|rezervasyon\w*|onay\w*|makbuz\w*|basari\w*)\b/],
  ["pending", /\b(?:load\w*|pending|spinner|progress|yuklen\w*|bekle\w*|ilerle\w*)\b/],
  ["disclosure", /\b(?:detail\w*|disclos\w*|expand\w*|accordion|detay\w*|ayrinti\w*|akordeon)\b/],
  ["tabs", /\b(?:tabs?|sekme\w*)\b/],
  ["picker", /\b(?:picker|select\w*|seci\w*)\b/],
  ["button", /\b(?:buttons?|dugme\w*|buton\w*)\b/],
];
const scopeOf = (text: string) => scopes.filter(([, pattern]) => pattern.test(text)).map(([scope]) => scope);
const quotes = /“[^”]+”|"[^"]+"|‘[^’]+’|(?:^|\s)'[^'\n]+'(?=\s|[.,!?]|$)|`[^`]+`/g;
const motion = "(?:animations?|motion|transitions?|animasyon\\w*|hareket\\w*)";
const englishNot = "(?:do not|dont|never|must not|should not|cannot|cant)";
const englishCommands = "(?:add|apply|use|include|introduce|enable|play|show|put|trigger|insert|run|give|add in)";
const businessRestriction = /\b(?:(?:do not|dont|never|must not|should not|only) (?:show|announce|mark|report|display|simulate|fake|fabricate|pretend) (?:a |the )?(?:success|confirmed|paid)|(?:odeme\w*|onay\w*)[^.]{0,75}(?:basarili|onaylandi|odendi)[^.]{0,30}(?:gosterme\w*|gosterilme\w*|isaretleme\w*))\b/;

function directive(text: string): Polarity | null {
  const opposite = new RegExp(`\\b${englishNot} (?:forget|fail|neglect) to (?:animate|${englishCommands} (?:any |an |the )?${motion})\\b|\\b${englishNot} (?:remove|disable|stop|prevent|suppress|drop|skip|omit|reduce|turn off) (?:the |any |existing |current |all |its |the existing )*${motion}\\b|\\b(?:do not|dont) want .{0,76}without ${motion}\\b`);
  const turkishOpposite = /\b(?:animasyon\w*|hareket\w*) (?:asla )?(?:kaldirma(?:yin|sin)?|engelleme(?:yin|sin)?|azaltma(?:yin|sin)?|silme(?:yin|sin)?|kapatma(?:yin|sin)?|kesme(?:yin|sin)?)\b|\b(?:animasyonsuz|hareketsiz) .{0,60}(?:istemiyorum|istemiyoruz|olmasin)\b/;
  const still = new RegExp(`\\b${englishNot} (?:ever )?(?:animate|(?:${englishCommands}) (?:any |an |the |further |decorative |extra |another |more )*\\w*(?:\\s+\\w+){0,3} ?${motion})\\b|\\b(?:without|no|zero) (?:any |more |decorative |extra )?(?:${motion})\\b|\\b(?:keep(?:ing)?|leave|stay|remain|render|make|set|hold)\\b.{0,48}\\b(?:static|still|motionless|instant)\\b|\\b(?:remove|disable|stop|prevent|suppress|drop|skip|omit|strip|turn off)\\b.{0,40}\\b${motion}\\b|\\b(?:instant only|unanimated)\\b`);
  const turkishStill = /\b(?:animasyon\w*|hareket\w*)\b.{0,25}\b(?:ekleme(?:yin|sin|meyin|mesin)?|eklenmesin|uygulama(?:yin|sin)?|uygulanmasin|kullanma(?:yin|sin)?|kullanilmasin|yapma(?:yin|sin)?|istemiyorum|istemiyoruz|kaldir(?:in|ilsin)?|sil(?:in|insin)?|olmasin|devre disi)\b|\b(?:hareketsiz|animasyonsuz|gecikmesiz|aninda goster|sabit (?:kalsin|olsun|tut))\b/;
  const positive = /\b(?:animate|use motion|add animation|play an animation|motion enabled|hareketlendir\w*|animasyonlu|animasyon\w* (?:ekle(?:yin|nsin)?|olsun|kullan\w*)|hareket\w* (?:ekle(?:yin|nsin)?|olsun|kullan\w*))\b/;
  if (opposite.test(text) || turkishOpposite.test(text)) return "motion";
  if (still.test(text) || turkishStill.test(text)) return "still";
  if (positive.test(text)) return "motion";
  return null;
}

export function interpretMotion(query: string, selected: string, normalize: (value: string) => string) {
  const unquoted = query.replace(quotes, " ");
  const clauses = unquoted.split(/[;.!?]+|\s+(?:but|however|whereas|while|except|ama|ancak|fakat|oysa|buna karsilik|buna karşılık)\s+|,\s*(?=(?:and|ve)\b)|\s+(?:and|ve)\s+(?=(?:animate|do not|dont|remove|never|keep|leave|animasyon|hareket)\b)/i)
    .flatMap(clause => clause.split(/,\s+/));
  const target = new Set(scopeOf(normalize(selected)));
  const chosen: { text: string; polarity: Polarity; scope: Scope[] }[] = [];
  let reported = false;
  const policyClauses: string[] = [];
  for (const clause of clauses) {
    const text = normalize(clause);
    if (!text) continue;
    if (businessRestriction.test(text)) continue;
    policyClauses.push(clause);
    const polarity = directive(text);
    if (polarity) {
      if (/\b(?:said|wrote|asked|quoted|the example says|dedi|yazdi|soyledi)\b/.test(text)) { reported = true; continue; }
      chosen.push({ text: clause, polarity, scope: scopeOf(text) });
    } else if (/\b(?:must|should|can) not$|\b(?:yapilmasin|uygulanmasin)$/.test(text) && chosen.at(-1)?.polarity === "motion") {
      chosen.push({ text: clause, polarity: "still", scope: scopeOf(text) });
    }
  }
  const policyText = policyClauses.join(" ");
  if (!chosen.length) return { polarity: reported || unquoted.trim() === "" && query.trim() !== "" ? "unclear" : null, policyText, query: unquoted } as const;
  const matched = chosen.filter(item => item.scope.some(scope => target.has(scope)));
  const scoped = matched.length ? matched : chosen.filter(item => item.scope.length === 0);
  const active = target.size ? scoped : chosen;
  if (!active.length) return { polarity: "unclear", policyText, query: unquoted } as const;
  const polarities = new Set(active.map(item => item.polarity));
  if (polarities.size > 1) return { polarity: "unclear", policyText, query: unquoted } as const;
  return { polarity: active[0].polarity, policyText, query: chosen.length > active.length && active[0].polarity === "motion" ?
    active.map(item => item.text).join(" ") : unquoted } as const;
}
