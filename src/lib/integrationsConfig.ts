// Entegrasyonlar — tek kaynak konfigürasyon. Yeni entegrasyonlar buraya
// eklenir; UI hardcode JSON blokları içermez ve provider bağımsızdır.

import {
  MessageCircle, Instagram, Mail, CalendarDays, Calculator, Webhook,
  type LucideIcon,
} from "lucide-react";

export type IntegrationStatus = "connected" | "not_connected" | "coming_soon";

export type IntegrationCategory =
  | "messaging" | "social" | "email" | "calendar" | "accounting" | "developer";

export interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  /** Altyapı sağlayıcısı — sadece bilgilendirme amaçlı küçük metin. */
  provider?: string;
  status: IntegrationStatus;
  icon: LucideIcon;
  /** Bu turda bağlantı kurulum ekranı açılabilir mi? */
  isAvailable: boolean;
  actionLabel?: string;
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  messaging: "Mesajlaşma",
  social: "Sosyal Medya",
  email: "E-posta",
  calendar: "Takvim",
  accounting: "Muhasebe",
  developer: "Geliştirici",
};

export const STATUS_LABELS: Record<IntegrationStatus, string> = {
  connected: "Bağlı",
  not_connected: "Bağlı değil",
  coming_soon: "Yakında",
};

/** Ana entegrasyon kartları. */
export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description:
      "Görev, ödeme, tahsilat, teslimat ve diğer operasyonel bildirimleri WhatsApp üzerinden yönetin.",
    category: "messaging",
    provider: "Evolution API",
    status: "not_connected",
    icon: MessageCircle,
    isAvailable: true,
    actionLabel: "WhatsApp'ı Bağla",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Instagram Business hesabınızı Şantiyem AI ile bağlayın.",
    category: "social",
    status: "coming_soon",
    icon: Instagram,
    isAvailable: false,
  },
];

/** Alt bölümdeki sade "Yakında" listesi. */
export const UPCOMING_INTEGRATIONS: Pick<
  IntegrationDef, "id" | "name" | "description" | "category" | "icon"
>[] = [
  { id: "email", name: "E-posta", description: "Bildirim ve rapor gönderimi", category: "email", icon: Mail },
  { id: "google-calendar", name: "Google Calendar", description: "Toplantı ve termin senkronizasyonu", category: "calendar", icon: CalendarDays },
  { id: "accounting", name: "Muhasebe", description: "Fatura ve cari aktarımı", category: "accounting", icon: Calculator },
  { id: "webhook", name: "Webhook / API", description: "Kendi sistemlerinizle bağlantı", category: "developer", icon: Webhook },
];

/** Gerçek bağlantı yoksa bağlı sayısı 0 kalır — sahte sayı üretilmez. */
export const countConnected = (list: IntegrationDef[] = INTEGRATIONS) =>
  list.filter((i) => i.status === "connected").length;

export const countAvailable = (list: IntegrationDef[] = INTEGRATIONS) =>
  list.filter((i) => i.isAvailable).length;
