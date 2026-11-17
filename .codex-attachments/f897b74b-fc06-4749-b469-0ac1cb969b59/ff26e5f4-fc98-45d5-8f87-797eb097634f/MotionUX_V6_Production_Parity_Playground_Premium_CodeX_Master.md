# CODEX MASTER PROMPT — MotionUX V6
## Studio ↔ Registry Parity · Real Component Playground · Premium Quality Acceptance

**Görev tipi:** Analiz değil, baştan sona uygulama, gerçek kod, otomatik ve görsel test, commit + push.

**TEK HEDEF REPO:** `https://github.com/SapienXai/MotionUX` (`main`).  **İŞ YAPILMAYACAK REPO'LAR:** `SapienXai/bookplace`, `SapienXai/RestaurantWallet` (DineWallet), diğer tüm ürün repoları. Bu ürünlerde branch, commit, push, migration, deploy, token, production config değişikliği YASAK. Ürün temalarının Studio'daki isolated preview adapter'ları korunacak.

**North Star:** MotionUX'ta kullanıcı bir bileşeni **görür → deneyerek özelleştirir → gerçek kodunu / install komutunu kopyalar → temiz bir React/Next.js projesinde birebir aynı bileşeni ve davranışı çalıştırır.** Studio önizlemesiyle kurulabilir component arasında görsel veya davranış farklılığı kabul edilmez. İkinci hedef: 82 bileşenin her birini sadece çalışır demo olmaktan çıkarıp gerçekten premium interaction standardına taşımak.

### Sınırlar: V5 tasarımını yeniden çizme!

Kullanıcının seçtiği **MotionUX Studio V5 tasarımını koru.** Bu görev yeniden tasarım değildir. Referanslar:

- `docs/design-reference/motionux-studio-v5-reference.png`
- `docs/design-reference/STUDIO-V5-DESIGN-SPEC.md`
- `docs/evidence/studio-v5/desktop-1536x1024-light.png`
- `docs/evidence/studio-v5/mobile-390-light.png`
- `docs/evidence/studio-v5/playground-desktop.png`

V5'in **270px sidebar, coral vurgular, açık temiz UI, lavanta demo sahneleri, iki sütunlu yatay Gallery kartları, ilk 6 kart sırası, arama, header ve responsive davranışını** muhafaza et. Screenshot'lardaki kompozisyonu bozacak yeni hero, font yönü, dashboard, side panel veya süsleme icat etme. Gerekli değişiklikler component/playground işlevselliğine odaklanmalı; UI ayar panelleri V5'in aynı tasarım dilini kullanmalı.

**Başlangıç noktası (repo üzerinde tekrar kontrol et):** 14 Kasım 2026 itibarıyla `main` HEAD `3e813117c2f89c758f196695fd79526967c24b62`. 82 source-qualified preview, 86 registry entry, 306 başarılı Playwright kontrolü, ilk ekran yaklaşık 161.1 KB gzip JS (6 canlı preview), CI yeşil. 82 öğe de `needs-review` olarak kayıtlı; `v2.0.0` yok. `v1.0.0` tag'i ve mevcut tüketici API'leri korunmalıdır. HEAD ileri gittiyse son duruma göre çalış, eski commit'e resetleme yapma.

Başta oku: `AGENTS.md` varsa, `PRODUCT.md`, `DESIGN.md`, `README.md`, `registry.json`, `metadata/reference-inventory.json`, `metadata/components.json`, `docs/COMPONENT-ACCEPTANCE.md`, `docs/STUDIO-V5-VERIFICATION.md`, `docs/QUALITY-GATES.md`, `docs/RELEASE.md`, ilgili skill, `studio/app/*`, `studio/demos/gallery-featured.tsx`, `studio/catalog.ts`, `components/**/*`, `tests/**/*`.

