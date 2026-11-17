# CODEX — MOTIONUX V2 / PREMIUM INTERACTION DESIGN SYSTEM
## Doğrudan uygulama görevi · SapienXai/MotionUX · 14 Kasım 2026

> **GÖREV BİR ANALİZ RAPORU DEĞİL, UÇTAN UCA ÜRÜN GELİŞTİRMEDİR.**
>
> `https://github.com/SapienXai/MotionUX` reposunu mevcut v1.0.0 temeli üzerinden **DesignBookmark Motion seviyesinde veya daha iyi etkileşim kalitesine sahip, geniş kapsamlı, yeniden kullanılabilir bir premium React UI & motion sistemine** dönüştür. Bu dosya tek seferlik uygulama yetkilendirmesidir. Çalışmayı yalnızca roadmap, birkaç demo veya dört basit component ile bitirme.
>
> **North Star:** Tasarım açısından güçlü bir vitrinde, gerçekten etkileşime girilebilen, projelere tek komutla eklenebilen, lisansı doğrulanmış/özgün, her durumu test edilmiş **81 referansın tamamına karşılık gelen 81 çalışan deneyim**. Güncel referans sayısı değişirse yeniden envanter çıkar ve güncel toplamı hedefle.

---

## 0. BAĞLAM VE SINIRLAR

Mevcut durum (doğrudan repodan tekrar doğrula; bu bilgiler 14 Kasım 2026 incelemesine dayanıyor):

- Repo: `SapienXai/MotionUX` (mevcut **public** repo; **yeni repo açma**).
- Default branch: `main`, incelenen HEAD: `5cde6e1d506979229b479c5221ff7b541e1dc101`.
- Mevcut sürüm: değişmez `v1.0.0` tag'i, shadcn GitHub registry.
- Registry'nin dört öğesi: `motion-foundations`, `motion-dock`, `motion-disclosure`, `motion-status-pill`.
- React 19, TypeScript, Motion, Vite showcase, Playwright, shadcn registry.
- Kullanıcı seviyesinde `sapienx-motion-system` Codex skill'i ve global `AGENTS.md` yönlendirmesi kurulmuş; Google `modern-web-guidance` korunmuş.
- İki ürünün ayrılmış pilot branch'leri var:
  - BookPlace `SapienXai/bookplace:codex/motionux-pilot` (`34fe690`).
  - DineWallet `SapienXai/RestaurantWallet:codex/motionux-pilot` (`ae9ae91`).
- Eski pilotlar ürünlerin `main` dalına merge edilmemiş. Ürünlerin iş mantığına veya prod ortamına otomatik müdahale ETME.
- Şu an `motion-dock` neredeyse yalnızca `<nav>` sarmalayıcısı; `motion-disclosure` basit `<details>`; bu seviyeyi premium motion kalitesi diye kabul etme.
- Ürün markaları farklı: BookPlace ile DineWallet için ayrı theme adapter kullanılmalı. Paylaşılan registry hiçbir marka rengini veya uygulama iş kuralını zorlamamalı.

**İşleyiş:** `main` üzerinde küçük, anlamlı ve doğrulanmış commit'lerle çalışabilirsin; force-push, mevcut tag'i oynatma, history rewrite, aşırı geniş bağımlılık yükseltmesi yapma. `v1.0.0` geriye dönük uyumunu koru. Yeni API'ler eklemek serbest; kırıcı değişiklik zorunluysa migration/compat layer oluştur.

**Yapılacaklar:** Kaynak keşfi, lisans kontrolü, gerçek bileşen geliştirme, registry, showcase, animasyon kalitesi, testler, CI, global skill güncellemesi, dokümantasyon ve sürümleme. Sadece dosya listesi üretip durma.

**Yapılmayacaklar:** BookPlace/DineWallet payment/booking/veri akışını değiştirme; ürün `main`e merge veya production deploy yapma; ücretli servise izinsiz abone olma; yeni ayrı bir site/repo/monorepo açma; AI tarafından uydurulmuş başarı/publish/ödemeyi gerçekmiş gibi gösterme.

---

## 1. REFERANS HEDEFİ: DESIGNBOOKMARK MOTION — TAM KAPSAM

Birincil referans: `https://designbookmark.com/motion`
Ek kaynaklar:
- `https://designbookmark.com/skills`
- `https://kokonutui.com`
- `https://smoothui.dev`
- `https://github.com/kokonut-labs/kokonutui`
- `https://github.com/educlopez/smoothui`
- `https://motion.dev/docs/react`
- `https://ui.shadcn.com/docs/registry/github`

