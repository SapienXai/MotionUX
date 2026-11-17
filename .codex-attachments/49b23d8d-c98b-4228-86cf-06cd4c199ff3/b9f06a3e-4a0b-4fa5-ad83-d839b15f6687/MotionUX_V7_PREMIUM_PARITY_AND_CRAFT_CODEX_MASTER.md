# CODEX MASTER PROMPT — MOTIONUX V7
## Premium Motion Craft, 82/82 Real-Consumer Parity & Production-Quality Playground

**İş türü:** Baştan sona kod geliştirme, test, kalite kabulü, belge güncellemesi, commit ve push. Yalnızca analiz/roadmap DEĞİL.

**Repo:** `https://github.com/SapienXai/MotionUX`  
**Referans başlangıç HEAD (14 Kasım 2026):** `4a99ea250597069b31241b6fb293ac6bcf6fe98a` (`main`). Başlamadan önce güncel `origin/main`'i kontrol et; eşleşmiyorsa en güncel kod üzerinden ilerle, geçmişi silme.  
**Görsel otorite:** `docs/design-reference/motionux-studio-v5-reference.png` ve korunmuş V5/V6 Studio tasarımı.  
**Var olan ürün:** 82 referans/preview, 92 registry item (86 temel + 6 Gallery preset), global Codex motion skill, V6 Playground, V6 parity manifest.  
**Temel ilke:** **GÖRDÜĞÜM = ÖZELLEŞTİRDİĞİM = KODUNU KOPYALADIĞIM = PROJEME KURDUĞUM = AYNI GERÇEK COMPONENT, AYNI STATE VE AYNI ANİMASYON.**

---

## 0. DEĞİŞMEZ SINIRLAR / YETKİ

1. **Yalnızca `SapienXai/MotionUX` repo'sunda çalış.** BookPlace (`SapienXai/bookplace`) ve DineWallet (`SapienXai/RestaurantWallet`) repolarına **hiçbir yazma işlemi, commit, push, PR, merge, migration, deploy yapma**. Onlara özel temalar MotionUX Studio içinde kalabilir; kendi repo kodlarını değiştirme.
2. **V5'te onaylanan Studio görsel yönünü değiştirme.** Coral renk, 270 px sidebar, iki sütunlu yatay kart Gallery, üst arama, tipografi, 6 featured kompozisyonu, mevcut mobil düzen, Playground ve light/dark korunacak. Yeni landing, yeni logo, komple yeniden tasarım veya framework değişikliği YOK. Bu görev ağırlıklı olarak hareket kalitesi, kanıtlanabilir eşleşme ve kullanılabilirliği artırır. Hatalı UX düzeltmeleri referans sadakati içinde yapılabilir.
3. **React 19 + TypeScript + Vite Studio + Motion + shadcn GitHub registry** mimarisini koru. Mevcut MIT/telif ve provenance kayıtlarını bozma. Üçüncü taraf bileşen kodu için dosya düzeyi lisans/izin yoksa doğrudan kopyalama veya tersine mühendislikle kod çıkarma yapma; aynı kullanıcı amacını karşılayan özgün motion tasarımı geliştir.
4. `v1.0.0` tag'i ve var olan kurulum contract'ları korunacak. Mevcut published pin'leri sessizce değiştirme, force-push/history rewrite yapma. Gerekli değişikliklerde yeni immutable commit SHA'leri, registry manifest hash'leri ve migrasyon notları kullan. `v2.0.0` tag'ini **yalnızca tüm release gate'leri gerçekten geçtiyse** oluştur; aksi halde release pending bırak.
5. **Production deploy yapma, ücretli servis bağlama, kullanıcı parasıyla ilgili sahte işlemler oluşturma.** Sadece yerel örnekler / sentetik demo verileri. Yerel Gallery `Loading to Success` simülasyonunun başarı durumu kesinlikle gerçek API/ödemeyi temsil etmesin.
6. Mevcut `~/.codex/AGENTS.md`, Google `modern-web-guidance` ve global skills'leri koru; onları override etme. Gerekli skill iyileştirmesini önce repo içinde kaydet; kullanıcı düzeyine uygulanıyorsa yedekli, idempotent, mevcut kuralları silmeden uygula.
7. Mümkün olduğunca bağımsız çalış, fazlar arasında gereksiz onay isteme. Ancak yapamadığın test veya karşılaştırmayı yapılmış sayma. Ortamda fiziki cihaz/VoiceOver/NVDA yoksa **gerçekte olmayan test kanıtı üretme**. Bloke olmayan geliştirmelere devam et.