**Önemli:** Codex'in mevcut global Google modern-web-guidance, shadcn ve Motion skill'leri ile repo talimatlarını dikkate al; bunları silme/değiştirme. Bu görev kapsamında global Mac ayarlarına veya diğer reponun dosyalarına yazma. Repo içindeki skill kaynakları gerektiğinde güncellenebilir.

---

## FAZ 0 — DOĞRUDAN GERÇEK DURUM / KONTRAT AUDİTİ

Bu faz rapor yazıp durmak için değil, sonraki kod çalışmalarına ölçülebilir temel oluşturmak için var.

1. `main` ve remote HEAD'i karşılaştır; değişmişse merge stratejisiyle güvenli ilerle, `v1.0.0`'a dokunma, force push yapma.
2. Mevcut Studio Gallery ve Playground'u, 82 öğenin item-ID / registry item / source file / örnek component / published pin eşleştirmesini çıkar. Birebir eşleşmeyenleri otomatik işaretleyen makine okunabilir bir **parity manifest** geliştir.
3. İlk 6 V5 Gallery kartını özellikle incele: Tab Pill, Loading to Success, Expandable Card, Morph Dropdown, Profile Card, Swipe Deck.
4. **Gerçek örnek uyumsuzluğu:** Gallery, `studio/demos/gallery-featured.tsx` içinde özel bir kompozisyon kullanıyor. `ActionMenu` yeni `defaultOpen`, `inline`, `triggerIcon` prop'larına sahip; ancak hâlen Studio Install'da görünen `#03173314f6e8ce3c69ff448930d3278a9af90822` pin'indeki `ActionMenu` bunları içermez. Bu ve benzeri farkları açıkça bul ve **yeni doğrulanmış, immutable bir sürümde** çöz. Eski SHA'yı değiştirmek imkânsız; eski kodu yeniymiş gibi göstermeye çalışma.
5. Gallery'deki **Loading to Success idle** durumu da kontrol edilmeli: kullanıcı herhangi bir işlem başlatmadan ekranda "Completed" göstermemeli. `idle → pending → resolved(success|error)` durum makinesini açıkça ayır. Demo timer'ı sadece *açıkça işaretli simülasyonda* kullanılabilir. Gerçek client işlerinde success dışarıdan gelen doğrulanmış state'e bağlı.
6. 82 kayıt için `preview implementation`, `actual installed code`, `consumer fixture`, `visual/gesture spec`, `source/license`, `test`, `version` alanlarını hazırla. Her component için fark türü: `parity-ok`, `parity-broken`, `not-tested`, `blocked`.

**Zorunlu ilk checkpoint:** `docs/V6-PARITY-AUDIT.md` ve `metadata/parity-manifest.json`. Bunları oluşturduktan sonra aşağıdaki fazları gerçekten uygula; audit hazırlayıp görevi bitirme.

---

## FAZ 1 — "WHAT YOU SEE IS WHAT YOU INSTALL" SÖZLEŞMESİ

### 1A. Bir tek kaynak gerçeği (Single Source of Truth)

- Gallery, Playground, Usage, Code ve shadcn install, aynı **public component + seçilmiş variant/preset + gerekli style/assets** kontratını kullanmalı. Studio'ya özel salt görsel wrapper gerektiren yerlerde wrapper sadece preview sahnesi için olabilir; gerçek öğenin geometry, style ve behavior'ünü değiştiren kısım **kurulabilir kaynağa/preset'e** dahil olmalı.
- Studio'ya özel CSS ile geçici şekilde premium gösterip, consumer projeye çıplak/basic component vermek YASAK.
- Gallery'deki kart sahnesinin dış çerçevesi, 2 sütun layout, Studio tipografisi gibi **Studio chrome** tüketiciye gitmez; ama tıklanan gerçek componentin kendisi ve bağımlı CSS/tokens oraya gider.
- V5'in ilk 6 öne çıkan demosu için **birebir kurulabilir showcase preset** tasarla. Örn. `tab-pill-gallery`, `loading-to-success-gallery`, `expandable-room-gallery`, `morph-dropdown-gallery`, `profile-card-gallery`, `swipe-deck-gallery` gibi isimler makul; gerçek adları API tutarlılığına göre belirle. Önce var olan generic item'ları koru, sonra curated preset ekle. Aynı fiziksel etkileşimi iki ayrı bağımsız koda bölüp sürüm sapması yaratma.
- Fotoğraf/özel demo verisi gerekiyorsa: copyright durumunu doğrula, sadece gerekli/izinli fixture assetleri seç; tüketicinin kendi `image`, `title`, `content`, `actions` prop'larını rahatlıkla verebildiğinden emin ol. Kütüphanenin mantığını tek demo fotoğrafına kilitleme.
- Her demoda `Gallery preset` / `Base component` ayrımını kullanıcının anlayacağı şekilde göster. Gallery'de hangisi görülüyorsa o **seçilmiş kurulum** olmalı. Base'e erişim ek olabilir.

