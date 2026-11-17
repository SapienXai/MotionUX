# CODEX MASTER PROMPT — MotionUX Studio V5
## Referans görsele sadık, premium, canlı ve hızlı Gallery + Playground

> **BU BİR UYGULAMA TALİMATIDIR. ANALİZ VEYA YALNIZCA TASARIM ÖNERİSİ DEĞİL.**
>
> Bu mesajla birlikte eklediğim **MotionUX Studio V5 referans ekran görüntüsünü** incele. Hedefimiz bu ekranın yerleşimini, görsel hiyerarşisini, oranlarını, renk karakterini, kart yapısını, boşluklarını ve etkileşim mantığını **mümkün olan en yüksek sadakatle birebir hayata geçirmek**. Arayüzün arkasında gerçek, işlevsel ve akıcı MotionUX componentleri çalışmalı.
>
> **Sıradan bir “benzeri” istemiyorum.** Referanstaki tasarımı farklı bir estetikle yeniden yorumlama; kendi sevdiğin dashboard/landing şablonuna dönüştürme. Görseli bir resim olarak ekrana basma; React + TypeScript + CSS + Motion ile canlı UI olarak inşa et. Tasarım referansı **görsel otoritedir**.

## 0 — ÇALIŞMA KAPSAMI VE REPO SINIRLARI

- **TEK HEDEF REPO:** `https://github.com/SapienXai/MotionUX`.
- Mevcut `main` üzerindeki projeyi **yerinde geliştir**; yeni repo, yeni uygulama, ayrı component sitesi, yeni stack veya monorepo oluşturma.
- Kontrole başladığında son commit, çalışma ağacı, `README.md`, `studio/main.tsx`, `studio/studio.css`, `studio/catalog.ts`, `studio/demos/**`, `registry.json`, `metadata/reference-inventory.json`, `tests/**`, `DESIGN.md`, `PRODUCT.md`, `.github/workflows/ci.yml` ve ilgili skill'leri oku.
- 14 Kasım 2026 inceleme noktası: `main=3387b75ca97ad880bfc11ccfa8ca2a1e110a1792`; Studio'da 82 referans demo, registry'de 86 öğe, React 19, Vite 8, Motion 14.14.0, TypeScript, Playwright, GitHub shadcn registry bulunuyor. **Bunları tahmin değil başlangıç bilgisi say, işe başlarken tekrar doğrula.**
- **BookPlace (`SapienXai/bookplace`) ve DineWallet (`SapienXai/RestaurantWallet`) repolarına HİÇBİR YAZMA İŞLEMİ YAPMA.** Dosya düzenleme, commit, branch, PR, merge, push, deploy YOK. İki markanın tema/örnekleri yalnızca MotionUX Studio içinde olabilir.
- Mevcut registry contract'ları, v1.0.0 tag'i, 82 katalog referansı, kurulum komutları, component kaynak kodları, testler ve global Codex skill'leri korunacak. Bu görev esasen **Studio UX/UI yeniden tasarımı**. Gerçek bir showcase bug'ını düzeltmek için MotionUX içindeki demo/registry componentine **dar, geriye uyumlu** müdahale serbest; bütün kütüphaneyi gerekçesiz yeniden yazma.
- Yalnızca MotionUX `main` üzerinde küçük, anlaşılır, testli commitler yap; push et. Force push, history rewrite, mevcut tag'i değiştirme, müşteri projelerine deployment yapma.
- Referans ekran görüntüsüne erişemiyorsan erişimi doğrulamadan hayali tasarım uygulamaya geçme; ekli görseli öncelikle aç/incele. Görsel erişilebilir olduğunda repo altında `docs/design-reference/motionux-studio-v5-reference.png` veya dosyanın gerçek formatıyla kayıt altına al. Sadece görüntü referansı olarak sakla; runtime'da arka plan görseli olarak kullanma.

## 1 — REFERANS GÖRSELİN DEĞİŞTİRİLMEYECEK TASARIM KARARLARI

**Görsel 1536 × 1024 px masaüstü screenshot'tır.** Aşağıdaki ölçüler referanstaki kompozisyonu izleyen yaklaşık hedeflerdir; nihai karar görsel karşılaştırmayla verilecek. Pixel ölçüsü ile font rendering/cihaz farklılığı çatışırsa, **optik birebirliğe öncelik ver**.

### A. Temel iskelet

