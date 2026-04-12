import { useState } from "react";
import { Contract } from "@/hooks/useContracts";
import { useContractSignatures } from "@/hooks/useContractSignatures";
import { useUser } from "@/contexts/UserContext";
import {
  ArrowLeft, Edit2, Trash2, Download, RefreshCw, Bot, Building2, Calendar,
  ChevronUp, ChevronDown, AlertTriangle, Plus, Clock, DollarSign, CheckCircle2, Shield,
  Mail, Send, History, FileCheck, ListChecks
} from "lucide-react";
import ContractItemsSection from "./ContractItemsSection";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  cardStyleClass, CONTRACT_TYPES, getDaysRemaining, getStatusInfo,
  formatCurrency, formatDate, getTimeProgress, ForceMajeure
} from "./ContractTypes";
import SendForSignatureModal from "./SendForSignatureModal";

interface Props {
  contract: Contract;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReanalyze: () => void;
  allHakedisler?: any[];
}

export default function ContractDetail({ contract, onBack, onEdit, onDelete, onReanalyze, allHakedisler = [] }: Props) {
  const { user } = useUser();
  const status = getStatusInfo(contract.end_date, contract.status);
  const tp = getTimeProgress(contract.start_date, contract.end_date);
  const daysLeft = getDaysRemaining(contract.end_date);
  const analysis = contract.ai_analysis;

  const { requests, uploads, activities, sendForSignature, sendReminder, getSignatureStatus } = useContractSignatures(contract.id);
  const sigStatus = getSignatureStatus();
  const [showSendModal, setShowSendModal] = useState(false);

  const projectHakedis = contract.project_id
    ? allHakedisler.filter(h => h.project_id === contract.project_id)
    : [];
  const totalHakedisAmount = projectHakedis.reduce((s: number, h: any) => s + Number(h.net || h.amount || 0), 0);
  const hakedisUsagePct = contract.amount > 0 ? (totalHakedisAmount / contract.amount) * 100 : 0;

  const penaltyRate = analysis?.gecikme_cezasi?.gunluk || 0;
  const penaltyLimit = analysis?.gecikme_cezasi?.limit_yuzde || 0;
  const [penaltyDays, setPenaltyDays] = useState(() => {
    if (daysLeft !== null && daysLeft < 0) return Math.abs(daysLeft);
    return 0;
  });
  const penaltyTotal = penaltyDays * penaltyRate;
  const penaltyPct = contract.amount > 0 ? (penaltyTotal / contract.amount) * 100 : 0;

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
    general: true, items: true, ai: true, penalty: true, comparison: true, schedule: true, fm: false, docs: false, signature: true, activity: false
  });
  const toggle = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const handleItemsTotalChange = async (total: number) => {
    // Sync contract amount with items total if items exist
    // This is informational - parent can handle actual update
  };

  const Section = ({ id, title, icon, badge, children }: { id: string; title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }) => (
    <div className={`overflow-hidden ${cardStyleClass}`}>
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expandedSections[id] && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  const handleSendForSignature = async (data: any) => {
    return sendForSignature({
      ...data,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm flex items-center gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Sözleşme Takibi
        </button>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSendModal(true)} size="sm" className="h-8 text-xs text-white bg-blue-500 hover:bg-blue-600">
            <Mail className="w-3 h-3 mr-1" /> İmzaya Gönder
          </Button>
          <Button onClick={onEdit} variant="outline" size="sm" className="h-8 text-xs">
            <Edit2 className="w-3 h-3 mr-1" /> Düzenle
          </Button>
          {contract.file_url && (
            <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Download className="w-3 h-3 mr-1" /> PDF
              </Button>
            </a>
          )}
          <Button onClick={onDelete} variant="outline" size="sm" className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="w-3 h-3 mr-1" /> Sil
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-foreground">{contract.name}</h1>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: status.color, backgroundColor: status.bg }}>
          {status.icon} {status.label}
        </span>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: sigStatus.color, backgroundColor: `${sigStatus.color}15` }}>
          {sigStatus.label}
        </span>
      </div>

      {/* Signature Tracking Section */}
      <Section id="signature" title="İmza Takibi" icon={<FileCheck className="w-4 h-4 text-blue-500" />}
        badge={requests.length > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sigStatus.color}15`, color: sigStatus.color }}>{requests.length}</span> : undefined}
      >
        {requests.length === 0 ? (
          <div className="text-center py-6">
            <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Henüz imzaya gönderilmedi</p>
            <Button onClick={() => setShowSendModal(true)} size="sm" className="mt-3 h-8 text-xs text-white bg-blue-500 hover:bg-blue-600">
              <Send className="w-3 h-3 mr-1" /> İmzaya Gönder
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const reqUploads = uploads.filter(u => u.signature_request_id === req.id);
              const daysSince = Math.ceil((Date.now() - new Date(req.sent_at).getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = req.deadline && new Date(req.deadline) < new Date();
              const isWaiting = !reqUploads.length && req.status !== "imzalandi";

              return (
                <div key={req.id} className="rounded-lg p-3 space-y-2 border" style={{ borderColor: isOverdue ? "rgba(239,68,68,0.25)" : undefined }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{req.recipient_name}</p>
                      <p className="text-[10px] text-muted-foreground">{req.recipient_email} • {new Date(req.sent_at).toLocaleDateString("tr-TR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isWaiting && daysSince >= 7 && (
                        <Button onClick={() => sendReminder(req)} size="sm" className="h-7 text-[10px] text-white" style={{ backgroundColor: "#F59E0B" }}>
                          Hatırlatma Gönder
                        </Button>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{
                        color: reqUploads.length ? "#22C55E" : isOverdue ? "#EF4444" : "#F59E0B",
                        backgroundColor: reqUploads.length ? "rgba(34,197,94,0.1)" : isOverdue ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)"
                      }}>
                        {reqUploads.length ? "✅ İmzalandı" : isOverdue ? "⌛ Süresi Doldu" : `⏳ ${daysSince}g bekleniyor`}
                      </span>
                    </div>
                  </div>

                  {req.deadline && (
                    <p className="text-[10px]" style={{ color: isOverdue ? "#EF4444" : "#F59E0B" }}>
                      ⏰ Son tarih: {new Date(req.deadline).toLocaleDateString("tr-TR")}
                    </p>
                  )}

                  {reqUploads.map(u => (
                    <div key={u.id} className="flex items-center justify-between rounded p-2" style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          📎 {u.file_name} — {u.signer_name}{u.signer_title ? ` (${u.signer_title})` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleString("tr-TR")}</p>
                      </div>
                      <a href={u.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] text-blue-500">
                          <Download className="w-3 h-3 mr-1" /> İndir
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* General Info */}
      <Section id="general" title="Genel Bilgiler" icon={<Building2 className="w-4 h-4 text-primary" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">
          <div><span className="text-muted-foreground">Karşı Taraf</span><p className="font-medium mt-0.5 text-foreground">{contract.counterparty}</p></div>
          <div><span className="text-muted-foreground">Tür</span><p className="font-medium mt-0.5 text-foreground">{CONTRACT_TYPES[contract.contract_type] || contract.contract_type}</p></div>
          <div><span className="text-muted-foreground">Tutar</span><p className="font-medium mt-0.5 text-foreground">{formatCurrency(contract.amount)}</p></div>
          <div><span className="text-muted-foreground">Başlangıç</span><p className="font-medium mt-0.5 text-foreground">{formatDate(contract.start_date)}</p></div>
          <div><span className="text-muted-foreground">Bitiş</span><p className="font-medium mt-0.5 text-foreground">{formatDate(contract.end_date)}</p></div>
          <div><span className="text-muted-foreground">Kalan</span><p className="font-medium mt-0.5" style={{ color: status.color }}>{daysLeft !== null ? `${daysLeft} gün` : "—"}</p></div>
        </div>

        {tp.total > 0 && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1 text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Süre: {tp.elapsed}g geçti, {tp.remaining}g kaldı</span>
                <span>%{Math.round(tp.pct)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${tp.pct}%`, backgroundColor: tp.pct >= 90 ? "#EF4444" : tp.pct >= 70 ? "#F59E0B" : "#22C55E" }} />
              </div>
            </div>
            {contract.amount > 0 && (
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1 text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Tutar: {formatCurrency(totalHakedisAmount)} hakediş, {formatCurrency(contract.amount - totalHakedisAmount)} kaldı</span>
                  <span>%{Math.round(hakedisUsagePct)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, hakedisUsagePct)}%`, backgroundColor: hakedisUsagePct >= 100 ? "#EF4444" : hakedisUsagePct >= 90 ? "#F59E0B" : "#3B82F6" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* İş Kalemleri / BOQ */}
      <Section id="items" title="İş Kalemleri" icon={<ListChecks className="w-4 h-4 text-primary" />}>
        <ContractItemsSection contractId={contract.id} onTotalChange={handleItemsTotalChange} />
      </Section>

      {/* AI Critical Clauses */}
      {analysis?.kritik_maddeler?.length > 0 && (
        <Section id="ai" title="AI Kritik Madde Analizi" icon={<Bot className="w-4 h-4 text-primary" />}
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
                    {(m.madde_no || m.madde) && <span className="text-[10px] text-muted-foreground">Madde {m.madde_no || m.madde}</span>}
                    {m.konu && <span className="text-[10px] font-medium text-muted-foreground">— {m.konu}</span>}
                  </div>
                  <p className="text-xs text-foreground">{m.icerik || m.aciklama}</p>
                </div>
              );
            })}
          </div>
          <Button onClick={onReanalyze} variant="outline" size="sm" className="h-8 text-xs text-primary">
            <RefreshCw className="w-3 h-3 mr-1" /> Yeniden Analiz Et
          </Button>
        </Section>
      )}

      {/* Penalty Calculator */}
      {penaltyRate > 0 && (
        <Section id="penalty" title="Cezai Şart Hesaplama" icon={<AlertTriangle className="w-4 h-4 text-destructive" />}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] block mb-1 text-muted-foreground">Gecikme Günü</label>
              <input type="number" value={penaltyDays} onChange={e => setPenaltyDays(Number(e.target.value))} min={0} className="w-full rounded px-2 py-2 text-sm outline-none bg-background border border-border text-foreground" />
            </div>
            <div>
              <label className="text-[10px] block mb-1 text-muted-foreground">Günlük Ceza</label>
              <p className="text-sm font-medium mt-1 text-foreground">{formatCurrency(penaltyRate)}</p>
            </div>
            <div>
              <label className="text-[10px] block mb-1 text-muted-foreground">Toplam Cezai Şart</label>
              <p className="text-lg font-bold" style={{ color: penaltyTotal > 0 ? "#EF4444" : "#22C55E", fontFamily: "'Space Grotesk', sans-serif" }}>
                {formatCurrency(penaltyTotal)}
              </p>
            </div>
          </div>
          {penaltyTotal > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-medium text-destructive">
                ⚠️ Sözleşme bedelinin %{penaltyPct.toFixed(1)}'ine karşılık geliyor
                {penaltyLimit > 0 && ` (Üst limit: %${penaltyLimit})`}
              </p>
              <p className="text-[10px] mt-1 text-muted-foreground">Referans amaçlıdır, sözleşmenizi kontrol ediniz.</p>
            </div>
          )}
        </Section>
      )}

      {/* Contract vs Hakediş Comparison */}
      {projectHakedis.length > 0 && (
        <Section id="comparison" title="Sözleşme vs Hakediş Karşılaştırması" icon={<DollarSign className="w-4 h-4 text-primary" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Hakediş</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Tutar</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Durum</th>
                </tr>
              </thead>
              <tbody>
                {projectHakedis.map((h: any) => (
                  <tr key={h.id} className="border-b border-border">
                    <td className="py-2 text-foreground">{h.period}</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(Number(h.net || h.amount || 0))}</td>
                    <td className="py-2 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}>{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-2 font-semibold text-foreground">Toplam</td>
                  <td className="py-2 text-right font-semibold text-foreground">{formatCurrency(totalHakedisAmount)}</td>
                  <td className="py-2 text-right">
                    <span className="text-[10px] font-medium" style={{ color: hakedisUsagePct >= 100 ? "#EF4444" : hakedisUsagePct >= 90 ? "#F59E0B" : "#22C55E" }}>
                      %{Math.round(hakedisUsagePct)} kullanıldı
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-muted-foreground">Sözleşme Bedeli</td>
                  <td className="py-1 text-right text-muted-foreground">{formatCurrency(contract.amount)}</td>
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
        <Section id="schedule" title="Ödeme Takvimi" icon={<Calendar className="w-4 h-4 text-primary" />}>
          <div className="space-y-3">
            {analysis.odeme_takvimi.map((o: any, i: number) => {
              const isPast = o.tarih && new Date(o.tarih) < new Date();
              const isPaid = projectHakedis.some((h: any) => h.status === "Ödendi" && h.period?.includes(String(o.hakedis_no)));
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: isPaid ? "#22C55E" : isPast ? "#F59E0B" : "hsl(var(--muted-foreground) / 0.3)" }} />
                    {i < analysis.odeme_takvimi.length - 1 && <div className="w-px h-6 bg-border" />}
                  </div>
                  <div className="flex-1 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-foreground">
                        {isPaid ? "✅" : isPast ? "⚠️" : "○"} Hakediş #{o.hakedis_no}
                      </span>
                      {o.not && <span className="ml-2 text-muted-foreground">— {o.not}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{formatDate(o.tarih)}</span>
                      <span className="font-medium text-foreground">{o.tutar ? formatCurrency(o.tutar) : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Force Majeure */}
      <Section id="fm" title="Mücbir Sebep ve Süre Uzatımı" icon={<Shield className="w-4 h-4 text-primary" />}>
        {forceMajeures.length > 0 && (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Tarih</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Tür</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Gün</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Durum</th>
                </tr>
              </thead>
              <tbody>
                {forceMajeures.map(fm => (
                  <tr key={fm.id} className="border-b border-border">
                    <td className="py-2 text-foreground">{formatDate(fm.start_date)} — {formatDate(fm.end_date)}</td>
                    <td className="py-2 text-muted-foreground">{fm.type}</td>
                    <td className="py-2 text-right text-foreground">{fm.affected_days}g</td>
                    <td className="py-2 text-right">
                      <select
                        value={fm.status}
                        onChange={e => setForceMajeures(p => p.map(f => f.id === fm.id ? { ...f, status: e.target.value as any } : f))}
                        className="rounded px-1 py-0.5 text-[10px] outline-none bg-background border border-border"
                        style={{ color: fm.status === "onaylandi" ? "#22C55E" : fm.status === "reddedildi" ? "#EF4444" : "#F59E0B" }}
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
          <div className="rounded-lg p-3 space-y-2 bg-background border border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] block mb-1 text-muted-foreground">Başlangıç</label>
                <input type="date" value={fmForm.start_date} onChange={e => setFmForm(f => ({ ...f, start_date: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none bg-background border border-border text-foreground" />
              </div>
              <div>
                <label className="text-[10px] block mb-1 text-muted-foreground">Bitiş</label>
                <input type="date" value={fmForm.end_date} onChange={e => setFmForm(f => ({ ...f, end_date: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none bg-background border border-border text-foreground" />
              </div>
              <div>
                <label className="text-[10px] block mb-1 text-muted-foreground">Tür</label>
                <select value={fmForm.type} onChange={e => setFmForm(f => ({ ...f, type: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none bg-background border border-border text-foreground">
                  {["Deprem", "Sel", "Hava Koşulları", "Resmi Tatil", "Pandemi", "Diğer"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] block mb-1 text-muted-foreground">Etkilenen Gün</label>
                <input type="number" value={fmForm.affected_days || ""} onChange={e => setFmForm(f => ({ ...f, affected_days: Number(e.target.value) }))} className="w-full rounded px-2 py-1 text-xs outline-none bg-background border border-border text-foreground" />
              </div>
            </div>
            <input value={fmForm.description} onChange={e => setFmForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded px-2 py-1 text-xs outline-none bg-background border border-border text-foreground" placeholder="Açıklama" />
            <div className="flex gap-2">
              <Button onClick={addForceMajeure} size="sm" className="h-7 text-xs text-primary-foreground bg-primary hover:bg-primary/90">Kaydet</Button>
              <Button onClick={() => setShowFmForm(false)} variant="outline" size="sm" className="h-7 text-xs">İptal</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowFmForm(true)} variant="outline" size="sm" className="h-8 text-xs text-primary">
            <Plus className="w-3 h-3 mr-1" /> Mücbir Sebep Ekle
          </Button>
        )}
      </Section>

      {/* Activity Log */}
      <Section id="activity" title="Aktivite Geçmişi" icon={<History className="w-4 h-4 text-primary" />}
        badge={activities.length > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{activities.length}</span> : undefined}
      >
        {activities.length === 0 ? (
          <p className="text-xs text-center py-4 text-muted-foreground">Henüz aktivite yok</p>
        ) : (
          <div className="space-y-2">
            {activities.map(act => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-2 h-2 rounded-full" style={{
                    backgroundColor: act.action === "imzali_yuklendi" ? "#22C55E" : act.action === "imzaya_gonderildi" ? "#3B82F6" : "hsl(var(--muted-foreground))"
                  }} />
                </div>
                <div className="flex-1">
                  <p className="text-foreground">{act.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(act.created_at).toLocaleString("tr-TR")}
                    {act.actor_name && ` — ${act.actor_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Notes */}
      {contract.notes && (
        <div className={`p-4 ${cardStyleClass}`}>
          <p className="text-xs font-semibold mb-2 text-foreground">📝 Notlar</p>
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{contract.notes}</p>
        </div>
      )}

      {/* Send for Signature Modal */}
      {showSendModal && (
        <SendForSignatureModal
          contract={contract}
          senderName={user?.user_metadata?.full_name || user?.email || "Şantiyem"}
          onSend={handleSendForSignature}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </div>
  );
}