---

## 1. NEDEN V7 — V6'DAN KALAN GERÇEK AÇIKLAR

V6'da doğrulandığı raporlananlar:
- `4a99ea2` main ve yeşil CI; 319 Playwright geçti, 2 koşullu atlandı.
- 82/82 Playground kaydı için **en az bir** çalışan kontrol; 170 varsayılan ve konfigüre kullanım örneği.
- 92/92 registry clean-install ve TypeScript.
- Altı Gallery preset'inde 72 **reduced-motion başlangıç/bitiş screenshot + ARIA** parity durumu.
- 12 öncelikli örnek için 192 hareket karesi kayıtlı.
- `metadata/parity-manifest.json` hash + commit pin yöntemi.
- V6 ilk ekran yaklaşık 169,9 KB gzip JS; LCP 244–316ms ve CLS ~0,000076 **yerel 4x CPU Chromium ölçümleri**, gerçek cihaz/gerçek ağ sonucu değil.

**Bunları terminal ve dosyalar üzerinden yeniden doğrula.** Sayılar ve tahminler başlangıç bağlamıdır, testleri tekrar çalıştırmadan "geçti" deme.

**Kalan açıklar:**
- **76/82 Gallery ↔ kurulu React visual/interaction parity** yapılmamış. Altı özel preset için bile **normal-motion timeline parity** henüz tamamlanmış değil.
- 82/82 controls sadece en az bir meaningful edit kanıtlıyor; componentlerin birçoğunda spring, easing, duration, gesture, layout choreography, motion/state varyantlarını düzenleme eksik.
- 0/82 premium readiness; referans kalite ve hareket fiziği için bireysel tasarım incelemesi bitmemiş.
- İlk altı özgün Gallery preset'i var ama diğer 76'nın demo-vs-ship düzeni, bazılarının farklı state/fixture içerikleri ve kaynak/kurulum eşleşmesi nesnel olarak ölçülmeli.
- Fiziksel iPhone/Android, kurulu PWA ve ekran okuyucu testleri doğrulanmamış. Bu eksikliği saklama.

**Bu turdaki en büyük hedef:** Bir sayacın 82'ye ulaşması değil; bir componenti Studio'da inceleyen, onun ayarını değiştirip kodunu kopyalayan ve temiz Next.js/React tüketicisinde kuran kişinin **aynı görseli ve hareketi** elde etmesi.

---

## 2. P0 — PARITY ENGINE: KALAN 76 + İLK 6'NIN GERÇEK MOTION EŞLEŞMESİ

İlk olarak `metadata/reference-inventory.json`, `metadata/parity-manifest.json`, `studio/catalog.ts`, `studio/app/gallery.tsx`, `studio/app/playground.tsx`, `studio/app/preview.tsx`, `studio/demos/*`, `components/showcase/*`, `scripts/fixture-parity.mjs`, `scripts/registry-smoke.mjs`, `metadata/usage-templates.json` dosyalarını incele.

### 2.1 Bütün 82 kayıt için tek kaynak doğruluğu

Her kayıt için aşağıdakiler kayıt altına alınmalı:
- `id`, `provider`, `registryItem`, varsa `galleryPreset`, source path, gerçek public component API, CSS ve asset dependency'leri.
- Gallery'de kullanılan component ve gösterilen props/state/variant/theme.
- Playground'daki aynı presetin default ve özelleştirilmiş değerleri.
- Usage/Code/Install'in **tam aynı immutable paket/sürüm** ile eşleşmesi.
- Demo fixture'ının component kodundan ayrıldığı nokta. Demo-only içerik varsa kullanıcı bunu açıkça görmeli; Gallery'deki özellik registry'ye de kurulamıyorsa sahte parity sayma.

