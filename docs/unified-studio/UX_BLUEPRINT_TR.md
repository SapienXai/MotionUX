# MotionUX — Unified Studio / UX Blueprint

**Sürüm:** V1, 19 Kasım 2026  
**Kapsam:** SapienXai/MotionUX, mevcut kaynak kodu temel alınarak tam ürün UX dönüşümü.  
**Hedef:** Mevcut motorların gücünü korurken ürünü tek, akıcı, anlaşılır ve tutarlı bir deneyime dönüştürmek.

> **Not:** Bu dosya uygulamaya yön veren ürün tasarım sözleşmesidir. Altı PNG görseli görsel referanstır. Ekranlardaki proje isimleri, sayılar, avatar, statüler, tarihler, örnek veri ve lisans etiketleri yalnızca temsilidir. Üründe gerçek/hesaplanan veriler kullanılmalı; doğrulanmamış kaynaklar asla "Verified" olarak gösterilmemelidir.

## 1. Kesin ürün kararı

MotionUX; ayrı ayrı Gallery, Playground, My Library, Brain, Build ve Agent ekranları arasında gezilen bir araç koleksiyonu olarak sunulmamalıdır. **Projects**, **Studio**, **Discover** üç temel deneyimdir:

- **Projects:** Giriş noktası. Kullanıcı doğal dille uygulama oluşturur; mevcut projeleri, durumlarını ve son çalışma yerini görür.
- **Studio:** Bütün proje düzenleme ve üretim işlerinin çalışma alanı. Canvas merkezli; sayfa/yapı solda, seçili öğe özellikleri sağda; AI istemi, canlı önizleme, kaydetme, sürüm, export ve teknik araçlar bağlamsal.
- **Discover:** Bileşenleri tek katalogda keşfetme, deneme, lisans ve uyumluluk inceleme, kaydetme ve mevcut projeye aktarma. Studio içinden modal/sheet olarak da erişilir. "Playground" burada öğenin canlı önizleme modudur, ayrı ürün değil.

**Studio**, proje açıkken geçilen bağlamsal çalışma alanıdır. Global üst menüde sürekli Projects ve Discover yeterlidir; üçüncü ayrı navigasyon öğesi olarak Studio eklemek zorunlu değildir.

## 2. Referanslar ve tasarım sözleşmesi

| Dosya | Temel ekran | Vurgulanacak unsur |
|---|---|---|
| `references/projects.png` | Projects desktop · Light | Tek ana create CTA, tek brief alanı, son projeler, az kontrol |
| `references/studio.png` | Studio desktop · Dark | Birleşik shell, sol sayfa ağacı, gerçek canvas, sağ seçili öğe özellikleri, alt AI composer |
| `references/discover.png` | Discover desktop · Light | Tek katalog, canlı specimen, uygunluk/provenance, proje içinde kullanım |
| `references/mobile-studio.png` | Studio mobile · Dark | Tam ekran öncelikli canvas, alt navigasyon, sheet tabanlı özellikler, AI isteği |
| `references/studio-add-component.png` | Studio içinde Add drawer · Dark | Projeden ayrılmadan arama, gerçek specimen, seçim ve projeye ekleme |
| `references/mobile-add-sheet.png` | Studio içinde mobil Add sheet · Dark | Tek parmakla erişilen, kısa, sabit CTA ve alt panel |

**Öncelik:** Bilgi hiyerarşisi, ekran bölgeleri, boşluk kullanımı, etkileşim ve haller > renklerin birebir kopyası. Referanstaki temsili sahte ürünü aynen üretmek değil, **gerçek MotionUX işlevlerini bu UX sistemine oturtmak** hedeflenir. Görseller kullanılabilir mockup; çalışan kodla çelişen, gerçeğe aykırı işaretler uygulamaya aktarılmamalı.

### Tasarım karakteri