- **Sol kalıcı sidebar ~270 px**: beyaz/kırık beyaz arka plan, sağda çok ince açık gri ayırıcı. Geriye kalan alan bütün genişliği kullanıyor.
- **Sağ üst yatay araç çubuğu**: yaklaşık 22 px yukarıdan başlayan, içerikte geniş yer tutan ince çerçeveli arama; sağda iki küçük ikon butonu (light/dark ve GitHub). Sidebar'dan bağımsız hizada.
- **İçerik başlangıcı sidebar sağından ~18–34 px içeride.** Gözle görülür ancak israf etmeyen whitespace.
- **Hero**: tek satırda güçlü sans-serif başlık **“Beautiful motion. Ready to use.”**, hemen altında **“Premium interactive components for modern React applications.”**. Gereksiz illustration, hero art, gradient billboard, sağda istatistik kutusu veya devasa padding EKLEME.
- Hero'nun altında görseldeki gibi nefes alan boşluk, ardından kart galerisi.
- **Masaüstünde 2 sütunlu, yatay (horizontal) bileşen kartları**. **3/4 sütunlu küçük kutucuk şablonuna çevirmek YASAK.** Kartlar büyük, kolay deneyimlenen preview'lerle dolu olmalı.
- Kartlar açık renk ince border'lı, hafif yuvarlatılmış, çok düşük shadow'lu, bol beyaz boşluklu. Kartlar arasındaki boşluk ~14–18 px. Sayfanın toplam görünümü temiz, minimal, optik olarak hizalı.

### B. Sidebar — referanstaki kompozisyon

Üstte:
- Özgün, küçük **mercan/coral tonlu çift şeritli MotionUX logosu** (gerçek bir SVG/component olarak çiz; screenshot kesiti kullanma), sağında **MotionUX**, altında aralıklı büyük harflerle **STUDIO**. Boyut/oran referansa yakın.
- Ana gezinme satırları: `Gallery` (aktif mercan açık zemin), `Playground`, `Components`, `Guides`, `Examples`.
- İnce divider.
- `CATEGORIES` küçük uppercase section title.
- `All components` ve kayıtlar: `Navigation`, `Buttons`, `Cards`, `Inputs`, `Gestures`, `Feedback` öncelikli; diğer gerçek kategori grupları (ör. Typography, AI, Media) da 82 katalogdan eksiksiz erişilebilir olacak. Yanlarında küçük doğal count pill'leri.
- Counts **gerçek inventory/registry verisinden türetilecek**. Screenshot'taki örnek sayıları yanlış bile olsa statik kopyalama YOK.
- Alt divider ve ekranın altına yakın **“Use MotionUX in your project”** CTA kartı: minimal yıldız simgesi, iki/üç satırlık açıklama, mercan `Get started →` butonu. Buton gerçek kurulum rehberini açmalı.
- Sidebar **bir tasarım arşivi listesi değil**, rafine ürün navigasyonu. Sidebar scroll'unu makul tut; dar yüksek ekranlarda promo içeriği önemli kontrolleri itmesin.

### C. Main toolbar

- Tek satırlı büyük arama kutusu: solda search ikonu ve `Search components...`; focus state net, border ince, yüksekliği görseldeki gibi yaklaşık 44–48 px.
- Sağda kutulu güneş/ay tema butonu ve GitHub ikonu. Tam işlevli; tüm navigasyonlar/focus/touch ve `aria-label` tutarlı.
- Görselde bulunmayan top navbar sekmeleri, dikkat çekici promosyon rozetleri veya ekstra CTA dizisi koyma.

### D. Kartların birebir içerik düzeni

Her galeri kartı **yatay iki parçalı**:
1. **Solda yaklaşık %62–66** genişliğinde, padding içinde açık lila/gri (`#f1eef8` ailesi) renkli büyük **canlı preview stage**; köşeler yumuşak, aydınlık, bazı componentlerde subtil gerçek shadow/depth.
2. **Sağda yaklaşık %34–38** metin/CTA bölümü: üstte kalın component adı (ör. `Sliding Tab Pill`), 1–3 satır doğal açıklama, ince açık gri category chips, altta border'lı `▷ Open playground →` action.
3. Kart genişliği ve iç boşlukları screenshot'taki gibi; sağ metin rahat okunmalı, stage sıkışmamalı. Her kartın toplam yüksekliği referanstaki ilk altı kartla yaklaşık aynı seviyede (~235–245 px).
4. **Kartları dikey preview-üstü / başlık-altı modern kart şablonuna dönüştürme** (masaüstünde). İki parçalı yatay karakter kritik.
5. **İlk görünür altı kartın sıra, ad, içerik, kompozisyonu referansa yakın olacak:**
   - Sol üst: **Sliding Tab Pill** — `Overview / Analytics / Members`, hareketli pembe selection pill.
   - Sağ üst: **Loading to Success** — `Processing...` durumundan `Completed` pill'ine yumuşak, gerçek state transition.
   - Sol orta: **Expandable Card** — `Premium Room`, küçük otel görseli, kısa özet; açılınca King bed / Wi-Fi / Breakfast detayları.
   - Sağ orta: **Morph Dropdown** — coral `New action` butonundan `Create / Share / Duplicate` menüsüne doğal morph.
   - Sol alt: **Profile Card** — gerçekçi örnek avatar, `Emma Carter`, `Product Designer`, 128/24K/312 demo istatistikleri; zarif kart derinliği.
   - Sağ alt: **Swipe Deck** — soft pembe/lila seyahat kartları, `Santorini`, `Greece`, gerçek swipe/drag.