### 1B. Bağımsız tüketici doğrulaması

- `registry.json` için manifest/schema, file path, CSS import, `registryDependencies` ve dependency sürümleri tam olsun. Mevcut 86 item'a kırıcı etkide bulunma; yeni item sayısı artabilir.
- `npm / pnpm` tüketicileri, React 19 ve Next.js 16 App Router/Tailwind 3 ve 4 için smoke fixtures. shadcn `view` → `add --dry-run` → gerçek `add` → `typecheck` → production build.
- **Gerçek parity testi**: Her item'ı temiz, Studio CSS'si yüklenmemiş React tüketicide oluştur; Gallery/Playground ve isolated consumer'da aynı props + aynı theme + aynı viewport + aynı state + aynı animasyon politikasıyla screenshot ve davranış testi karşılaştır. Açıkça tanımlı **Studio dış kabuk toleransı** hariç materyal fark olmayacak. Bu testi CI'a koy. Exact pixel match'i font rendering farkları için tek kriter yapma; anlamlı görüntü ve etkileşim farklarını kapsayan görüntü karşılaştırması + DOM/ARIA assertions kullan.
- İlk 6 Gallery preset'i hem açık/koyu hem 390/768/1536 px, hem idle/activated durumlarında zorunlu karşılaştır. Tüm 82 item için en az bir standart consumer parity smoke; kritik ve görsel açıdan zengin öğeler için active/gesture/reduced karşılaştırma.
- `Copy code` sekmesi **kurulumla aynı sürüm** kaynak TSX/CSS ve varsa asset listesini göstermeli. Şu anki Studio build `main` kodunu gösterirken Install eski pin'e işaret edebiliyor. Bu sürüm tutarsızlığını tamamen ortadan kaldır: kaynak görünümünün ve install pin'inin **aynı immutable release artifact'i** temsil etmesini sağlayan manifest/version-resolver tasarla. Kullanıcıya açıkça "working tree preview" gösteriliyorsa Install'ı stable gibi sunma.
- Doğrulanmış bir SHA/tag yoksa `Install` disabled/unverified durumunu belirt; kırık veya yanlış kurulum komutu üretme.
- Paketlenmiş preset'ten consumer'da neyin görünmesi gerektiğini README'de minimum bağımlılıklarla açıkla.

### 1C. Versiyon stratejisi

- `v1.0.0` tag'ini asla değiştirme.
- Git commit SHA self-reference döngüsü yaratma: commit içeriğini değiştirince hash değişir. **Publish sonrası doğrulanmış SHA veya immutable tag** üzerinden tüketim adresi üret; üretim manifesti ve UI'daki pin tutarlı olmalı.
- `v2.0.0` yalnızca tüm release quality gate'leri geçince tag'lenebilir. Gerekirse ara checkpoint SHA'larında ilerle; Studio açıkça `Preview / Candidate` gösterir. Tag, docs ve registry birbirini tutmalı.