- Apple/Linear/Vercel düzeyinde ferah, modern, profesyonel. Ne aşırı parlak glass ne ağır “admin dashboard” görünümü.
- Inter font; büyük başlıklarda sıkı harf aralığı; metin 13–15 px, kritik metin WCAG uyumlu kontrast.
- Light: `#f9f9fc` canvas, `#ffffff` surface, `#20212c` primary text, `#7459dc` selected accent; sınırlar yumuşak.
- Dark: `#0f1016` canvas, `#151620` pane, `#f3f0fb` text; vurgu muted lilac. Koyu modda kartlar zeminden yeterince ayrılsın.
- UI bileşenleri 8–16 px radius (ihtiyaca göre); 4/8 bazlı spacing; ürün genelinde birleşik token kaynakları.
- Kalıcı navigasyon katmanları en fazla bir üst toolbar + proje bağlamındaki gerekli paneller. Aynı görevi tekrar eden butonları kaldır.
- Hareket: kontrol feedback’i, select/hover/pressed, panel geçişleri, onay animasyonları; 120–220ms civarı akıcı varsayılanlar, ölçülmüş ve `prefers-reduced-motion` destekli. Gereksiz sürekli animasyon yok.
- Durumlar: loading skeleton, empty, success, error, retry, offline/unavailable, permissions/rights, unsaved/saved, background job progressing. Sadece renk değil metin/ikon ile aktar.

## 3. Navigasyon ve rotalar

Mevcut `platform/apps/studio/app/page.tsx`, `studio-chrome.tsx`, `studio/app/shell.tsx`, `lib/studio-bridge.ts` birlikte incelensin. Tasarım kararları:

1. **Tek global header**. Uygulama her yerde aynı markayı, Projects/Discover geçişini, arama ve sistem/light/dark görünümünü kullanır.
2. **Projects ana giriş:** root (`/`) veya uygun kanonik route bu deneyimi gösterir; eski `/build` derin linkleri ve açık proje URL'leri çalışmaya devam eder veya kontrollü redirect alır.
3. **Katalog yolu:** `/discover` kanonik konum olabilir. 5199 legacy kaynak URL'leri kırılmasın. Mevcut 5199/5200 güvenli origin kontrolleri korunmalı, sahte tek origin varsayımı yapılmamalıdır.
4. **Back / browser history:** projeyi bırakıp Discover'a gidince seçim, arama, scroll, proje revizyonu ve taslak geri dönülebilir olsun.
5. **Tek global arama davranışı:** boş bağlamda catalog; proje içindeyken proje öğeleri/sayfalar ve bileşenlere yönlendiren anlamlı sonuçlar. Mevcut Ctrl/Cmd+K mantığıyla çakışma olmamalı.
6. Eski Gallery/Library/Source/Build bağlantıları korunur; gerekli route mapping/redirect yapılır. Kullanıcıya iki aktif navigasyon sistemi aynı anda gösterilmez.

## 4. Projects — kullanıcı görevleri

### İlk kez gelen

- İlk bakışta tek açık soru: **What are we building today?**
- Brief alanı + Create app. Bileşen seçimi isteğe bağlı; başlangıçta zorunlu ayar ekranı yok.
- `Add reference`, `Components`, `Design style` gibi ikincil seçenekler bağlamsal sheet açar. Yapılmayan/yeterli desteği olmayan seçenek sahte düğme olarak konmaz.
- Sistem, Brain/verified-source retrieval/native Codex akışını arka planda çalıştırır; işin aşamalarını kısa, anlaşılır ifadelerle raporlar.
- Başarılı üretimde aynı projenin Studio'suna gider. Hata varsa teknik ayrıntı `Details` altında, ana ekranda anlaşılır çözüm + Retry/Cancel/Recover.
- Template örnekleri isteyenlere secondary “Examples/Templates” yüzeyi; ana ekranı 6 template kutusuyla boğmaz.

### Geri gelen

- Son üç proje görsel kartları; son çalışma, durum ve devam et aksiyonu.
- “All projects” ayrı sonuç/sayfa; üretim, taslak, kırık revizyon, geri yüklenebilir proje durumları doğru yansıtılır.
- `Create app` girişine dönmek için proje ekranını terk etmek gerekmez.

### Bilinçli olarak gizlenenler

