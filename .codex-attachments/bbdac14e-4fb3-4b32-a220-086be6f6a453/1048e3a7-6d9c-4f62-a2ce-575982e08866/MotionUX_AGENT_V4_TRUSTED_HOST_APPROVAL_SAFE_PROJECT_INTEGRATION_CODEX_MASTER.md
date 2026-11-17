# CODEX MASTER PROMPT — MOTIONUX AGENT V4
## Trusted Host Authorization · Manifest-Bound Approvals · Safe Project Integration

> **Görev tipi:** GERÇEK UYGULAMA / MÜHENDİSLİK — yalnızca analiz değil.
>
> **Repo:** `SapienXai/MotionUX`
>
> **Referans ana dal commit'i (başlangıçta yeniden kontrol et):** `4ab639ab12df3f775cb1e1e8d82d125e87152e27` — *Add evidence-gated Agent V3 fixture integration*.
>
> **İstenen sonuç:** V3'ün kanıtlanmış fixture entegrasyonunu, bağımsız **insan/host onayı** gerektiren gerçek proje yazma mimarisine bağlayan güvenilir yerel altyapı. Bu görevde yalnızca MotionUX ve **açıkça oluşturulmuş, atılabilir test kopyaları** değiştirilebilir. **BookPlace, DineWallet, Play/SmartStream, PlaceDJ, XPOS veya diğer gerçek projelere yazma YOK.**
>
> **Önemli durum:** V3 `AGENT_V3_FIXTURE_READY`. `REAL_PROJECT_WRITES_DISABLED` halen geçerli ve bir güvenlik invariantıdır. Canlı proje yazmayı etkinleştirmek, ancak ayrıca doğrulanmış gerçek kullanıcı/host yetkisi ve ayrıca yetkilendirilmiş belirli bir proje çalışmasıyla mümkündür. Bu master prompt böyle bir canlı proje onayı değildir.

---

## 0. Ürün niyeti — ne inşa ediyoruz?

MotionUX'un hedefi *The motion intelligence layer for AI-built interfaces.* Günlük Codex oturumunda kullanıcı bir React veya Next.js ekranı için uygun orijinal motion bileşeni aradığında sistem:

`Understand → Recommend/No-motion → Inspect → Review exact diff → **Human host approval** → Apply exact scope → Verify in browser → Rollback/recover`

akışını gerçekleştirebilmeli. **Açık rıza olmadan otomatik düzenleme yapan bir robot istemiyoruz.** Ürün premium, minimal ve sade olmalı: kullanıcıya 20 dosya adı veya korkutucu jargon yüklemek yerine sade bir özet göster; ancak incelemek isterse tam dosya listesi, bağımlılık diff'i, lisans ve hash dahil tüm ayrıntılara ulaşabilsin. Kişi tek bir bileşen ve tek ekran için bilinçli onay verir. Onayın kapsamı kendiliğinden genişleyemez.

Bu fazda yeni SaaS, API, hesap, merkezi veritabanı, bulut altyapısı, özel AI modeli veya arka plan daemon'u yaratma. Önce mevcut yerel Node 24 + macOS + Brain/Agent/MCP altyapısını yeniden kullan. Mevcut beş MCP aracı **read-only kalacak**.

## 1. Repo gerçeklerini önce doğrula

Mevcut kodu okumadan yeni soyutlamalar icat etme. Özellikle:

- `docs/AGENT-V3.md`, `docs/ROADMAP.md`, `docs/MCP-V1.md`, `docs/AGENT-V2.md`
- `scripts/agent/v3/{authority,cli,review,selection,transaction,workspace,verify,cache,dependencies}.mjs`
- `src/agent/integration/v3/{contracts,adapters,validation}.ts`
- `schemas/agent/v3/{host-grant,grant,review,manifest,transaction,report,request}.json`
- `scripts/agent/v3/{safety,sandbox}.test.mjs`, `src/brain/polarity.ts`, `scripts/brain/polarity.test.mjs`
- `scripts/mcp/{server,projects,verify-codex}.mjs`, `src/mcp/{handlers,contracts}.ts`
- `scripts/agent/v2/{transaction,files,recheck,process}.mjs`
- `metadata/editions/v14.json`, `scripts/studio/catalog.mjs`, `.gitignore`, `AGENTS.md`