**Çok önemli:** DesignBookmark sitesi tek bir motion kütüphanesi değildir; kendi örneklerini ve Kokonut UI / SmoothUI bileşenlerini listeler. Bir örneğin sayfada `Copy code` düğmesi olması, o kaynak kodun bağımsız bir kütüphanede yeniden dağıtılmasına izin verildiği anlamına gelmez. **Önce ilgili kodun lisansını/izinlerini kesin doğrula.**
- İzin veren lisans + gerekli notices doğrulandıysa gerçek kaynağı mümkün olduğunca sadık şekilde adapte et, sürümünü/commit'ini pinle ve gerekli copyright/attribution'ı koru.
- Kodun lisansı/yeniden dağıtım yetkisi belirsizse kodu kopyalama, minify edilmiş bundle'ı sökerek klonlama veya prompt çıktısını kaynak izni yerine koyma. Etkileşim örneğini incele; **aynı kullanıcı amacına ve benzer motion kalitesine sahip bağımsız bir component** üret. Markanın ayırt edici grafik varlıklarını kopyalamadan MotionUX'a ait görsel stil oluştur.
- Kokonut UI ve SmoothUI genel depolarında MIT görülebilir ama her gerçek dosya/asset/subdependency ayrıca doğrulanmalı. License kayıtlarını dosya seviyesinde tut.
- Ücretli/kapalı Motion+ bileşenlerini hak olmadan ithal etme. Benzer işlevleri bağımsız yaz.
- DesignBookmark logosu, fontları, ticari isimleri, ürün içi görselleri ve özel işaretlerini MotionUX içine kopyalama.

### Zorunlu sabit başlangıç envanteri — 81 örnek

Aşağıdaki 81 örneğin **hiçbirini atlama.** Kaynağın bugün farklılaşmış olma ihtimaline karşı önce canlı sayfayı tarayıp güncel inventory oluştur. Aynı isimli ama farklı sağlayıcılı örnekleri farklı registry ID olarak izle. Tamamlanan sayı kodu bulunan dosya sayısı değil, **gerçekten çalışan ve test edilen ayrı katalog deneyimi sayısı**dır.

#### A — DesignBookmark özgün listesi (50)

01. Plan switch
02. Letter limit
03. Pull cord
04. Morph tooltip
05. Spring dropdown
06. File drop
07. Command button **[DesignBookmark]**
08. Morph island
09. Goo menu
10. Jelly slider
11. Hold to publish
12. Swipe deck
13. Springy input
14. Rubber dock
15. Parallax ticket
16. Glass lens
17. Pull to refresh
18. Word roll
19. Weight wave
20. Goo morph
21. Scramble text
22. Read along
23. Roll links
24. Prompt box
25. Streaming reply
26. Ghost suggestion
27. Goo thinking
28. Expand card
29. Fan cards
30. Stat card
31. Profile card
32. Magnetic button
33. Loading to success
34. Copy button
35. Like burst
36. Tab pill
37. Bottom bar
38. Dynamic menu
39. Segmented control
40. Sidebar collapse
41. Command palette
42. Step progress
43. OTP code
44. Toggle switch
45. Star rating
46. Tag input
47. Number stepper
48. Range slider
49. Password strength
50. Checkbox list

#### B — Kokonut UI / SmoothUI kaynaklı listesi (31)

51. Detent dial — Kokonut UI
52. Siri orb — SmoothUI
53. Agent steps — Kokonut UI
54. Hold button — Kokonut UI
55. Exposure slider — SmoothUI
56. Boarding pass — Kokonut UI
57. Marker text — Kokonut UI
58. Smooth tab — Kokonut UI
59. Unlock Face ID — SmoothUI
60. Slide to confirm — Kokonut UI
61. Notification stack — Kokonut UI
62. Wheel picker — Kokonut UI
63. Dynamic text — Kokonut UI
64. Voice input — Kokonut UI
65. Tool approval — Kokonut UI
66. Toolbar — Kokonut UI
67. Scrubber — SmoothUI
68. Cart button — Kokonut UI
69. Page flip — Kokonut UI
70. Signature pad — Kokonut UI
71. Undo button — Kokonut UI
72. Card field — Kokonut UI
73. Stack panel — Kokonut UI
74. Typewriter — Kokonut UI
75. Thinking text — Kokonut UI
76. Glass player — Kokonut UI
77. Bell button — Kokonut UI
78. Morph popover — Kokonut UI
79. Task list — SmoothUI
80. Music toggle — SmoothUI
81. Command button **[Kokonut UI]**

**Kural:** Kaynaktaki görsel/gesture örneği, farklı bir teknolojiyle inşa edilse bile fonksiyonel olarak sadık ve estetik olarak aynı düzeyde olmalı. “Daha ucuz” görünmesi kabul edilemez. Ancak doğrulanmamış lisans altında kaynak kodun aynen alınması da kabul edilemez.