**Önemli mimari tercih:** 76 kayıt için düşünmeden 76 yeni Gallery wrapper'ı yazma. Base component + tüketicinin kullanım örneği + ortak semantic theme adapter'ı ile eşleşebiliyorsa bunu doğrula. Yalnızca gerçekten farklı/özel görsel kompozisyon gerekiyorsa **installable Gallery preset** oluştur, registry'ye gerçek CSS/fixture/asset ve public props'la ekle. Gereksiz duplicate kaynak, her item için ayrı `use client` ve ekstra bundle yaratma.

### 2.2 Bağımsız tüketici testi

Şu anki `scripts/fixture-parity.mjs` yaklaşımını genişlet ve sürdürülebilir kıl:
- **Örnekleri temiz shadcn React tüketicisine GitHub pinned SHA ile kur**, Studio CSS, Studio-local imports veya asset URL'leri olmadan build et. Farklı makinede de tekrar çalışsın.
- 82 kayıt için installed source file hash/contract, usage compilation, gerçek mount ve **aynı props/state/fixture** koşullarında Gallery ↔ installed component davranış karşılaştırması.
- Karşılaştırma minimum `idle`, `activated`, `completed/settled`, `reverse/reset`, `disabled/error` (uygulanıyorsa) durumlarını kapsasın. Her item'in kendine özgü state graph'ından hangilerinin geçerli olduğu gerekçelendirilsin.
- **Screenshot tek başına yeterli değil:** ARIA + DOM semantic state + doğru callback/olay çıktıları + gesture outcome da kıyaslansın.
- Visual parity için aynı `width`, `height`, `font`, `theme`, `assets`, locale ve CSS tokens kullanılmalı; test ``Studio CSS'i tüketiciye taşıyarak" yapay başarı yaratmasın. Consumer kendi yüklediği component CSS'ini kullanmalı.
- V6'daki `<=2.5%` tolerant pixel difference, 1px neighborhood ve `animations: disabled` yalnızca **statik görsel parity** ölçütüdür; bunu motion parity diye etiketleme. Eşik yetersiz kalan görselleri somut olarak incele; ihtiyaca göre sıkılaştır ama farklı font rasterization nedeniyle sahte kırılma üretme.
- Gerçek sürüklemeyi/tıklamayı iki ortamda tekrarla. **Normal motion** için eşit clock/time origin, event triggers, capture FPS, settled/cancel/reverse state ve keyframe zamanlamalarını karşılaştır. Sadece eşit son kareyle "animasyon birebir" deme.
- Simülasyonun timer'ları deterministik/fake clock ile tutarlı olmalı; `prefers-reduced-motion` açık/kapalı.
- Minimum **82 static parity kaydı** + animasyon yapan bileşenlerin tamamında uygun timeline/transition assertion; riskli gesture ve morph öğelerinde kare dizisi ve computed transform/layout geometrileri karşılaştırması.
- Öncelikli 6 özel preset için 390/768/1536px, light/dark, reduced/normal ve `idle→active→reset` tam matris. Diğer 76 için temsilî tam matris + her kayıt için en az gerçek normal-motion/touch ve reduced-motion karşılaştırması. Geniş matris CI süresini aşarsa matrisi bağımsız jobs/shards'a böl; coverage tablosunu açık tut.
- Başarı durumları `parity-ok`, `parity-broken`, `not-tested`, `blocked`. `parity-ok` yalnızca **ölçülen kapsamı** açık olan kayıtlar için. Otomatik script `missing` kayıtları sessizce atlamasın.

### 2.3 Pin sürüm düzeni

