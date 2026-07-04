import { AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgPlan, effectiveLimit } from "@/hooks/useOrgPlan";
import { isNativeApp, NATIVE_SUB_NOTICE } from "@/lib/nativeGuards";

const WATCH: { key: string; label: string; unit?: string }[] = [
  { key: "projects", label: "Projeler" },
  { key: "users", label: "Kullanıcılar" },
  { key: "storage_mb", label: "Depolama", unit: "MB" },
  { key: "kb_storage_mb", label: "Bilgi Bankası", unit: "MB" },
  { key: "ai_requests_month", label: "AI istekleri (bu ay)" },
  { key: "voice_minutes_month", label: "Sesli dakika (bu ay)" },
  { key: "comm_messages_month", label: "İletişim mesajı (bu ay)" },
  { key: "company_memory_writes_month", label: "Şirket Hafızası yazma (bu ay)" },
];

interface Row {
  key: string; label: string; ratio: number; used: number; limit: number;
  enforcement: "hard" | "soft"; over: boolean;
}

export function QuotaWarningBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  const { summary } = useOrgPlan();
  if (!summary) return null;

  const rows: Row[] = [];
  for (const w of WATCH) {
    const spec = effectiveLimit(summary, w.key);
    if (!spec || spec.limit < 0) continue;
    const used = summary.usage[w.key] ?? 0;
    const ratio = used / Math.max(spec.limit, 1);
    if (ratio < 0.8) continue;
    rows.push({
      key: w.key, label: w.label, ratio, used, limit: spec.limit,
      enforcement: spec.enforcement, over: used >= spec.limit,
    });
  }
  if (rows.length === 0) return null;

  const worst = rows.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  const blocked = worst.over && worst.enforcement === "hard";
  const critical = worst.ratio >= 0.95;

  const variant = blocked ? "destructive" : critical ? "destructive" : "default";
  const title = blocked
    ? `Sınıra ulaşıldı: ${worst.label}`
    : critical
      ? `Sınıra çok yaklaştınız: ${worst.label}`
      : `Kullanım yüksek: ${worst.label}`;

  return (
    <Alert variant={variant as any} className="my-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {rows.length === 1
            ? `${worst.label}: ${worst.used}/${worst.limit}`
            : `${rows.length} metrik %80 üzerinde. Planınızı yükseltmek isteyebilirsiniz.`}
        </span>
        {isNativeApp() ? (
          <span className="text-xs opacity-80">{NATIVE_SUB_NOTICE}</span>
        ) : (
          <Button size="sm" variant={blocked ? "secondary" : "default"} onClick={onUpgrade}>
            <Zap className="h-3 w-3 mr-1" /> Planı yükselt
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
