// Sprint 22 — Small pills for payment method + status shown on Finance rows.
import { Banknote, Building2, FileText, CreditCard } from "lucide-react";

export const PAYMENT_METHOD_META: Record<
  string,
  { label: string; icon: any; color: string; emoji: string }
> = {
  nakit: { label: "Nakit", icon: Banknote, color: "#22C55E", emoji: "💵" },
  havale: { label: "EFT", icon: Building2, color: "#3B82F6", emoji: "🏦" },
  eft: { label: "EFT", icon: Building2, color: "#3B82F6", emoji: "🏦" },
  cek: { label: "Çek", icon: FileText, color: "#A855F7", emoji: "📄" },
  kredi_karti: { label: "K. Kartı", icon: CreditCard, color: "#EC4899", emoji: "💳" },
};

export const PaymentMethodBadge = ({ type }: { type?: string | null }) => {
  const meta = (type && PAYMENT_METHOD_META[type]) || PAYMENT_METHOD_META.nakit;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium"
      style={{
        backgroundColor: meta.color + "18",
        color: meta.color,
      }}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

export const STATUS_META: Record<
  string,
  { label: string; color: string }
> = {
  odendi: { label: "Ödendi", color: "#22C55E" },
  bekliyor: { label: "Bekliyor", color: "#F59E0B" },
  planlandi: { label: "Planlandı", color: "#3B82F6" },
  gecikti: { label: "Gecikti", color: "#EF4444" },
  bekleniyor: { label: "Bekliyor", color: "#F59E0B" },
};

export const StatusBadge = ({ status }: { status?: string | null }) => {
  const meta = (status && STATUS_META[status]) || STATUS_META.odendi;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium"
      style={{
        backgroundColor: meta.color + "18",
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
};
