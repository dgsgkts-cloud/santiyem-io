import { useState, useMemo, useRef } from "react";
import { useEInvoices, EInvoice, computeEffectiveStatus } from "@/hooks/useEInvoices";
import InvoiceWizard from "./InvoiceWizard";
import { useProjects } from "@/hooks/useProjects";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { parseUBLInvoice } from "@/lib/ublParser";
import { getCompanyProfile } from "@/lib/companyProfile";
import { formatCurrencyFull, formatCurrencyShort, formatNumber0 } from "@/lib/formatCurrency";
import MetricTooltip from "@/components/MetricTooltip";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import EmptyState from "@/components/desktop/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, Upload, Plus, Search, Trash2, Link2, Inbox, Send,
  AlertCircle, CheckCircle2, Clock, XCircle, RotateCcw, Wallet,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  beklemede: { label: "Bekliyor", color: "#F59E0B", icon: Clock },
  onaylandi: { label: "Onaylandı", color: "#22C55E", icon: CheckCircle2 },
  reddedildi: { label: "Reddedildi", color: "#EF4444", icon: XCircle },
  iade: { label: "İade", color: "#A855F7", icon: RotateCcw },
  iptal: { label: "İptal", color: "#64748B", icon: XCircle },
  odendi: { label: "Ödendi", color: "#22C55E", icon: CheckCircle2 },
  tahsil_edildi: { label: "Tahsil Edildi", color: "#22C55E", icon: CheckCircle2 },
  gecikmis: { label: "Gecikmiş", color: "#EF4444", icon: AlertCircle },
};