Legacy blueprint generation, low-level source selection mode, component count/config, test/provenance menüleri varsayılan girişe yığılmaz. Desteklenmesi gereken admin/advanced modlar ayrı bağlamsal menüye taşınabilir.

## 5. Studio — tek editör kabuğu

**Amaç:** üç belge türünün aynı kullanıcı kabuğunda yönetilmesi; yeni bir devasa ortak renderer yazılması değil.

### Güncel teknik ayrımlar (korunmalı)

- `platform/packages/build-canvas/editor.tsx`: Puck / typed block document. Blok ekleme, sürükleme/seçim, Puck fields, section palette, media, Edit/Interact/Run.
- `platform/apps/studio/app/build/source-editor.tsx`: SourceGraph eski B11 projeleri. Kendi controls, revision, source usage ve preview.
- `platform/apps/studio/app/build/code-editor.tsx`: B11R CodeProject; TSX/TS/CSS modules, declared controls, native module revision, verified Run/export. Arbitrary TSX için Puck drag/drop **yok** ve varmış gibi gösterilmemeli.
- `platform/apps/studio/app/build/kinetic-editor.tsx`: Source/Code türleri için başlamış ortak shell. Geliştirme burada veya yeni bir shared workspace shell'de yapılabilir.
- `platform/apps/studio/app/build/editor-loader.tsx`: tür seçimi; verinin temsilini dönüştürüp kayıplı migrate etmemeli.

### Ortak, kullanıcıya görünen arayüz

1. **Üst bar:** geri / proje adı / saved-unsafe indicator / Preview / Export; Undo/Redo yer varsa ikon veya menüde; tema kişisel menüde.
2. **Sol panel:** Pages listesi ve seçilen sayfanın Structure/Sections/Components ağacı. `+ Add component` tek noktadan açılır. Panel kapanır; dar ekranlarda sheet.
3. **Orta canvas:** gerçek proje görünümü, seçilen öğe çerçevesi, desktop/tablet/mobile viewport switch, gerçek width + zoom. Edit yerine gerçeğe en yakın canlı etkileşim tercih; mevcut renderer sınırları korunur.
4. **Sağ panel:** yalnızca seçilen öğenin **Content** alanları açık; Style, Motion, Advanced collapsed/secondary tab. Boş selection için proje düzeyi faydalı ayarlar.
5. **Alt AI input:** proje bağlamındaki `Revise with Codex` motorunun doğal dil arabirimi. Projeyi sıfırdan üretme değil mevcut revizyonu düzenleme; işi ve sonucunu takip etme.
6. **Tek Preview/Run kavramı:** kullanıcıya ayrı `Edit`, `Interact`, `Run`, `Open saved preview`, `Stop` gibi modlar aynı anda yüklenmemeli. UI “Live canvas” ve “Preview real app” şeklinde anlaşılır olmalı. Arkada draft vs saved revision ayrımı doğruluğunu korur.
7. **Export:** export/pwa seçenekleri tek menü/sheet; kaynak izinleri ve local-only sınırları açık, uygulanabilir mesajlarla gösterilir.
8. **Advanced:** Inspector, Integration Lab, provenance/usage, Motion DNA, source code ve diagnostic logs ancak ihtiyaç halinde açılır. Teknik kabiliyetler yok edilmez.

### Kritik davranış doğrulukları

- Seçilen control değişikliği gerçek kayda ve canvas'ı temsil eden revizyona doğru yansısın.
- Autosave/checkpoint ile gerçek Save/Run/Export sınırı gizlenmesin. Taslak varsa `Draft changes`, saved ise `Saved`. Gerçek persistence olmadan “Saved” denmez.
- AI revision devam ederken gerçek job state, Cancel ve hata geri kazanımı.
- Kaynak pin/haklar/export engeli preview ile karıştırılmaz.
- Legacy Puck projesinde drag/drop mevcutsa korunur, CodeProject'te native declared controls ile sınırlı olduğu açıklanır.
- Proje değiştirince undo history, dirty state, page selection, design identity, optional local notes karmaşaya yol açmasın.