**Bu fazın kabulü:** Studio'da tıkladığım ilk 6 kartın **kurulum kodunu ayrı ve temiz projede** çalıştırdığımda aynı animasyon, aynı kurumsal görünüm (tema), aynı durumlar; ayrıca güncel kaynak gösterimi ve gerçek install SHA uyumlu.

---

## FAZ 2 — GERÇEK INTERACTIVE PLAYGROUND: 82/82

Mevcut `studio/app/playground.tsx` içinde `Props` büyük ölçüde `story.api`, `Variants` açıklama metni, `States` metin gösterimi. **Bunlar özelleştirme paneli değil.** Oyuncak birkaç toggle da yeterli olmaz. Kullanıcının componenti kendi projesine göre özelleştirebilmesi gerekiyor.

### Veri modeli

- Her source-qualified öğe için TypeScript ile doğrulanmış `PlaygroundDefinition` / `ControlSchema` gibi sürdürülebilir şema tasarla. **Tek generic devasa JSON form kullanma**; ortak primitive form kontrollerini paylaş ama her componentin gerçek props'una dayalı kontrollü config yaz.
- Her kontrol: prop/key, tip (boolean, number, range, enum, text, color/token, array/options, duration/spring, action/state), min/max/step, default, label, açıklama, serialization ve a11y.
- **Gerçek public API'de olmayan bir property için sahte ayar üretme.** Gerekliyse reusable API'ye yeni typed props ekle; yeni API'yi registry, Story ve consumer fixture'a yansıt.
- Public props + demo-state + event simulation farklı şeylerdir; ayır. Örneğin `Loading to Success` durumlarını simüle edebiliriz, ama gerçek ödeme gerçekleşmiş gibi sunmayız.
- Kontrol değişiminde komponent **unmount edilmeden** mümkün olduğunca canlı güncellensin. Motion/spring değişimi gerçek hareketi etkilesin; gösterilen JS/TSX usage **eşzamanlı ve gerçek** config'i yansıtsın.
- `Reset`, `Replay`, `Copy Code`, `Copy Install`, `Copy Usage`, uygun yerde `Copy Configuration`, `Share URL` çalışmalı. İstersek özellikleri query string ile paylaşabiliriz ancak hassas veri depolama yok. URL uzunluğunu ve validation'ı koru.

### Görsel düzen ve davranış

- V5 Studio tasarımını bozmadan Playground'da büyük preview + okunaklı, iyi gruplanmış kontroller. Masaüstünde uygun sağ/alt inspector, mobilde kolay erişilen sheet veya collapsible panel; gereksiz sekme karmaşası yok.
- Üstte **Preview / Props / Variants / States / Code / Install / Usage / Accessibility / Source** sekmeleri işlevsel olsun. Boş veya düz metin gibi davranan sekmeler kaldırılmasın ama **gerçek işlevle doldurulsun**; gerekiyorsa birlikte birleştir ancak navigasyon net olsun.
- Light/Dark, Neutral/BookPlace/DineWallet, Desktop/Tablet/Mobile, Türkçe/İngilizce, reduced-motion kontrolleri gerçek componenti etkilemeli. Marka tema seçimi Studio-stage adapter ile kalmalı; shared component içinde marka rengi hardcode edilmemeli.
- Önizleme tek tıkta anında değişmeli; modal, popover, gesture, pressed, loading, empty/error/success durumları için gerçek state control ve eylem tekrarlama imkânı olmalı.
- En az 82/82 katalog kaydı için **gerçek ve anlamlı düzenlenebilir kontroller** ve gerçek UI state senaryoları olmalı. Her componentte aynı beş alakasız slider'ı kopyalama. Bazısında tek gerçek prop + state düğmeleri mantıklı olabilir; hiçbirinde boş/göstermelik kontrol olmamalı.
- Varyantı bulunmayan öğeye fake varyant üretme; gerekiyorsa "Single variant" deyip API'yi bu şekilde sun ve diğer state'leri gerçekten çalıştır.
- Kod örneği tıpkı kullanıcının seçtiği props ile compile edilmeli; satırları string replacement ile güvenilmez biçimde üretme. Structured serializer + type check / generated example test.