6. Görselin altı yalnızca ilk 6 componenti gösterir; **galeri aşağı kaydırıldığında 82 kayıt eksiksiz devam edecek**. Referansı tamamlamak adına diğer componentleri silme.
7. Component kartı içindeki aktif demo etkileşimi ile `Open playground` navigasyonu **farklı event yüzeyleri** olmalı; demo içindeki click/drag/keyboard yanlışlıkla sayfayı değiştirmemeli.
8. Preview'ler poster, CSS temsili, sabit screenshot veya GIF olmayacak. **Mevcut MotionUX componentlerinin canlı React implementasyonları** kullanılacak.

### E. Tipografi, renk ve yüzey

- Büyük hero: modern, temiz, güçlü **sans-serif** (Inter/Geist karakterinde), sıkı ama rahat satır/aralık. Eski Instrument Serif/italik dev hero'yu kaldır.
- Logo ve kart başlıklarında kendinden emin yazı kalınlığı, gövde açıklamasında koyu gri, kategori/metadata'da daha açık gri.
- Yaklaşık token başlangıçları: `canvas #fcfbfa`, `surface #ffffff`, `stage #f1eff8`, `ink #15151e`, `muted #666675`, `line #e4e0e9`, `accent #f16f6b`, `accent-soft #ffe9e8`; **görsele bakarak gerçek tonları ve kontrastı tune et**. Bunlar screenshot'un yerine geçmez.
- Çok hafif shadow, az sayıda accent; ikonda Lucide'dan tutarlı stroke. Yüksek kontrastlı siyah/coral dengesi.
- Koca blur orb'lar, parlayan gradient zeminler, liquid-glass gösterisi, neumorphism, rastgele 3D paneller, gereksiz büyük border radius, kalın drop shadow, parallax hero **YASAK**. Zengin hareket **componentlerin içinde** olacak; çerçeve sakince onların sahnesi olmalı.
- Screenshot'ta avatar, otel, Santorini benzeri içerikler vardır. Aynı kompozisyonu destekleyen **lisanslı/özgün yerel demo assetleri** kullan; telifsiz hakkı kontrol et, metadata/notices ekle. Thumbnail'ların aspect ratio, ağırlık ve crop'u referansa benzesin. Gerçek kullanıcılara ait kişisel veri kullanma.

## 2 — MOTION VE MİKRO-ETKİLEŞİM SİSTEMİ

**Her hareketin amacı ve fiziksel karakteri olsun.** MotionUX bir animasyon vitrini ama Studio chrome'u animasyonla bağırmamalı. Premium hissi doğru hız, küçük hareket, tutarlı spring ve kesintisiz state geçişlerinden gelecek.

### Studio chrome micro-motion

- Sidebar aktif pill geçişi: link değiştiğinde yumuşak shared layout indicator (~220–350 ms, ayarlı spring), focus durumu görünür.
- Sidebar row hover/press: hafif background/ikon-etiket geçişi (~120–180 ms), aşırı scale yok.
- Search: focus border, temiz command/search etkileşimi; masaüstünde ⌘K/Ctrl+K gerçek çalışmalı, Escape kapatmalı/temizlemeli; klavye odağı doğru.
- Theme toggle: güneş/ay arasında kısa rafine geçiş; tüm yüzeylerde renk değişimi tutarlı. FOUC ve temanın yenilemede gereksiz sıçramasını önle; yerel tercih kalıcılığını gerekiyorsa güvenli uygula.
- Gallery filtre geçişleri: stable keyed layout, kontrollü 180–300 ms reorder/enter/exit; ekran kaymasın ve erişilebilir `aria-live` sonuç sayısı bulunsun.
- Card hover: 1–2 px hafif lift/elevation, gölge/border inceliği; ana preview animasyonunu override etme. Touch'ta hover taklidi yok.
- `Open playground` CTA: ikonun küçük yönlü hareketi, press feedback; gerçek route/query deep link.
- Preview componentleri: her biri **kendi orijinal MotionUX etkileşim davranışını** çalıştırmalı; aynı fade+scale animasyonunun her karta kopyalanması yasak.
- Playground açılışı/kapanışı: route state, focus ve scroll devamlılığı; yönlü hafif geçiş. `prefers-reduced-motion` ile anında.
- Gerekirse (yalnızca doğru olduğu yerde) Motion shared `layoutId`, `AnimatePresence`, `useSpring`, transform/opacity kullan. Keyed remount ile açık menülerin her hareketinde state kaybetme.