## 6. Discover — birleşik bileşen deneyimi

### Kullanıcı akışı

`Discover/search → try original → inspect eligibility/license/source → add/save/use in project → Studio`.

- Kanonik kaynaktan katalog; Gallery ve Build component picker ikili katalog sürdürmesin.
- Bir bileşen için görsel kart + interaktif specimen + detay paneli; bugünkü ayrı Playground route'u tercihen bu panel/preview durumuna dönüştürülür.
- Filter: All, Featured/Recommended, Verified, Saved, Categories; provider ve source eligibility secondary filter.
- Teknik rozetler gerçeğe dayanır: **direct**, **connected/local-only**, **reference-only**, **unavailable**, **rights restricted**; açıklaması user-facing. *Compiler-ready* ile *visually verified* aynı şey değil.
- `Use in Project` proje seçimi + uyumluluk. Studio içinden açıldığında proje zaten belli; aynı bağlamda tek dokunuşla ekleme/niyet kompozisyonu.
- Bileşen seçim limiti (şu anda 4) ve limit gerekçesi net; gizlice aşılmaz. Arayüz ürün ihtiyacına göre uyumlu kaynakları öne çıkarmalı.
- My Library favorites/collections/notes tek catalog “Saved” altına taşınır. Mevcut kayıtlar kaybolmaz.
- Source attribution, pin, original/adapter ayrımı, lisans belgeleri saklanır ve gerektiğinde incelenir.

### Aynı kaynak kullanımı

`/discover`, Studio içindeki Add sheet ve Create app bileşen seçimi aynı arama, filtre, detay, uygunluk ve seçim durumunu paylaşan ortak component API/UI ailesini kullanır. Doğru bridge ve renderer izolasyonları korunabilir.

## 7. Mobil deneyim

- 320, 375, 390, 430, 768, 1024 ve 1440 px test. En önemli 390 ve 320.
- Mobil Studio: canvas öncelikli; Pages, Add, Properties için bottom sheet; varsayılan sürekli açık üç sütun yok.
- Floating AI composer veya bottom-anchored prompt; mobil alt navigasyonla çakışmasın, klavye açıldığında görünür kalsın.
- Tek parmak hedefleri en az ~44 px; klavye, dokunma, scroll, selection ve dialog focus yönetimi.
- Desktop code preview testlerinin yanında gerçek 320/390 overflow denetimi. Sistem zoom ve font scale testleri.

## 8. Motion, light/dark, erişilebilirlik

- `prefers-color-scheme` ile varsayılan system, kullanıcı light/dark override etsin. Studio ile Gallery arasında tutarlı.
- İyi kontrast, okunaklı küçük yazı, seçili/disabled/pressed/focus ve hovered states. Yalnızca gölge veya renk değil açıklayıcı işaretler.
- `prefers-reduced-motion` animasyon, auto-play preview ve drag-based controls için saygılı bir alternatif sağlar.
- Ekran okuyucu landmark/focus, Escape, Enter, ARIA label/expanded/current, dialog odak geri dönüşü. Bileşen specimen preview güvenli izolasyonda kalır.

## 9. Kod, kalite ve maliyet sınırları

- Tek ortak UX shell = tek runtime uygulaması zorunlu değildir. 5199 Gallery / 5200 Studio / isolated 5202 Run güven sınırları doğrulansın.
- Yeni abonelik, uzak servis, büyük veritabanı, ayrı bağımlı platform kurma. Var olan local-first, native Codex, source pin, export sözleşmesi korunur.
- CSS tokenlarını katmanlı şekilde birleştir; tarihsel override yığınlarını büyütme. Yeni universal CSS çakışmaları ekleme.
- Legacy veri koruma: açılabilir eski projeler, sürümler, local draft recovery, Project Kit, favorites ve existing source graphs kullanılmaya devam eder.
- İlgisiz mimari alanları yeniden yazma; güvenlik testlerini gevşetme veya E2E kaldırma.

## 10. Fazlar — Codex tek görev altında sırayla uygulayacak

