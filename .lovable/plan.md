## Teşhis planı — "Bağlanıyor..." takılması

Web preview'de test ediyorsunuz, authentication açık. Sebep büyük ihtimalle **Allowed Origins** eksikliği: preview URL `lovableproject.com` alt-domain'inde çalışıyor ama listede yok.

### Adım 1 — Allowed origins genişlet (dashboard, kod yok)
ElevenLabs → Şantiyem AI Agent → **Security** → Allowed origins şu 6 girdiyi içermeli:
- `https://*.lovableproject.com`
- `https://*.lovable.app`
- `https://santiyem.io`
- `https://www.santiyem.io`
- `capacitor://localhost`
- `http://localhost`

Save → preview'i **hard reload** (Cmd+Shift+R) → mikrofona tekrar basın.

### Adım 2 — Hâlâ takılıyorsa doğrulama testi
Authentication'ı geçici olarak **kapatın** ve tekrar deneyin.
- Bağlanırsa → sorun kesin olarak allowed origins; hangi girdiyi eksik eklediğinizi bulup ekleyeceğiz.
- Bağlanmazsa → bu bir dashboard sorunu değil. Bu durumda `elevenlabs-conversation-token` edge function loglarına bakıp token cevabındaki HTTP kodunu ve ElevenLabs hata mesajını çıkaracağım.

### Adım 3 — Native header safe-area
Değişikliklerimiz kodda hazır ama iOS'ta görmek için `npm run cap:sync` + Xcode build gerekiyor. Bu ayrı bir konu; şimdilik bağlantı sorununa odaklanalım.

Kod değişikliği yok — sadece sizin dashboard'da denemeniz gereken adımlar.