### En kritik altı demo için quality bar

- **Tab Pill**: selection gerçek spring ile pürüzsüz kayar; hızlı tekrar tıklamada pozisyon atlamaz; keyboard Home/End/arrow, RTL ve disabled durumları testli.
- **Loading to Success**: pending→success→reset kontrollü demo state'i; yalnızca demo modunda simulated completion, asla gerçek ürün işlemini başarılı göstermeye bağlı yanlış semantik yok. Reduced motion anında doğru label.
- **Expandable Card**: kart boyu/içeriği doğal açılır, köşe/yerleşim continuity, text clipping yok, hızlı aç-kapat ve focus korunur; aynı stage'de collapsed/expanded örnek olarak da sunulabilir.
- **Morph Dropdown**: trigger ile menü arasında algılanır şekil ve hacim sürekliliği; `scale` animasyonuyla açılan sıradan dropdown'u “morph” kabul etme. Overlay viewport edge, ESC, focus return, outside click ve touch çalışmalı.
- **Profile Card**: görsel derinlik ve tıklanınca anlamlı gerçek profile details state; sadece dekoratif profil screenshot'u değil.
- **Swipe Deck**: parmak ve pointer ile sürükleme, drag cancel/velocity, card stacking, gesture ve horizontal scroll çatışması çözülmüş; sağ/sol erişilebilir alternatif.

### Motion etik kuralları

- UI her zaman animasyon kapalıyken de tam işlevli olsun.
- `prefers-reduced-motion`, düşük güç, düşük FPS ve offscreen için yumuşak fallback.
- **82 component aynı anda looping/autoplay yapmasın.** Görünen stage'ler bile gerekli etkileşimler dışında idle kalsın.
- Scroll-jacking, sürekli çalışıp CPU tüketen `requestAnimationFrame`, aşırı blur/backdrop-filter ve pahalı layout-thrashing yok.
- Hareketi sahte başarılı ödeme, rezervasyon veya sistem durumu üretmek için kullanma.

## 3 — GERÇEK GALLERY / PLAYGROUND ÜRÜN DAVRANIŞI

### Gallery

- Giriş URL'si kullanıcıyı **doğrudan referanstaki Gallery** ekranına getirsin. Eski editorial “field guide” tasarımının ana sayfada izi kalmasın.
- 82 `metadata/reference-inventory.json` kaydı ve `studio/catalog.ts` demo mapping'leri **tek source of truth** olsun. İlgili kategorilere gerçek sayıları yansıt; arama ad/açıklama/kategori/sağlayıcı üzerinden çalışsın.
- Sidebar category filter ile search birlikte çalışmalı; URL üzerinden deep link, tarayıcı back/forward ve paylaşılabilir state korunmalı.
- Bir kategori boşsa düzgün empty state; 82'nin herhangi biri yüklenemezse açık hata state'i ve retry; **boş kart / fake demo / sessiz catch yok**.
- Gallery kartları gerçek componentli demo içerir. Default state görseldeki duruşa yakın olmalı ama kullanıcı oynayabilmeli; demo üzerinde reset seçeneği erişilebilir.
- Lazy-load heavy preview modules; görünürlükte mount, offscreen pause/unmount stratejisini test et. İlk altı kart ve scroll ederken çoklu preview gösterimi hızlı olmalı. Çok fazla reactive timer/observer birikmesin.
- Runtime sırasında 82 card responsive render edilmeli; count/isimler hardcoded veya birbirinden kopuk JSON listeleriyle çoğaltılmamalı.
- Her kartta gerçek component status/provenance gerekiyorsa discreet sun; mevcut `needs-review` kayıtlarını “production ready” diye gösterme.

### Playground / detay