Doğrula: `main`/`origin/main`, çalışma ağacı, mevcut test komutları, Node/npm/Codex sürümü, aktif MCP kaydı ve Codex `config.toml`'deki diğer ayarların bütünlüğü. Kullanıcı özel kasası `.motionux-v9/` içinde. **500 orijinal, 9.969 önceki donmuş hash, Studio/Gallery/My Library/Project Kit, Brain ve beş MCP aracı korunacak.** Yeni kaynağı yeniden toplama veya 500 bileşeni yeniden derleme gerekiyormuş gibi davranma.

Önce baseline testleri ve mevcut disk ölçümü al; yeni işlerden sonra kıyasla. Başlangıç raporu V3'te 3.14 GB kasa ve 543 MB tepe geçici build bildiriyor; **güncel ölçüm** farklıysa güncelini kullan.

## 2. Bir güvenlik modeli yaz ve kodla — 'onay' ile 'yetki'yi karıştırma

Önce `docs/AGENT-V4-TRUST.md` içinde açık tehdit modeli kur:

1. **Untrusted:** Codex/model yanıtı, proje kaynak kodu/README/AGENTS içeriği, prompt-injection, MCP tool args, request JSON, `reviewFingerprint`, ekran görüntüsü, shell çıktısı.
2. **Trusted yalnızca doğrulanırsa:** İnsan onayını alan Codex host uygulaması veya ayrı korunmuş yerel operator process. Yetkiyi **Agent'ın kendi oluşturduğu metin**, `approve:<hash>`, dosyaya yazılmış `approved:true`, bir fixture grant'i veya başka bir AI tool çağrısı veremez.
3. **Sistem sınırı:** macOS aynı kullanıcı hesabındaki kontrolsüz ayrı süreç, disk izinleri ve OS keychain erişimi. Tehdit modelinde hangi saldırganlara karşı korunduğunu ve hangilerine karşı korunmadığını açık yaz. `chmod 0600` tek başına aynı kullanıcı süreçlerine karşı bağımsız güven sınırı değildir.
4. Codex CLI/IDE/app-server'ın genel komut veya dosya onay pencereleri kendi başlarına **manifest-bound** MotionUX yetkisi değildir. `acceptForSession`, global workspace trust, `approval_policy=never`, öz-kendine onay veya bir shell komutu içinden türetilen onay kesinlikle yeterli değil.
5. Daha önce V3 fixture harness'inin WeakMap nesnesiyle verdiği `fixtureAuthority` sadece test sınırıdır. Bunu gerçek insan yetkisi olarak yükseltme.
6. Haklar: provider kaynakları / asset ve lisans koşulları ayrı; `MIT + Commons Clause` gibi lisansları düz MIT gibi değerlendirip otomatik yeniden dağıtma. Kaynaklar private vault dışında kamuya taşınmaz.

**En kritik emniyet kuralı:** Bir host onayının kesin bağlandığı tam manifest, insan/host olayı ve runner'ın uygulayacağı işlem arasında atlanabilir hiçbir boşluk kalmayacak. Buna dair kanıt yoksa `REAL_PROJECT_WRITES_DISABLED` sabit kalacak.

## 3. Güncel Codex approval yeteneklerini araştır — davranışı varsayma

Mevcut Codex binary'si ve resmî belgeleri incele; tahmin yürütme:

