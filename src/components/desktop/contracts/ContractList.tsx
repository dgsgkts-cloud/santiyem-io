import { Contract } from "@/hooks/useContracts";
import { FileText, Plus, AlertTriangle, CheckCircle2, XCircle, DollarSign, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardStyleClass, CONTRACT_TYPES, getDaysRemaining, getStatusInfo, formatCurrency, formatDate, getTimeProgress } from "./ContractTypes";

interface Props {
  contracts: Contract[];
  signatureMap?: Record<string, { status: string; label: string; color: string }>;
  onSelect: (c: Contract) => void;
  onAdd: () => void;
}

export default function ContractList({ contracts, signatureMap = {}, onSelect, onAdd }: Props) {
  const now = new Date();
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => !c.end_date || new Date(c.end_date) >= now).length,
    expiring: contracts.filter(c => { const d = getDaysRemaining(c.end_date); return d !== null && d > 0 && d <= 30; }).length,
    expired: contracts.filter(c => c.end_date && new Date(c.end_date) < now).length,
  };

  const sorted = [...contracts].sort((a, b) => {
    const da = getDaysRemaining(a.end_date);
    const db = getDaysRemaining(b.end_date);
    const sa = da !== null && da > 0 && da <= 30 ? 0 : da !== null && da < 0 ? 1 : 2;
    const sb = db !== null && db > 0 && db <= 30 ? 0 : db !== null && db < 0 ? 1 : 2;
    if (sa !== sb) return sa - sb;
    return (da ?? 999) - (db ?? 999);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sözleşme Takibi</h1>
          <p className="text-xs mt-1 text-muted-foreground">Tüm sözleşmelerinizi tek ekrandan yönetin</p>
        </div>
        <Button onClick={onAdd} className="h-9 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Yeni Sözleşme Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Sözleşme", value: stats.total, color: "#94A3B8", icon: FileText },
          { label: "Aktif", value: stats.active, color: "#22C55E", icon: CheckCircle2 },
          { label: "Süresi Yaklaşan", value: stats.expiring, color: "#F59E0B", icon: AlertTriangle },
          { label: "Süresi Dolan", value: stats.expired, color: "#EF4444", icon: XCircle },
        ].map((s) => (
          <div key={s.label} className={`p-4 ${cardStyleClass}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contract Cards */}
      {contracts.length === 0 ? (
        <div className={cardStyleClass}>
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <span className="text-5xl mb-4">📄</span>
            <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sözleşmelerinizi takip edin
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-5">
              Sözleşme ekleyerek vade tarihleri, ödeme takvimleri ve cezai şartları otomatik takip edin.
            </p>
            <Button onClick={onAdd} className="text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1.5" /> Yeni Sözleşme Ekle
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const status = getStatusInfo(c.end_date, c.status);
            const daysLeft = getDaysRemaining(c.end_date);
            const tp = getTimeProgress(c.start_date, c.end_date);
            const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

            const hakedisCount = c.ai_analysis?.odeme_takvimi?.length || c.payment_schedule?.length || 0;
            const warningCount = c.ai_analysis?.kritik_maddeler?.filter((m: any) => m.onem === "kritik").length || 0;

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={`w-full text-left p-5 transition-all hover:border-accent ${cardStyleClass}`}
                style={{
                  borderLeftWidth: isExpiring ? 3 : daysLeft !== null && daysLeft < 0 ? 3 : undefined,
                  borderLeftColor: isExpiring ? "#F59E0B" : daysLeft !== null && daysLeft < 0 ? "#EF4444" : undefined,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate text-foreground">{c.name}</h3>
                    <p className="text-xs mt-0.5 text-muted-foreground">{c.counterparty} • {formatCurrency(c.amount)}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ml-2" style={{ color: status.color, backgroundColor: status.bg }}>
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs mb-3 text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(c.start_date)} — {formatDate(c.end_date)}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
                    {CONTRACT_TYPES[c.contract_type] || c.contract_type}
                  </span>
                </div>

                {tp.total > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] mb-1 text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tp.elapsed}g geçti</span>
                      <span>{tp.remaining}g kaldı — %{Math.round(tp.pct)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${tp.pct}%`,
                          backgroundColor: tp.pct >= 90 ? "#EF4444" : tp.pct >= 70 ? "#F59E0B" : "#22C55E",
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {signatureMap[c.id] && (
                    <span className="font-semibold px-1.5 py-0.5 rounded" style={{ color: signatureMap[c.id].color, backgroundColor: `${signatureMap[c.id].color}15` }}>
                      {signatureMap[c.id].label}
                    </span>
                  )}
                  {!signatureMap[c.id] && <span>📝 Taslak</span>}
                  {hakedisCount > 0 && <span>📋 {hakedisCount} hakediş</span>}
                  {warningCount > 0 && <span style={{ color: "#F59E0B" }}>⚠️ {warningCount} uyarı</span>}
                  {c.ai_analysis && <span style={{ color: "#60A5FA" }}>🤖 AI Analiz</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