`vite.config.mjs` build-time registry pin kontrolünü ve `metadata/parity-manifest.json` paket hash mantığını koru. Parity çalışması için candidate SHA → GitHub'a push → o SHA'dan gerçek shadcn install → doğrulama → **takip commitinde** manifest pin yenileme sırasını uygula. Kendini hash'leyen commit veya `main` dosyasını eski pinle "aynı" diye gösteren Code paneli olmasın.

Yalnızca SHA sabitlemesi değil: `Code`, `Usage`, `Install`, seçilmiş Gallery preset ve Playground state bağlanmış olsun. Uyuşmazlıkta Install kapansın ve doğru teknik açıklama olsun; ama sırf pin uyuşmuyor diye ürünü kalıcı şekilde kullanılamaz bırakma — yeni doğrulanmış checkpoint oluştur.

**P0 başarı raporu:** `82/82` için `install + mount + explicit parity classification`; `6/6` feature preset animation timeline; hiçbir kayıt "varsayılan görünüm benzer" olduğu için eşleşmiş ilan edilmez.

---

## 3. P1 — PREMIUM MOTION CRAFT: HER 82 COMPONENTİ TEK TEK İNCELE

**Bu faz çok kritik:** 82 çalışan demo tek başına Apple/Linear/DesignBookmark kalitesi değildir. `docs/COMPONENT-ACCEPTANCE.md` üzerinde her referansı ölçülmüş kanıtla yeniden değerlendir.

### 3.1 Component başına hareket tasarımı

Her öğeye kısa bir `Motion Spec` ekle:
- Kullanıcının amacı ve trigger'ı.
- `idle`, `hover/focus`, `press`, `drag`, `release`, `open`, `close`, `success/error`, `cancel`, `repeated interruption` gibi uygun durumlar.
- Hareket eden alt parçaların hiyerarşisi; nereye ve **neden** hareket ettikleri.
- Süre / spring stiffness, damping, mass / inertia / velocity sınırları; mantıklı başlangıç değerleri.
- Son durumun animasyon kesildiğinde doğru kalması ve reduced-motion eşdeğeri.
- Keyboard/focus/touch, PWA scroll/overlay sınırları.
- Performance riski: transform/opacity tercih, ölçüm gerekçesi varsa animating width/height/filter.

### 3.2 İlk kalite grubu — hepsinde premium hareket ve interruption testleri

1. **Morph Island:** Yalnızca açık/kapalı kart değil; görünüm, genişlik, yükseklik, içerik hiyerarşisi ve shared-layout geçişi; çok hızlı aç/kapa ve resize'da kararlı.
2. **Goo Menu:** Gerçekten organik bağlanan/ayrılan şekiller; görünür lobe/bridge continuity; reduced-motion'da sade ayrı butonlar; hit target ve a11y sağlam.
3. **Swipe Deck:** Gerçek velocity, momentum/eşik, yön kararı, kart yığını/derinlik, geri döndürme, pointercancel, drag sonrası focus ve kart sayısı 0/1/N.
4. **Dynamic Menu / Morph Popover:** Trigger → menu fiziksel geçiş; viewport, nested scroll, mobile keyboard, Escape, outside dismissal, ARIA ve tab focus; çalışan `showPopover` fallback.
5. **Sliding Tab / Bottom Bar:** Indicator momentum ve layout continuity; text width/RTL/keyboard/disabled/rapid taps.
6. **Expandable / Profile Card:** Height/content continuity, image and text interpolation, interruption, focus management, no hidden focusable elements.
7. **Pull to Refresh:** Actual scroll gesture ile doğal ilişki; Safari/PWA overscroll conflict yok; ayrı keyboard action güvenli.
8. **Goo Morph, Jelly Slider, Rubber Dock, Glass Lens, Signature Pad, Siri Orb:** Her birinin kendine has hareket karakterini gerçekten göster; bir tane genel `scale` transition ile geçiştirme.

Bunlardan sonra diğer bütün kayıtları kategoriler halinde tamamla: navigation → feedback → forms → cards/gestures → text → AI/media. Zayıf öğeleri özgün kaliteli tasarımla düzelt. Mevcut işlevleri bozacak sırf dekoratif değişiklik yapma. Gizli sürekli RAF, gereksiz blur, loop veya ses autoplay yok.