### Envanter ve izlenebilirlik

Oluştur:
- `docs/REFERENCE-INVENTORY.md`: her örnek için kaynak URL, provider, canlı önizleme URL'si, kategori, etkileşim tanımı, kaynak lisansı, yeniden kullanım kararı, MotionUX component adı, sürüm, test bağlantısı, screenshot/film kanıtı, durum.
- `metadata/reference-inventory.json`: makine tarafından okunabilir aynı kayıtlar; benzersiz source-qualified ID. Örn. `designbookmark-command-button` ve `kokonut-command-button`.
- Başlangıç envanterindeki her ID için nihai durum: `ready`, `needs-review`, `blocked`. `ready` yalnızca gerçek runtime demo + install + test + erişilebilirlik + dokümantasyon sonrası.
- Kaynağın artık mevcut olmaması halinde kayıt sakla, gözlemi yaz ve aynı ihtiyaca karşılık gelen özgün bileşeni uygula.
- Yeni bulunan örnekleri dahil et; mevcut 81'i sessizce eksiltme. Gerçek olmayan “81/81 hazır” raporu verme.

---

## 2. TASARIM KALİTESİ — APPLE / LINEAR / DESIGNBOOKMARK SEVİYESİ

**Ürün hissi:** Premium, fiziksel, hassas, doğal, mobile-native ve zahmetsiz. Bir demo kutusuna birkaç `scale(0.95)` efekti eklemek “premium motion” değildir.

Her bileşeni şu açılardan tasarla:

1. **Görsel işçilik:** Optik hizalama, ritim, boşluk, tipografi, incelikli elevation, köşe yarıçapı, doğal kenar/ışık davranışı, doğru ikon ağırlığı, kontrast, sakin hiyerarşi.
2. **Fiziksel hareket:** Tutarlı spring, doğru ivme ve sönüm, yönlü hareket, velocity continuity, kesilince/tersine dönünce atlama olmaması, gerçek touch ve pointer davranışı.
3. **Microinteraction:** Press, hover, focus, drag, release, select, expand/collapse, pending, success, error, cancel; her birinde anlamlı geri bildirim.
4. **Choreography:** Birden fazla parçanın birlikte değiştiği yerde hareket sırası, ortak layout geçişi, ölçek/orijin, exit animation; boş hareket ve bekletme yok.
5. **Bileşen gerçeği:** `props`, controlled/uncontrolled destek (uygun olduğunda), varyantlar, işlevsel callback'ler, keyboard/touch, edge cases. Görsel demo değil gerçek kullanılabilir component.
6. **Karakter:** Her component farklı bir hareket fikri göstermeli. 81 kartın hepsine aynı fade/scale animasyonu koyma.
7. **Sessizlik:** Gereksiz hareketten kaçın. Animasyon yalnızca durumu, ilişkileri veya eylem sonucunu daha anlaşılır hale getirsin. Kullanıcı kontrolü her zaman birinci öncelik.
8. **Orijinal tasarım:** MotionUX'ın kendine ait rafine vitrin tasarımı olmalı; üçüncü tarafın branding'ini birebir taklit etme.

Her bileşen için iç kalite inceleme tablosu: `visual`, `interaction`, `accessibility`, `performance`, `production-readiness` (0–5, açıklamalı ve kanıtlı). Ölçülemez rakamlarla “mükemmel” ilan etme; sorunları açıkça belirtip düzelt.

**No-go örnekleri:**
- Etkileşimi olmayan statik kartı “animated” diye sunmak.
- Bir tasarımın görselini resim olarak render edip gerçek component gibi göstermek.
- Animasyonu videoyla taklit etmek.
- Sadece isim vererek 81 kayıt doldurmak.
- Component davranışının kendisini yalnızca showcase koduna koymak.
- Bütün butonlara aynı spring scale uygulayıp tamamlandığını iddia etmek.
- Milyon parçacıklı canvas/WebGL animasyonuyla düşük güçlü telefonu zorlamak.
- Sonsuz dönen yükleme veya dekorasyon animasyonlarıyla sayfayı ağırlaştırmak.
- Kolaylık için gerçek form/publish/payment sonuçlarını süre sonunda “success” yapmak.

---

## 3. MİMARİ — MERKEZİ KÜTÜPHANE, GERÇEK REGISTRY

Mevcut şemayı incele, ilerlet; projeleri yeniden framework'e taşıma.