- `Open playground` tıklanınca **aynı premium tasarım dilinde tam işlevli detay deneyimi** açılsın. Ayrı generic developer docs sayfasına atma.
- Preview merkezde büyük stage; sekmeler veya panelde: `Preview`, `Props`, `Variants`, `States`, `Code`, `Install`, `Usage`, `Accessibility`, `Source` (bilgi yoksa uydurma; eksik veri açıkça bildir).
- Desktop/tablet/mobile stage width; light/dark; **Neutral / BookPlace / DineWallet** theme adapters; TR/EN; reduced motion; replay/reset/controlled test state. Kontroller gerçekten etkisini göstersin.
- `Code` tab'i ilgili **gerçek source code'u** ve CSS'ini gösterip kopyalayabilsin; üretilmiş hayali kod olmasın. Build/bundle kaynak gösterimi uygunsa statik doğrulanabilir raw import veya bilinen kaynak bağlantısı kullan.
- `Install` tab'i ilgili registry item'in **doğru pinlenmiş, doğrulanmış shadcn komutunu** göstersin; dev/geliştirme SHA'sı ile stable sürüm ayrımını dürüstçe göster.
- API/prop controls mümkünse gerçekten durum değiştirip gerçek preview'ü etkilesin. Yalnızca metinsel property listesi göstermenin adı playground değildir.
- Geri dönüldüğünde galeri filtreleri, scroll pozisyonu ve kullanıcı tercihlerine makul şekilde dönsün.
- Kategori listesi ile Playground gerçek route/URL state'i tutarlı olsun; deep link ve reload bozulmasın.

### Sidebar'daki diğer işlevler

Referans görselde görünen **Gallery, Playground, Components, Guides, Examples, Get started** kontrolleri tıklanabilir ve **gerçek yararlı** hedefe götürmeli:
- Gallery: ana bileşen galerisi.
- Playground: son seçili / featured bileşenin detayına.
- Components: gerçek registry, kategori ve kurulum bilgisini keşif görünümüne.
- Guides / Get started: repo içinde zaten mevcut README, komponent kullanımı ve shadcn kurulumuna bağlı düzgün, site-içi rehber görünümüne (veya doğru mevcut dokümana). Boş placeholder sayfa değil.
- Examples: gerçek, çalışır örneklerin olduğu Studio içeriği veya doğrulanabilir örnek route'u.
- GitHub butonu gerçek `SapienXai/MotionUX` adresine.
- Navbar/Sidebar etkileşimleri mobilde de erişilebilir.

## 4 — MOBİL: REFERANSIN DOĞAL, PREMIUM UYARLAMASI

Referans **desktop** ekranıdır, mobil görsel verilmedi. Desktop tasarımını değiştirmeden, mobilini aynı estetik dilde **bilinçli tasarla**:

- **>= 1400 px:** Screenshot'a en yüksek sadakat; yaklaşık 270 px kalıcı sidebar; iki sütun yatay kart.
- **1200–1399 px:** Uygun kaldığı sürece iki sütun; kart içeriğinin okunurluğu veya stage davranışı bozuluyorsa bir sütuna in.
- **768–1199 px:** Daraltılmış veya açılıp kapanan sidebar; galeri öncelikli; çoğunlukla tek sütun yatay kart.
- **<= 767 px:** Kompakt header (logo, search, theme, menü); sidebar erişilebilir **sheet/drawer** ile açılır; galeri **tek sütun**; kartın preview kısmı üstte, açıklaması altta (masaüstündeki iki parça estetiği korunarak). Playgrounds mobile-first.
- 320/360/375/390/430 px sınamaları. Safe area, sticky header, iOS bottom region, browser toolbar; yatay taşma sıfır.
- Mobil touch target >= 44 CSS px (uygun istisnaları gerekçelendir), input font >=16 px, focus ve metin kontrastı erişilebilir.
- Sidebar drawer ESC, backdrop close, scroll lock ve focus restore, keyboard ile kullanılabilir.
- Preview içindeki drag, sayfa dikey scroll'unu kilitlemesin. Hover'a bağlı vazgeçilmez işlevler olmasın.
- Component farklı browser motorunda kırılırsa doğru fallback; emülatör sonucunu “fiziksel Safari test edildi” diye raporlama.

## 5 — MİMARİK UYGULAMA VE KOD KALİTESİ

Mevcut Vite/React/TS/Motion mimarisini koruyarak Studio codebase'i modülerleştir. Yüzlerce satırlık tek `studio/main.tsx` ve sürekli sonuna eklenen CSS override'larıyla iş bitirme. Gerektiğinde:

```text
studio/
  app/ (or existing suitable structure)
    StudioShell
    StudioSidebar
    StudioHeader
    Gallery
    GalleryCard
    LivePreviewStage
    Playground
    Guides
    ThemeProvider
  demos/             # existing 82 real demos preserved
  catalog.ts         # existing source-of-truth preserved
  styles/            # scoped design tokens, layout, states, responsive
```