### 3.3 Referans kalite karşılaştırması

- DesignBookmark, Kokonut UI, SmoothUI kaynakları için mevcut `SOURCE-REVIEW` ve provenances'ı temel al. Erişilebilir canlı referans varsa görünür etkileşim davranışını karşılaştır; lisanssız kod/asset alıntılama yok.
- Referansların görsel hedefi sadece giriş ekranı değildir: selected, expanded, dragging, pending, failed ve reverse karelerini de değerlendir.
- Kaynak erişilemiyorsa engeli yaz; **uydurma referans kararı** verme. Bağımsız kalite kriterlerine göre hareketi iyileştir.
- Her item için gerçek screencapture/interaction trace veya screenshot sequence; zaman/viewport/browser bilgisi; notlar; değişen gözlemlerin ne düzeldiği.
- 0–5 `visual`, `interaction`, `accessibility`, `performance`, `production` puanlarını ancak ilgili tekrar üretilebilir kanıtla ver. Otomatik 5/5, topluca `ready` veya yalnızca axe=0 üstünden premium kabul YASAK.
- `ready` için kaynağı, kurulumu, behavior parity, visual/motion craft, a11y ve performans testleri kapsama göre tamamlanmış olmalı. Gerçek cihaz/assistive tech gerekli olup yoksa ayrı `hardware-unverified` veya `release-blocked` olarak tut; user'a açıkla.

---

## 4. P2 — GERÇEK PLAYGROUND: BÜTÜN PUBLIC PROPLAR VE MOTION AYARLARI

Mevcut `studio/playground/base.ts`, `featured.ts`, `controls.ts`, `fields.tsx`, `base-usage.ts`, `metadata/usage-templates.json` temellerini geliştir. Yeni devasa "mega component editor" kütüphanesi veya ayrı SaaS backend kurma.

### 4.1 Sadece metin editörü değil

- Her item için **uygun olan tüm gerçekten desteklenen public props** tanımlı olsun. Göstermediğin kritik prop veya placeholder control kalmasın.
- `Props` gerçek component API: label/content, size/variant, disabled, icon, count/range, class/style/theme where safe, controlled vs uncontrolled.
- `States` gerçek geçiş grafiği: idle/pending/success/error, expanded, activated, dragged, reset; geçersiz state seçimi hata yaratmasın.
- `Variants` gerçekten farklı davranış/styling üreten seçenekler; tek varyant varsa böyle yaz, sahte çoklu variant gösterme.
- `Motion` için uygun bileşenlerde animasyon parametreleri (**duration, stiffness, damping, mass, distance, scale, rotation, threshold, spring/instant**, vb.) gerçek public API üzerinden düzenlenebilir. **Bütün componentlere yapay spring knob ekleme**: statik native input'ta ayar gereksizse sakla. Motion değiştirmeyi sağlayan ayarların gerçekten runtime style/transition'a bağlandığını kanıtla.
- Props metadata'sı ile TS types ve usage generator bir kaynaktan türetilsin veya drift testiyle korunsun. Yalnızca Studio'da çalışan props, kurulu component API'sinde yoksa panelde yer almasın.
- Edit sonucunda önizleme **canlı** değişsin; ilgili seçilmiş state gereksiz remount ile kaybolmasın. `Replay`, `Reset to defaults`, `Copy share link` ve browser history beklenen şekilde çalışsın.
- Gallery'deki bir kart üzerinde yapılan bir değişiklik Playground'a geçtiğinde taşınsın; Playground'da özelleştirilen presetin kurulum kodu ile aynı data yapılsın.
- Kullanıcının istediği özelleştirme `Usage` koduna birebir yansısın; TypeScript build, React gerçek mount ve uygun durumda on-screen output assertion yap. Sadece string içeren TypeScript derlemesinin geçmesi yeterli değil.
- Bileşenin gerçek backend callback'i gereken durumda gösterim için sentetik handler kullan; **yayınla, ödeme al, onay ver** gibi sonuçları kendiliğinden gerçekmiş gibi tamamlama.