- React 19 + TS strict; `motion/react` ana motion motoru, basit dekoratif geçiş için CSS, özel zorunlu kullanım dışında GSAP ekleme.
- Next.js 16 App Router tüketicileriyle uyumlu; `"use client"` sınırları dar, server component consumer mümkün olduğunca hafif.
- Tailwind 3 ve 4 tüketicilerini destekle; registry componentleri global Tailwind v4 önkoşuluyla kilitlenmesin. Scoped styles / CSS variables kullanılabilir.
- shadcn/ui **GitHub registry** kullan; ekstra hosting, custom registry server, npm yayın zorunluluğu yok.
- Her öğenin `registry.json` dosyasındaki entry'si gerçek dosyalara işaret etsin; `registryDependencies` içindeki her iç bağlantının tag/SHA pin'i ayrı olsun.
- Tüketicide `@components/sapienx-motion/` veya projeye uyumlu path; dosyaları açıp değiştirmek mümkün olsun, runtime GitHub fetch gerekmesin.
- `MotionProvider`, spring tokens, presets, `useReducedMotion`, shared layout primitives, gesture helpers sadece gerektiği yerde ortak olsun. Paketler tree-shake ve lazy import edilebilir olsun.
- Her component kolay takılabilir gerçek `export` API'ye sahip olsun. Showcase ve gerçek registry **aynı source code**u kullansın.
- Temaları ayır: `neutral`, `bookplace`, `dinewallet`; ürün renklerini shared primitive içine sabitleme. Temalar örnek adapter olarak showcase'te çalışsın; actual ürün token'larına uyarlanabilir.
- `aria`, HTML semantics ve klavye kurallarını görsel efekt uğruna bozma.
- Eski dört item'ın contract'ını bozma. `motion-dock` gelişmiş bir navigasyon davranışı alamıyorsa, uyumlu v2 prop'ları veya `motion-animated-tab-bar` gibi ayrı bir item ile çöz.

Önerilen repo yapısı (gerçeğine uygun şekilde uyarlayabilirsin):

```text
MotionUX/
  components/
    foundations/
    navigation/
    buttons/
    inputs/
    overlays/
    cards/
    typography/
    feedback/
    gestures/
    ai/
    media/
  registry.json
  metadata/
    components.json
    reference-inventory.json
  examples/ or showcase/
    app/
    catalog/
    previews/
    themes/
    component-playground/
  skills/
    sapienx-motion-system/
      SKILL.md
      references/
  docs/
    REFERENCE-INVENTORY.md
    DESIGN-PRINCIPLES.md
    MOTION-TOKENS.md
    COMPONENTS.md
    SOURCE-REVIEW.md
    QUALITY-GATES.md
    VERIFICATION.md
    ADOPTION-BOOKPLACE.md
    ADOPTION-DINEWALLET.md
    RELEASE.md
  tests/
    components/
    interactions/
    accessibility/
    visual/
    registry/
  .github/workflows/ci.yml
```

Klasörlerin isimleri mevcut build mantığını bozmayacak şekilde seçilmeli. İsimli item + variants ile aynı konsept altında kod paylaşımı mümkündür; ancak katalogdaki 81 ayrı örneğin her biri için **ayrı tanımlı deneyim, çalışır demo ve izlenebilir test** bulunmalıdır.

---

## 4. SHOWCASE — MOTIONUX'IN KENDİ PREMIUM ÜRÜNÜ

Bir Vite sayfasına demo componentlerini alt alta dizmek yeterli DEĞİL. Kendisi de üst seviye bir ürün gibi hissettiren **MotionUX Studio / Component Gallery** inşa et.

### Showcase gereksinimleri
- Profesyonel, özgün, premium landing: anlamlı güçlü başlık, net tipografik hiyerarşi, gösterişli olmayan yüksek kalite, rafine motion, kuvvetli boşluk ritmi.
- Tam anlamıyla çalışan **galeri**: tüm 81+ item görünsün, kategoriye göre filtre, arama, kaynak türü, status, new/featured, sorted.
- Etkileşimli **live preview**: her kartta etkileşim gerçekten çalışmalı; basit sayfa görüntüsü değil. Mouse/touch ve keyboard ile gerçekten kullanılabilir.
- Component detayında: büyük preview stage, `Props`, `Variants`, `States`, `Code`, `Install`, `Usage`, `Accessibility`, `Performance`, `Source/License`, `Test evidence` sekmeleri veya eşdeğer açık navigasyon.
- Üst düzey kontroller: **Light / Dark**, **Desktop / Tablet / Mobile**, **Neutral / BookPlace / DineWallet**, **Normal / Reduced motion**.
- Her demo gerçekçi ama açıkça *demo* içerik kullansın; Türkçe ve İngilizce örnekleri, uzun text ve hata durumları olsun.
- Her item için kopyalanabilir **pinned** `shadcn add` komutu ve çalışan copy/paste React usage example.
- “Copy code” ancak gerçek kurulan source code ise; sahte veya hayali kod değil.
- Komponentleri farklı arka planlarda açıkça gösterebilen rafine preview sahnesi; ama kullanımı zorlaştıran ağır efektler yok.
- İyi dizayn edilmiş mobil UI: hamburger mecburi değil, doğal sticky/filter/navigation, 320/375/390 genişlikte horizontal overflow yok.
- Katalog sayfasında 81 ağır demo aynı anda animasyon çalıştırmasın. Görünenlerde progressive mount/lazy-load; düşük güçte kontrolsüz `requestAnimationFrame` veya sürekli motion yok.
- İncelemesi kolay **comparison mode** (özellikle interaction variants), tek tıklamayla play/reset/reduced motion; tek başına screenshot yeterli değil.
- Story testleri için stabil `data-testid` ve deterministic state. UI screenshot baseline'larını repo içine ekle; sahte görsel eşleşme iddiası yok.
- Gerekliyse preview için build çıktısı hazırla, fakat yeni ücretli servis bağlama ve hiçbir ürünün production'ına deploy etme.