### Örnek beklentiler (gerçek public API'ye uyumlu hale getir)

| Component | İşleyen ayarlar / durumlar |
|---|---|
| Sliding Tab Pill | Tab sayısı/başlık/ikon, controlled value, disabled tab, selected indicator speed/spring, klavye | 
| Loading to Success | idle/pending/success/error, label, timing yalnızca **simülasyon**, authoritative state, replay |
| Expandable Card | Title/subtitle/image, closed/open, safe overflow, direction/spring, alternate content |
| Morph Dropdown | Open/closed, action set, placement, interactive dismiss, animation ve focus |
| Profile Card | Profile data, collapsed/expanded, metric count, avatar, action callback |
| Swipe Deck | Card data, drag threshold, velocity, navigation, interrupt/reset, empty/last card |
| OTP / Forms | Controlled value, disabled, validation, paste/keyboard, locale |
| Goo Menu / Island | Morph/gesture/state örnekleri gerçekten farklı; yalnızca scale/fade değil |
| Media / AI | Simulated vs real state net, izin/clipboard/audio hata senaryoları |

**Bu fazın kabulü:** Katalogdan rastgele herhangi bir item seçildiğinde canlı ayarlarıyla anlamlı şekilde değiştirilebilir; seçilen konfigürasyonun kopyalanan kullanım kodu temiz TS projesinde derlenir ve aynı görünür sonucu üretir.

---

## FAZ 3 — PREMIUM INTERACTION CRAFT: 82'Yİ GERÇEKTEN İYİLEŞTİR

Hedefimiz **82 kart / 306 test** sayısı değil, 82 farklı premium etkileşim. Önce özel harekete sahip yüksek görünürlüğe sahip bileşenleri üretim kalitesine getir, sonra bütün katalogda aynı standardı uygula.

### P0: Öncelikli 12 öğe

`Tab Pill`, `Morph Dropdown / Popover`, `Loading to Success`, `Expandable Card`, `Profile Card`, `Swipe Deck`, `Morph Island`, `Goo Menu`, `Rubber Dock`, `Pull to Refresh`, `Signature Pad`, `Glass Lens`.

Her P0 item için şu test planını gerçek kodla uygula:

1. **Motion choreography:** Tetik → hareket başlangıcı → devam → tersine çevirme / iptal → bitiş. Physics, spring stiffness/damping, velocity, shared layout/FLIP, easing, transform origins somut olarak test edilmeli.
2. **Gerçek ayırt edici davranış:** Morph Island bir generic accordion olamaz; tetikleyiciden bütüncül yüzeye fiziksel dönüşüm yapmalı. Goo Menu yalnızca sırayla açılan üç buton olamaz; gerçek birleşme/ayrılma efekti (performanslı SVG filter / shape tekniği, reduced-motion alternatifi) sunmalı. Morph Dropdown tetikleyici ve overlay arası **görsel süreklilik** sunmalı. Swipe Deck katmanlı kart, sürükleme, exit/re-entry, velocity, interrupt kontrolünü korumalı. Pull to Refresh scroll ve touch ile doğal çalışmalı; mobil native browser scroll davranışına saygılı olmalı.
3. **Product polish:** Visual hierarchy, icon weight, text spacing, natural shadow/elevation, branded tokens, responsive constraints, gesture affordance, fail/error/retry.
4. **A11y & mobile:** Keyboard/touch parity, focus, focus return, ESC, ARIA, 200% zoom, reduced-motion, iOS PWA safe areas, no hover-only critical paths.
5. **Visual evidence:** P0 için light/dark × desktop/mobile × idle/active/reverse-state screenshots ve gerekirse animation screencast. Screenshot yalnızca ilk kare olmasın; hareketin en az orta ve son fazını da al. Gerekirse Playwright frame sampling ile snapshot.