### 4.2 Playground'un UX'i

V5 görüntüsünün marka hiyerarşisini koru ama etkileşim ergonomisini iyileştir:
- Büyük interaktif preview sabit ve görünür kalsın; kontrol panelleri masaüstünde yan panel/bölünmüş çalışma alanı, mobilde scroll/bottom sheet gibi doğal çözüm kullanabilir. Kontrol değişti diye preview sürekli üstten sıfırlanmasın.
- Code panel: **kurulacak gerçek TSX/CSS**, dosya seçici ve syntax-highlight (hafif yöntem tercih); Install'de exact pin + dry-run + bağımlılık ve asset açıklaması; Usage'da seçilen ayarlara göre gerçek örnek.
- Preview settings: light/dark, Neutral/BookPlace/DineWallet theme adapter, desktop/tablet/mobile, TR/EN, reduced motion.
- Kaydedilebilir/URL ile paylaşılabilir config, migration ve invalid-input sanitization. Çok uzun `config` query'si, bozuk JSON veya tehlikeli içerik sayfayı kırmamalı.
- Screen reader için state açıklamaları; hover-only durumlar zorunlu değil; mobile touch hedefleri uygun.

**P2 kabul:** 82 item için anlamlı controls; hareketli 82 içinden animasyon parametrelerinin public API'ye uygun gerçek kontrol edildiği itemler listesi; default + değiştirilen tüm ayarları kapsayan `TypeScript → consumer render → screenshot/behavior` regression matrix; kabul edilmeyen prop kontrollere eklenmez.

---

## 5. P3 — STUDIO V5/V6 TASARIMINI KORUYAN GÖRSEL STANDART

Bu faz redesign değildir. Referans: `docs/design-reference/motionux-studio-v5-reference.png` ve V5/V6 snapshotları.

- 1536×1024: 270px sidebar, üst arama, hero ve ilk 6 kartın iki kolonlu yatay kompozisyonu korunacak.
- İlk altı featured kartın özel grafikleri, composition, internal interaction ve assets korunacak; iyileştirme yaparsan önce/sonra görsel kanıt göster.
- Diğer 76 kart da aynı düzeyde rafine görünsün; fakat hepsini aynı "copy-paste lilac stage" yapma. Component karakteri, kendi kompozisyonu, kaliteli düzen ve typographic hierarchy olmalı.
- Light/dark, touch, 320/375/390/768/1024/1440/1536, 200% zoom, uzun TR etiketler, reduced motion kontrolleri.
- Gallery başlangıcında **sadece görünürdeki demolar** çalışsın; IntersectionObserver, observer cleanup, focus-within mount korunmalı. Gezinmede stutter/scroll jank/boş alan yaratma.
- Özel görsel demo asset'leri registry'ye gömülecekse paket boyutunu ölç; mümkün olduğunda asset path, `data:` boyutu ve gerçek client caching farklarını dikkate al. Consumer'ın kendi medyasını kolayca verebildiği temiz API sağla. Sırf parity için bundle'ı şişirme.
- İlk altı görselin referansla pixel/crop hizalamasını regressions'a bağla; **bütün sayfanın aynı olduğu iddiası** ile bir componentin referans fidelity'sini birbirine karıştırma.

---

## 6. P4 — PERFORMANS, ERİŞİLEBİLİRLİK, GERÇEK CİHAZ SINIRLARI