**Showcase tasarım kapısı:** Galeriye giren biri daha componentlere tıklamadan kütüphanenin Apple/Linear seviyesinde ciddiyetle tasarlandığını hissetmeli. Generic Tailwind dashboard / sıradan dokümantasyon sayfası OLMAMALI.

---

## 5. GELİŞTİRME SIRASI (HEPSİ ZORUNLU; KALİTEYİ KORUYARAK DİLİMLERE AYIR)

Toplu tek commit/tek devasa generated file yerine, her dilimi **tam çalışan, testli, registry'de kurulabilir ve showcase'te görünür** hale getirerek işle.

**Dalga 0 — Audit & inventory**
- Mevcut `main`, tag, skills, registry ve iki pilotu doğrula.
- Her 81 item'in kısa interaction spec'ini yaz: aktör, tetikleyici, state graph, geçişler, gesture, exit/reset, reduced motion, a11y.
- Önce tüm lisans ve kaynak kararını belgele.
- Aşamalı `docs/IMPLEMENTATION-STATUS.md` oluştur; her checkpoint'te güncelle.

**Dalga 1 — Foundations + showcase shell**
- Motion tokens, button/field semantics, theme adapters, performance rules, animations, breakpoint discipline.
- Premium showcase landing + katalog + route/detail playground + arama/filtreleme.
- CI ve visual screenshot workflow başlangıcı.
- Var olan 4 item'i v2 kalite kapısından geçir; eskiden gelen kodu korumak onları “premium” saymak anlamına gelmez.

**Dalga 2 — En yüksek ürün değeri / navigasyon**
- Bottom bar, Tab pill, Smooth tab, Segmented control, Rubber dock, Dynamic menu, Sidebar collapse, Command palette, Spring dropdown, Morph tooltip, Morph popover, Toolbar, Stack panel, Pull cord.
- Burada **hareketli indicator, layout choreography, overlay focus, portal, gesture** gerçek çalışmalı.
- Özellikle Bottom bar ve Tab pill mevcut `motion-dock` üzerinde yalnızca bir CSS `translateY` animasyonu olmamalı.

**Dalga 3 — Buton, feedback, durum**
- Plan switch, Hold to publish, Hold button, Slide to confirm, Loading to success, Copy button, Like burst, Magnetic button, Command button (iki ayrı sağlayıcı), Cart button, Bell button, Undo button, Toggle switch, Notification stack, Step progress, Agent steps, Tool approval, Goo thinking.
- Server-confirmed state semantiği gerektirenlerin API'sini kontrollü yap. `onComplete` gerçek işi otomatik başlatmaz; demo'daki synthetic state açıkça “demo” olarak işaretlenir.

**Dalga 4 — Inputs, booking, fintech**
- Letter limit, File drop, Springy input, Jelly slider, OTP code, Tag input, Number stepper, Range slider, Password strength, Checkbox list, Detent dial, Exposure slider, Wheel picker, Card field, Signature pad, Star rating.
- Form library-agnostic controlled APIs; klavye, IME, touch, validation, disabled, loading, error, overflow, localization.

**Dalga 5 — Cards, transitions, gestures**
- Morph island, Goo menu, Swipe deck, Parallax ticket, Glass lens, Pull to refresh, Goo morph, Expand card, Fan cards, Stat card, Profile card, Boarding pass, Page flip, Unlock Face ID.
- Gestures gerçek etkileşim olmalı; overflow, inertia, interruption, PWA scroll/pointer conflict, Android/iOS fallback kontrol et.
- “Unlock Face ID” biyometrik kimlik doğrulama taklidi olarak ürünlere alınmamalı; yalnızca **görsel demo, asla gerçek biyometrik güvenlik iddiası yok**.