- Dosya yapısı öneridir; mevcut projeye uyarlanabilir. **İsimler önemsiz; gerçek modülerlik, temiz import, erişilebilirlik ve görsel eşleşme önemli.**
- Global CSS reset demo componentlerinin özel stillerini bozmamalı; Studio chrome CSS'i scope içinde kalmalı.
- Preview içindeki React component gerçek registry kaynağını kullansın; ikinci mock implementasyon yazma.
- Dark/light ve brand theme değişimi nested component states'i gereksiz resetlemesin.
- 82 demo yükleyicisi (dynamic import) korunmalı, test coverage zayıflatılmamalı.
- `motion/react` yeterliyse yeni animasyon dependency ekleme. Animasyon yükünü hafif tut.
- Client-only API kullanırken SSR/consumer sınırlarını bozma. Stable `v1.0.0` registry ve mevcut pinli importlar etkilenmesin.
- Var olan `DesignBookmark` kaynak referansları ve lisans/provenance dokümanlarını koru. Referans markasının logosunu/metin assetlerini kopyalama; screenshot MotionUX için sağlanmış tasarım referansı, ürün kodunun temelidir.
- Karmaşık component card interaction focus/state'in başka bir karta geçerken sızmamasını sağla; component preview ile link CTA event boundaries net.

## 6 — HIZ VE PERFORMANS: BİRİNCİ SINIF KABUL KRİTERİ

**Öncelik: görsel kalite + gerçek motion + düşük maliyetli runtime.** 82 demo gösteriyoruz diye 82 JS motorunu başlangıçta çalıştırma.

- Katalog metadata'sı küçük ve statik/import edilebilir; preview modülleri on-demand code split.
- İlk viewport'taki card preview'leri görünür olduklarında mount et; viewport dışındaki ağır gesture/observer/timer'ları durdur veya kontrollü de-mount et. Kullanıcı scroll ederken fark edilir boş ekran istemiyoruz; skeleton stage sabit ölçüde ve kısa süreli olsun.
- Cumulative layout shift küçük; görüntü ve card ölçüleri önceden rezervli. Örnek görseller optimize, local, lazy, `width`/`height` veya `aspect-ratio` bilgili.
- İcon için mevcut Lucide, tipografi için mümkün olduğunca mevcut yerel fontlar; ekstra web-font zinciri kurma. Eski Instrument Serif yükü artık kullanılmıyorsa sadece Studio entry'den çıkar.
- Hareketler çoğunlukla `transform`/`opacity`; hover feedback için non-composited pahalı efektten kaçın.
- Studio baseline JS ve yeni JS/bundle gzip ayrı ölç; **gereksiz artışa izin verme**. İlk route için makul hedef **<= ~170 KB gzip JS** (ağ/asset hariç) veya ölçüme dayalı açıklamalı gerekçe; önceki repodaki mevcut 83.5 KB entry / ~133 KB featured örneği referans olarak kullan. Bu ölçümler 14 Kasım raporundandı, yeniden ölç.
- Web Vitals hedefleri: lab ortamında LCP <2.5s, CLS <0.1, INP <200ms mümkünse; donanım/ağ koşullarını raporla, kesin garanti/uydurma yapma. Özellikle filtre geçişi ve overlay'lerde frame drops/long tasks gözle.
- CPU 4× throttle altında en az ilk viewport, filtre, card click, tema değiştirme, hızlı scroll, Swipe Deck ve Morph Dropdown profilini al.
- Gerçek iOS cihaz mevcutsa test et; yoksa WebKit emülasyon kapsamını açıkla.
- `requestAnimationFrame`, ResizeObserver, IntersectionObserver, animation subscriptions ve event listeners cleanup; memory leak ve hızla çok kez mount-unmount sorunları olmasın.
- Kullanıcının eski iPhone/Safari PWA tecrübelerini akılda tut; düşük güçlü cihazları dışlama.

## 7 — GÖRSEL KABUL: EKRAN GÖRÜNTÜSÜ OLMADAN 'TAMAMLANDI' DENMEYECEK

### A. Tasarım sadakati süreci

1. Ekteki **V5 referans screenshot'ı** aç, bölgelere ayır: sidebar, topbar, hero, kart sistemi, lila stage, card description, CTA, promo.
2. `docs/design-reference/STUDIO-V5-DESIGN-SPEC.md` oluştur: referans boyutu, büyük bölgelerin tahmini x/y/width/height, spacing, tipografi, renk, radius, border, shadow ve davranış kararları. Bu yalnızca uygulamaya yön veren bir kısa spec; analizde durma.
3. Birebir desktop iskeleti kodla. **1536 × 1024** görüntü al. Yan yana referans ve güncel screenshot kontrolü yap.
4. Önce **büyük makro farkları** düzelt: yanlış sidebar genişliği, yanlış 2-col grid, kart oranları, font/hero, renk, preview stage, CTA position. Sonra **mikro farkları** düzelt.
5. En az üç somut görsel kontrol döngüsü gerçekleştir veya anlamlı fark kalmadığında daha erken dur. İlgili diff/overlay çıktılarını kaydet.
6. Mobil adaptasyonları oluştur, gerçek touch/keyboard ile test et; son screenshot'ları kaydet.

