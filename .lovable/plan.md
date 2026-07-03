## Sorunlar

1. **Header iOS status bar ile üst üste biniyor** — `VoiceCopilot`'un üst çubuğu `safe-area-inset-top` uygulamıyor, saat/pil ikonu başlığa binmiş.
2. **Ajan İngilizce konuşuyor** — ElevenLabs oturumu başlatılırken dil override'ı gönderilmiyor; ajan otomatik olarak İngilizce'ye düşüyor.

## Çözüm

### 1. Safe area (`src/components/voice/VoiceCopilot.tsx`)
- Root container'a `paddingTop: env(safe-area-inset-top)` ve `paddingBottom: env(safe-area-inset-bottom)` ekle (Tailwind arbitrary: `pt-[env(safe-area-inset-top)]`).
- Böylece hem üst çubuk (Şantiyem / AI Construction Copilot) hem alt buton alanı çentik/ev tuşu bölgesine binmez.

### 2. Türkçe zorlaması (`src/components/voice/VoiceCopilot.tsx`)
- `useConversation({...})` çağrısına `overrides` ekle:
  ```ts
  overrides: {
    agent: { language: "tr" }
  }
  ```
- `startSession` çağrısına da yedek olarak aynı override'ı geç (SDK bunu ilk mesaj için baz alır).
- **ElevenLabs dashboard gerekliliği**: Agent → Security → "Overrides" bölümünde `language` override'ı ETKİN olmalı. Değilse SDK sessizce yok sayar. (Kodu bittikten sonra kullanıcıya bu tek adımı hatırlatacağım.)

### 3. Doğrulama
- Kullanıcıdan simülatörde tekrar mikrofona basmasını isteyeceğim; başlık artık status bar altında görünmeli ve ajan Türkçe karşılamalı ("Merhaba, ben Şantiyem AI…").

Web tarafına dokunulmaz; sadece bu bileşen değişir.
