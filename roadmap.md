# Roadmap

## Aktif
- [x] WhatsApp Yönetici Özeti → Evolution API mimarisine geçiş (inşa edildi, API credential aşaması atlandı)
  - [x] whatsapp_connections tablosu + RLS
  - [x] Evolution adapter + state/JID mapping + rate limiter
  - [x] whatsapp-connection edge function (QR/pairing/disconnect/status)
  - [x] evolution-webhook edge function (multi-tenant, connection/message status)
  - [x] whatsapp-summary edge function Evolution’a göre güncellendi
  - [x] WhatsAppConnectionCard + useWhatsAppConnection frontend
  - [x] WhatsAppSummaryPanel entegrasyonu
  - [x] Birim testler
  - [x] Edge function deploy
  - [ ] Evolution API URL + API key secret girme (kullanıcı isteğiyle atlandı)
