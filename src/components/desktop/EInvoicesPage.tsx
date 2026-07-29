import { useState, useMemo, useRef } from "react";
import { useEInvoices, EInvoice, computeEffectiveStatus } from "@/hooks/useEInvoices";
import InvoiceWizard from "./InvoiceWizard";
import InvoiceDetailModal from "./InvoiceDetailModal";
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
import { FinanceStatStrip, FinanceFilterBar, FinanceListShell, FinanceRow, FinanceRowAction } from "@/components/finance/financeUi";
import { SkeletonList } from "@/components/ui/Skeletons";

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
  const [detailTarget, setDetailTarget] = useState<EInvoice | null>(null);

  const [linkAccount, setLinkAccount] = useState<string>("");
  const [linkProject, setLinkProject] = useState<string>("");


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
    <div className="px-5 pt-5 pb-6 space-y-5 mx-auto w-full max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="ds-heading text-foreground">E-Fatura / E-Arşiv</h1>
          <p className="ds-caption text-muted-foreground mt-0.5">
            Gelen ve giden faturaları içe aktar, durumunu izle ve kasaya bağla
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xml" multiple onChange={handleUpload} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">UBL XML</span>
          </Button>
          <Button onClick={() => setShowManual(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Yeni Fatura</span>
          </Button>
        </div>
      </div>

      {/* SPRINT 38E — compact money-first KPI strip */}
      <FinanceStatStrip
        stats={[
          { label: "Gelen Toplam", value: formatCurrencyShort(stats.sumGelen), hint: "Gider faturaları", icon: Inbox, tone: "attention" },
          { label: "Giden Toplam", value: formatCurrencyShort(stats.sumGiden), hint: "Gelir faturaları", icon: Send, tone: "positive" },
          { label: "Bekleyen Gelen", value: stats.bekleyenGelen, icon: AlertCircle, tone: "info" },
          { label: "Bekleyen Giden", value: stats.bekleyenGiden, icon: AlertCircle, tone: "info" },
        ]}
      />

      {/* One filter line: search + direction chips, status stays in the select */}
      <FinanceFilterBar
        query={search}
        onQuery={setSearch}
        placeholder="Fatura no, karşı taraf veya VKN ile ara…"
        chips={[
          { value: "all", label: "Tümü", count: invoices.length },
          { value: "gelen", label: "Gelen", count: invoices.filter(i => i.direction === "gelen").length },
          { value: "giden", label: "Giden", count: invoices.filter(i => i.direction === "giden").length },
        ]}
        active={direction}
        onChip={(v) => setDirection(v as any)}
        right={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-[150px] shrink-0"><SelectValue placeholder="Durum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {Object.entries(STATUS_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* List — one dense register on every breakpoint */}
      {isLoading ? (
        <SkeletonList rows={6} />
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
        <FinanceListShell>
          {filtered.map((inv) => {
            const eff = computeEffectiveStatus(inv);
            const meta = STATUS_META[eff] || STATUS_META.beklemede;
            const overdue = eff === "gecikmis";
            const linked = !!(inv.linked_payment_id || inv.linked_collection_id);
            return (
              <FinanceRow
                key={inv.id}
                onClick={() => setDetailTarget(inv)}
                rail={overdue ? "overdue" : eff === "beklemede" ? "attention" : undefined}
                title={inv.counterparty_name}
                status={<span style={{ color: meta.color }}>{meta.label}</span>}
                statusTone={overdue ? "overdue" : eff === "beklemede" ? "attention" : "positive"}
                subtitle={
                  <span className="flex items-center gap-2 flex-wrap">
                    <span>{inv.direction === "gelen" ? "Gelen" : "Giden"}</span>
                    <span>{inv.invoice_date}</span>
                    <span className="font-mono">#{inv.invoice_no || "—"}</span>
                    {inv.counterparty_tax_no && <span className="font-mono opacity-70">VKN {inv.counterparty_tax_no}</span>}
                    {linked && <span className="text-emerald-300/90 inline-flex items-center gap-1"><Wallet className="w-3 h-3" /> Kasaya bağlı</span>}
                  </span>
                }
                amount={
                  <MetricTooltip full={formatCurrencyFull(inv.grand_total)}>
                    <span>{formatCurrencyShort(inv.grand_total)}</span>
                  </MetricTooltip>
                }
                amountTone={inv.direction === "gelen" ? "attention" : "positive"}
                actions={
                  <>
                    {!linked && (
                      <FinanceRowAction label="Kasaya bağla" icon={Link2} onClick={() => setLinkTarget(inv)} tone="text-primary" />
                    )}
                    <FinanceRowAction
                      label="Sil"
                      icon={Trash2}
                      onClick={() => setDeleteTarget({ id: inv.id, name: `${inv.invoice_no || "Fatura"} — ${inv.counterparty_name}` })}
                      tone="opacity-0 group-hover:opacity-100 hover:text-destructive"
                    />
                  </>
                }
              />
            );
          })}
        </FinanceListShell>
      )}

      <InvoiceWizard open={showManual} onClose={() => setShowManual(false)} />

      <InvoiceDetailModal
        invoice={detailTarget}
        onClose={() => setDetailTarget(null)}
        onLinkToCash={(inv) => { setDetailTarget(null); setLinkTarget(inv); }}
        onDelete={(inv) => {
          setDetailTarget(null);
          setDeleteTarget({ id: inv.id, name: `${inv.invoice_no || "Fatura"} — ${inv.counterparty_name}` });
        }}
      />

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
