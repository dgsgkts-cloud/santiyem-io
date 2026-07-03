## Sorun
Mikrofon (turuncu VoiceOrb) butonuna basınca uygulama beyaz ekrana düşüyor. Şu an konsolda/runtime hatalarında iz yok, çünkü hata yakalanmadan React ağacı çöküyor ve tüm sayfa boşalıyor.

## Olası Nedenler
1. `VoiceCopilot` içindeki `useConversation` (@elevenlabs/react 1.9) veya `startSession` çağrısı senkron bir exception fırlatıyor ve üstte bir ErrorBoundary olmadığı için tüm ağaç unmount oluyor.
2. `access` prop'u loading iken bazı alanlar `null/undefined` — `access.remainingSeconds !== null` gibi kontroller var ama `access.refresh` `onDisconnect` içinden çağrıldığında stale kapatma sorunları var.
3. iOS/Android WebView'da `navigator.mediaDevices` yok → yakalanmayan reject → render sırasında değil ama akış sırasında overlay'in `error` state'ine düşmesi gerekirken push edilen state çakışması.

Şu an konsol/network `read` snapshot'ında hata gözükmediği için gerçek exception'ı görmemiz gerek — bunun için ErrorBoundary şart.

## Yapılacaklar (sadece Voice modülü, UI dışı değişiklik yok)

1. **`src/components/voice/VoiceErrorBoundary.tsx` (yeni)**  
   Basit class ErrorBoundary. Hata olursa beyaz ekran yerine koyu bir "Sesli asistan başlatılamadı — <mesaj>" kartı gösterir ve `console.error` ile stack'i loglar. Kapat butonu ile `onClose` çağırır.

2. **`src/components/voice/VoiceOrb.tsx`**  
   `<VoiceCopilot />` render'ını `<VoiceErrorBoundary onClose={...}>` ile sarmala. Böylece bir sonraki denemede beyaz ekran yerine somut hata mesajını göreceğiz.

3. **`src/components/voice/VoiceCopilot.tsx` — savunmacı düzeltmeler**  
   - `start()` başında `navigator.mediaDevices?.getUserMedia` kontrolü; yoksa `setError("Bu cihaz mikrofon erişimini desteklemiyor.")` ile geri dön (fırlatma yok).
   - `onConnect` içindeki `conversation.sendContextualUpdate` çağrısını `queueMicrotask` içine al — `useConversation` başlatılırken `conversation` referansı henüz tanımlı olmayabilir; TDZ crash'ini engeller.
   - `onDisconnect`/`onError` callback'lerinde `try/catch` ekle; hiçbir callback exception'ı React ağacına sızmasın.
   - `access.refresh` çağrısını `access` prop üzerinden ref ile tut (stale closure guard).

4. **Doğrulama**  
   Değişiklikten sonra tekrar mikrofona basıldığında:
   - Eğer sorun ElevenLabs SDK / token akışı ise ekranda kırmızı kart + konsolda gerçek mesaj görünecek.
   - Eğer sorun MediaDevices ise net Türkçe uyarı çıkacak.
   Kullanıcıdan çıkan mesajı paylaşmasını isteyeceğim; oradan asıl sebebi tespit edip nokta atışı fix yapacağız.

## Kapsam Dışı
- ElevenLabs agent konfigürasyonu, kota mantığı, UI/tasarım, edge function'lar değişmiyor.
- Web ve native davranış aynı kalıyor.