### Kalan 70 öğe

Her item için envanter üzerinden kontrol et: etkileşim gerçekten benzersiz mi, yoksa aynı generic `scale 0.95` pattern'i mi? Semantik tutarlı mı? Activedaki kalite, default hali kadar iyi mi? Motion, performance, reduced, disabled, error, empty, keyboard/touch senaryosu var mı? Tasarım ref'ine işlevsel açıdan sadık mı?

**Zayıf gördüğün componenti yerinde iyileştir.** Ancak görsel referansın marka haklarını ya da lisanssız kaynak kodunu kopyalama. DesignBookmark, Kokonut, SmoothUI kaynaklarını lisans ve izlenebilirlik kurallarına uygun kullan; hakları belirsizse bağımsız tasarla. Mevcut `docs/SOURCE-REVIEW.md` kararlarını gözet.

Her item için `docs/COMPONENT-ACCEPTANCE.md` + `metadata/reference-inventory.json` status güncelle. Durumlar kanıta dayanmalı: `ready` için real consumer parity, clear API, interactive quality, licensed provenance, visual states, keyboard/touch/reduced, perf smoke + CI; yoksa `needs-review` / `blocked`. **82/82 otomatik hazır ilan etme.** Gerçek donanım veya bireysel görsel onay gerektiren kontrolleri açık belirt.

---

## FAZ 4 — PERFORMANCE, RELIABILITY, QUALITY GATES

V5 karşılaştırma ölçümleri **aynı yerel koşullarda**: initial JS ~161.1 KB gzip, altı visible mounted preview, LCP 264 ms, CLS 0.000076, çoğu etkileşim 64–80 ms Event Timing. Bunlar tek makinede localhost, Chromium 4× CPU; gerçek kullanıcı metrikleri değil.

**Beklentiler:**

- Gallery'nin ilk görünümü önceki V5'e göre gereksiz şişmesin. **Hedef: ilk görünüm JS ≤175 KB gzip** (aynı ölçme yöntemi, altı featured demo dahil). Aşıyorsa code-splitting ve lazy-import optimizasyonu yap; gerçekten gerekirse ve kanıtlıysa gerekçeli sapmayı raporla.
- Studio ilk ekran performansında LCP/CLS/interaction değerlerini **aynı kontrol metoduyla karşılaştır**, %15–20+'lık ölçülebilir gerileme varsa araştır ve düzelt. Tek localhost LCP'yi “gerçek cihaz garantisi” diye sunma.
- İlk viewportta sadece görünen/komşu canlı örnekler mount olsun; 82 heavy effect sürekli çalışmasın. Offscreen pause, event listener cleanup, IntersectionObserver; focus içerideyken unmount etme.
- Animasyonlar mümkün olduğunca `transform`/`opacity`; pahalı `filter`, büyük `backdrop-filter`, ölçü almadan layout thrashing, sürekli `RAF`, uygunsuz canvas CPU tüketiminden kaçın. SVG gooey gerekiyorsa kalite/performans ve fallback dengesi kur.
- Rich Playground ve Code Editor ancak açılınca yüklenmeli. İşlevsiz devasa syntax-highlight paketi gerektirme. Hafif, gerçek TypeScript/CSS source viewer ve yüksek kaliteli copy UX yeterli.
- Ölç: JS/CSS bundle, viewport-specific active mounts, script requests, CLS, event timing, long tasks, sampled CPU, memory hints, route switching, repeated open/close cleanup. Emülatörü gerçek cihaz diye yazma.
- V5 mobil a11y improvements korunmalı: native `<dialog>` drawer; focus close button → return opener; deeplink heading sticky header altında kalmamalı; reduced motion state görünür kalmalı.
- iOS gerçek cihaz yoksa mevcut WebKit + iPhone Simulator coverage korunur ve fiziksel test açık risk olarak raporlanır. Gerçek cihaz bağlıysa izinli lokal smoke yap; üretim repolarına dokunma.
- Render error, unexpected unmount, a11y regression, unsupported browser fallback, clipboard denial için düzgün UI.