**Referans uyumunu bozacak 'tasarım özgürlüğü' YOK.** Örneğin sağdaki component açıklamasını preview altına almak, 2-col'u 3-col yapmak, coral rengi mavi/mor yapmak, sidebar'ı masaüstünde kaldırmak, hero'ya büyük ek görsel koymak veya kağıt/serif estetiğini geri getirmek kabul edilmez.

### B. Kaydedilecek kanıtlar

`docs/evidence/studio-v5/` altında en az:

- `reference.png` veya özgün dosyanın gerçek uzantısıyla kayıt.
- `desktop-1536x1024-light.png` (**referans ana kontrol**).
- `desktop-1440-light.png`.
- `desktop-dark.png`.
- `tablet-768.png`.
- `mobile-390-light.png`.
- `mobile-390-dark.png`.
- `mobile-375-drawer-open.png`.
- `playground-desktop.png`.
- `playground-mobile.png`.
- `reference-comparison.png` (yan yana/overlay veya fark işaretleri).
- İlk altı gallery card'ın **aktif etkileşim hâllerine** ait screenshot veya kısa original interaction capture (video/GIF gerekli olanlarda).

Git'e boyutları makul optimize edilmiş kanıtlar ekle; ekran görüntülerini “inceledim” diyorsan gerçekten açıp kontrol etmiş ol.

### C. Testler

Eski testleri kapatma, assertion'ları silme veya sahte pass yazma. Güncelle / ekle:

- GitHub CI: lint, typecheck, build, existing `npm run verify`, shadcn registry smoke.
- `Gallery`: 82 öğe erişilebilir, gerçek category counts ve filters, arama, empty, back/forward/reload.
- Ekran büyüklükleri: 1536x1024, 1440x900, 1280, 1024, 768, 430, 390, 375, 360 ve 320.
- Desktop tam layout: sidebar sabit, 2-column horizontal cards, ilk altı sıra/isim doğru, toolbar/hero/paylaşım hizası, CTA/promo.
- `Playground`: Open, back, deep link, preview settings, kullanım/kurulum kopyalama; başka karta geçince stale state yok.
- Her kartın içinde live specimen mount ve gerçek input/click/drag; demo tıklanınca yanlışlıkla navigasyon yok.
- Keyboard: sidebar nav, focus, Escape, tab order, search shortcut, menu/dialog focus restore.
- Reduced motion: normal preview çalışır, spatial effects kapalı, state aynı.
- Axe, 200% zoom, uzun TR kelimeler, dark/light contrast, tooltip/overlay sınırlar.
- Scroll/render: görünmeyen ağır demo çalışmıyor; mount/unmount, component reset, rapid interactions.
- İlk altı animasyonun ayrı ayrı hareket/hız/focus ve interruption testleri.
- Source/license ve registry metadata korunmuş, 82/82 demo mapping var, 86 installable registry item bozulmamış.
- Firefox destekleniyorsa kontrol; Chrome ve WebKit zorunlu. Bunlar emülasyon olduğunda dürüstçe raporla.

Çıktı: `docs/STUDIO-V5-VERIFICATION.md` içinde gerçek komutlar, test sayıları, ölçümler, görsel kabul notları, bilinen eksikler.

## 8 — UYGULAMA FAZLARI (ARDIŞIK, GERÇEK GELİŞTİRME)

**Faz 1 — Audit + referans kontratı**
- Mevcut branch ve repoyu doğrula, screenshot'u aç, v5 tasarım spec'i çıkar. İki ürün reposuna dokunmama kuralını kayda geçir.

**Faz 2 — Pixel-faithful desktop shell**
- Studio'nun mevcut editorial hero/sol metin listesi yerleşimini kaldır. Logo, sidebar, header/search, hero, 2-col yatay card grid ve CTA'yı screenshot'a mümkün olduğunca sadık kur.

**Faz 3 — Gerçek component galerisi**
- Mevcut `studio/catalog.ts` + 82 demo'yu yeni GalleryCard bileşenine bağla. İlk altı demo screenshot'taki sırada/kompozisyonda; diğer 76 kesintisiz galeride. Hover, focus ve gerçek preview davranışları.

**Faz 4 — Playground + yardımcı rotalar**
- Önceki teknik detay yeteneklerini kaybetmeden yeni deneyime uyumlu, gerçek Code/Usage/Install/Props/Theme/Responsive panellerini hazırla. Sidebar'daki bütün linkleri işlevli yap.