- `npm run verify` ve tüm var olan 319 geçen Playwright testinin regresyonsuz kalması. Atlanan iki testin nedenini açıkça belgele; sessiz skip çoğaltma.
- Chrome, Firefox ve WebKit emülasyon ile fiziki iOS Safari ve kurulu PWA testini ayır. Mümkün olanlarda physical-device/browser manual checklist oluştur; gerçek cihaz yoksa `NOT_TESTED`.
- Klavye + touch + screen reader focus + modal/tooltip Escape/outside click + `aria-live` + `prefers-reduced-motion` + keyboard fallback. Axe=0 yalnızca temel katman.
- En az bir long-running Gallery turu: 82 componenti sırayla görmek, geri/ileri, aç/kapa, yoğun gesture, cache/memory trend, listener/observer cleanup ve offscreen animation.
- Lab network profiles: cold/warm, slow mobile, CPU throttling ve mümkünse network shaping. Sadece localhost 4x CPU LCP sonucu ile gerçek kullanıcı hızını kanıtlamış sayma.
- V6 baseline (`169.9 kB gzip JS`) ile initial route, lazy demo chunks, CSS, decoded assets, total network bytes ve main-thread task süresi kıyasla. Beklenmedik şişmede dosya/kütüphane düzeyinde teşhis koy, gereksiz bundle'ı küçült. Özellikle 82 preview'nun hepsi initial chunk'a girmesin.
- `React 19`, Next.js 16 App Router + Tailwind 3/4 fixture, pnpm/npm, TS strict, CSS import ve "use client" boundary doğrulamaları. Demo çalışıyor ama actual Next server/client build kırılıyorsa ready sayma.
- CI büyükse ayrı shards: unit+lint+TS, installed registry smoke, parity, normal/reduced motion, accessibility ve performance smoke. Cache, timeout, flaky test raporu, artifact upload. **Yeşil CI'nin kapsamını açıkça göster.**

---

## 7. UYGULAMA SIRASI, CHECKPOINTLER VE TAMAMLAMA GEREKLERİ

**Kod yazmadan uzun bir analiz belgesiyle görevi bitirme.** Başta kısa audit çıkar, sonrasında gerçekten geliştir; bütün fazlarda küçük, denetlenebilir commit ve push.

### Checkpoint A — Current source audit & 6 preset gerçek hareket parity
- Son `main` ve CI, aktif pin, manifest, Studio Code/Install/Usage ve kaynaklar.
- İlk altı installed `reduced` static parity testini yeniden çalıştır.
- **Normal-motion timeline + cancelled/reversed + follow-up callback** kıyası ekle. Eski testleri silme.
- `docs/V7-PROGRESS.md` ve `docs/V7-QUALITY-LEDGER.md` oluştur.

### Checkpoint B — 76 remaining full consumer parity
- Önce tüm 76 için exact source/usage/install hash + React mount + ARIA + states.
- Sonra her kayıt için uygun static/normal-motion parity; yüksek riskli öğeleri ilk grupta çöz.
- İhtiyaç olan az sayıdaki gerçek Gallery presetlerini installable yap, gereksiz wrapper kopyalama yapma.
- `metadata/parity-manifest.json` ve `docs/V7-PARITY-MATRIX.md` güncel kanıtla senkron.

### Checkpoint C — Premium craft audit & repair
- Bölüm 3'teki kritik 12+ etkileşimi özel ele al, ardından kategorilerle bütün 82.
- Her item için design/gesture review, visual captures, a11y ve perf; bir item gerçekten tamamlanınca puanla; kalanları needs-review tut.
- `docs/COMPONENT-ACCEPTANCE.md` gerçek gözleme göre yenilensin.

### Checkpoint D — Playground & code generation
- 82 component için gerçek public prop coverage, states, variants ve uygun motion parameter controls.
- Kullanım örnekleri ve copied source aynı pinned installer contract; auto-generated usage syntax/type/mount testleri.
- Gallery/Playground config state korunması ve optional theme adapters doğrulanması.

### Checkpoint E — Test/release discipline
- CI şeritleri ve evidence artifacts.
- Performans regressions, long-running Gallery ve Next fixtures.
- README/skill/catalog/changelog/release docs güncelle.
- Main'e verified commit/push; **release gate tam geçmediyse `v2.0.0` oluşturma.**

