# ElevenLabs Agent ID Bağlantısı ve Doğrulama

## Yapılacak

1. **Secret set et**
   - `ELEVENLABS_AGENT_ID` = `agent_5301kwknhe6vekm8eysmb0jf21rx`
   - Mevcut değeri override eder (secret zaten kayıtlı).

2. **Edge function'ı test et**
   - `elevenlabs-conversation-token` fonksiyonuna test isteği at.
   - Yanıtta geçerli bir `token` dönüyor mu, doğrula.
   - Hata varsa logları çek ve göster.

3. **Kullanıcı canlı test yapar**
   - Uygulamada sağ alttaki turuncu mikrofona bas.
   - "Merhaba" ve "Bu ay ne kadar ödeme yaptık?" sorularını dene.
   - Sonuçları raporla, sorun varsa `chat` ve `elevenlabs-conversation-token` loglarını inceleyip düzelt.

## Dokunulmayacak

- ElevenLabs agent config (name, prompt, voice, tools, auth) — zaten hazır.
- Frontend voice UI ve edge function kodu — mevcut haliyle çalışır durumda.
