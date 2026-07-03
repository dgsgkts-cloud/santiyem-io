# Mikrofon Etkinleşmeme Sorunu — Düzeltme Planı

## Teşhis

- `android/app/src/main/AndroidManifest.xml` dosyasında **RECORD_AUDIO (mikrofon) izni hiç tanımlı değil**. Bu yüzden native Android uygulamasında WebView mikrofonu asla açamıyor — tarayıcı izin isteği görünse bile sistem düzeyinde reddediliyor.
- Aynı eksik, daha önce yaşadığınız "her seferinde tekrar izin istiyor" sorununun da nedeni: uygulama düzeyinde izin verilmediği için WebView her oturumda yeniden soruyor.
- Sunucu tarafında sorun yok — token fonksiyonuna hiç istek ulaşmamış, yani bağlantı mikrofon aşamasında takılıyor.

## Yapılacaklar

### 1. Android manifest'e mikrofon izinleri (ana düzeltme)
`AndroidManifest.xml` dosyasına eklenecek:
- `android.permission.RECORD_AUDIO`
- `android.permission.MODIFY_AUDIO_SETTINGS`
- `android.permission.BLUETOOTH_CONNECT` (kulaklıkla kullanım için)

Capacitor, bu izinler manifest'te tanımlı olduğunda WebView'in mikrofon isteğini otomatik olarak native izinle eşleştirir. Kullanıcı **bir kez** onay verdikten sonra bir daha sorulmaz.

### 2. VoiceCopilot'ta native izin ön-kontrolü
`start()` fonksiyonunda, oturum başlatmadan önce `getUserMedia` ile mikrofon bir kez açılıp hemen kapatılacak (izni tetiklemek ve doğrulamak için). Başarısız olursa Türkçe, anlaşılır bir hata mesajı gösterilecek ("Mikrofon izni gerekli — Ayarlar > Uygulamalar > Şantiyem > İzinler").

### 3. Hata görünürlüğü
Mikrofon aşaması başarısız olduğunda "Bağlanıyor…" durumunda takılı kalmak yerine net hata durumuna geçilecek.

## Önemli Not

Manifest değişikliği **yeni bir Android derlemesi (APK/AAB) gerektirir**. Kod tarafındaki iyileştirmeler web önizlemede hemen çalışır, ancak native uygulamada düzelme için uygulamayı yeniden derleyip (`npx cap sync android` + build) telefona kurmanız gerekir.

## Teknik Detaylar

- Dosyalar: `android/app/src/main/AndroidManifest.xml`, `src/components/voice/VoiceCopilot.tsx`
- ElevenLabs SDK WebRTC bağlantısı `getUserMedia` başarısız olunca sessizce takılıyor; ön-kontrol bunu erken yakalayacak.
- Backend (token fonksiyonu, chat) değişmeyecek.