**Dalga 6 — Typography, AI, media**
- Word roll, Weight wave, Scramble text, Read along, Roll links, Prompt box, Streaming reply, Ghost suggestion, Marker text, Dynamic text, Voice input, Typewriter, Thinking text, Siri orb, Scrubber, Glass player, Task list, Music toggle.
- Metin hareketini ekran okuyucu ve reduced-motion kullanımına uygun tut; ses ve stream demoları açıkça simüle edilsin, mikrofona izinsiz erişim isteme, gerçek medya indirmeyi gerektirme.

**Dalga 7 — Cross-source completeness sweep**
- 81 ID listesini otomatik karşılaştır; eksikleri, kopya isimleri, sadece dekoratif demo olanları, test ve registry bağlantısı eksiklerini kapat.
- Güncel sayfada yeni eklenen örnekleri de ayrı kaydet ve mümkün oldukça uygula.
- Final tasarım kalite turu: sadece “pass” çıktılarına değil görsel-gesture işçiliğine odaklan.

İlerleme tek uzun oturuma sığmıyorsa her dalga sonunda doğrulanmış checkpoint/commit bırak ve bir sonraki dalgadan devam edilmesi için dosyada açık durum tut. Ancak kullanıcıyı gereksiz plan/approval döngüsüne sokma; arka arkaya uygulanabilir fazları gerçekten uygula. **Görev tamamlanmadıysa açıkça tamamlanmadı de.** Eksikleri varmış gibi davranıp release tag basma.

---

## 6. KOMPONENT API / EDGE CASE STANDARDI

Tüm item'ların public API'si için:
- `props` / `types` / `variants` / `default values` açık ve type-safe.
- `className`, `style` veya makul `slot` yüzeyleri; consumer'ın tasarım yetkisini çalma.
- Controlled/uncontrolled kuralları tutarlı; form alanları `name`, `value`, `onValueChange`/`onChange`, label/id association desteklesin.
- Strict TypeScript, no `any`, `forwardRef` gerektiğinde DOM ref, test edilen ref behavior.
- Sadece `mouseenter` ile çalışan kritik eylem olamaz; touch ve klavye alternatifi gerekli.
- 44 px civarı rahat touch target; visible focus, disabled affordance, screen-reader-friendly statuses.
- Overlay/sheet/popover: ESC, dış tık politikası, focus trap veya native dialog, restore focus, layering, safe area.
- Repeated rapid tap / drag cancellation / unmount mid-flight / async failure / high-latency / empty/error/loading.
- 200% zoom ve uzun Türkçe kelimeler, TR/EN tarih/sayı örnekleri; RTL için kırılma üretmeme.
- `prefers-reduced-motion: reduce` durumunda işlevler aynen erişilebilir; gerekli state değişiklikleri anında.
- `initial` davranışları hydration flash yapmasın; SSR uyumlu.
- Chrome + WebKit (iOS emulation) ve gerektiğinde Firefox; **emülasyonu gerçek iOS Safari/PWA testi diye raporlama**.
- Gerçek ürün ekranına takıldığında local CSS reset, body lock veya scroll davranışı bozulmasın.

**Motion karar ağacı:** native browser + CSS → `motion/react` gerektiğinde → bilinçli özel çözüm; GSAP yalnızca başka araçla makul yapılamayan özel etkileşimde ve tekil, gerekçeli exception. Animasyon çoğunlukla `transform/opacity`; pahalı blur/filter ve layout thrashing için profil al. Hook ve observer cleanup garanti.

---

## 7. OTOMATİK TEST + İNSAN GÖZÜYLE GÖRSEL DOĞRULAMA

