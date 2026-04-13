import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useContracts } from "@/hooks/useContracts";
import { useContractItems, ContractItem } from "@/hooks/useContractItems";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Plus, Trash2, FileText, Calculator, Bot, Loader2, CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AIKalem {
  sozlesme_kalemi_id: string;
  poz_no: string;
  tarif: string;
  tespit_edilen_miktar: number;
  guven_skoru: "yuksek" | "orta" | "dusuk";
  aciklama: string;
  approved?: boolean;
}

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCurrency = (n: number) => `₺${fmt(n)}`;

interface WizardProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onCreated: () => void;
}

interface LineItem {
  contract_item_id: string;
  poz_no: string;
  description: string;
  unit: string;
  contract_qty: number;
  unit_price: number;
  previous_cumulative_qty: number;
  current_qty: number;
}

interface Deduction {
  id: string;
  deduction_type: string;
  label: string;
  rate: number;
  amount: number;
}

const DEFAULT_DEDUCTIONS: Deduction[] = [
  { id: "kdv", deduction_type: "kdv", label: "KDV", rate: 20, amount: 0 },
  { id: "stopaj", deduction_type: "stopaj", label: "Stopaj", rate: 3, amount: 0 },
];

export default function HakedisWizard({ projectId, projectName, onClose, onCreated }: WizardProps) {
  const { user } = useUser();
  const { contracts } = useContracts();
  const [period, setPeriod] = useState("");
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>(DEFAULT_DEDUCTIONS);
  const [avansAmount, setAvansAmount] = useState(0);
  const [customDeductions, setCustomDeductions] = useState<{ label: string; amount: number }[]>([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomAmount, setNewCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previousHakedisData, setPreviousHakedisData] = useState<Record<string, number>>({});
  // AI state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AIKalem[] | null>(null);
  const [aiNotes, setAiNotes] = useState("");
  const [aiRetryCount, setAiRetryCount] = useState(0);

  // Find contracts for this project
  const projectContracts = useMemo(() =>
    contracts.filter(c => c.project_id === projectId),
    [contracts, projectId]
  );

  // Auto-select first contract
  useEffect(() => {
    if (projectContracts.length > 0 && !selectedContractId) {
      setSelectedContractId(projectContracts[0].id);
    }
  }, [projectContracts, selectedContractId]);

  // Fetch contract items when contract is selected
  const { items: contractItems, loading: itemsLoading } = useContractItems(selectedContractId);

  // Fetch previous cumulative data
  useEffect(() => {
    if (!selectedContractId || !user) return;
    (async () => {
      setLoading(true);
      // Get all previous hakedis for this project
      const { data: prevHakedis } = await supabase
        .from("project_hakedis")
        .select("id")
        .eq("project_id", projectId);
      
      if (prevHakedis && prevHakedis.length > 0) {
        const hakedisIds = prevHakedis.map(h => h.id);
        const { data: prevItems } = await (supabase as any)
          .from("hakedis_items")
          .select("contract_item_id, current_qty")
          .in("hakedis_id", hakedisIds)
          .not("contract_item_id", "is", null);
        
        if (prevItems) {
          const cumMap: Record<string, number> = {};
          prevItems.forEach((item: any) => {
            if (item.contract_item_id) {
              cumMap[item.contract_item_id] = (cumMap[item.contract_item_id] || 0) + Number(item.current_qty || 0);
            }
          });
          setPreviousHakedisData(cumMap);
        }
      }
      setLoading(false);
    })();
  }, [selectedContractId, projectId, user]);

  // Build line items from contract items
  useEffect(() => {
    if (contractItems.length === 0) return;
    setLineItems(contractItems.map(ci => ({
      contract_item_id: ci.id,
      poz_no: ci.poz_no,
      description: ci.description,
      unit: ci.unit,
      contract_qty: Number(ci.quantity),
      unit_price: Number(ci.unit_price),
      previous_cumulative_qty: previousHakedisData[ci.id] || 0,
      current_qty: 0,
    })));
  }, [contractItems, previousHakedisData]);

  const updateCurrentQty = (index: number, qty: number) => {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, current_qty: qty } : item));
  };

  // Calculations
  const grossTotal = useMemo(() =>
    lineItems.reduce((s, li) => s + (li.current_qty * li.unit_price), 0),
    [lineItems]
  );

  // Update deduction amounts based on rates
  useEffect(() => {
    setDeductions(prev => prev.map(d => ({
      ...d,
      amount: d.deduction_type === "kdv"
        ? Math.round(grossTotal * (d.rate / 100) * 100) / 100
        : d.deduction_type === "stopaj"
          ? Math.round((grossTotal + grossTotal * ((prev.find(x => x.deduction_type === "kdv")?.rate || 20) / 100)) * (d.rate / 100) * 100) / 100
          : d.amount,
    })));
  }, [grossTotal]);

  const kdvAmount = deductions.find(d => d.deduction_type === "kdv")?.amount || 0;
  const brutTotal = grossTotal + kdvAmount;
  const stopajAmount = deductions.find(d => d.deduction_type === "stopaj")?.amount || 0;
  const customTotal = customDeductions.reduce((s, d) => s + d.amount, 0);
  const totalDeductionsAmount = stopajAmount + avansAmount + customTotal;
  const netTotal = brutTotal - totalDeductionsAmount;

  const cumulativeAllTime = useMemo(() => {
    return lineItems.reduce((s, li) => s + ((li.previous_cumulative_qty + li.current_qty) * li.unit_price), 0);
  }, [lineItems]);

  const contractTotal = useMemo(() =>
    lineItems.reduce((s, li) => s + (li.contract_qty * li.unit_price), 0),
    [lineItems]
  );

  const remainingContract = contractTotal - cumulativeAllTime;

  const hasOverage = lineItems.some(li =>
    (li.previous_cumulative_qty + li.current_qty) > li.contract_qty && li.current_qty > 0
  );

  const handleSave = async () => {
    if (!user || !period.trim()) { toast.error("Dönem bilgisi zorunludur"); return; }
    if (grossTotal <= 0) { toast.error("En az bir kaleme miktar giriniz"); return; }

    setSaving(true);
    try {
      // 1. Create the hakedis record
      const { data: hakedis, error: hError } = await supabase
        .from("project_hakedis")
        .insert({
          user_id: user.id,
          project_id: projectId,
          period,
          amount: grossTotal,
          kdv: kdvAmount,
          net: netTotal,
          status: "Taslak",
          status_color: "#64748B",
          contract_id: selectedContractId || null,
          gross_total: grossTotal,
          deductions_total: totalDeductionsAmount,
          net_total: netTotal,
        } as any)
        .select()
        .single();

      if (hError || !hakedis) { toast.error("Hakediş oluşturulamadı"); console.error(hError); setSaving(false); return; }

      // 2. Create hakedis items linked to contract items
      const itemsToInsert = lineItems
        .filter(li => li.current_qty > 0)
        .map((li, i) => ({
          hakedis_id: hakedis.id,
          user_id: user.id,
          contract_item_id: li.contract_item_id,
          poz_no: li.poz_no,
          description: li.description,
          unit: li.unit,
          quantity: li.current_qty,
          unit_price: li.unit_price,
          total_price: li.current_qty * li.unit_price,
          previous_cumulative_qty: li.previous_cumulative_qty,
          current_qty: li.current_qty,
          cumulative_qty: li.previous_cumulative_qty + li.current_qty,
          sort_order: i,
        }));

      if (itemsToInsert.length > 0) {
        const { error: iError } = await supabase.from("hakedis_items").insert(itemsToInsert as any);
        if (iError) console.error("hakedis_items insert error:", iError);
      }

      // 3. Create deductions
      const deductionsToInsert = [
        ...deductions.filter(d => d.amount > 0).map((d, i) => ({
          hakedis_id: hakedis.id,
          user_id: user.id,
          deduction_type: d.deduction_type,
          label: d.label,
          rate: d.rate,
          amount: d.amount,
          sort_order: i,
        })),
        ...(avansAmount > 0 ? [{
          hakedis_id: hakedis.id,
          user_id: user.id,
          deduction_type: "avans",
          label: "Avans Kesintisi",
          rate: 0,
          amount: avansAmount,
          sort_order: deductions.length,
        }] : []),
        ...customDeductions.filter(d => d.amount > 0).map((d, i) => ({
          hakedis_id: hakedis.id,
          user_id: user.id,
          deduction_type: "diger",
          label: d.label,
          rate: 0,
          amount: d.amount,
          sort_order: deductions.length + 1 + i,
        })),
      ];

      if (deductionsToInsert.length > 0) {
        const { error: dError } = await (supabase as any).from("hakedis_deductions").insert(deductionsToInsert);
        if (dError) console.error("hakedis_deductions insert error:", dError);
      }

      toast.success("✅ Hakediş başarıyla oluşturuldu");
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error("Hakediş oluşturulamadı");
    } finally {
      setSaving(false);
    }
  };

  const addCustomDeduction = () => {
    if (!newCustomLabel.trim() || !newCustomAmount) return;
    setCustomDeductions(prev => [...prev, { label: newCustomLabel, amount: parseFloat(newCustomAmount) || 0 }]);
    setNewCustomLabel("");
    setNewCustomAmount("");
  };

  // AI: Call hakedis-ai edge function
  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) { toast.error("Lütfen yapılan işleri açıklayın"); return; }
    if (contractItems.length === 0) { toast.error("Sözleşme kalemleri yüklenmemiş"); return; }
    
    setAiLoading(true);
    setAiResults(null);
    
    const doRequest = async (attempt: number): Promise<any> => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hakedis-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            description: aiDescription,
            contractItems: contractItems.map(ci => ({
              id: ci.id, poz_no: ci.poz_no, description: ci.description,
              unit: ci.unit, quantity: ci.quantity, unit_price: ci.unit_price,
            })),
          }),
        });
        
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({ error: "Bağlantı hatası" }));
          if (resp.status === 429 || resp.status >= 500) {
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 2000));
              return doRequest(attempt + 1);
            }
          }
          throw new Error(errData.error || "AI servisi hatası");
        }
        return resp.json();
      } catch (err) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          return doRequest(attempt + 1);
        }
        throw err;
      }
    };
    
    try {
      const data = await doRequest(0);
      if (data.kalemler && data.kalemler.length > 0) {
        setAiResults(data.kalemler.map((k: AIKalem) => ({ ...k, approved: true })));
        setAiNotes(data.notlar || "");
        toast.success(`AI ${data.kalemler.length} kalem tespit etti, kontrol edin`);
      } else {
        toast.info("AI eşleşme bulamadı, manuel giriş yapın");
      }
    } catch (err: any) {
      toast.error(err.message || "AI servisi yanıt veremedi");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResults = () => {
    if (!aiResults) return;
    const approved = aiResults.filter(k => k.approved);
    if (approved.length === 0) { toast.error("En az bir kalemi onaylayın"); return; }
    
    setLineItems(prev => prev.map(li => {
      const match = approved.find(k => k.sozlesme_kalemi_id === li.contract_item_id);
      if (match) return { ...li, current_qty: match.tespit_edilen_miktar };
      return li;
    }));
    
    setAiModalOpen(false);
    setAiResults(null);
    setAiDescription("");
    toast.success(`✅ ${approved.length} kalem hakediş formuna aktarıldı`);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <h2 className="text-lg font-bold text-foreground">Yeni Hakediş Hazırla</h2>
        <div />
      </div>

      {/* Project & Period Info */}
      <div className="rounded-xl p-4 bg-card border border-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold mb-1 block text-muted-foreground">Proje</label>
            <div className="rounded-lg px-3 py-2 text-[13px] bg-muted text-foreground">{projectName}</div>
          </div>
          <div>
            <label className="text-[11px] font-semibold mb-1 block text-muted-foreground">Sözleşme</label>
            {projectContracts.length > 0 ? (
              <select
                value={selectedContractId || ""}
                onChange={e => setSelectedContractId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-background border border-border text-foreground"
              >
                {projectContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {fmtCurrency(c.amount)}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg px-3 py-2 text-[13px] bg-muted text-muted-foreground">Sözleşme bulunamadı</div>
            )}
          </div>
          <div>
            <label className="text-[11px] font-semibold mb-1 block text-muted-foreground">Dönem *</label>
            <input
              value={period}
              onChange={e => setPeriod(e.target.value)}
              placeholder="örn: Ocak 2026"
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-background border border-border text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Work Items Table */}
      {contractItems.length > 0 && (
        <div className="rounded-xl p-4 bg-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">İş Kalemleri</h3>
          </div>

          {hasOverage && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
              <span className="text-[11px] font-medium" style={{ color: "#EF4444" }}>
                ⚠️ Bazı kalemlerde sözleşme miktarı aşılıyor!
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-16">Poz No</th>
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground">İş Kalemi Tarifi</th>
                  <th className="text-center py-2 px-2 font-semibold text-muted-foreground w-14">Birim</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-20">Sözl. Mik.</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-20">Birim Fiyat</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-20">Önceki Küm.</th>
                  <th className="text-right py-2 px-2 font-semibold text-primary w-24">Bu Dönem</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-20">Küm. Mik.</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-24">Bu Dönem ₺</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-24">Küm. ₺</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => {
                  const cumQty = li.previous_cumulative_qty + li.current_qty;
                  const isOverage = cumQty > li.contract_qty && li.current_qty > 0;
                  const currentTotal = li.current_qty * li.unit_price;
                  const cumTotal = cumQty * li.unit_price;

                  return (
                    <tr key={li.contract_item_id} className={`border-b border-border ${isOverage ? "bg-destructive/5" : idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="py-1.5 px-2 font-mono text-muted-foreground">{li.poz_no}</td>
                      <td className="py-1.5 px-2 text-foreground">{li.description}</td>
                      <td className="py-1.5 px-2 text-center text-muted-foreground">{li.unit}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">{fmt(li.contract_qty)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">{fmtCurrency(li.unit_price)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">{fmt(li.previous_cumulative_qty)}</td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          value={li.current_qty || ""}
                          onChange={e => updateCurrentQty(idx, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className={`w-full rounded px-2 py-1 text-[11px] text-right outline-none bg-background border text-foreground font-mono ${
                            isOverage ? "border-destructive" : "border-primary/30 focus:border-primary"
                          }`}
                        />
                      </td>
                      <td className={`py-1.5 px-2 text-right font-mono ${isOverage ? "text-destructive font-semibold" : "text-foreground"}`}>
                        {fmt(cumQty)}
                        {isOverage && <span className="text-[9px] ml-0.5">⚠️</span>}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold text-primary">{fmtCurrency(currentTotal)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-foreground">{fmtCurrency(cumTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={8} className="py-2 px-2 text-right font-semibold text-foreground">Bu Dönem Toplam</td>
                  <td className="py-2 px-2 text-right font-bold text-primary font-mono">{fmtCurrency(grossTotal)}</td>
                  <td className="py-2 px-2 text-right font-semibold font-mono text-foreground">{fmtCurrency(cumulativeAllTime)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {contractItems.length === 0 && !itemsLoading && selectedContractId && (
        <div className="rounded-xl p-6 bg-card border border-border text-center">
          <p className="text-[13px] text-muted-foreground">Bu sözleşmede iş kalemi bulunamadı.</p>
          <p className="text-[11px] text-muted-foreground mt-1">Önce Sözleşme Takibi → İş Kalemleri bölümünden kalem ekleyin.</p>
        </div>
      )}

      {projectContracts.length === 0 && (
        <div className="rounded-xl p-6 bg-card border border-border text-center">
          <p className="text-[13px] text-muted-foreground">Bu projeye bağlı sözleşme bulunamadı.</p>
          <p className="text-[11px] text-muted-foreground mt-1">Sözleşme Takibi'nden yeni sözleşme oluşturup bu projeyi seçin.</p>
        </div>
      )}

      {/* Deductions Section */}
      {grossTotal > 0 && (
        <div className="rounded-xl p-4 bg-card border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Kesintiler</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* KDV */}
            <div className="rounded-lg p-3 bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-foreground">KDV</span>
                <span className="text-[11px] font-mono text-primary font-semibold">{fmtCurrency(kdvAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Oran:</span>
                <input
                  type="number"
                  value={deductions.find(d => d.deduction_type === "kdv")?.rate || 20}
                  onChange={e => setDeductions(prev => prev.map(d => d.deduction_type === "kdv" ? { ...d, rate: parseFloat(e.target.value) || 0 } : d))}
                  className="w-16 rounded px-2 py-1 text-[11px] text-right outline-none bg-background border border-border text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">%</span>
              </div>
            </div>

            {/* Stopaj */}
            <div className="rounded-lg p-3 bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-foreground">Stopaj</span>
                <span className="text-[11px] font-mono text-destructive font-semibold">-{fmtCurrency(stopajAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Oran:</span>
                <input
                  type="number"
                  value={deductions.find(d => d.deduction_type === "stopaj")?.rate || 3}
                  onChange={e => setDeductions(prev => prev.map(d => d.deduction_type === "stopaj" ? { ...d, rate: parseFloat(e.target.value) || 0 } : d))}
                  className="w-16 rounded px-2 py-1 text-[11px] text-right outline-none bg-background border border-border text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">%</span>
              </div>
            </div>

            {/* Avans */}
            <div className="rounded-lg p-3 bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-foreground">Avans Kesintisi</span>
                {avansAmount > 0 && <span className="text-[11px] font-mono text-destructive font-semibold">-{fmtCurrency(avansAmount)}</span>}
              </div>
              <input
                type="number"
                value={avansAmount || ""}
                onChange={e => setAvansAmount(parseFloat(e.target.value) || 0)}
                placeholder="₺ tutar girin"
                className="w-full rounded px-2 py-1 text-[11px] outline-none bg-background border border-border text-foreground"
              />
            </div>

            {/* Custom Deductions */}
            <div className="rounded-lg p-3 bg-muted/30 border border-border">
              <span className="text-[11px] font-semibold text-foreground block mb-2">Diğer Kesintiler</span>
              {customDeductions.map((cd, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">{cd.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-destructive">-{fmtCurrency(cd.amount)}</span>
                    <button onClick={() => setCustomDeductions(prev => prev.filter((_, j) => j !== i))} className="text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1">
                <input value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} placeholder="Açıklama"
                  className="flex-1 rounded px-2 py-1 text-[10px] outline-none bg-background border border-border text-foreground" />
                <input type="number" value={newCustomAmount} onChange={e => setNewCustomAmount(e.target.value)} placeholder="₺"
                  className="w-20 rounded px-2 py-1 text-[10px] text-right outline-none bg-background border border-border text-foreground" />
                <button onClick={addCustomDeduction} className="p-1 rounded text-primary hover:bg-primary/10">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {grossTotal > 0 && (
        <div className="rounded-xl p-4 bg-card border-2 border-primary/30 space-y-2">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">📊 Hakediş Özeti</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg p-3 bg-muted/30">
              <p className="text-[10px] text-muted-foreground">Bu Dönem Hakediş</p>
              <p className="text-[15px] font-bold text-foreground font-mono">{fmtCurrency(grossTotal)}</p>
            </div>
            <div className="rounded-lg p-3 bg-muted/30">
              <p className="text-[10px] text-muted-foreground">KDV Dahil Brüt</p>
              <p className="text-[15px] font-bold text-foreground font-mono">{fmtCurrency(brutTotal)}</p>
            </div>
            <div className="rounded-lg p-3 bg-muted/30">
              <p className="text-[10px] text-muted-foreground">Kesintiler</p>
              <p className="text-[15px] font-bold text-destructive font-mono">-{fmtCurrency(totalDeductionsAmount)}</p>
            </div>
            <div className="rounded-lg p-3 border-2 border-primary/50" style={{ background: "rgba(255,107,43,0.05)" }}>
              <p className="text-[10px] text-primary font-semibold">NET ÖDENECEK</p>
              <p className="text-[18px] font-bold text-primary font-mono">{fmtCurrency(netTotal)}</p>
            </div>
            <div className="rounded-lg p-3 bg-muted/30">
              <p className="text-[10px] text-muted-foreground">Kalan Sözleşme</p>
              <p className={`text-[15px] font-bold font-mono ${remainingContract >= 0 ? "text-green-500" : "text-destructive"}`}>
                {fmtCurrency(remainingContract)}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-lg p-3 bg-muted/20 mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Hakediş Toplamı (KDV hariç)</span><span className="font-mono text-foreground">{fmtCurrency(grossTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">+ KDV (%{deductions.find(d => d.deduction_type === "kdv")?.rate || 20})</span><span className="font-mono text-foreground">{fmtCurrency(kdvAmount)}</span></div>
            <div className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground font-semibold">Brüt Toplam</span><span className="font-mono font-semibold text-foreground">{fmtCurrency(brutTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">- Stopaj (%{deductions.find(d => d.deduction_type === "stopaj")?.rate || 3})</span><span className="font-mono text-destructive">-{fmtCurrency(stopajAmount)}</span></div>
            {avansAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">- Avans Kesintisi</span><span className="font-mono text-destructive">-{fmtCurrency(avansAmount)}</span></div>}
            {customDeductions.map((cd, i) => (
              <div key={i} className="flex justify-between"><span className="text-muted-foreground">- {cd.label}</span><span className="font-mono text-destructive">-{fmtCurrency(cd.amount)}</span></div>
            ))}
            <div className="flex justify-between border-t-2 border-primary/30 pt-1"><span className="text-primary font-bold">NET ÖDENECEK TUTAR</span><span className="font-mono font-bold text-primary text-[13px]">{fmtCurrency(netTotal)}</span></div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-[12px] font-medium bg-muted text-muted-foreground">
          İptal
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !period.trim() || grossTotal <= 0}
          className="px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#FF6B2B" }}
        >
          {saving ? "Kaydediliyor..." : "✅ Hakediş Oluştur"}
        </button>
      </div>
    </div>
  );
}
