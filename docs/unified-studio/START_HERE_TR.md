# MotionUX Unified Studio — Codex teslim paketi

Bu paket, MotionUX'un **tek parça ürün dönüşümünü** Codex'e tek goal üzerinden yaptırmak içindir.

## Paketin içeriği

- `CODEX_GOAL_PROMPT.md`: Codex'e tek seferde verilecek hedef. Fazların tamamı, mimari sınırlar, testler ve teslim sözleşmesi burada.
- `UX_BLUEPRINT_TR.md`: tarafımızdan hazırlanmış kapsamlı ürün kararı, UX akışları, referansların yorumu, fazlar ve kabul kriterleri.
- `references/projects.png`: Projects masaüstü / light.
- `references/studio.png`: Studio masaüstü / dark.
- `references/discover.png`: Discover masaüstü / light.
- `references/mobile-studio.png`: Studio mobil / dark.
- `references/studio-add-component.png`: Studio içindeki bileşen ekleme drawer.
- `references/mobile-add-sheet.png`: Mobil bileşen ekleme alt paneli.
- `references/*.html`: okunaklı ve düzenlenebilir statik referans mockupları; üretim uygulaması değil.

## Codex'e nasıl verilir?

1. Bu paketin **içeriğini** MotionUX reposuna `docs/unified-studio/` altında kopyalayın. Örn. `docs/unified-studio/CODEX_GOAL_PROMPT.md`, `docs/unified-studio/references/studio.png` vb.
2. Codex'i MotionUX repo kökünde açıp **tek mesaj** verin: `Read docs/unified-studio/CODEX_GOAL_PROMPT.md and execute the entire mission end-to-end. All design decisions, references, phases and acceptance criteria are provided. Do not stop after planning or ask for routine approvals. Continue through implementation, tests and final delivery report.`
3. Codex'e ekranları ayrı ayrı tarif etmeyin; tüm kabul koşulları ve uygulama kuralı belgelerde hazır.

## Başarıyı nasıl kontrol ederiz?

Codex finali şu üç şey olmadan tamamlanmış saymayacak: (a) gerçek kod değişiklikleri ve çalışan kullanıcı akışı, (b) çalıştırılmış testler ve elde edilen ekran görüntüleri, (c) `docs/UNIFIED-STUDIO-DELIVERY.md` raporu. Teslimin durumu güvenilir biçimde PASS / FAIL / BLOCKED ayrılacak.

**Dikkat:** Birden fazla fazın tek goal olması, kullanılan Codex oturumunun çalışma süresi, bağlam sınırı, izinler veya dış servisler nedeniyle hiç kesilemeyeceği anlamına gelmez. Prompt, ara checkpoint ve yeniden devam ettirilebilirlik için tasarlandı. Gerçek secret/izin eksikliği sahte başarıyla gizlenmez.
