import { Contract } from "@/hooks/useContracts";
import { FileText, Plus, AlertTriangle, CheckCircle2, XCircle, DollarSign, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardStyle, CONTRACT_TYPES, getDaysRemaining, getStatusInfo, formatCurrency, formatDate, getTimeProgress } from "./ContractTypes";

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

  // Sort: expiring first, then expired, then active
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
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>Tüm sözleşmelerinizi tek ekrandan yönetin</p>
        </div>
        <Button onClick={onAdd} className="h-9 text-sm font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
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
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs font-medium" style={{ color: "#64748B" }}>{s.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contract Cards */}
      {contracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={cardStyle}>
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} />
          <p className="text-sm font-medium" style={{ color: "#64748B" }}>Henüz sözleşme eklenmedi</p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>Yeni bir sözleşme ekleyerek başlayın</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const status = getStatusInfo(c.end_date, c.status);
            const daysLeft = getDaysRemaining(c.end_date);
            const tp = getTimeProgress(c.start_date, c.end_date);
            const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

            // Count hakedis and warnings (from ai_analysis)
            const hakedisCount = c.ai_analysis?.odeme_takvimi?.length || c.payment_schedule?.length || 0;
            const warningCount = c.ai_analysis?.kritik_maddeler?.filter((m: any) => m.onem === "kritik").length || 0;

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left rounded-xl p-5 transition-all hover:border-[#2A3441]"
                style={{
                  ...cardStyle,
                  borderLeft: isExpiring ? "3px solid #F59E0B" : daysLeft !== null && daysLeft < 0 ? "3px solid #EF4444" : "1px solid #1E2732",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate text-foreground">{c.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{c.counterparty} • {formatCurrency(c.amount)}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ml-2" style={{ color: status.color, backgroundColor: status.bg }}>
                    {status.icon} {status.label}
                  </span>
                </div>

                {/* Date + Type */}
                <div className="flex items-center gap-4 text-xs mb-3" style={{ color: "#94A3B8" }}>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(c.start_date)} — {formatDate(c.end_date)}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
                    {CONTRACT_TYPES[c.contract_type] || c.contract_type}
                  </span>
                </div>

                {/* Progress bar */}
                {tp.total > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: "#64748B" }}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tp.elapsed}g geçti</span>
                      <span>{tp.remaining}g kaldı — %{Math.round(tp.pct)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "#1E2732" }}>
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

                {/* Bottom row */}
                <div className="flex items-center gap-3 text-[10px]" style={{ color: "#64748B" }}>
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
