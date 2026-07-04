// Client-side quota check helper. Wraps the `check_quota` RPC and shows a
// toast when the caller is over the hard limit. Returns true when the action
// may proceed.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const METRIC_LABELS: Record<string, string> = {
  users: "kullanıcı",
  projects: "proje",
  storage_mb: "depolama",
  kb_storage_mb: "bilgi bankası depolaması",
};

export interface QuotaCheck {
  limit: number | null;
  used: number;
  remaining: number | null;
  enforcement: "hard" | "soft";
  grace_pct: number;
  over: boolean;
}

export async function checkQuota(metric: string): Promise<QuotaCheck | null> {
  const { data, error } = await supabase.rpc("check_quota", { _key: metric });
  if (error || !data) return null;
  return data as unknown as QuotaCheck;
}

export async function assertQuotaOrToast(
  metric: string,
  delta = 1,
): Promise<boolean> {
  const q = await checkQuota(metric);
  if (!q) return true;
  if (q.limit === null || q.limit < 0) return true;
  const cap = q.enforcement === "soft"
    ? Math.floor(q.limit * (1 + (q.grace_pct || 0) / 100))
    : q.limit;
  if (q.used + delta > cap) {
    const label = METRIC_LABELS[metric] ?? metric;
    toast.error(
      `Plan sınırına ulaşıldı: ${label} (${q.used}/${q.limit}). Devam etmek için planı yükseltin.`,
    );
    return false;
  }
  return true;
}
