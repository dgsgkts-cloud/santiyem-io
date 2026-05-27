# Android Deep Link Test Rehberi

Bu doküman `santiyem://payment-callback` ve `https://santiyem.io/payment-callback` deep link'lerinin adb ile test edilmesini açıklar.

---

## 1. ADB Komutlarıyla Manuel Test

### 1.1. Success (başarılı ödeme) senaryosu

```bash
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=success&message=Odeme+basarili"
```

**Beklenen davranış:**
- Uygulama ön plana gelir (varsa) veya açılır.
- `DeepLinkHandler` `santiyem://payment-callback?status=success&message=Odeme+basarili` URL'sini yakalar.
- Kullanıcı `/odeme-sonucu` sayfasına yönlendirilir.
- Ekranda: "Ödeme Başarılı" başlığı ve yeşil başarı durumu görünür.

---

### 1.2. Failed (başarısız ödeme) senaryosu

```bash
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=failure&message=Kart+onaylanmadi"
```

**Beklenen davranış:**
- Uygulama açılır.
- Kullanıcı `/odeme-sonucu` sayfasına yönlendirilir.
- Ekranda: "Ödeme Başarısız" başlığı ve kırmızı hata durumu görünür.

---

### 1.3. Cancel (iptal) senaryosu

```bash
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=cancel&message=Kullanici+iptal+etti"
```

**Beklenen davranış:**
- Uygulama açılır.
- Kullanıcı `/odeme-sonucu` sayfasına yönlendirilir.
- Ekranda: "Ödeme İptal Edildi" başlığı ve turuncu/amber iptal durumu görünür.

---

### 1.4. Native flag ile (Android → web köprüsü)

```bash
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=success&message=test&native=1"
```

**Beklenen davranış:**
- `native=1` flag'i `DeepLinkHandler` tarafından algılanır.
- URL'den `native=1` parametresi kaldırılır.
- Kullanıcı temiz `santiyem://payment-callback?status=success&message=test` URL'sine yönlendirilir.
- Webview içinde köprü sayfası (`/payment-callback`) açılmaz, doğrudan native uygulama `/odeme-sonucu` sayfasına gider.

---

### 1.5. Yanlış/eksik parametre (doğrulama testi)

```bash
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=unknown"
```

**Beklenen davranış:**
- `DeepLinkHandler` `paymentCallbackSchema` doğrulamasından geçemez.
- Hata toast mesajı gösterilir: "Geçersiz ödeme bildirimi".
- Kullanıcı varsayılan sayfaya (dashboard) yönlendirilir.

---

### 1.6. HTTPS App Links testi (autoVerify)

```bash
adb shell am start -a android.intent.action.VIEW -d "https://santiyem.io/payment-callback?status=success&message=AppLink+test"
```

**Beklenen davranış:**
- Cihazda `.well-known/assetlinks.json` doğrulanmışsa: uygulama doğrudan açılır (seçici dialog çıkmaz).
- Doğrulanmamışsa: tarayıcıda açılır veya seçici dialog görünür.

---

## 2. Cihazda Doğrulama Komutları

### 2.1. Deep link domain doğrulama durumunu kontrol et

```bash
adb shell pm get-app-links app.lovable.75507a907e2b421c9e2d6aa7effd7c93
```

**Başarılı çıktı örneği:**
```
Domain verification status for app.lovable.75507a907e2b421c9e2d6aa7effd7c93:
  santiyem.io: verified  <-- Önemli!
```

`verified` görünmüyorsa `assetlinks.json` yayında değil veya SHA-256 fingerprint yanlıştır.

---

### 2.2. Tüm app link domain'lerini listele

```bash
adb shell dumpsys package app.lovable.75507a907e2b421c9e2d6aa7effd7c93 | grep -A 20 "Domain Verifier"
```

---

### 2.3. Intent çözümleme (hangi aktivite yakalıyor)

```bash
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=success" -f 0x10000000
```

`-f 0x10000000` (FLAG_ACTIVITY_NEW_TASK) flag'i cihazda test ederken gerekebilir.

---

### 2.4. Logcat ile deep link yakalamasını izle

```bash
adb logcat | grep -i "santiyem\|deeplink\|intent"
```

Önce logcat'i başlatın, sonra adb start komutunu çalıştırın. `MainActivity` ve `DeepLinkHandler` loglarını görmelisiniz.

---

## 3. Logcat Filtreli Gözlem

Uygulamanızın console loglarını görmek için:

```bash
adb logcat -s "Capacitor" "Console" "WebView"
```

Veya React/WebView console mesajları için:

```bash
adb logcat | grep "React\|console"
```

---

## 4. Sorun Giderme

### 4.1. Uygulama açılmıyor, tarayıcı açılıyor
- `AndroidManifest.xml`'de `intent-filter` doğru mu kontrol edin.
- `santiyem://payment-callback` için `<data android:scheme="santiyem" android:host="payment-callback" />` var mı?
- `https://santiyem.io/payment-callback` için `autoVerify="true"` ve `assetlinks.json` yayında mı?

### 4.2. Seçici dialog (disambiguation) çıkıyor
- `assetlinks.json` doğrulanmamış demektir.
- `adb shell pm get-app-links` komutu ile kontrol edin.
- `assetlinks.json`'u `https://santiyem.io/.well-known/assetlinks.json` adresinden erişilebilir olduğundan emin olun.

### 4.3. `status=success` gitmiyor, boş sayfa geliyor
- `DeepLinkHandler.tsx`'te `resolveDeepLinkAction()` dönüş değerini console.log ile kontrol edin.
- `paymentCallbackSchema` validasyonu geçiyor mu kontrol edin.

---

## 5. Hızlı Test Akışı

```bash
# 1. Cihazı bağla
adb devices

# 2. Uygulamayı ön plana getir (veya aç)
adb shell monkey -p app.lovable.75507a907e2b421c9e2d6aa7effd7c93 -c android.intent.category.LAUNCHER 1

# 3. Logcat'i ayrı terminale başlat
adb logcat | grep -i "santiyem\|deeplink"

# 4. Deep link gönder
adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=success&message=Test+basarili"

# 5. Cihaz ekranında uygulamanın açıldığını ve ödeme sonuç sayfasına gittiğini doğrula
```

---

## 6. CI/CD Otomasyon (GitHub Actions vb.)

GitHub Actions'ta emülatör üzerinde test etmek için:

```yaml
- name: Start Android Emulator
  uses: reactivecircus/android-emulator-runner@v2
  with:
    api-level: 30
    script: |
      adb shell am start -a android.intent.action.VIEW -d "santiyem://payment-callback?status=success&message=CI+test"
      sleep 5
      adb shell screencap -p /sdcard/deeplink_test.png
      adb pull /sdcard/deeplink_test.png deeplink_test.png
```

---

## Notlar
- `santiyem://payment-callback` dışındaki `santiyem://` URL'leri `android:host="payment-callback"` olmadığı için genel scheme filter tarafından yakalanır.
- `status` değeri sadece `success`, `failure`, `cancel` olabilir (büyük/küçük harf duyarlı değil, `canceled` → `cancel` normalize edilir).