**CI'da zorunlu:**

1. Lint, strict TS, registry build, all existing tests, example usage compile, Vite production build.
2. Mevcut 306 Playwright testi korunmalı; yeni parity/playground/interaction testleriyle sayı artsın. Başarısız testi kaldırıp geçen sayıyı yükseltme.
3. Tüm 86+ registry öğesine install/typecheck smoke; yeni gallery preset'leri de dahil.
4. İlk 6 featured preview için **real install consumer screenshot parity**; diğer 76 için consumer smoke + seçili state screenshots.
5. 82/82 Playground schema coverage, controls non-noop assertion; option değişince DOM/ARIA/visual state değişir, generated usage TS typecheck.
6. 320/375/390/768/1024/1280/1536 viewport + Chromium/WebKit; Firefox minimum smoke. Touch, keyboard, long Turkish labels, RTL ve reduced-motion.
7. Visual screenshot baselines review; baseline'ı sessizce overwrite etme. V5 screenshot ile UI dış-kabuk farklarını otomatik tespit et, kabul edilmeyen layout değişikliklerini düzelt.
8. `prefers-reduced-motion`, rapid click/drag/interrupt, async fail, error retry ve cancellation testleri.

---

## FAZ 5 — STUDIO UX, DOCS VE SKILL TUTARLILIĞI

- V5 Gallery'yi yerleşim olarak koru: logo/sidebar, search, ilk 6 feature, iki sütun yatay stage/copy, coral/lilac ürün dili, responsive layout.
- Kartlarda gerçek component ile preset farkı anlaşılabilir olmalı; *hangi kurulabilir preset görüldüğü* küçük bir gösterimle işaretlenebilir ama gereksiz gürültü üretme.
- Gallery'den Playground'a geçince seçilen kartın **aynı variant ve state** görünümü gelmeli; mümkün olduğunda mevcut state/props devam etsin. Kullanıcıya açıldığı anda bambaşka temel demo gösterme.
- İşlevsel sidebar: Gallery, Playground, Components, Guides, Examples; arama/category filter/url/back/forward/scroll focus korunmalı.
- Topluluk için `Docs`: bir componenti nasıl kurarsın, Code/Install pin eşleşmesi, preset/base farkı, theme adapter, reduced motion, version upgrade, Next compatibility.
- Repo içindeki `skills/sapienx-motion-system/SKILL.md` güncelle: gelecekte Codex yeni component yapınca Gallery=Playground=Registry parity ve editable controls + real consumer test + acceptance gate şart. **Global Mac dosyalarına bu görevde dokunma**; gerekirse kullanıcıya idempotent kurulum güncellemesi yönergesi ver.
- Gerçek source/lisans kararlarını metadata'ya yaz; DesignBookmark `Copy code` olması yeniden dağıtım hakkı kanıtı sayılmaz.
- `README.md`, `CHANGELOG.md`, `docs/VERIFICATION.md`, `docs/STUDIO-V6-ACCEPTANCE.md`, `docs/RELEASE.md` ve yeni parity schema docs güncel olsun.

---

## İŞ YÖNETİMİ VE DOĞRULANABİLİR TAMAMLAMA

Tüm adımlar **uygulama talimatı**dır. Yalnızca plan, rapor veya “yapılabilir” listesi oluşturup durma. İşlevleri geliştir, test et, görsel incele, commit + push yap. Uygunsa doğrudan MotionUX `main` üzerinde küçük, mantıklı ve test edilmiş commit'lerle ilerle; her dalga sonrası branch/remote durumunu doğrula. Mevcut tag, history, ilişkisiz dosyalar korunmalı. **Force-push / tag overwrite yok.** CI ilk andan itibaren yeşil tutulmaya çalışılmalı, başarısız run varsa nedenini düzelt.

