// Sprint M1.5 — Shared warehouse pills, badges, and AI/alerts panels.
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, RefreshCcw, PackageMinus,
  AlertTriangle, Clock, ClipboardCheck, Truck, PackageX, Wrench,
  Sparkles, ChevronRight, TrendingDown,
} from "lucide-react";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { STATE_META, type StockState, type Movement } from "./warehouseConstants";
import type { WarehouseData } from "./useWarehouseData";

export const StatePill = ({ state }: { state: StockState }) => {
  const m = STATE_META[state];
  return <span className={`text-fs-2xs px-2 py-0.5 rounded-full border ${m.color}`}>{m.label}</span>;
};

export const MoveBadge = ({ kind }: { kind: Movement["kind"] }) => {
  const map: Record<Movement["kind"], { label: string; icon: any; color: string }> = {
    in:       { label: "Giriş", icon: ArrowDownToLine, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    out:      { label: "Çıkış", icon: ArrowUpFromLine, color: "bg-red-500/10 text-red-400 border-red-500/20" },
    transfer: { label: "Transfer", icon: ArrowLeftRight, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    adjust:   { label: "Düzeltme", icon: RefreshCcw, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    consume:  { label: "Tüketim", icon: PackageMinus, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    return:   { label: "İade", icon: RefreshCcw, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  };
  const { label, icon: Icon, color } = map[kind];
  return (
    <span className={`text-fs-2xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${color}`}>
      <Icon className="w-2.5 h-2.5" /> {label}
    </span>
  );
};

export const AIInsightsCard = () => {
  const insights = [
    { icon: AlertTriangle, tone: "text-red-400", text: "C30 Hazır Beton 5 gün içinde tükenecek — bugün sipariş verin." },
    { icon: TrendingDown, tone: "text-amber-400", text: "Ø16 Nervürlü Demir stoğu talebin %40 üzerinde — yeni alım erteleyin." },
    { icon: ArrowLeftRight, tone: "text-blue-400", text: "Tuğla, Şantiye Deposu B'den A'ya transfer edilmeli (mesafe 12km)." },
    { icon: Sparkles, tone: "text-[#FF6B2B]", text: "Yalıtım malzemesi bu hafta içinde sipariş edilmezse iş 3 gün gecikir." },
    { icon: PackageX, tone: "text-muted-foreground", text: "3 kalem 90+ gündür hiç hareket görmedi — dead stock uyarısı." },
  ];
  return (
    <div className="rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-card to-transparent p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
          </div>
          <div className="min-w-0">
            <div className="text-foreground font-semibold text-fs-sm truncate">AI Depo Öngörüleri</div>
            <div className="text-muted-foreground text-fs-xs truncate">Talep, tüketim ve tedarik analizinden</div>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text: "Depo & envanter modülü için AI özeti hazırla." } }))}
          className="text-fs-xs text-[#FF6B2B] hover:text-[#FF8A55] flex items-center gap-1 shrink-0 min-h-[44px] px-2"
        >
          Detaylı özet <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-2">
        {insights.map((i, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-background/40 border border-border/60">
            <i.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i.tone}`} />
            <span className="text-foreground/80 text-fs-xs leading-snug">{i.text}</span>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export const SmartAlerts = ({ data }: { data: WarehouseData }) => {
  const critical = data.stocks.filter(s => s.state === "critical" || s.state === "out").length;
  const delayed = data.transfers.filter(t => t.status === "transit" || t.status === "approved").length;
  const overdue = data.assignments.filter(a => !a.returned && a.returnDays < 0).length;
  const alerts = [
    { icon: AlertTriangle, label: "Kritik Stok", value: critical, color: "text-red-400 border-red-500/30 bg-red-500/[0.04]" },
    { icon: Clock, label: "Süresi Yaklaşan", value: 4, color: "text-amber-400 border-amber-500/30 bg-amber-500/[0.04]" },
    { icon: ClipboardCheck, label: "Eksik Sayım", value: 2, color: "text-orange-400 border-orange-500/30 bg-orange-500/[0.04]" },
    { icon: Truck, label: "Geciken Transfer", value: delayed, color: "text-blue-400 border-blue-500/30 bg-blue-500/[0.04]" },
    { icon: PackageX, label: "Atıl Envanter", value: 3, color: "text-muted-foreground border-border bg-card" },
    { icon: Wrench, label: "Geciken Zimmet", value: overdue, color: "text-red-400 border-red-500/30 bg-red-500/[0.04]" },
  ];
  return (
    <ResponsiveGrid variant="auto" minItemWidth={160} className="gap-2">
      {alerts.map(a => (
        <div key={a.label} className={`rounded-xl border p-3 ${a.color}`}>
          <div className="flex items-center gap-1.5 text-fs-2xs uppercase tracking-wide opacity-70">
            <a.icon className="w-3 h-3" /> {a.label}
          </div>
          <div className="text-fs-xl font-semibold mt-1 tabular-nums">{a.value}</div>
        </div>
      ))}
    </ResponsiveGrid>
  );
};
