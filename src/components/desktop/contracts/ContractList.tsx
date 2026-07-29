import { useMemo, useState } from "react";
import { Contract } from "@/hooks/useContracts";
import { FileText, Plus, AlertTriangle, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FinanceStatStrip, FinanceFilterBar, FinanceListShell, FinanceRow, FinanceStatusPill,
} from "@/components/finance/financeUi";
import { CONTRACT_TYPES, getDaysRemaining, getStatusInfo, formatCurrency, formatDate, getTimeProgress } from "./ContractTypes";

interface Props {
  contracts: Contract[];
  signatureMap?: Record<string, { status: string; label: string; color: string }>;
  onSelect: (c: Contract) => void;
  onAdd: () => void;
}

// SPRINT 38E — contracts as a dense, date-first register instead of tall cards.
export default function ContractList({ contracts, signatureMap = {}, onSelect, onAdd }: Props) {
  const now = new Date();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => !c.end_date || new Date(c.end_date) >= now).length,
    expiring: contracts.filter(c => { const d = getDaysRemaining(c.end_date); return d !== null && d > 0 && d <= 30; }).length,
    expired: contracts.filter(c => c.end_date && new Date(c.end_date) < now).length,
  };

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...contracts]
      .filter(c => {
        const d = getDaysRemaining(c.end_date);
        if (filter === "expiring" && !(d !== null && d > 0 && d <= 30)) return false;
        if (filter === "expired" && !(d !== null && d < 0)) return false;
        if (filter === "active" && !(d === null || d >= 0)) return false;
        if (!q) return true;
        return `${c.name} ${c.counterparty}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const da = getDaysRemaining(a.end_date);
        const db = getDaysRemaining(b.end_date);
        const sa = da !== null && da > 0 && da <= 30 ? 0 : da !== null && da < 0 ? 1 : 2;
        const sb = db !== null && db > 0 && db <= 30 ? 0 : db !== null && db < 0 ? 1 : 2;
        if (sa !== sb) return sa - sb;
        return (da ?? 999) - (db ?? 999);
      });
  }, [contracts, query, filter]);

  return (
    <div className="px-5 pt-5 pb-6 max-w-6xl mx-auto space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ds-heading text-foreground">Sözleşme Takibi</h1>
          <p className="ds-caption text-muted-foreground mt-0.5">Vade, ödeme takvimi ve imza durumu tek ekranda</p>
        </div>
        <Button onClick={onAdd} className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Yeni Sözleşme</span>
        </Button>
      </header>

      <FinanceStatStrip
        stats={[
          { label: "Toplam", value: stats.total, icon: FileText, tone: "neutral", onClick: () => setFilter("all"), active: filter === "all" },
          { label: "Aktif", value: stats.active, icon: CheckCircle2, tone: "positive", onClick: () => setFilter("active"), active: filter === "active" },
          { label: "Süresi Yaklaşan", value: stats.expiring, icon: AlertTriangle, tone: "attention", onClick: () => setFilter("expiring"), active: filter === "expiring" },
          { label: "Süresi Dolan", value: stats.expired, icon: XCircle, tone: "overdue", onClick: () => setFilter("expired"), active: filter === "expired" },
        ]}
      />

      {contracts.length === 0 ? (
        <div className="rounded-card border border-border/80 bg-card shadow-soft flex flex-col items-center justify-center py-12 px-6 text-center">
          <span className="text-4xl mb-3">📄</span>
          <h3 className="ds-body font-semibold text-foreground mb-1.5">Sözleşmelerinizi takip edin</h3>
          <p className="ds-caption text-muted-foreground max-w-sm mb-4">
            Sözleşme ekleyerek vade tarihleri, ödeme takvimleri ve cezai şartları otomatik takip edin.
          </p>
          <Button onClick={onAdd}><Plus className="w-4 h-4 mr-1.5" /> Yeni Sözleşme Ekle</Button>
        </div>
      ) : (
        <>
          <FinanceFilterBar query={query} onQuery={setQuery} placeholder="Sözleşme veya karşı taraf ara…" />

          <FinanceListShell>
            {sorted.length === 0 ? (
              <p className="ds-caption text-muted-foreground py-12 text-center">Bu filtreyle eşleşen sözleşme yok</p>
            ) : (
              sorted.map((c) => {
                const status = getStatusInfo(c.end_date, c.status);
                const daysLeft = getDaysRemaining(c.end_date);
                const tp = getTimeProgress(c.start_date, c.end_date);
                const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const hakedisCount = c.ai_analysis?.odeme_takvimi?.length || c.payment_schedule?.length || 0;
                const warningCount = c.ai_analysis?.kritik_maddeler?.filter((m: any) => m.onem === "kritik").length || 0;

                return (
                  <div key={c.id} className="relative">
                    <FinanceRow
                      rail={isExpired ? "overdue" : isExpiring ? "attention" : undefined}
                      onClick={() => onSelect(c)}
                      title={c.name}
                      status={<span style={{ color: status.color }}>{status.label}</span>}
                      statusTone={isExpired ? "overdue" : isExpiring ? "attention" : "neutral"}
                      subtitle={
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="truncate">{c.counterparty}</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{formatDate(c.start_date)} — {formatDate(c.end_date)}
                          </span>
                          <span className="opacity-70">{CONTRACT_TYPES[c.contract_type] || c.contract_type}</span>
                          {hakedisCount > 0 && <span className="opacity-70">{hakedisCount} hakediş</span>}
                          {warningCount > 0 && <span className="text-amber-300/90">{warningCount} kritik madde</span>}
                          {signatureMap[c.id] && <span style={{ color: signatureMap[c.id].color }}>{signatureMap[c.id].label}</span>}
                        </span>
                      }
                      amount={formatCurrency(c.amount)}
                      amountTone="neutral"
                      meta={
                        daysLeft === null ? undefined :
                          isExpired ? <span className="text-rose-300/90">{Math.abs(daysLeft)}g gecikme</span> :
                            <span className={isExpiring ? "text-amber-300/90" : undefined}>{daysLeft}g kaldı</span>
                      }
                    />
                    {tp.total > 0 && (
                      <div className="h-[3px] bg-muted/60 mx-3 mb-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${tp.pct}%`,
                            backgroundColor: tp.pct >= 90 ? "hsl(var(--destructive))" : tp.pct >= 70 ? "#F59E0B" : "#22C55E",
                            opacity: 0.65,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </FinanceListShell>
        </>
      )}

      <p className="ds-caption text-muted-foreground text-center pt-1">
        <FinanceStatusPill tone="attention">30 gün içinde bitenler</FinanceStatusPill>
        <span className="ml-2">listenin en üstünde gösterilir.</span>
      </p>
    </div>
  );
}