**Checkpoint stratejisi (sadece belge değil gerçek kod):**
1. Audit + parity manifest + P0 fixed install pin.
2. İlk 6 gallery preset → consumer parity (light/dark/mobile/desktop/active).
3. Playground schema ve canlı editor → ilk 12 high-value item ile üretim kalitesinde deneyim.
4. Kalan 70 item editor + compile+interaction test.
5. 82 premium craft review + evidence + CI + docs + sürüm değerlendirmesi.

Kapsam büyük; bunu düşük kaliteli 82 otomatik form oluşturarak “bitirme”. Her checkpoint sonunda testli kod/commit/kanıt bırak, `docs/V6-PROGRESS.md` dosyasında **done / remaining / blocked / next** yaz. Oturum sınırına ulaşırsan güvenli ve açık checkpoint bırak; tamamlanmamış iş için başarı iddiası üretme. Ama sırf kapsam büyük diye yalnızca ilk 6 componentte durma; mümkün olduğunca tüm işi uygulayarak sürdür.

### Kesin no-go

- BookPlace ve DineWallet ya da başka ürün repolarına **herhangi bir yazma**.
- MotionUX için production deploy, domain/DNS, ödeme veya ücretli servis değişikliği.
- v1 tag'ini değiştirme; tüm P0/P1/82 quality gate'leri doğrulanmadan `v2.0.0` yayınlama.
- Sadece Studio'da güzel görünüp kurulumda farklı çıkan component.
- Empty/idle durumda sahte success veya diğer iş sonuçlarını üretme.
- `Props`/`Variants`/`States` sekmelerinde sadece açıklama metni veya işe yaramayan slider.
- Statik screenshot, video veya iframe'i gerçek component/gesture yerine koyma.
- Testte screenshot güncelleyerek ya da test silerek kalite farkını gizleme.
- Eski kaynak kodu **güncel install** gibi gösterme.
- 82 `needs-review` kaydını manuel/gerçek kalite kanıtı olmadan `ready`ye çevirmeme.

### Bitişte beklediğim RAPOR

1. MotionUX HEAD SHA, `main` push ve GitHub CI URL + sonucu.
2. **82'nin kaçı parity-ok**, kaçı kendi Playground controls'üyle gerçek ve derlenebilir, kaçının premium acceptance'ı `ready`/`needs-review`/`blocked`.
3. İlk 6 featured Gallery preset için her bir **aynı source → gerçek install → consumer screenshot** kanıt bağlantısı ve exact pinned version.
4. V5 tasarım sadakati: yeni 1536×1024 vs referans farkı, mobil screenshot, dark/light, viewport sonuçları.
5. Kalan gerçek sorunlar, örneğin fiziksel cihaz/ekran okuyucu/karmaşık gesture açık riskleri.
6. Önce/sonra initial JS gzip, Core Web Vitals benzeri lab değerleri ve etkileşim davranışları. Ölçüm koşullarını eksiksiz belirt.
7. Yazılan yeni component/registry/skill/docs/test dosyaları, upgrade yöntemi ve varsa uygun yeni tag. `v2.0.0` yayınlanmadıysa nedenini açık yaz.
8. Diğer repo ve production ortamlarına dokunulmadığının doğrulanması.

**Nihai kabul sorusu:** MotionUX Gallery'de bir preset'i tıklayıp özelleştirdiğimde, gördüğüm TSX/CSS'nin verdiğim ayarlarla oluşturduğu aynı deneyimi, temiz bir BookPlace/DineWallet *benzeri fixture* React projesine tek komutla kurabilir miyim? Evet yanıtı görsel + davranış + TS compile + registry install kanıtıyla doğrulanmadan işi tamamlandı sayma.

**ŞİMDİ KODU UYGULAMAYA BAŞLA.**