Zorunlu CI (`.github/workflows/ci.yml`):
1. Lint + TS strict typecheck + production build.
2. Registry manifest/schema + source file integrity + pinned dependency validation.
3. Her registry item için `shadcn view`, temsilî kapsamlı item gruplarında `add --dry-run` ve temiz tüketicide gerçek install smoke; manifestin sahte target göstermediğini kontrol et.
4. Unit/interaction testleri: her item'e en az bir benzersiz temel davranış assertion'ı; kritik gesture/overlay/form öğelerinde kapsamlı state graph.
5. Accessibility: axe taramaları + rol, label, tab/arrow focus, reduced-motion, status announce; otomatik axe sıfır sorunu tek başına yeterli sayma.
6. Screenshot comparisons (light/dark, desktop/mobile, component states). Onaylanmış baseline'ı sessizce üzerine yazarak regresyon gizleme; yeni görseli inceleyip gerekçelendir.
7. Playwright Chromium desktop 1440; mobile touch 375/390; WebKit 375/390; 320px narrow; tablet testleri (temsili, ağır item'larda). 200% zoom en az seçili önemli item'larda.
8. Perf smoke: off-screen animasyon CPU kullanımı, layout shift, büyük JS chunk, uzun listelerde performans, main thread blocking, event listener leaks. Tek “120 FPS” iddiası gibi ölçülmemiş rakam yazma.
9. Testte DevTools console pageerror, hydration warnings, horizontal overflow, focus loss gözlemi.
10. `npm audit` ya da kullanılan package manager'ın audit sonuçlarını dev/runtime ayrı değerlendir; açığı saklama.

**Hedef release kapısı:**
- Başlangıç 81 ID: 81 benzersiz entry + 81 çalışan demo + 81 anlamlı kaynak/izin kaydı + 81 installable registry item veya ortak item'e *açıkça referans veren farklı çalışan preset* + 81 component-level smoke test.
- “Tamamlandı” denecek her item: temel demo, gerçek etkileşim, setup/install, TS API, kaynak, responsive, reduced-motion.
- Visual kalite gözden geçirilmiş; hem premium efektler hem erişilebilirlik.
- V1 consumer uyumu korunmuş; tüketici `main`'leri dokunulmamış.
- CI ve release komutları belgeli.

Eğer bütün kapılar geçmiyorsa `v2.0.0` tag'leme. Doğrulanmış küçük checkpoint commitleri kalsın, release readiness raporu açıkça blokajları yazsın. Tag gerekiyorsa yeni immutable tag kullan; `v1.0.0`'ı değiştirme.

---

## 8. BOOKPLACE VE DINEWALLET'İ UNUTMA, AMA RİSKLİ REFACTOR YAPMA

Bu görevde ürün repolarına production deploy veya `main` merge **YOK**. Önce MotionUX kütüphanesini üstün kaliteye getir. Showcase'te iki marka adaptörü oluştur:

### BookPlace profili
- Premium, sıcak, ferah hotel/reservation UX.
- Public otel sayfasında: animated bottom navigation, hero gallery, room card expansion, room switch, date/guest controls, booking step progress, confirmation feedback.
- PWA ve hotel editor erişilebilirliği; Core/PMS sahipliğini koru.
- `docs/ADOPTION-BOOKPLACE.md`: önerilen MotionUX item -> gerçek ekran/route -> mevcut component -> en düşük riskli uygulama + pinned install + test planı.

### DineWallet profili
- Quiet luxury, clean operator app; brand black/pearl ve kontrollü accent.
- Staff: bottom nav, transaction state, QR response, history, filters, reports, consent/copy feedback.
- Ödeme: başarı göstergesi **yalnızca sunucunun doğruladığı `CAPTURED`** durumundan; fake/timer success yok. İdempotency ve tutarlar backend'de kalır.
- `docs/ADOPTION-DINEWALLET.md`: önerilen item/route, safe adapter, permissions/accessibility/performance notes, pinned install ve test planı.
- Eski iPhone/Safari/PWA tarafında gereksiz JS yükü ve sürekli animation yaratma.

**Bu aşamada mevcut `codex/motionux-pilot` branch'leri ve ürün `main`leri değiştirilmez.** Yeni full-scale UI redesign, ödeme veya rezervasyon akışı için ayrı uygulama adımı gerekir. Ürünlerin marka vitrini showcase içinde gerçek etkileşimlerle gösterilir.

---

## 9. CODEX SKILL — KALICI YAZILIM TASARIM STANDARDI

Mevcut `skills/sapienx-motion-system/SKILL.md` dosyasını geliştirdikten sonra aynı standardı kullanıcının global Codex skill kaynağına **non-destructive** ve yedekli güncelle.

- Var olan `~/.codex/AGENTS.md`, `~/.agents/skills/...`, Google `modern-web-guidance` ve diğer skill'leri silme/overwrite etme; mevcut entegrasyona tek idempotent block.
- Her React UI çalışmasında repo ve tasarım systemini okuyup önce MotionUX catalog taramayı, gerekçeli item seçmeyi, olmayanı gerekirse MotionUX'a tekrar kullanılabilir şekilde eklemeyi öğret.
- "Her şeyi animasyonlu yap" kuralı koyma; uygun olmayan yerde sakin UI daha premiumdur.
- Yeni component hazırlama workflow'u: reference → legal provenance → motion specification → design tokens → API → demo → tests → registry → release notes.
- DesignBookmark örneği verilince lisans izinleri yoksa kod kopyalama yapmadan özgün çözüm üret.
- Visual design review ve animation performance review'ü iki ayrı gate olarak uygula.
- `shadcn view`, `--dry-run`, exact pinned tag, diffin incelenmesi, local override'a saygı.
- Skill'in gerçekten yüklendiğini **yeni ve temiz Codex oturumunda** test et; yalnızca dosya yazıldığı için “global active” iddia etme.
- İlgili resmi veya güvenilir ek skill'leri, kopyalamadan önce kaynağını ve lisansını kontrol ederek, **gerekliyse** yükle: `animate`, `apple-design`, `review-animations`, `animation-performance`, `mobile-native`, `frontend-design`, `shadcn`, resmi Motion skill. Zaten mevcut olanı ikinci kez kurma; aynı konuda birbiriyle çelişen global kurallar oluşturma.

---

## 10. GITHUB, SÜRÜM VE RAPORLAMA

- Mevcut repo `main`de disiplinli küçük commit'ler + push; kayıtsız devasa iş yığınından kaçın.
- v2'de registry item dosyaları doğrulanmış kaynaklardan kurulabilir olmalı.
- README hem **kullanıcıya** hem de Codex'e yönelik net olsun: local showcase, browse/test, install, use, update, version pinning, release process.
- `.github/workflows/ci.yml`: her push/PR'da test, fail olanlar açık.
- `CHANGELOG.md`: v1→v2 migration ve katkılar.
- Kaynak ve lisans izleri kayıtlı olmadan hiçbir bileşen “approved for reuse” olamaz.
- `docs/VERIFICATION.md`: gerçek komut çıktıları, test sayıları, cihaz emülasyonu, bundle farkları, eksikler. Sahte CI badge veya test raporu yok.
- `docs/IMPLEMENTATION-STATUS.md`: 81 item's gerçek progression; kaç ready/blocked; kapanmayan sorunlar.
- İsteğe bağlı preview dağıtımı, zaten bağlı ve yetkili bir altyapı varsa uygulanabilir; **hiçbir ürün production deploy'u yok**.
- `v2.0.0` yalnızca **tam kalite + inventory kabul kriterleri** karşılanınca oluştur; aksi halde “release pending” ve açık backlog ile bırak.
- Final cevabında şunları **somut şekilde** raporla:
  1. `main` commit SHA ve varsa release tag.
  2. Envanterde güncel toplam / ready / needs-review / blocked, **kaynak bazında**.
  3. Showcase giriş/preview yolu; gerçek çalışan item demosunun kısa özeti.
  4. Önemli tasarım kararları ve hangi öğelerde orijinal vs lisanslı adaptasyon kullanıldığı.
  5. Gerçek testler, CI durumu, browser coverage ve runtime bundle ölçümleri.
  6. BookPlace / DineWallet için önerilen 5'er öncelikli item ve entegrasyon planı.
  7. Kalan iş varsa dürüst blokaj listesi ve tam olarak ne eksik.
  8. Kodun commit edildiği, push edildiği ve yapılmayan production işlemleri.

---

## 11. SON KABUL TESTİ (EN ÖNEMLİ BÖLÜM)

Bir kullanıcı MotionUX Studio'yu açtığında:
- Yalnızca birkaç temel dropdown görmez; **81 ayrı premium interaktif örneği** gerçekten deneyebilir.
- Her örneğin bir fikri, kişiliği ve kaliteli hareket dinamiği vardır.
- Bir örneği seçip özelleştirebilir, dark/light ve mobile/desktop'ta görebilir, kopyaladığı kurulumu kendi projesinde kullanabilir.
- BookPlace ve DineWallet temalarında nasıl hissettirdiğini anında görebilir.
- Çok sayıda ağır örneğe rağmen vitrin gereksiz zorlanmaz, erişilebilirlik bozulmaz.
- Kaynak, lisans, gerçek kullanım ve testler şeffaftır.
- React uygulamasında eklenen her yeni component bu standardı sürdürür.

**Kritik başarı ölçütü:** “DesignBookmark'taki örnekleri birebir/benzer ekledik” sözü değil; **gözle görülen premium etkileşim kalitesi + gerçek yeniden kullanılabilir kod + eksiksiz envanter + çalışır testler**.

Başlangıçta yalnızca plan sunma. Repo üzerinde kod yazarak ilerle, tüm iş dilimlerini yürüt, her aşamayı doğrula ve commit/push yap. Yetki verilmiş repo işlerini tamamlamak için fazlar arasında gereksiz onay isteme. Meşru erişim/lisans/altyapı engelleri varsa sınırı aşma; kalan bağımsız işleri tamamla, engeli açıkça bildir.

**Başla.**