**Çok geniş işse:** Her checkpoint sonunda gerçek kod ve testlerle ayrı commit/push + kalan görevleri açık ledger ile bırak. “Bütün fazlar bitti” iddiası için aşağıdaki tam kabul şartları aranır. Fiziksel cihaz yok diye bağımsız geliştirmeyi durdurma.

---

## 8. KABUL KRİTERLERİ — BUNLAR OLMADAN "V7 COMPLETE" DEME

1. **82/82 installed base React render** + 82/82 gerçek public example/Usage + TypeScript ve temsilî Next compatibility.
2. **82/82 Gallery↔installed consumer parity** açık coverage; render/callback/state eşleşmesi; statik görsel ile hareket parity ayrımı; her kayıt için `measured`, `unverified`, `blocked` durumları ve kanıtlar.
3. **6/6 Gallery preset** immutable pin altında tam source/CSS/assets/usage + normal/reduced animation sequence parity, interrupted/reverse testleri.
4. **82 item** için component-specific motion spec, visual + interaction review, a11y, performance ve release status; hiçbirini otomatik `ready` yapma.
5. **Playground** `Props`, `Variants`, `States` ve uygun `Motion` kontrollerini gerçek public API ile bağlar. En az bir alanı değiştirmeyi "tam editör" diye göstermeyen ayrıntılı coverage.
6. Studio V5/V6 seçilen tasarım ve ilk altı kart bozulmaz; mobile, dark, responsive ve 200% zoom regresyonu yok.
7. Bütün yeni testler, eski testler ve shadcn registry smoke CI'da yeşil; varsa skip / fiziksel cihaz eksikliği net.
8. **Sürüm kararı:** `v2.0.0` ancak 82 kalite kaydının tüm gerekli gate'leri kapanıp gerçek kanıt oluştuğunda; aksi halde checkpoint unreleased. `v1.0.0` unchanged.
9. Sadece MotionUX repo'suna yazılmış olacak; BookPlace/DineWallet repo `main`, branch ve production'ına dokunulmayacak.

**No-go:** Testte sadece screenshot kaydetme, componentin handler'ını simüle ederek sonucu doğrudan ayarlama ve "parity-ok" sayma, sadece CSS reflow ile physics doğrulama, statik `animations: disabled` karelerini normal-motion diye sunma, `.md` tablosunda otomatik 82 `ready`, render edilen demo yerine farklı registry componenti kurma, bozuk pin'i gizleme, eski V5 tasarımını değiştirip "daha premium" iddia etme.

---

## 9. SON RAPOR (KISA AMA KANITLI)

Tamamlayınca kullanıcıya Türkçe olarak şunları raporla:

- Repo ve son `main` commit SHA; CI run linki, pipeline sonuçları, gerçek pass/skip sayıları.
- 82 için `installed`, `static-parity`, `motion-parity`, `premium-ready`, `needs-review`, `blocked` **ayrı sayılar**; ilk altı / kalan 76 ayrı.
- Kanıt bağlantıları: `docs/V7-PARITY-MATRIX.md`, `docs/V7-QUALITY-LEDGER.md`, `docs/COMPONENT-ACCEPTANCE.md`, screenshot/film ve consumer fixtures; gerçek hangi tarayıcılarda ölçüldüğü.
- İlk 12 premium hareket için "önce neydi, sonra ne oldu, nasıl doğruladın".
- Playground kontrol kapsamı: gerçekten çalışan props ve motion knobs, sample generated Usage ve install pin.
- V6 vs V7 initial JS, CSS, LCP/CLS/long tasks/interaction; lab vs gerçek cihaz ayrımı.
- Tamamlanmayanlar: hangi kayıt, neden, eksik kanıt, sonraki somut adım.
- v1.0.0, v2.0.0 ve ürün repo/deploy durumu.

**Bu görev MotionUX'un tamamlanmış gibi görünmesi için değil; gerçekten diğer React projelerimizin güvenebileceği, görsel ve fiziksel etkileşim kalitesi yüksek bir kütüphane olması için. Analizle değil kodla başla, test et, ilerlemeyi commit/push ile kalıcılaştır.**

**BAŞLA.**