**Faz 5 — Motion craftsmanship**
- Studio micro-interactions, layout transitions, first six live demos'un motion polish'i, reduced motion. Gerekli ise sadece MotionUX içindeki ilgili demo/component kodunu geriye uyumlu düzelt.

**Faz 6 — Mobile + performance**
- Drawer/safe-area, 1-col stacked card, touch gestures, offscreen lazy mount, JS/perf profiling. Kötü performansı tasarımın bir bedeli olarak kabul etme.

**Faz 7 — Visual regression + kanıt + CI**
- 1536px screenshot karşılaştırmasını yinele. Belirgin farkları düzelt; tüm testleri çalıştır. Güncel README, DESIGN.md ve Studio docs'u yeni tasarıma göre yaz. Eski screenshot'ları güncel gibi öne çıkarma.

**Faz 8 — Commit ve teslim**
- Testli küçük commitler, `SapienXai/MotionUX` `main`e push. CI sonucunu kontrol et. V2'nin release gate'i kapanmadıysa `v2.0.0` basma. Production deploy yapma.

## 9 — KESİN KABUL KRİTERLERİ — 'DONE' TANIMI

**Hiçbirini eksiltme:**

1. `1536x1024` light desktop ilk ekranı referansla bakıldığında **aynı kompozisyon**: sidebar ~270 px, search + iki icon, birebir hero, **2 sütun yatay kart**, solda lila stage, sağda açıklama/CTA, altta promo.
2. Referanstaki ilk altı kart **aynı sırada**; içlerindeki React componentler gerçekten çalışıyor.
3. Galeride 82 canlı önizlemeye erişim; statik resim/gif hilesi yok; scroll ederken performans korunuyor.
4. Sidebar kategorileri, search, filtreler, theme, GitHub, promo, playground linkleri, Copy/Install/Code gerçek çalışıyor.
5. Playground işlevsel ve yeni Studio görsel diliyle aynı; marka temaları sadece MotionUX içinde.
6. Mobile tablet desktop adaptasyonları; accessibility, keyboard, reduced motion, dark mode, touch/safe area başarılı.
7. Animasyonlar rafine ve kesintisiz; özellikle Tab Pill, Loading→Success, Expand Card, Morph Dropdown, Profile Card, Swipe Deck'te gerçek kalite kontrolü.
8. Mevcut registry, v1 stable etiket, 82 referans, 86 registry item ve ürün pilotları etkilenmemiş.
9. CI yeşil; ciddi hata yok; screenshots ve reference comparison repo içinde; güncel doğrulama ve gerçek performans ölçümleri raporlanmış.
10. Tüm yeni değişiklikler **yalnızca MotionUX** içinde commit/push edilmiş. BookPlace/DineWallet `main` ve production'a hiç dokunulmamış.

**YAPMA:**
- Kod yazmadan “plan tamamlandı” deme.
- “Benzerini yaptım” deyip ekranı farklı tasarımla teslim etme.
- Responsive gerekçesi olmadan desktop kart yapısını değiştirme.
- Sahte/işlevsiz buton, ölü bağlantı veya kopyalanamayan kod bırakma.
- 82 bileşeni tek seferde autoplay ile başlatma.
- Registry üzerinde büyük kırıcı refactor yapma.
- Studio'yu yeni repo/framework altında yeniden yaratma.
- Kullanıcıdan her fazda tekrar onay isteme; tanımlı kapsamdaki değişiklikleri uygula.

**SON RAPOR FORMATIN:**
- Yapılan en önemli görsel değişiklikler (referans eşleştirmesiyle).
- Before/after 1536 × 1024 screenshot linkleri ve mobil screenshotlar.
- Galeri 82/82 gerçek preview, Playground/Sidebar işlevlerinin test sonucu.
- Micro-motion ve performans ölçüm tablosu (gerçek değerler).
- CI linki, testler, commit SHA ve `main` push durumu.
- Dürüstçe kapanmayan eksikler varsa bunlar; neyi yapamadığını saklama.
- BookPlace/DineWallet repolarına **yazma işlemi yapılmadığı** açık teyidi.

**ÖNCELİK SIRASI:** `Reference fidelity > gerçek etkileşim ve UX > hissedilir motion kalitesi > erişilebilirlik ve performans (bunlar temel kalite koşuludur) > süs`. Hız uğruna kaliteyi, kalite uğruna hızı feda etme. Yeni bir dashboard tasarlamıyorsun; **tam olarak bu MotionUX Studio V5 ekranını hayata geçiriyorsun.**

**Hemen uygula.**
