# Şantiyem AI Construction Copilot — Faz 1

Chat'i "AI Construction Copilot" deneyimine dönüştüreceğiz. Üç yapı taşı:
**Voice Copilot** (ElevenLabs), **Morning Briefing**, **Hands-Free Mode**.
Meeting Mode sonraki sprint.

---

## 1. ElevenLabs Voice Copilot

ElevenLabs Conversational AI (WebRTC) kullanılacak — doğal kesme, düşük gecikme,
premium ses. Agent, ElevenLabs Dashboard'da yaratılıp `agent_id` bir secret olarak
saklanacak (`ELEVENLABS_AGENT_ID`).

**Backend**
- `standard_connectors--connect` ile ElevenLabs bağlanır → `ELEVENLABS_API_KEY` gelir.
- Yeni edge function `elevenlabs-conversation-token`:
  - JWT doğrular (getClaims), premium/trial + günlük kota kontrolü.
  - `/v1/convai/conversation/token?agent_id=...` çağırır, tek kullanımlık token döner.
- Yeni edge function `voice-usage-track`: her session sonunda saniye ekler.
- Yeni tablo `voice_usage`: `user_id, date, seconds_used`. RLS + GRANT.
  - Free: 600 sn/gün, Premium: sınırsız.

**Client tools (agent → app)**
ElevenLabs agent web UI'da şu client tool'lar tanımlanacak (kullanıcı manuel yapacak
— talimat vereceğim), `useConversation` ile handler bağlanacak:
- `query_project_data({intent, keyword})` → mevcut `chat` edge function'ına proxy.
- `render_dashboard_card({type, payload})` → UI'da kart üretir.
- `create_task`, `create_payment`, `notify_contractor` → confirmation flow.
- `navigate_to(page)` → in-app router.

**UI**
- `src/components/voice/VoiceCopilot.tsx`: fullscreen overlay.
  - Durum halkası: idle / listening (nabız) / thinking (spinner) / speaking (waveform).
  - Kesme: kullanıcı konuşmaya başlayınca ElevenLabs VAD otomatik keser.
  - Sağda canlı **Dashboard Rail**: agent konuşurken KPI kartları, uyarılar,
    quick action butonları belirir (fade-in + scale animasyonu).
  - Alt: mic toggle, kapat, "Yazmaya geç" butonu (mevcut ChatInput'a döner).
- `src/components/voice/VoiceOrb.tsx`: her sayfada sağ altta (WhatsApp butonunun
  üstünde) yeni büyük mic FAB — tap → VoiceCopilot açar.

## 2. Morning Briefing

- Edge function `morning-briefing`:
  - Kullanıcının aktif projeleri için: geciken ödemeler, kritik stok, bugünkü
    task'lar, işgücü, hava, ilerleme yüzdesi.
  - Basit "health score" (0-100) hesaplar.
  - Gemini flash ile 3-4 cümlelik konuşma metni üretir.
- Dashboard'a `MorningBriefingCard`: günde ilk giriş sonrası açılır (localStorage
  `briefing_shown_YYYY-MM-DD`).
- "Sesli dinle" butonu → VoiceCopilot'u brifing metniyle açar (agent
  `sendContextualUpdate` ile başlar), "Hangisini incelemek istersin?" ile biter.

## 3. Hands-Free (Construction) Mode

- `src/pages/ConstructionMode.tsx` route: `/saha`.
- Siyah zemin, tek büyük mikrofon (60vh), çok büyük yanıt tipografisi (28-36px).
- Sadece VoiceCopilot mantığı — dashboard rail gizli, tam ekran ses.
- Wake-lock API (ekran kapanmasın).
- VoiceOrb'a uzun basınca veya menüden "🦺 Saha Modu" ile açılır.

## 4. Premium AI OS Yeniden Tasarım (odaklı)

Full redesign yerine copilot yüzeylerini premium'a çekiyoruz:
- `ChatMessage` kart sistemine yeni ikon seti + daha yumuşak shadow'lar (mevcut
  yapıyı korur, sadece token güncellemeleri).
- Global `VoiceOrb` her sayfada.
- Landing chat başlığı "AI Construction Copilot" olur.
- Motion: `framer-motion` yerine mevcut Tailwind animate + minimal CSS
  keyframes (listening pulse, thinking shimmer, speaking waveform).

## 5. Kota & Erişim

- `src/hooks/useVoiceAccess.ts`:
  - `is_premium || in_trial` → sınırsız.
  - Free → günlük 10 dk. Bittiğinde upgrade modal.
- VoiceOrb kilitliyse mic üstünde küçük 🔒 rozet.

---

## Teknik Sıra

1. **Setup**: `bun add @elevenlabs/react`; ElevenLabs connector bağla; agent_id
   secret'ı iste; `voice_usage` migration.
2. **Backend**: `elevenlabs-conversation-token`, `voice-usage-track`,
   `morning-briefing` edge fonksiyonları.
3. **Hooks**: `useVoiceAccess`, `useVoiceConversation` (useConversation wrapper +
   client tools + kota).
4. **UI**: `VoiceOrb`, `VoiceCopilot` (orb + dashboard rail), `ConstructionMode`
   sayfası + route, `MorningBriefingCard`.
5. **Integration**: `App.tsx`'e global `<VoiceOrb />`; Dashboard'a briefing kartı.
6. **QA**: Playwright ile orb açılıyor mu, kota engeli çalışıyor mu, hands-free
   route render oluyor mu.

## Kullanıcıdan İstenecekler

Uygulama başlamadan **senin yapman gerekenler**:
1. ElevenLabs hesabı → **Conversational AI → Create Agent**.
2. Agent sistem prompt'u: "Sen Şantiyem AI, deneyimli bir proje direktörüsün.
   Kısa, profesyonel, Türkçe cevap ver. Veri sorularında `query_project_data`
   client tool'unu kullan." (final metni ben vereceğim.)
3. Agent'ta şu **client tool'ları** tanımlaman gerekecek (isim + parametre şeması
   ben vereceğim): `query_project_data`, `render_dashboard_card`, `create_task`,
   `notify_contractor`, `navigate_to`.
4. Agent'ı ElevenLabs UI'da **"Authentication: Required"** yap, `agent_id`'yi
   bana ver → ben `ELEVENLABS_AGENT_ID` secret'ı olarak kaydedeceğim.
5. ElevenLabs connector'ını Lovable'a bağlaman gerekecek — `connect` tool'u
   sana açıp bekleyecek.

## Kapsam Dışı (bu sprint)

- Meeting Mode (kayıt, özet, PDF).
- Voice tabanlı kart oluşturma dışında full "voice + typing" thread hafızası
  (agent kendi conversation state'ini tutuyor; ayrı DB entegrasyonu sonra).
- Landing sayfası veya sidebar'ın topyekün redesign'ı — mevcut sistemi
  koruyup copilot yüzeylerini üstüne koyuyoruz.

## Tahmin

Bu plan 1 uzun iterasyonda tamamlanabilir. Onaylarsan ElevenLabs bağlantısı ve
agent kurulumu ile başlıyorum.