const EInvoicesPage = () => {
  const { invoices, isLoading, addInvoice, updateInvoice, deleteInvoice, linkToCash } = useEInvoices();
  const { projects } = useProjects();
  const { accounts } = useCashAccounts();
  const fileRef = useRef<HTMLInputElement>(null);

  const [direction, setDirection] = useState<"all" | "gelen" | "giden">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [linkTarget, setLinkTarget] = useState<EInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [linkAccount, setLinkAccount] = useState<string>("");
  const [linkProject, setLinkProject] = useState<string>("");

  const [manual, setManual] = useState({
    direction: "gelen" as "gelen" | "giden",
    invoice_type: "e_fatura" as "e_fatura" | "e_arsiv",
    invoice_no: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    counterparty_name: "",
    counterparty_tax_no: "",
    subtotal: "",
    kdv_total: "",
    grand_total: "",
    project_id: "",
    description: "",
  });

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (direction !== "all" && i.direction !== direction) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !i.invoice_no.toLowerCase().includes(s) &&
          !i.counterparty_name.toLowerCase().includes(s) &&
          !(i.counterparty_tax_no || "").includes(s)
        ) return false;
      }
      return true;
    });
  }, [invoices, direction, statusFilter, search]);

  const stats = useMemo(() => {
    const gelen = invoices.filter((i) => i.direction === "gelen");
    const giden = invoices.filter((i) => i.direction === "giden");
    const sumGelen = gelen.reduce((s, i) => s + Number(i.grand_total), 0);
    const sumGiden = giden.reduce((s, i) => s + Number(i.grand_total), 0);
    const bekleyenGelen = gelen.filter((i) => i.status === "beklemede").length;
    const bekleyenGiden = giden.filter((i) => i.status === "beklemede").length;
    return { sumGelen, sumGiden, bekleyenGelen, bekleyenGiden };
  }, [invoices]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const company = getCompanyProfile();
    const ourTaxNo = (company as any).vkn || (company as any).taxNo || "";
    let ok = 0, fail = 0;
    for (const f of files) {
      try {
        const txt = await f.text();
        const parsed = parseUBLInvoice(txt, ourTaxNo);
        const r = await addInvoice({
          ...parsed,
          source: "ubl_upload",
          file_name: f.name,
          ubl_payload: { raw: txt.slice(0, 5000) },
        });
        if (r) ok++; else fail++;
      } catch (err: any) {
        fail++;
        toast.error(`${f.name}: ${err.message}`);
      }
    }
    if (ok) toast.success(`${ok} fatura içe aktarıldı`);
    if (fail) toast.error(`${fail} dosya işlenemedi`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleManualSave = async () => {
    if (!manual.counterparty_name || !manual.grand_total) {
      toast.error("Karşı taraf ve toplam tutar zorunludur");
      return;
    }
    const r = await addInvoice({
      direction: manual.direction,
      invoice_type: manual.invoice_type,
      invoice_no: manual.invoice_no,
      invoice_date: manual.invoice_date,
      counterparty_name: manual.counterparty_name,
      counterparty_tax_no: manual.counterparty_tax_no || undefined,
      subtotal: Number(manual.subtotal) || 0,
      kdv_total: Number(manual.kdv_total) || 0,
      grand_total: Number(manual.grand_total),
      description: manual.description,
      project_id: manual.project_id || undefined,
      source: "manuel",
    });
    if (r) {
      setShowManual(false);
      setManual({
        direction: "gelen", invoice_type: "e_fatura", invoice_no: "",
        invoice_date: new Date().toISOString().slice(0, 10),
        counterparty_name: "", counterparty_tax_no: "",
        subtotal: "", kdv_total: "", grand_total: "",
        project_id: "", description: "",
      });
    }
  };

  const handleLink = async () => {
    if (!linkTarget) return;
    const ok = await linkToCash(linkTarget, linkAccount || undefined, linkProject || undefined);
    if (ok) {
      setLinkTarget(null);
      setLinkAccount("");
      setLinkProject("");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            E-Fatura / E-Arşiv
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gelen ve giden e-faturaları içe aktar, takip et ve kasaya bağla
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xml"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> UBL XML Yükle
          </Button>
          <Button onClick={() => setShowManual(true)}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Fatura
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Inbox} label="Gelen Toplam" value={stats.sumGelen} color="#EF4444" />
        <StatCard icon={Send} label="Giden Toplam" value={stats.sumGiden} color="#22C55E" />
        <StatCard icon={AlertCircle} label="Bekleyen Gelen" value={stats.bekleyenGelen} color="#F59E0B" raw />
        <StatCard icon={AlertCircle} label="Bekleyen Giden" value={stats.bekleyenGiden} color="#F59E0B" raw />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <Tabs value={direction} onValueChange={(v) => setDirection(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="gelen"><Inbox className="w-3 h-3 mr-1" /> Gelen</TabsTrigger>
            <TabsTrigger value="giden"><Send className="w-3 h-3 mr-1" /> Giden</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="lg:w-[180px]"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(STATUS_META).map(([k, m]) => (
              <SelectItem key={k} value={k}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Fatura no, karşı taraf veya VKN ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={invoices.length === 0 ? "Henüz fatura yok" : "Filtreye uygun fatura yok"}
          description={
            invoices.length === 0
              ? "GİB portalından indirdiğiniz UBL XML dosyalarını yükleyebilir veya manuel olarak fatura ekleyebilirsiniz."
              : "Filtreleri temizleyip tekrar deneyin."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">Yön</th>
                  <th className="px-4 py-2.5 text-left">Tarih</th>
                  <th className="px-4 py-2.5 text-left">Fatura No</th>
                  <th className="px-4 py-2.5 text-left">Karşı Taraf</th>
                  <th className="px-4 py-2.5 text-right">Tutar</th>
                  <th className="px-4 py-2.5 text-left">Durum</th>
                  <th className="px-4 py-2.5 text-left">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const meta = STATUS_META[inv.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={inv.id} className="border-t border-border hover:bg-muted/20 group">
                      <td className="px-4 py-3">
                        {inv.direction === "gelen" ? (
                          <Badge variant="outline" className="text-[10px]"><Inbox className="w-3 h-3 mr-1" /> Gelen</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]"><Send className="w-3 h-3 mr-1" /> Giden</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.invoice_date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{inv.counterparty_name}</div>
                        {inv.counterparty_tax_no && (
                          <div className="text-[10px] text-muted-foreground font-mono">VKN {inv.counterparty_tax_no}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <MetricTooltip full={formatCurrencyFull(inv.grand_total)}>
                          <span>{formatCurrencyShort(inv.grand_total)}</span>
                        </MetricTooltip>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={inv.status} onValueChange={(v) => updateInvoice(inv.id, { status: v as any })}>
                          <SelectTrigger className="h-7 w-[140px] text-xs" style={{ color: meta.color }}>
                            <span className="flex items-center gap-1.5"><Icon className="w-3 h-3" />{meta.label}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_META).map(([k, m]) => (
                              <SelectItem key={k} value={k}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!inv.linked_payment_id && !inv.linked_collection_id ? (
                            <button
                              onClick={() => setLinkTarget(inv)}
                              className="p-1.5 rounded hover:bg-primary/10 text-primary"
                              title="Kasaya bağla"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-success flex items-center gap-1">
                              <Wallet className="w-3 h-3" /> Bağlı
                            </span>
                          )}
                          <button
                            onClick={() => setDeleteTarget({ id: inv.id, name: `${inv.invoice_no || "Fatura"} — ${inv.counterparty_name}` })}
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map((inv) => {
              const meta = STATUS_META[inv.status];
              return (
                <div key={inv.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {inv.direction === "gelen" ? "Gelen" : "Giden"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{inv.invoice_date}</span>
                      </div>
                      <div className="font-medium text-foreground mt-1">{inv.counterparty_name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">#{inv.invoice_no || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">{formatCurrencyShort(inv.grand_total)}</div>
                      <div className="text-[10px]" style={{ color: meta.color }}>{meta.label}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {!inv.linked_payment_id && !inv.linked_collection_id ? (
                      <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => setLinkTarget(inv)}>
                        <Link2 className="w-3 h-3 mr-1" /> Kasaya Bağla
                      </Button>
                    ) : (
                      <span className="flex-1 text-[11px] text-success flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> Kasaya bağlandı
                      </span>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ id: inv.id, name: inv.counterparty_name })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Manual add modal */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Manuel Fatura Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={manual.direction} onValueChange={(v) => setManual({ ...manual, direction: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gelen">Gelen</SelectItem>
                  <SelectItem value="giden">Giden</SelectItem>
                </SelectContent>
              </Select>
              <Select value={manual.invoice_type} onValueChange={(v) => setManual({ ...manual, invoice_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e_fatura">E-Fatura</SelectItem>
                  <SelectItem value="e_arsiv">E-Arşiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Fatura No" value={manual.invoice_no} onChange={(e) => setManual({ ...manual, invoice_no: e.target.value })} />
              <Input type="date" value={manual.invoice_date} onChange={(e) => setManual({ ...manual, invoice_date: e.target.value })} />
            </div>
            <Input placeholder="Karşı Taraf *" value={manual.counterparty_name} onChange={(e) => setManual({ ...manual, counterparty_name: e.target.value })} />
            <Input placeholder="VKN/TCKN" value={manual.counterparty_tax_no} onChange={(e) => setManual({ ...manual, counterparty_tax_no: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Matrah" value={manual.subtotal} onChange={(e) => setManual({ ...manual, subtotal: e.target.value })} />
              <Input type="number" placeholder="KDV" value={manual.kdv_total} onChange={(e) => setManual({ ...manual, kdv_total: e.target.value })} />
              <Input type="number" placeholder="Toplam *" value={manual.grand_total} onChange={(e) => setManual({ ...manual, grand_total: e.target.value })} />
            </div>
            <Select value={manual.project_id || "none"} onValueChange={(v) => setManual({ ...manual, project_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Proje (opsiyonel)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Proje yok</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Açıklama" value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowManual(false)}>Vazgeç</Button>
              <Button onClick={handleManualSave}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link to cash modal */}
      <Dialog open={!!linkTarget} onOpenChange={(o) => !o && setLinkTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkTarget?.direction === "gelen" ? "Gider olarak işle" : "Tahsilat olarak işle"}
            </DialogTitle>
          </DialogHeader>
          {linkTarget && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <div className="font-medium">{linkTarget.counterparty_name}</div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  #{linkTarget.invoice_no} · {linkTarget.invoice_date}
                </div>
                <div className="text-lg font-bold mt-1">{formatCurrencyFull(linkTarget.grand_total)}</div>
              </div>
              <Select value={linkAccount || "none"} onValueChange={(v) => setLinkAccount(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Kasa hesabı (opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Hesap seçme</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} — ₺{formatNumber0(Number(a.balance))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={linkProject || linkTarget.project_id || "none"} onValueChange={(v) => setLinkProject(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Proje (opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Proje yok</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setLinkTarget(null)}>Vazgeç</Button>
                <Button onClick={handleLink}>
                  <Link2 className="w-4 h-4 mr-1" /> Bağla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <DeleteConfirmModal
          open
          title="Faturayı Sil"
          itemName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteInvoice(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, raw }: { icon: any; label: string; value: number; color: string; raw?: boolean }) => (
  <div className="bg-card border border-border rounded-lg p-3">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <MetricTooltip full={raw ? String(value) : formatCurrencyFull(value)}>
      <div className="text-xl font-bold" style={{ color }}>
        {raw ? value : formatCurrencyShort(value)}
      </div>
    </MetricTooltip>
  </div>
);

export default EInvoicesPage;
