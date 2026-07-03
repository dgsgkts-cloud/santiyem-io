# Sesli Asistan: Bağlantı, Mikrofon İzni ve İlk Mesaj Düzeltmeleri

## Tespitler

1. **"Bağlanıyor…" da takılma**: `startSession` çağrısında zaman aşımı yok — WebRTC bağlantısı kurulamazsa (örn. dil override'ı ajanda tanımlı değilse veya WebRTC engellenirse) ekran sonsuza kadar "Bağlanıyor…" da kalıyor, hata göstermiyor. Ayrıca backend loglarında token isteği hiç görünmüyor; yani akış büyük ihtimalle daha mikrofon izni aşamasında takılıyor.
2. **Mikrofon izninin tekrar tekrar sorulması**: Kod önce kendisi `getUserMedia` çağırıyor, sonra ElevenLabs SDK'sı bağlantı açarken **ikinci kez** mikrofon istiyor. iOS'ta bu çift istem olarak görünüyor.
3. **İlk mesajın söylenmemesi**: `language: "tr"` override'ı gönderiliyor ama ajanın Türkçe dil ayarında ilk mesaj tanımlı değilse ElevenLabs ilk mesajı boş geçiyor.

## Yapılacaklar

### 1. Bağlantı teşhisi ve zaman aşımı (`VoiceCopilot.tsx`)
- `startSession`'a 15 saniyelik zaman aşımı ekle; süre dolarsa "Bağlanıyor" yerine net bir hata mesajı ve "Tekrar Dene" butonu göster.
- Her adımı (mikrofon izni → token alındı → oturum açıldı) konsola logla ki takılmanın tam yeri görülebilsin.
- Token yanıtındaki `agent_id`'yi de logla.

### 2. WebSocket yedeği (edge function + client)
- Token fonksiyonuna `signed_url` desteği ekle (ElevenLabs `get-signed-url` ucu).
- WebRTC 15 saniyede bağlanamazsa otomatik olarak WebSocket (`signedUrl`) ile yeniden dene — bazı ağlarda/iOS WebView'da WebRTC engellenebiliyor.

### 3. Tek mikrofon istemi
- Manuel `getUserMedia` ön çağrısını kaldır; mikrofonu yalnızca SDK istesin (tek istem).
- İzin durumunu `navigator.permissions.query({ name: "microphone" })` ile kontrol edip daha önce reddedildiyse açıklayıcı mesaj göster.
- Not: Native (Capacitor) tarafta iOS'un her oturumda tekrar sorması WKWebView davranışıdır; `Info.plist`'te `NSMicrophoneUsageDescription` tanımlı olmalı ve Capacitor 5+ native izin verildiyse tekrar sormaz. Bunun için yerel projede `npx cap sync` + yeni build gerekir.

### 4. İlk mesaj garantisi
- `startSession` override'ına `firstMessage: "Merhaba, ben Şantiyem AI. Hangi projede yardımcı olayım?"` ekle.
- **Sizin yapmanız gereken (ElevenLabs panelinde, 1 kez)**: Agent → Security → Overrides bölümünde **First message** kutusunu da işaretleyin (Language'in yanına). İşaretlenmezse override sessizce yok sayılır.

## Teknik Detaylar
- Değişen dosyalar: `src/components/voice/VoiceCopilot.tsx`, `supabase/functions/elevenlabs-conversation-token/index.ts`
- Doğrulama: Edge function'ı doğrudan test edip token/signed URL döndüğünü kontrol edeceğim; web önizlemede bağlantı akışını konsol loglarıyla izleyeceğim.