**Faz 0 — Envanter / ölçüm:** actual HEAD + route map + 3 editör kabiliyeti + katalog/state kökenleri + screenshot & benchmark baseline + risk. Mevcut güvenlik/görsel/regresyon testlerini kaydet.

**Faz 1 — Navigation & Projects:** global shell, projects-first home, project resume, generation CTA/progress/error recovery; eski link uyumluluğu; gereksiz starter/legacy seçeneklerin advanced'e taşınması.

**Faz 2 — Unified Studio workspace:** tek toolbar + shared left/right/canvas + AI composer; belge tipi adaptörleri. Puck, SourceGraph, CodeProject ayrı persistence/runner/export davranışlarıyla korunur.

**Faz 3 — Unified Discover & Add:** ortak katalog API, preview/detail modal, eligibility badges, saved items, Studio'da inline component selection, cross-project handoff, eski playground deep link geçişleri.

**Faz 4 — UX quality & motion:** tokens, all states, keyboard/focus, system/light/dark, mobile-first sheets, touch, accessible responsive behaviors. Progressive disclosure ile teknik panelleri advanced'e taşı.

**Faz 5 — Integration & verification:** real Create→Edit→Discover/Add→AI Revise→Save→Preview→Inspector→Export loop, legacy reopening, provenance/rights, source pin and PWA regression, E2E responsive screenshots, failure recovery.

**Faz 6 — Cleanup & handoff:** artık çağrılmayan/duplikasyonlu UI routes/components/css seçici temizliği; deprecation/redirects; test kanıtları, değişiklik özeti, gerçek eksikler, nihai durum raporu. Her faz sonrasında anlaşılır commit/checkpoint; tek kullanıcı isteğini bölüp yeni onay isteme.

## 11. Tamamlama kriterleri (net olarak PASS / FAIL / BLOCKED)

- [ ] Yeni kullanıcı home'dan brief yazar, Create app yapar ve Studio'da somut çalışan proje açar.
- [ ] Mevcut üç belge türü de tek Studio kabuğunda açılır; veri/çıktı kaybı yoktur.
- [ ] Normal kullanıcı üst seviye üçten fazla ürün alanı görmez.
- [ ] Kullanıcı projeden çıkmadan bileşen arar, dener, seçer veya uyumsuzluk gerekçesini görür.
- [ ] Realtime/source-based revision akışı doğrulanır; AI revizyonu persisted/editable hale gelir ve Run ile aynı revizyonu gösterir.
- [ ] Unsaved/draft/saved/preview-ready/preview-failed hallerinde yanıltıcı durum işareti yoktur.
- [ ] Verified, direct, local-only, reference-only, license/rights ve export gerekçeleri gerçek kaynak verisinden gelir.
- [ ] Export ve Export PWA mevcut kısıtlarla çalışır veya doğrulanmış gerekçeyle bloklanır.
- [ ] My Library saved/favorites/notes ve eski kaynak deep linkleri geriye dönük uyumludur.
- [ ] System/light/dark okuma kontrastı; reduced-motion; keyboard; screen-reader smoke.
- [ ] 320/390/768/1024/1440 px ekranda kritik etkileşimler kullanılabilir; yatay taşma yok.
- [ ] Gereksiz/tekrarlı nav, palette ve editor shell UX kaldırılmıştır, aktif iki kabuk görünmez.
- [ ] Repository test/typecheck/build, security contracts ve elverişli browser E2E geçer.
- [ ] Nihai teslim raporu commit/CI/tests/screenshot/failure açıklaması ve gerçek sınırlamaları içerir.

## 12. Değişmemesi gereken prensipler

**Çalışan motor korunur, görünür karmaşa kaldırılır.** Kullanıcı deneyimi, sistemin sahip olmadığı kabiliyetleri vaat etmemeli. Tek oturumda tüm fazları ilerletirken hiçbir testi sahte PASS göstermemeli, mevcut projeleri/özel kaynakları silmemeli, kaynak haklarını yok saymamalı. Bir faz çevresel bir nedenle bloklanırsa engelsiz diğer fazlara devam edip son raporda dürüstçe ayırmalı.