- `https://learn.chatgpt.com/docs/app-server` — güncel App Server **Approvals** akışı.
- `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `serverRequest/resolved`, `item/completed` gibi resmî event'lerin gerçek destek durumunu kontrol et.
- `threadId`, `turnId`, `itemId`, `cwd`, değişiklik bilgisi, onay kararı ve varsa permission scope'unun hangi semantikte geldiğini belirle.
- Kodun **gerçek kullanıcının butona bastığını** bağımsız olarak doğrulayıp doğrulayamayacağını sorgula. Sadece modelin onay çıktısını taklit etmesi mümkünse güvenilir kanal sayma.
- Kullanıcının mevcut Codex yapılandırmasını veya diğer MCP kayıtlarını bozma. Var olan global `AGENTS.md`, modern-web-guidance ve `node_repl.args` benzeri ayarları koru. Yalnızca gerekli ve doğrulanmış değişiklik yapılabilir; öncesi/sonrası diff ve özel yedek tut.

Desteklenen resmî mekanizmada tekil onay olayı MotionUX'un exact manifest'ine güvenilir biçimde bağlanamıyorsa: **bunu açık bir ürün engeli olarak kaydet**, ayrı bir minimal yerel operator-host prototipi/kanıt testi uygula; AMA Codex'in kendi başına çağırabileceği bir CLI ile 'onay imzalama' çözümünü güvenli diye sunma. Gerçek proje yazmalarını açma. `host-approval-unverified` / `HOST_BRIDGE_NO_GO` gibi dürüst durumları üret.

## 4. Değişmez Host Authorization Contract v1

`schemas/agent/v4/`, `src/agent/integration/v4/`, `scripts/agent/v4/` gibi gerçek mimariye uygun yeni bir modül kur. Mevcut V3 tiplerini tekrar kullan; gereksiz parallel engine yazma.

**Güvenilir host claim en az şu alanlara bağlanmalı:**

- `schemaVersion`, `issuer`, `issuerKeyId` / güvenli host kimliği, onaylayan yerel kullanıcı/operatör, olay referansı.
- **`threadId`, `turnId`, `itemId`** gibi host kaynak kimlikleri, mevcut API bunları gerçekten sağlıyorsa; olmayanı uydurma.
- `canonicalRoot`, filesystem `device/inode` ve izin/kapsam bilgisi; hedef repo git HEAD + staged/unstaged/untracked durumu veya bütün yazılabilir ağacın etki alanındaki doğrulanmış baseline hash'i.
- Tek route/file selector, tek component ID, gerçek provider, `upstreamCommit`, `upstreamHash`, registry SHA-256, notice/lisans review kararı.
- `manifestDigest` ve **canonical sorted write-set**; her dosyanın tam path'i, create/modify/delete, önceki/sonraki SHA-256, chmod, dependency/lockfile ve yeni klasörler. Boş belirsiz wildcard'lar yasak.
- `nonce` rastgele ve tek kullanım, kısa TTL (örnek ≤ 120 s), `issuedAt`, `expiresAt`, `permissions` en az ayrı `apply-reviewed-files`, `offline-build`, `loopback-browser`.
- `decision: accepted | declined | cancelled` ve bağımsız doğrulanabilir imza/MAC veya host-owned process capability; sırlar modelin okuyabildiği ortama, `.motionux-v9/` vault'una veya GitHub'a yazılmaz.
- Sürüm/revocation/consume state'i. Replay, stale, başka kullanıcı, başka cihaz, başka run, başka repo, başka branch, başka dosya veya genişleyen manifest fail-closed.

Kanonik JSON, şema validasyonu, tahrif/açık olmayan alan reddi, `kid`/anahtar rotasyonu yaklaşımı, drift check ve recovery API geliştir. Onay iptali derhal işlem durdurabilmeli; tüketilmiş/sona ermiş grant yeniden kullanılamamalı. **İhraç yetkisi host'ta**, doğrulama runner'da; Model/Agent/MCP'nin `mintGrant()` erişimi yok.

Örnek test host'u fixture için ayrı olabilir ama production host gibi davranıyormuş gibi raporlanamaz. Test için sabit anahtar ayrı fixture'da olabilir; production anahtarları dosyada/repoda/agent ortamında olamaz.

## 5. UX: İnsan neyi onaylayacağını kolayca anlamalı

Onay öncesinde okunabilir **MotionUX Change Review** sun:

- Hangi proje ve ekran? Hangi orijinal component ve upstream pin? Neden uygun? Alternatif/no-motion kararı var mı?
- Kaç dosya değişiyor/ekleniyor? Toplam diff. Hangi npm bağımlılıkları ve lockfile değişiklikleri? CSS, theme, SSR/client boundary, i18n ve a11y etkileri? Provider lisansı ve sınırlaması?
- Hangi kontroller çalışacak ve süre/performans maliyeti nedir? Rollback garantisinin kapsamı nedir; ne değildir?
- Her değişikliği inceleyebilmek için **tam diff + manifest** açılabilmeli.
- Kullanıcı `Approve exactly these changes`, `Reject`, `Cancel` seçeneklerini açıkça görmeli. Varsayılan **Reject**; sessizlik/zaman aşımı reddir. `Approve entire session/workspace` bu işlem için geçerli bir tekil grant sayılmaz.
- Modelin ürettiği mesaj/dosya, onay UI'sının içeriğini yetkisiz biçimde değiştiremez. Onay gösterildikten sonra tek bir dosya byte'ı değişirse onayı geçersiz say.

Apple/Linear sadeliği; fakat güvenliği bir 'devasa form' veya gereksiz SaaS paneliyle çözme. Eğer gerçek host onayı için yeni kullanıcı arayüzü şartsa mevcut yerel Codex host'un açık API'sini tercih et. İmkânsızsa yalnızca fixture operator prototipi geliştir ve NO_GO raporu ver.

## 6. Genel proje hedefleme: support matrix ve fail-closed

V3 şimdi iki sabit adapter ve iki fixture ile doğrulanmıştır. **'500 component herhangi projeye kurulabilir' veya 'evrensel otomatik editör' iddiası yapma.**

- Mevcut Next.js App Router ve React/Vite fixture'larını yeni V4 host-grant bridge ile yeniden kabul et.
- Yalnızca **açıkça tanımlı, kanıtlanmış component/adapter/React sürüm eşleşmesini** destekle; bilinmeyen `html-iframe`, SSR belirsizliği, API state owner bilinmeyen iş akışı, uyumsuz dependency, bilinmeyen fiziksel mobile/screen-reader gibi hard constraint durumlarında entegre etme.
- En az iki farklı component için gerçekleşen yeni host-bound onay senaryosu ve kapsamlı reddetme senaryoları yaz.
- Değişiklik motoru, project-owned state ve theme'i korumalı; provider motion/easing/spring parametrelerini zorla yeniden yazmamalı. Gerekliyse incelemeye sunulan, desteklenen prop/adapter yolu kullanılmalı.
- Başka gerçek projelerde kullanım için CLI **read-only review** yeteneği tasarlanabilir, ancak bu görevde o projelerin dosyalarını bile izinsiz tarama; çalışma sadece MotionUX fixture'ları üzerinde.
- Dependency lock doğrulamasında eski resolved paketlerin değişip değişmediğini, peer dependency ve postinstall script kapalı olduğunu ölç. `npm ci --offline --ignore-scripts` gibi doğrulanmış güvenli komutları kullan. Ağdan paket temini kendiliğinden açılmasın.
- Çoklu hedefler, devasa repo ağaçları, turbo monorepo, native runtime, server API editleri ve unsupported adapters başlangıçta `unsupported` veya `review-required` dönebilir.

## 7. Transaction V4 — manifest bazlı atomiklik, yarış ve rollback

V3'ün `scripts/agent/v3/transaction.mjs` ve V2'nin journal/preimage araçlarını temel al. Yalnızca onaylanmış dosyaya yaz; `git add`, `git commit`, `git push`, deploy ya da migration tetikleme.

1. **Preflight:** current source pin + verified Brain evidence + license + exact repo root + route/file + dependency graph + full required path set + protected paths + before hash + changed/untracked files + reserved disk check.
2. **Grant:** bağımsız host tarafından verilen, tek kullanımlık, manifest-bound onay; hiçbir fallback veya `--yes` bypass yok.
3. **Apply:** root dev/ino, grant state ve manifest her yazımdan önce doğrulansın. `O_NOFOLLOW`, `lstat`, `realpath`, inode/mode, symlink/hardlink, inode swap, case-fold Unicode, `..`/absolute path, hidden secrets, untracked user files fail closed.
4. **Journal:** durable preimages ve onay/effect event'leri; fsync/atomic replace; SIGINT/SIGTERM/SIGKILL ve process-kill recovery.
5. **Verify:** bağımsız prod build ve gerçek browser testleri **izin verilen kopyada**, credential/log sızıntısı olmadan.
6. **Rollback:** başarısız/cancelled işlemde eski dosya ve lockfile byte/mode/ağaç hash'i birebir; önceki bağımsız kullanıcı editlerini koru. Tekrar rollback idempotent.
7. **Fresh restore verification:** yeni attempt ID ile gerçekten yeniden build + Playwright. Reused eski başarılı trace ile sahte `passed` verme. Doğrulama fail ise CLI **nonzero exit code**.
8. **Concurrence:** aynı proje veya aynı dosya kümesine çakışan run'lar serialize/reject; lock/dead-owner take-over güvenli; grant consumed after claim, replay imkânsız.

İzinli onayın kapsamı dışındaki bir dosyaya tek byte bile yazılırsa **P0 fail**. İşlem yarıda kalır ve recovery belirsizse kör otomatik silme yapma; `needs-manual-review` döndür, kanıtları koru.

## 8. Gerçek Codex host kabul testi — otomasyon ≠ insan onayı

Ayrı doğrulama katmanları oluştur:

**L1. Pure contract:** schema/crypto/nonce/replay/expiry/revocation/manifest binding testleri; CI Linux sentetik fixture'ında çalışabilsin.

**L2. Trusted fixture operator:** Ayrı test host'u exact manifest'e onay/reddetme/iptal kararı verir ve kapsamlı audit kaydı tutar. Fixture grant'i gerçek kullanıcı onayı diye tanıtma.

**L3. Native Codex fresh-session:** Yeni Codex oturumunda var olan `motionux_status`, `search_motion`, `recommend_motion`, `inspect_component`, `plan_motion` araçları 5/5 geçer. Genel host approval event'ini resmi protokolde gözle; kullanıcı/host olayının manifest'e bağlanabilirliği gerçek veriye dayanarak raporlanır. Eğer test gerçek insan etkileşimini göstermiyorsa `host-user-approval-unverified` olarak bırak.

**L4. End-to-end fixture:** Onaylı Next.js ve Vite kopyasına iki ayrı gerçek orijinal entegrasyonu; başarısız yetkide sıfır yazım; başarılı entegrasyonda browser kabulü ve tam rollback.

**L5. Live project go/no-go:** Gerçek user-host imzalı/korunmuş grant + canlı hedefe isolation + revocation + replay testleri yapılmadıysa **`REAL_PROJECT_WRITES_DISABLED`**. Bu aşamada hiçbir gerçek projeyi pilot gibi kullanma.

Kayıtlı Codex MCP yapılandırmasına write tools ekleme. Host approval bridge read-only tool'a yazma yan etkisi kazandırmamalı; gerekiyorsa ileride **ayrı, kullanıcının yönetebileceği writer capability** tanımla, bu fazda etkinleştirme.

## 9. Browser acceptance: 'derlendi' yeterli değil

İki mevcut fixture + gerekiyorsa bir olumsuz/no-motion senaryosu üzerinden gerçek kontrol:

- Chromium gerçek interaction; Firefox ve WebKit gerçek smoke interaction.
- 320/390 CSS px emulated touch; desktop keyboard Tab/Shift+Tab/Enter/Space/Escape/Arrow; focus retention ve hydration; reduced-motion davranışının sadece viewport ayarı değil **gözlenen sonuç** olması.
- Axe automated accessibility, semantic state, proper label, pending/success/failure/cancel ve race; no fake payment/booking success.
- Orijinal animasyonun en az iki farklı hareket halinde gerçek frame/opacity/transform örnekleri, Studio'daki kaynağa referans; `no-motion` durumunda sıfır yeni hareket ve sıfır yazım.
- Before/after/restored ekran görüntüsü ve Playwright trace; toplam JS bytes, CPU sample, JS heap, LCP/CLS, mümkünse renderer RSS. Ölçemediğin metriği `unknown` bırak.
- Baseline ve yeni ölçüm aynı makine, browser, cache/CPU koşullarıyla kıyaslanmalı. Bir bileşen eklemek ciddi regresyon yaratıyorsa kabul etme; otomatik test penceresinin kör noktalarını manuel kontrole açık bırak.
- Sonuçları `.motionux-v9/evidence/agent-v4/` altına koy, public repoya kullanıcı uygulaması source/blob/screenshot kopyalama.

## 10. Adversarial test matrisi — bunlar olmadan READY yok

Aşağıdaki sınıflar için gerçek test yaz:

- model tarafından üretilmiş `approved:true`, forged host event, replayed/grabbed token, signature mismatch, revoked/expired grant, reuse after success, wrong operator, wrong thread/turn/item.
- tam manifest yerine sadece hash metni, post-review changed diff, changed source pin/provider license/React pin, modified lockfile, untracked files.
- workspace hijack, symlink/hardlink, case-fold path collision, deleted directory, inode replacement, same user concurrent process.
- plan `no-motion`, `no-suitable-component`, `need-more-context`, `stale-index`; bunlarda hiçbir yazma.
- source copyright/license ambiguity, unapproved asset URL, remote import, lifecycle script, network-required package, unsupported adapter.
- prompt injection in README/AGENTS/source, malicious CLI args/JSON/MCP, credential markers; hiçbir source talimatı host yetkisine dönüşemez.
- refusal/cancel/timeout before approval, before each mutation, after one mutation, during build/browser, power-loss simulation/SIGKILL, corrupt journal, rollback conflict.
- independent negative scenario: test host `acceptForSession` veya genel command approval veriyor fakat exact manifest event yok => `host-approval-unverified` ve sıfır yazım.
- iki ayrı fixture'ın grants karıştırılıyor => reddet; geçmiş bir grant başka run'a taşınıyor => reddet.
- kaydedilen audit log ve raporlarda signer secrets, özel kullanıcı dosyaları veya raw provider payload bulunmasın.

Testleri yalnızca test sayısı için yazma. Her red-path'in kapsam dışında **hiç dosya yazmadığını** kanıtlayan dosya hash'i ve sınır testi iste.

## 11. Depolama ve süreç maliyeti

Önceki 58.97 GB → 3.06 GB temizliğini koru. Yerel kasa V3 raporunda ~3.14 GB; ölçüme göre bugünkü baz al. Geçici `node_modules`, Next `.next`, Vite `dist`, fixture clones, tarayıcı profili ve npm caches tekrar devasa büyümemeli.

- Incremental rebuild/immutable source, mevcut private offline cache; tarball yeniden indirmek yerine `seed-cache` ve mevcut hashed paketleri kullan.
- Geçici build/test kopyalarını `finally` ile kaldır; başarısız testte journal/preimage ve küçük audit raporu saklanır, büyük build çöpleri kalmaz.
- Her fixture kabulünün ardından disk mantıksal/allocated/block ve boş alan verisi karşılaştırılır; APFS klonları nedeniyle abartılı 'geri kazanıldı' söylemi yok.
- P95 startup, approval decision, preflight, apply, verify, rollback, cold/warm end-to-end; CPU/RSS; her metrik için ölçüm protokolü.
- Önce V3 sınırı olan ~850 MiB build-replica ve tek aktif build korunsun; daha yüksek limite ancak gerekçelendirilmiş ölçümle izin ver.
- Büyük kaynak importu ve toplu `npm install` tekrarı yasak; gerekirse red/NO_GO ve rapor.

## 12. CLI, şemalar, insan raporu ve dokümantasyon

Gerçek implementation durumuna göre komut adlarını seç; tercihen:

```sh
npm run agent:v4:doctor
npm run agent:v4:review -- --request fixtures/agent/v3/requests/next-disclosure.json --json
npm run agent:v4:dry-run -- --review RUN_ID --json
npm run agent:v4:host-check -- --review RUN_ID --json
npm run agent:v4:fixture-evaluate -- --review RUN_ID --json
npm run agent:v4:status -- --run RUN_ID --json
npm run agent:v4:rollback -- --run RUN_ID --recheck --json
npm run agent:v4:evaluate
npm run test:agent:v4
```

`host-check` **onay vermez**, yalnızca host uyumluluğu/kanıt durumunu gösterir. Test fixture grant'i sadece fixture testlerinde oluşturulabilir; production signer'a agent-accessible CLI yok.

`docs/AGENT-V4.md` ve `docs/ROADMAP.md` güncelle: yalnızca *gerçekte doğrulanan* özellikler için `Available` yaz; `fixture-verified`, `host-contract-verified`, `host-human-approval-verified`, `real-project-writes-disabled` gibi ayrı durumlar kullan. README'ye abartısız, kısa bağlantı ekle. Codex global config'e gereksiz dokunma; bir gerçek bağlantı değişikliği gerekiyorsa farklı ayarları ve bütün pluginleri koruyan kanıt üret.

Kullanıcıya sunulacak özet örneği:

```text
MotionUX /details önerisi: Animate UI Accordion
Neden? Oda detaylarını açmak/kapatmak, tasarımı korumak
Kaynak: pinned commit + SHA-256 + lisans bildirimi
Değişiklik: 3 mevcut dosya + 7 yeni dosya (örnek)
Bağımlılıklar: ayrı okunabilir diff
Onay: HENÜZ VERİLMEDİ / GERÇEK HOST ONAYI BEKLENİYOR
Yazılan hedef dosya: 0
Sonraki güvenli adım: exact manifesti insan inceleyip onaylamalı
```

UI/rapor durumlarını görsel olarak premium sade tut, ama güvenlik jargonunu gizleyip onay kapsamını belirsizleştirme.

## 13. Quality Gates — kesin kabul

Aşağıdakilerin tamamı sağlanmadan `AGENT_V4_HOST_BRIDGE_READY` deme:

- [ ] V3 bug-free fixture baseline, 500 orijinal ve 9.969 donmuş hash korundu.
- [ ] Brain 51 eski + 108 polarity senaryosu ve yeni bağımsız negatif dil testleri geçiyor.
- [ ] Güvenilir host onay kaynağı gerçekten test edilebiliyor; **simulated fixture approval ile gerçek insan onayı karıştırılmıyor**.
- [ ] Manifest, exact write set, operator, root identity, source pin, TTL, nonce, replay/revoke binding doğrulandı.
- [ ] Yanlış onay/manifest, yarıda kesilme ve concurrent write testlerinde kapsam dışı dosya değişmedi.
- [ ] En az iki gerçek orijinal iki farklı geçici React/Next.js fixture'ında browser ve rollback kabulü geçti.
- [ ] Her rollback recheck benzersiz attempt ile gerçek build+browser yaptı; fail nonzero.
- [ ] V1 5 MCP araç keşfi, gerçek yeni Codex oturumu, mevcut Studio/Brain/Agent V1/V2/V3 regresyonları ve GitHub CI geçti.
- [ ] V4 disk baseline ile uyumlu; gereksiz cache/node_modules kalmadı.
- [ ] Başka müşteri/ürün reposunda hiçbir dosya değiştirilmedi.
- [ ] Özel vault ve signed host secrets Git'e, CI artifact'e veya dış ağa gönderilmedi.

**Önemli statü ayrımı:**

1. `AGENT_V4_HOST_BRIDGE_READY_FIXTURE_ONLY` — simüle değil, gerçek host protokolü kanıtı **varsa**, bütün fixture kabulü ve host-manifest binding tamam; **REAL_PROJECT_WRITES_DISABLED**.
2. `AGENT_V4_FIXTURE_READY_HOST_UNVERIFIED` — fixture katmanı başarılı ancak gerçek insan/host onayı zinciri bağımsız kanıtlanamadı; **REAL_PROJECT_WRITES_DISABLED**. Bu gerçek ve kabul edilebilir bir kısmi sonuçtur; yanlış `READY` yazma.
3. `AGENT_V4_NO_GO` — fixture güvenliği, manifest, browser, rollback, lisans veya temel regresyon başarısız.

**Bu görevde hiçbir statü gerçek BookPlace/DineWallet gibi proje yazımına onay anlamına gelmez.** Sonrasında kullanıcı tarafından belirli bir repo ve değişiklik için ayrı iş/izin verildiğinde pilot düşünülebilir.

## 14. Çalışma ve teslim kuralları

- Bu görevde yalnızca MotionUX reposunu ve MotionUX içindeki **atılabilir fixture kopyalarını** değiştir; mevcut fixture seed'lerinin semantiğini veya gerçek projelerin kodunu gereksiz bozma.
- Normal kod düzeltmesi, test, commit ve push'u tamamla; kullanıcı her fazda yeniden onay vermek zorunda değil. Ancak **insan host approval kapısını kendi kendine geçme**; modelin kendi onayını üretmesi kesinlikle yasak. Gerekiyorsa doğrulanamayan dış bağımlılığı açıkça bloke et.
- Yapılan her teknik değişiklik için gerçek testleri çalıştır; bilinmeyen olguyu doğrulanmış gibi anlatma.
- Mevcut 5 MCP aracı read-only; yeni bir `apply` MCP aracı ekleme. Production deploy / release / yayımlama yapma.
- En az bir bağımsız güvenlik incelemesi, crash/recovery testi ve gerçek Codex session tool keşfi yap.
- `AGENTS.md`, `README.md`, `docs/ROADMAP.md`, `docs/AGENT-V4.md` tutarlı olsun; teknik borçları ve gerçek destek matrisini açık yaz.
- Raporda `main`/`origin/main` SHA, commit URL, CI 4/4, test sayıları, kurulan orijinal ve upstream pin, plan diff'i, gerçek host status, başarısız red-path örnekleri, fresh rollback attempt IDs, disk/perf metrikleri, kalan açık konular ve **real-project write state** yer almalı.
- Public GitHub'da yalnızca kaynak kodu, sentetik test fixture'ları, şema ve doküman. `.motionux-v9/` içeriği, orijinal payload, kullanıcı notu, özel source screenshot/trace, grant secret yok.

### Başarı cümlesi

> *MotionUX'un amacı kullanıcı adına gizlice UI kodu yazmak değil; doğru hareketi bulmak, değişikliği anlaşılır göstermek, yalnızca güvenilir insan onayıyla tam kapsamda uygulamak, gerçek tarayıcıda kanıtlamak ve güvenle geri almaktır.*

**Bu master prompt uygulama talimatıdır. Sadece plan hazırlama. İzinli fixture sınırlarında mümkün olan bütün geliştirmeyi ve testleri baştan sona yap. Host onayı teknik olarak doğrulanamıyorsa dürüstçe fail-closed ve ilgili statüyle bitir.**
