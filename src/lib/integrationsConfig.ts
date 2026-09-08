// Entegrasyonlar — tek kaynak konfigürasyon. Tek sade liste; bölüm ayrımı yok.
// Bağlantı durumu gerçek bağlantı kaydından okunur, burada sahte durum üretilmez.

import { MessageCircle, type LucideIcon } from "lucide-react";

export type IntegrationStatus = "connected" | "not_connected";

export interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  manageLabel?: string;
}

export const STATUS_LABELS: Record<IntegrationStatus, string> = {
  connected: "Bağlı",
  not_connected: "Bağlı Değil",
};

/** Görünen entegrasyonlar — tek sade liste. */
export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Yönetici özetleri ve ileride proje sohbetleri",
    icon: MessageCircle,
    actionLabel: "Bağla",
    manageLabel: "Yönet",
  },
];
