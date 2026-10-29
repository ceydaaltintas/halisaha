# Halı Saha Takım Dengeleyici

Arkadaş grubunuz için FIFA kartlı oyuncu profilleri oluşturup, maç günü gelenleri
seçip, uygulamanın iki takımı otomatik olarak dengelemesini sağlayan mobil öncelikli
bir web uygulaması.

## Teknik yığın

- Vite + React + TypeScript + Tailwind CSS v4
- Giriş/hesap yok — PIN tabanlı kart sahipliği
- Veri katmanı soyutlanmış: `LocalStorageRepository` (varsayılan, Supabase
  bağlanmadan da çalışır) ve `SupabaseRepository`
- Takım dengeleme algoritması bir Web Worker içinde çalışır (UI kilitlenmez)

## Kurulum

```bash
npm install
npm run dev
```

Hiçbir ek yapılandırma gerekmez — `.env` dosyası oluşturmazsanız uygulama
otomatik olarak **localStorage moduna** düşer ve tarayıcınızda tam işlevli
çalışır (test etmek için ideal).

### Komutlar

| Komut              | Açıklama                                   |
| ------------------ | ------------------------------------------- |
| `npm run dev`       | Geliştirme sunucusu                        |
| `npm run build`     | Üretim derlemesi (`tsc -b && vite build`) |
| `npm run test`      | Vitest birim testleri                      |
| `npm run preview`   | Üretim derlemesini yerelde önizle          |

## Supabase'e bağlama (opsiyonel)

1. [supabase.com](https://supabase.com) üzerinde bir proje oluşturun.
2. Proje panelinde **SQL Editör**'ü açın, [`supabase/schema.sql`](supabase/schema.sql)
   dosyasının **tamamını** kopyalayıp yapıştırın ve çalıştırın.
   - Bu dosya şunları oluşturur: `halisaha_players` tablosu (RLS açık, anon
     erişimi yok), `halisaha_players_public` görünümü (PIN hariç tüm alanlar),
     `halisaha_create_player` / `halisaha_update_player` / `halisaha_delete_player`
     RPC fonksiyonları (PIN doğrulaması `pgcrypto` ile sunucu tarafında yapılır,
     hatalı denemelerde kısa süreli kilit uygulanır), `halisaha_matches` /
     `halisaha_match_player_stats` / `halisaha_match_ratings` tabloları (maç
     sonucu, gol/asist ve maç sonrası performans puanları — PIN gerektirmez,
     herkes ekleyebilir) ve `halisaha-avatars`
     Storage bucket'ı.
3. Dosyanın sonundaki yorumda belirtilen şekilde kendi **yönetici PIN**'inizi
   ayarlayın (SQL Editör'de):
   ```sql
   insert into public.halisaha_settings (key, value)
     values ('admin_pin_hash', crypt('SIZIN_4_HANELI_PININIZ', gen_salt('bf')))
     on conflict (key) do update set value = excluded.value;
   ```
4. Proje ayarlarından `Project URL` ve `anon public` anahtarını alın, kök dizinde
   bir `.env` dosyası oluşturup doldurun (bkz. `.env.example`):
   ```bash
   cp .env.example .env
   ```
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
5. Sunucuyu yeniden başlatın (`npm run dev`). Uygulama artık otomatik olarak
   Supabase moduna geçer; önceden localStorage'da oluşturduğunuz kartlar
   Supabase'e taşınmaz (iki depo birbirinden bağımsızdır).

PIN'ler asla düz metin saklanmaz veya istemciye dönmez — ne localStorage modunda
(tuzlu SHA-256 ile) ne de Supabase modunda (`pgcrypto` `crypt`/`gen_salt` ile).

## Deploy (Vercel / Netlify)

Standart bir Vite SPA'sıdır:

- **Vercel**: Depoyu import edin, framework preset "Vite" olarak algılanır.
  Environment Variables kısmına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`'i
  ekleyin. Build command: `npm run build`, Output: `dist`.
- **Netlify**: Build command `npm run build`, Publish directory `dist`. Aynı env
  değişkenlerini Netlify panelinden ekleyin.

Env değişkenlerini eklemezseniz deploy edilen uygulama localStorage modunda
çalışır (her cihaz kendi kart listesini tutar — arkadaş grubu için önerilen
kurulum Supabase'e bağlamaktır, böylece herkes aynı kart havuzunu görür).

## Nasıl kullanılır

1. **Kart oluştur**: Ana sayfada "+ Yeni Kart" ile isim, pozisyon(lar), 6 stat
   (bütçe sınırlı) ve avatar seçip 4 haneli bir PIN belirleyin.
2. **Maç kur**: "Maç Kur" ile gelenleri işaretleyin, takım büyüklüğünü (5v5-8v8)
   ve dizilişi seçin, isterseniz kısıt ekleyin (aynı/ayrı takım, kesin kaleci,
   takıma sabitleme).
3. **Takımları oluştur**: Saha görünümünde iki takım dizilişe yerleşir, altında
   güç karşılaştırması ve radar grafiği görünür. "Yeniden karıştır" farklı ama
   eşit derecede dengeli bir alternatif gösterir, "Manuel takas" ile iki oyuncuyu
   birbirine değiştirebilirsiniz, "Paylaş" sahayı PNG olarak indirir/paylaşır.
4. **Maç sonucunu kaydet** (opsiyonel): Maç bittikten sonra "📝 Maç Sonucunu
   Kaydet" ile skoru ve oyuncu başına gol/asisti girin, ardından isteyen
   katılımcılar birbirine 1-10 arası bir performans puanı verebilir. Bu
   puanlar ve galibiyet oranı, sonraki maçlarda balancer'ın kullandığı OVR'a
   küçük bir "form" düzeltmesi (±3) olarak otomatik yansır — kalıcı kart
   statları değişmez. Ana sayfadaki "📊 Maç Geçmişi" ile geçmiş maçları ve
   oyuncu bazlı istatistikleri (gol, asist, galibiyet oranı, ort. puan)
   görebilirsiniz.

## Kod yapısı

- `src/lib/ratings.ts` — OVR ve pozisyon puanı hesapları (ağırlık tablosu burada)
- `src/lib/balancer.ts` — takım dengeleme algoritması (saf TS, UI'dan bağımsız)
- `src/lib/formations.ts` — diziliş tanımları ve slot sıralaması
- `src/lib/assignment.ts` — küçük boyutlu atama problemi çözücü (bitmask DP)
- `src/lib/form.ts` — maç geçmişinden form/kariyer istatistiği hesaplama
- `src/data/` — `PlayerRepository` / `MatchRepository` arayüzleri ve implementasyonları
- `src/components/PlayerCard/` — FIFA tarzı kart + form
- `src/components/Pitch/` — SVG saha, diziliş yerleşimi, karşılaştırma paneli
- `src/components/Match/` — maç sonucu kaydetme + puanlama akışı
- `src/pages/MatchHistoryPage.tsx` — lider tablosu ve geçmiş maçlar
- `src/__tests__/` — Vitest birim testleri (`npm run test`)
