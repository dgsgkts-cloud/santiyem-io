// Sprint 37 — Smart Suggestions.
// Context-aware prompts derived from live operations data, not a static list.

import { useMemo } from "react";
import {
  AlertTriangle,
  Wallet,
  Package,
  HardHat,
  FileText,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import type { AIOperationsSummary } from "@/lib/aiOperationsBrain";
import type { ExecutiveKpis } from "@/hooks/useExecutiveBrief";

interface Suggestion {
  id: string;
  icon: typeof Sparkles;
  label: string;
  prompt: string;
  hint?: string;
}

export function buildSmartSuggestions(
  kpis: ExecutiveKpis | null,
  ops: AIOperationsSummary
): Suggestion[] {
  const out: Suggestion[] = [];

  if ((kpis?.criticalRisks ?? 0) > 0) {
    out.push({
      id: "risks",
      icon: AlertTriangle,
      label: "Bugünün risklerini göster",
      prompt: "Bugün için tespit edilen tüm operasyonel ve finansal riskleri önceliklendirerek listele.",
      hint: `${kpis?.criticalRisks} kritik başlık`,
    });
  }
  if ((kpis?.pendingPayments ?? 0) > 0) {
    out.push({
      id: "payments",
      icon: Wallet,
      label: "Geciken ödemeleri incele",
      prompt: "Vadesi geçmiş ödeme ve tahsilatları listele, hangi işlem önce yapılmalı söyle.",
      hint: `${kpis?.pendingPayments} bekleyen kayıt`,
    });
  }
  if ((kpis?.criticalStockItems ?? 0) > 0) {
    out.push({
      id: "stock",
      icon: Package,
      label: "Malzeme eksiklerini kontrol et",
      prompt: "Kritik seviyedeki malzemeleri ve önerilen sipariş miktarlarını listele.",
      hint: `${kpis?.criticalStockItems} kritik stok`,
    });
  }
  if ((kpis?.activeWorkersToday ?? 0) >= 0) {
    out.push({
      id: "labor",
      icon: HardHat,
      label: "Bugünkü saha durumunu özetle",
      prompt: "Bugünkü puantaj, ekip dağılımı ve iş gücü verimliliğini özetle.",
      hint: `${kpis?.activeWorkersToday ?? 0} kişi sahada`,
    });
  }
  out.push({
    id: "progress",
    icon: FileText,
    label: "Proje ilerlemesini özetle",
    prompt: "Aktif projelerin fiziksel ilerleme, bütçe ve takvim durumunu tek özet halinde ver.",
    hint: `${kpis?.activeProjects ?? 0} aktif proje`,
  });
  out.push({
    id: "diary",
    icon: CalendarClock,
    label: "Günlük şantiye raporu üret",
    prompt: "Bugünkü şantiye günlüğü için hava, ekip, imalat ve uyarıları içeren rapor taslağı hazırla.",
  });
  out.push({
    id: "exec",
    icon: Sparkles,
    label: "Yönetici özeti hazırla",
    prompt: "CEO modu: gelir, gider, nakit, kârlılık, proje sağlığı, riskler ve önerileri tek ekranda özetle.",
  });

  if (ops.topAction?.topActionLabel) {
    out.unshift({
      id: "top-action",
      icon: Sparkles,
      label: ops.topAction.topActionLabel,
      prompt: `${ops.topAction.title} konusunu detaylandır ve atmam gereken adımları sırala.`,
      hint: "AI önceliği",
    });
  }

  return out.slice(0, 6);
}

interface Props {
  kpis: ExecutiveKpis | null;
  ops: AIOperationsSummary;
  onSelect: (prompt: string) => void;
}

const AISmartSuggestions = ({ kpis, ops, onSelect }: Props) => {
  const suggestions = useMemo(() => buildSmartSuggestions(kpis, ops), [kpis, ops]);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.prompt)}
          className="group flex items-start gap-2.5 rounded-card border border-border/70 bg-card/50 p-3 text-left transition-all hover:border-primary/40 hover:bg-card active:scale-[0.99] animate-fade-in"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-primary/10">
            <s.icon className="h-4 w-4 text-primary" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
              {s.label}
            </span>
            {s.hint && (
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.hint}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
};

export default AISmartSuggestions;
