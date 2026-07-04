import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageBar } from "./UsageBar";
import { PlanBadge } from "./PlanBadge";
import { useOrgPlan, effectiveLimit } from "@/hooks/useOrgPlan";

const METRICS: { key: string; label: string; unit?: string }[] = [
  { key: "users", label: "Kullanıcılar" },
  { key: "projects", label: "Projeler" },
  { key: "storage_mb", label: "Toplam depolama", unit: "MB" },
  { key: "kb_storage_mb", label: "Bilgi Bankası depolaması", unit: "MB" },
  { key: "ai_requests_month", label: "AI istekleri (bu ay)" },
  { key: "voice_minutes_month", label: "Sesli dakika (bu ay)" },
  { key: "comm_messages_month", label: "İletişim mesajı (bu ay)" },
  { key: "company_memory_writes_month", label: "Şirket Hafızası yazma (bu ay)" },
];

export function PlanLimitsPanel() {
  const { summary, loading } = useOrgPlan();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Plan ve Kullanım</CardTitle>
        <PlanBadge />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="text-xs text-muted-foreground">Yükleniyor…</div>}
        {!loading && summary && METRICS.map((m) => {
          const spec = effectiveLimit(summary, m.key);
          const used = summary.usage[m.key] ?? 0;
          return (
            <UsageBar
              key={m.key}
              label={m.label}
              used={used}
              limit={spec?.limit ?? null}
              enforcement={spec?.enforcement ?? "soft"}
              unit={m.unit}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
