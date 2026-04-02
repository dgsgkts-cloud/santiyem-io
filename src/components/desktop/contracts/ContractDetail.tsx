import { useState } from "react";
import { Contract } from "@/hooks/useContracts";
import {
  ArrowLeft, Edit2, Trash2, Download, RefreshCw, Bot, Building2, Calendar,
  ChevronUp, ChevronDown, AlertTriangle, Plus, Clock, DollarSign, CheckCircle2, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  cardStyle, CONTRACT_TYPES, getDaysRemaining, getStatusInfo,
  formatCurrency, formatDate, getTimeProgress, ForceMajeure
} from "./ContractTypes";

interface Props {
  contract: Contract;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReanalyze: () => void;
  allHakedisler?: any[];
}

export default function ContractDetail({ contract, onBack, onEdit, onDelete, onReanalyze, allHakedisler = [] }: Props) {
  const status = getStatusInfo(contract.end_date, contract.status);
  const tp = getTimeProgress(contract.start_date, contract.end_date);
  const daysLeft = getDaysRemaining(contract.end_date);
  const analysis = contract.ai_analysis;

  // Hakediş comparison
  const projectHakedis = contract.project_id
    ? allHakedisler.filter(h => h.project_id === contract.project_id)
    : [];
  const totalHakedisAmount = projectHakedis.reduce((s: number, h: any) => s + Number(h.net || h.amount || 0), 0);
  const hakedisUsagePct = contract.amount > 0 ? (totalHakedisAmount / contract.amount) * 100 : 0;

  // Penalty calculator
  const penaltyRate = analysis?.gecikme_cezasi?.gunluk || 0;
  const penaltyLimit = analysis?.gecikme_cezasi?.limit_yuzde || 0;
  const [penaltyDays, setPenaltyDays] = useState(() => {
    if (daysLeft !== null && daysLeft < 0) return Math.abs(daysLeft);
    return 0;
  });
  const penaltyTotal = penaltyDays * penaltyRate;
  const penaltyPct = contract.amount > 0 ? (penaltyTotal / contract.amount) * 100 : 0;

  // Force majeure
  const [forceMajeures, setForceMajeures] = useState<ForceMajeure[]>([]);
  const [showFmForm, setShowFmForm] = useState(false);
  const [fmForm, setFmForm] = useState({ start_date: "", end_date: "", type: "Deprem", description: "", affected_days: 0 });
  const totalExtension = forceMajeures.filter(f => f.status === "onaylandi").reduce((s, f) => s + f.affected_days, 0);

  const addForceMajeure = () => {
    if (!fmForm.start_date || !fmForm.end_date) return;
    const days = fmForm.affected_days || Math.ceil((new Date(fmForm.end_date).getTime() - new Date(fmForm.start_date).getTime()) / (1000 * 60 * 60 * 24));
    setForceMajeures(p => [...p, {
      id: Date.now().toString(), ...fmForm, affected_days: days, status: "bekliyor"
    }]);
    setFmForm({ start_date: "", end_date: "", type: "Deprem", description: "", affected_days: 0 });
    setShowFmForm(false);
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true, ai: true, penalty: true, comparison: true, schedule: true, fm: false, docs: false
  });
  const toggle = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const Section = ({ id, title, icon, badge, children }: { id: string; title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>{title}</span>
          {badge}
        </div>
        {expandedSections[id] ? <ChevronUp className="w-4 h-4" style={{ color: "#64748B" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#64748B" }} />}
      </button>
      {expandedSections[id] && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm flex items-center gap-1" style={{ color: "#94A3B8" }}>
          <ArrowLeft className="w-4 h-4" /> Sözleşme Takibi
        </button>
        <div className="flex items-center gap-2">
          <Button onClick={onEdit} variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
            <Edit2 className="w-3 h-3 mr-1" /> Düzenle
          </Button>
          {contract.file_url && (
            <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
                <Download className="w-3 h-3 mr-1" /> PDF
              </Button>
            </a>
          )}
          <Button onClick={onDelete} variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#EF4444" }}>
            <Trash2 className="w-3 h-3 mr-1" /> Sil
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{contract.name}</h1>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: status.color, backgroundColor: status.bg }}>
          {status.icon} {status.label}
        </span>
      </div>

      {/* General Info */}
      <Section id="general" title="Genel Bilgiler" icon={<Building2 className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">
          <div><span style={{ color: "#64748B" }}>Karşı Taraf</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{contract.counterparty}</p></div>
          <div><span style={{ color: "#64748B" }}>Tür</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{CONTRACT_TYPES[contract.contract_type] || contract.contract_type}</p></div>
          <div><span style={{ color: "#64748B" }}>Tutar</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{formatCurrency(contract.amount)}</p></div>
          <div><span style={{ color: "#64748B" }}>Başlangıç</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{formatDate(contract.start_date)}</p></div>
          <div><span style={{ color: "#64748B" }}>Bitiş</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{formatDate(contract.end_date)}</p></div>
          <div><span style={{ color: "#64748B" }}>Kalan</span><p className="font-medium mt-0.5" style={{ color: status.color }}>{daysLeft !== null ? `${daysLeft} gün` : "—"}</p></div>
        </div>

        {/* Progress bars */}
        {tp.total > 0 && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: "#64748B" }}>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Süre: {tp.elapsed}g geçti, {tp.remaining}g kaldı</span>
                <span>%{Math.round(tp.pct)}</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                <div className="h-full rounded-full" style={{ width: `${tp.pct}%`, backgroundColor: tp.pct >= 90 ? "#EF4444" : tp.pct >= 70 ? "#F59E0B" : "#22C55E" }} />
              </div>
            </div>
            {contract.amount > 0 && (
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: "#64748B" }}>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Tutar: {formatCurrency(totalHakedisAmount)} hakediş, {formatCurrency(contract.amount - totalHakedisAmount)} kaldı</span>
                  <span>%{Math.round(hakedisUsagePct)}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, hakedisUsagePct)}%`, backgroundColor: hakedisUsagePct >= 100 ? "#EF4444" : hakedisUsagePct >= 90 ? "#F59E0B" : "#3B82F6" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* AI Critical Clauses */}
      {analysis?.kritik_maddeler?.length > 0 && (
        <Section id="ai" title="AI Kritik Madde Analizi" icon={<Bot className="w-4 h-4" style={{ color: "#FF6B2B" }} />}
          badge={<span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>🤖</span>}
        >
          <div className="space-y-2 mb-3">
            {analysis.kritik_maddeler.map((m: any, i: number) => {
              const level = m.onem === "kritik" ? { color: "#EF4444", bg: "rgba(239,68,68,0.08)", icon: "🔴", label: "Yüksek Risk" }
                : m.onem === "onemli" || m.onem === "uyari" ? { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", icon: "🟡", label: "Orta Risk" }
                : { color: "#22C55E", bg: "rgba(34,197,94,0.08)", icon: "🟢", label: "Bilgi" };
              return (
                <div key={i} className="rounded-lg p-3" style={{ backgroundColor: level.bg, border: `1px solid ${level.color}20` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{level.icon}</span>
                    <span className="text-[10px] font-semibold" style={{ color: level.color }}>{level.label}</span>
                    {(m.madde_no || m.madde) && <span className="text-[10px]" style={{ color: "#64748B" }}>Madde {m.madde_no || m.madde}</span>}
                    {m.konu && <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>— {m.konu}</span>}
                  </div>
                  <p className="text-xs" style={{ color: "#F1F5F9" }}>{m.icerik || m.aciklama}</p>
                </div>
              );
            })}
          </div>
          <Button onClick={onReanalyze} variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#FF6B2B" }}>
            <RefreshCw className="w-3 h-3 mr-1" /> Yeniden Analiz Et
          </Button>
        </Section>
      )}

      {/* Penalty Calculator */}
      {penaltyRate > 0 && (
        <Section id="penalty" title="Cezai Şart Hesaplama" icon={<AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Gecikme Günü</label>
              <input type="number" value={penaltyDays} onChange={e => setPenaltyDays(Number(e.target.value))} min={0} className="w-full rounded px-2 py-2 text-sm outline-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Günlük Ceza</label>
              <p className="text-sm font-medium mt-1" style={{ color: "#F1F5F9" }}>{formatCurrency(penaltyRate)}</p>
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Toplam Cezai Şart</label>
              <p className="text-lg font-bold" style={{ color: penaltyTotal > 0 ? "#EF4444" : "#22C55E", fontFamily: "'Space Grotesk', sans-serif" }}>
                {formatCurrency(penaltyTotal)}
              </p>
            </div>
          </div>
          {penaltyTotal > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-medium" style={{ color: "#FCA5A5" }}>
                ⚠️ Sözleşme bedelinin %{penaltyPct.toFixed(1)}'ine karşılık geliyor
                {penaltyLimit > 0 && ` (Üst limit: %${penaltyLimit})`}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>Referans amaçlıdır, sözleşmenizi kontrol ediniz.</p>
            </div>
          )}
        </Section>
      )}

      {/* Contract vs Hakediş Comparison */}
      {projectHakedis.length > 0 && (
        <Section id="comparison" title="Sözleşme vs Hakediş Karşılaştırması" icon={<DollarSign className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 font-medium" style={{ color: "#64748B" }}>Hakediş</th>
                  <th className="text-right py-2 font-medium" style={{ color: "#64748B" }}>Tutar</th>
                  <th className="text-right py-2 font-medium" style={{ color: "#64748B" }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {projectHakedis.map((h: any) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid #1E2732" }}>
                    <td className="py-2" style={{ color: "#F1F5F9" }}>{h.period}</td>
                    <td className="py-2 text-right" style={{ color: "#F1F5F9" }}>{formatCurrency(Number(h.net || h.amount || 0))}</td>
                    <td className="py-2 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}>{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #1E2732" }}>
                  <td className="py-2 font-semibold" style={{ color: "#F1F5F9" }}>Toplam</td>
                  <td className="py-2 text-right font-semibold" style={{ color: "#F1F5F9" }}>{formatCurrency(totalHakedisAmount)}</td>
                  <td className="py-2 text-right">
                    <span className="text-[10px] font-medium" style={{ color: hakedisUsagePct >= 100 ? "#EF4444" : hakedisUsagePct >= 90 ? "#F59E0B" : "#22C55E" }}>
                      %{Math.round(hakedisUsagePct)} kullanıldı
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-1" style={{ color: "#64748B" }}>Sözleşme Bedeli</td>
                  <td className="py-1 text-right" style={{ color: "#64748B" }}>{formatCurrency(contract.amount)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="py-1 font-medium" style={{ color: "#F59E0B" }}>Kalan</td>
                  <td className="py-1 text-right font-medium" style={{ color: "#F59E0B" }}>{formatCurrency(contract.amount - totalHakedisAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>
      )}

      {/* Payment Schedule Timeline */}
      {analysis?.odeme_takvimi?.length > 0 && (
        <Section id="schedule" title="Ödeme Takvimi" icon={<Calendar className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
          <div className="space-y-3">
            {analysis.odeme_takvimi.map((o: any, i: number) => {
              const isPast = o.tarih && new Date(o.tarih) < new Date();
              const isPaid = projectHakedis.some((h: any) => h.status === "Ödendi" && h.period?.includes(String(o.hakedis_no)));
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: isPaid ? "#22C55E" : isPast ? "#F59E0B" : "#334155" }} />
                    {i < analysis.odeme_takvimi.length - 1 && <div className="w-px h-6" style={{ backgroundColor: "#1E2732" }} />}
                  </div>
                  <div className="flex-1 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium" style={{ color: "#F1F5F9" }}>
                        {isPaid ? "✅" : isPast ? "⚠️" : "○"} Hakediş #{o.hakedis_no}
                      </span>
                      {o.not && <span className="ml-2" style={{ color: "#64748B" }}>— {o.not}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: "#94A3B8" }}>{formatDate(o.tarih)}</span>
                      <span className="font-medium" style={{ color: "#F1F5F9" }}>{o.tutar ? formatCurrency(o.tutar) : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Force Majeure */}
      <Section id="fm" title="Mücbir Sebep ve Süre Uzatımı" icon={<Shield className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
        {forceMajeures.length > 0 && (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 font-medium" style={{ color: "#64748B" }}>Tarih</th>
                  <th className="text-left py-2 font-medium" style={{ color: "#64748B" }}>Tür</th>
                  <th className="text-right py-2 font-medium" style={{ color: "#64748B" }}>Gün</th>
                  <th className="text-right py-2 font-medium" style={{ color: "#64748B" }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {forceMajeures.map(fm => (
                  <tr key={fm.id} style={{ borderBottom: "1px solid #1E2732" }}>
                    <td className="py-2" style={{ color: "#F1F5F9" }}>{formatDate(fm.start_date)} — {formatDate(fm.end_date)}</td>
                    <td className="py-2" style={{ color: "#94A3B8" }}>{fm.type}</td>
                    <td className="py-2 text-right" style={{ color: "#F1F5F9" }}>{fm.affected_days}g</td>
                    <td className="py-2 text-right">
                      <select
                        value={fm.status}
                        onChange={e => setForceMajeures(p => p.map(f => f.id === fm.id ? { ...f, status: e.target.value as any } : f))}
                        className="rounded px-1 py-0.5 text-[10px] outline-none"
                        style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: fm.status === "onaylandi" ? "#22C55E" : fm.status === "reddedildi" ? "#EF4444" : "#F59E0B" }}
                      >
                        <option value="bekliyor">Bekliyor</option>
                        <option value="onaylandi">Onaylandı</option>
                        <option value="reddedildi">Reddedildi</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalExtension > 0 && contract.end_date && (
          <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p className="text-xs font-medium" style={{ color: "#60A5FA" }}>
              Onaylanan uzatım: {totalExtension} gün → Yeni bitiş: {formatDate(
                new Date(new Date(contract.end_date).getTime() + totalExtension * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
              )}
            </p>
          </div>
        )}

        {showFmForm ? (
          <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Başlangıç</label>
                <input type="date" value={fmForm.start_date} onChange={e => setFmForm(f => ({ ...f, start_date: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Bitiş</label>
                <input type="date" value={fmForm.end_date} onChange={e => setFmForm(f => ({ ...f, end_date: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Tür</label>
                <select value={fmForm.type} onChange={e => setFmForm(f => ({ ...f, type: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}>
                  {["Deprem", "Sel", "Hava Koşulları", "Resmi Tatil", "Pandemi", "Diğer"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Etkilenen Gün</label>
                <input type="number" value={fmForm.affected_days || ""} onChange={e => setFmForm(f => ({ ...f, affected_days: Number(e.target.value) }))} className="w-full rounded px-2 py-1 text-xs outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              </div>
            </div>
            <input value={fmForm.description} onChange={e => setFmForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }} placeholder="Açıklama" />
            <div className="flex gap-2">
              <Button onClick={addForceMajeure} size="sm" className="h-7 text-xs text-white" style={{ backgroundColor: "#FF6B2B" }}>Kaydet</Button>
              <Button onClick={() => setShowFmForm(false)} variant="outline" size="sm" className="h-7 text-xs" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>İptal</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowFmForm(true)} variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#FF6B2B" }}>
            <Plus className="w-3 h-3 mr-1" /> Mücbir Sebep Ekle
          </Button>
        )}
      </Section>

      {/* Notes */}
      {contract.notes && (
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#F1F5F9" }}>📝 Notlar</p>
          <p className="text-xs whitespace-pre-wrap" style={{ color: "#94A3B8" }}>{contract.notes}</p>
        </div>
      )}
    </div>
  );
}
