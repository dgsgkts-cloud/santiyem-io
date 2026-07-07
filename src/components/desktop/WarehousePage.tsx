// Sprint 27 — Warehouse & Inventory Center
// Frontend-only. No backend/schema changes. Reuses projects/subcontractors as
// context and renders deterministic demo data for the rest so the module feels
// production-populated end-to-end.

import { useMemo, useState } from "react";
import {
  Warehouse, Package, Boxes, ArrowLeftRight, ClipboardCheck, BarChart3,
  Sparkles, Plus, Search, Truck, ArrowDownToLine, ArrowUpFromLine, RefreshCcw,
  AlertTriangle, CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown,
  Building2, MapPin, User, Calendar, Zap, ChevronRight, Eye, X, Wrench,
  ArrowUpRight, ArrowDownRight, Layers, PackageCheck, PackageX, PackageMinus,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";

// -------- deterministic demo data ------------------------------------------

const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
const fmtTRY = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
const fmtNum = (n: number) => n.toLocaleString("tr-TR");
const daysFromNow = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
};

const CATEGORIES = ["Beton", "Demir", "Kereste", "Elektrik", "Mekanik", "Yalıtım", "Boya", "Seramik"];
const UNITS = ["ton", "adet", "m³", "m²", "kg", "paket"];
const MATERIALS = [
  "C30 Hazır Beton", "Ø12 Nervürlü Demir", "Ø16 Nervürlü Demir", "OSB Panel",
  "XPS Yalıtım Levhası", "Alçıpan 12.5mm", "PVC Boru Ø110", "Kablo NYY 3x2.5",
  "Filli Su Bazlı Boya", "Ege Duvar Seramiği", "Çimento Torbası", "Tuğla 19x19",
  "Kalıp Kerestesi", "Yapı Çeliği Örgü", "İzolasyon Membranı", "Silikon Kartuş",
];
type StockState = "healthy" | "low" | "critical" | "out";
const STATE_META: Record<StockState, { label: string; color: string; dot: string }> = {
  healthy: { label: "Sağlıklı", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  low: { label: "Düşük", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  critical: { label: "Kritik", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  out: { label: "Stok Yok", color: "bg-white/5 text-white/50 border-white/10", dot: "bg-white/40" },
};

type Warehouse_ = {
  id: string; name: string; type: string; manager: string; location: string;
  capacity: number; occupied: number; items: number; value: number;
};
type Stock = {
  id: string; name: string; category: string; unit: string; warehouse: string;
  current: number; reserved: number; min: number; avgCost: number; supplier: string;
  lastPurchase: number; state: StockState;
};
type Movement = {
  id: string; kind: "in" | "out" | "transfer" | "adjust" | "consume" | "return";
  material: string; qty: number; unit: string; warehouse: string; project: string;
  actor: string; whenDays: number; reason: string;
};
type Transfer = {
  id: string; from: string; to: string; material: string; qty: number; unit: string;
  status: "requested" | "approved" | "transit" | "done";
};
type Assignment = {
  id: string; item: string; employee: string; project: string; department: string;
  assignedDays: number; returnDays: number; returned: boolean;
};
type Count = {
  id: string; material: string; expected: number; counted: number; unit: string;
  warehouse: string;
};

const useWarehouseData = () => {
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();

  return useMemo(() => {
    const projNames = ((projects || []).map((p: any) => p.name).slice(0, 6));
    while (projNames.length < 4) projNames.push(`Şantiye ${projNames.length + 1}`);

    const supplierNames = ((subcontractors || []).slice(0, 6).map((s: any) => s.name));
    while (supplierNames.length < 6) {
      supplierNames.push(["Betonsa", "Erdemir Çelik", "Kalekim", "Filli Boya", "Ege Seramik", "İzocam"][supplierNames.length]);
    }

    const warehouses: Warehouse_[] = [
      { id: "wh-1", name: "Merkez Depo", type: "Merkez", manager: "Ahmet Yılmaz", location: "İstanbul / Tuzla", capacity: 5000, occupied: 3450, items: 128, value: 4_820_000 },
      { id: "wh-2", name: "Şantiye Deposu A", type: "Şantiye", manager: "Kerem Demir", location: projNames[0], capacity: 1200, occupied: 890, items: 62, value: 1_240_000 },
      { id: "wh-3", name: "Şantiye Deposu B", type: "Şantiye", manager: "Merve Kaya", location: projNames[1], capacity: 900, occupied: 320, items: 41, value: 480_000 },
      { id: "wh-4", name: "Geçici Alan", type: "Temporary", manager: "Selin Aksoy", location: projNames[2], capacity: 500, occupied: 470, items: 24, value: 320_000 },
      { id: "wh-5", name: "Konteyner 12", type: "Container", manager: "Osman Er", location: projNames[3], capacity: 200, occupied: 90, items: 18, value: 165_000 },
    ];

    const stocks: Stock[] = MATERIALS.map((name, i) => {
      const min = 40 + Math.round(seed(i + 1) * 60);
      const current = Math.round(seed(i + 2) * 220);
      const state: StockState = current === 0 ? "out" : current < min * 0.35 ? "critical" : current < min ? "low" : "healthy";
      return {
        id: `stk-${i}`, name,
        category: CATEGORIES[i % CATEGORIES.length],
        unit: UNITS[i % UNITS.length],
        warehouse: warehouses[i % warehouses.length].name,
        current,
        reserved: Math.round(current * seed(i + 3) * 0.3),
        min,
        avgCost: Math.round((80 + seed(i + 4) * 4200) / 10) * 10,
        supplier: supplierNames[i % supplierNames.length],
        lastPurchase: -Math.round(seed(i + 5) * 40),
        state,
      };
    });

    const movements: Movement[] = Array.from({ length: 14 }).map((_, i) => {
      const kinds: Movement["kind"][] = ["in", "out", "transfer", "adjust", "consume", "return"];
      const kind = kinds[i % kinds.length];
      const mat = MATERIALS[i % MATERIALS.length];
      return {
        id: `mv-${i}`, kind, material: mat,
        qty: Math.round(seed(i + 20) * 80 + 5),
        unit: UNITS[i % UNITS.length],
        warehouse: warehouses[i % warehouses.length].name,
        project: projNames[i % projNames.length],
        actor: ["Ahmet Y.", "Merve K.", "Kerem D.", "Selin A.", "Osman E."][i % 5],
        whenDays: -i,
        reason: ["Şantiye teslim", "İade", "Fire", "Transfer", "Tüketim", "Sayım fark"][i % 6],
      };
    });

    const transfers: Transfer[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `tr-${i}`,
      from: warehouses[i % warehouses.length].name,
      to: warehouses[(i + 1) % warehouses.length].name,
      material: MATERIALS[i % MATERIALS.length],
      qty: 10 + Math.round(seed(i + 40) * 90),
      unit: UNITS[i % UNITS.length],
      status: (["requested", "approved", "transit", "done"] as const)[i % 4],
    }));

    const tools = ["Hilti Kırıcı", "Bosch Matkap", "Lazer Metre", "Makita Taşlama", "Kaynak Makinesi", "Baret + KKD Seti", "İskele Takımı", "Vibratör"];
    const assignments: Assignment[] = tools.map((t, i) => {
      const ret = 3 - i;
      return {
        id: `zm-${i}`, item: t,
        employee: ["Mehmet A.", "Hasan K.", "Ali T.", "Fatih Y.", "Barış O.", "Cem D.", "Deniz S.", "Emre G."][i],
        project: projNames[i % projNames.length],
        department: ["İnşaat", "Elektrik", "Mekanik", "Yardımcı"][i % 4],
        assignedDays: -10 - i * 2,
        returnDays: ret,
        returned: i > 5,
      };
    });

    const counts: Count[] = MATERIALS.slice(0, 8).map((m, i) => {
      const expected = 50 + Math.round(seed(i + 60) * 200);
      const diff = Math.round((seed(i + 61) - 0.5) * 20);
      return {
        id: `ct-${i}`, material: m, expected,
        counted: expected + diff,
        unit: UNITS[i % UNITS.length],
        warehouse: warehouses[i % warehouses.length].name,
      };
    });

    return { warehouses, stocks, movements, transfers, assignments, counts };
  }, [projects, subcontractors]);
};

// -------- UI helpers -------------------------------------------------------

const KPI = ({ icon: Icon, label, value, delta, tone = "neutral" }: any) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/60 text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      {delta != null && (
        <span className={`text-[10px] flex items-center gap-0.5 ${tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "text-white/40"}`}>
          {tone === "up" ? <ArrowUpRight className="w-3 h-3" /> : tone === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
          {delta}
        </span>
      )}
    </div>
    <div className="mt-2 text-2xl font-semibold text-white tracking-tight">{value}</div>
  </div>
);

const StatePill = ({ state }: { state: StockState }) => {
  const m = STATE_META[state];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${m.color}`}>{m.label}</span>;
};

const MoveBadge = ({ kind }: { kind: Movement["kind"] }) => {
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
    <span className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${color}`}>
      <Icon className="w-2.5 h-2.5" /> {label}
    </span>
  );
};

const AIInsightsCard = () => {
  const insights = [
    { icon: AlertTriangle, tone: "text-red-400", text: "C30 Hazır Beton 5 gün içinde tükenecek — bugün sipariş verin." },
    { icon: TrendingDown, tone: "text-amber-400", text: "Ø16 Nervürlü Demir stoğu talebin %40 üzerinde — yeni alım erteleyin." },
    { icon: ArrowLeftRight, tone: "text-blue-400", text: "Tuğla, Şantiye Deposu B'den A'ya transfer edilmeli (mesafe 12km)." },
    { icon: Sparkles, tone: "text-[#FF6B2B]", text: "Yalıtım malzemesi bu hafta içinde sipariş edilmezse iş 3 gün gecikir." },
    { icon: PackageX, tone: "text-white/60", text: "3 kalem 90+ gündür hiç hareket görmedi — dead stock uyarısı." },
  ];
  return (
    <div className="rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-white/[0.02] to-transparent p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">AI Depo Öngörüleri</div>
            <div className="text-white/40 text-[11px]">Talep, tüketim ve tedarik analizinden</div>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text: "Depo & envanter modülü için AI özeti hazırla." } }))}
          className="text-xs text-[#FF6B2B] hover:text-[#FF8A55] flex items-center gap-1"
        >
          Detaylı özet <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {insights.map((i, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-black/20 border border-white/5">
            <i.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i.tone}`} />
            <span className="text-white/80 text-xs leading-snug">{i.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SmartAlerts = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => {
  const critical = data.stocks.filter(s => s.state === "critical" || s.state === "out").length;
  const delayed = data.transfers.filter(t => t.status === "transit" || t.status === "approved").length;
  const overdue = data.assignments.filter(a => !a.returned && a.returnDays < 0).length;
  const alerts = [
    { icon: AlertTriangle, label: "Kritik Stok", value: critical, color: "text-red-400 border-red-500/30 bg-red-500/[0.04]" },
    { icon: Clock, label: "Süresi Yaklaşan", value: 4, color: "text-amber-400 border-amber-500/30 bg-amber-500/[0.04]" },
    { icon: ClipboardCheck, label: "Eksik Sayım", value: 2, color: "text-orange-400 border-orange-500/30 bg-orange-500/[0.04]" },
    { icon: Truck, label: "Geciken Transfer", value: delayed, color: "text-blue-400 border-blue-500/30 bg-blue-500/[0.04]" },
    { icon: PackageX, label: "Atıl Envanter", value: 3, color: "text-white/70 border-white/10 bg-white/[0.02]" },
    { icon: Wrench, label: "Geciken Zimmet", value: overdue, color: "text-red-400 border-red-500/30 bg-red-500/[0.04]" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {alerts.map(a => (
        <div key={a.label} className={`rounded-xl border p-3 ${a.color}`}>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-70">
            <a.icon className="w-3 h-3" /> {a.label}
          </div>
          <div className="text-2xl font-semibold mt-1">{a.value}</div>
        </div>
      ))}
    </div>
  );
};

// -------- Views -----------------------------------------------------------

const OverviewView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => {
  const totalValue = data.warehouses.reduce((s, w) => s + w.value, 0);
  const totalItems = data.stocks.length;
  const criticalCount = data.stocks.filter(s => s.state === "critical" || s.state === "out").length;
  const todayIn = data.movements.filter(m => m.whenDays === 0 && m.kind === "in").length + 6;
  const todayOut = data.movements.filter(m => m.whenDays === 0 && m.kind === "out").length + 4;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPI icon={Package} label="Toplam Malzeme" value={totalItems} delta="+3" tone="up" />
        <KPI icon={Layers} label="Stok Değeri" value={fmtTRY(totalValue)} delta="+6%" tone="up" />
        <KPI icon={AlertTriangle} label="Kritik Stok" value={criticalCount} delta="+2" tone="down" />
        <KPI icon={ArrowDownToLine} label="Bugün Giriş" value={todayIn} />
        <KPI icon={ArrowUpFromLine} label="Bugün Çıkış" value={todayOut} />
        <KPI icon={ArrowLeftRight} label="Transferler" value={data.transfers.length} />
        <KPI icon={Wrench} label="Bekleyen Zimmet" value={data.assignments.filter(a => !a.returned).length} />
        <KPI icon={ClipboardCheck} label="Sayım Farkı" value="₺32K" delta="-5%" tone="up" />
      </div>

      <SmartAlerts data={data} />
      <AIInsightsCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-semibold text-sm">Aylık Tüketim Trendi</div>
              <div className="text-white/40 text-[11px]">Son 6 ay · malzeme bazlı</div>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {[52, 71, 63, 88, 74, 96].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6B2B]/50 to-[#FF6B2B]/10 border border-[#FF6B2B]/30 transition-all hover:from-[#FF6B2B]/70"
                     style={{ height: `${h}%` }} />
                <span className="text-[10px] text-white/40">{["Şub", "Mar", "Nis", "May", "Haz", "Tem"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-white font-semibold text-sm mb-4">Depo Doluluk</div>
          <div className="space-y-3">
            {data.warehouses.map(w => {
              const pct = Math.round((w.occupied / w.capacity) * 100);
              const color = pct > 85 ? "bg-red-400" : pct > 65 ? "bg-amber-400" : "bg-emerald-400";
              return (
                <div key={w.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/70 truncate">{w.name}</span>
                    <span className="text-white/50">%{pct}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const StocksView = ({ data, onOpen }: { data: ReturnType<typeof useWarehouseData>; onOpen: (s: Stock) => void }) => {
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const filtered = data.stocks.filter(s =>
    (state === "all" || s.state === state) &&
    (cat === "all" || s.category === cat) &&
    (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.supplier.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-[#0F1419]/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Malzeme / tedarikçi ara…"
                   className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B2B]/50" />
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)}
                  className="px-2.5 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white/80 focus:outline-none">
            <option value="all">Tüm kategoriler</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 p-0.5">
            {[["all", "Tümü"], ["healthy", "Sağlıklı"], ["low", "Düşük"], ["critical", "Kritik"], ["out", "Yok"]].map(([v, l]) => (
              <button key={v} onClick={() => setState(v)}
                      className={`px-2.5 py-1 text-[11px] rounded-md ${state === v ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {filtered.map(s => {
          const available = s.current - s.reserved;
          const meta = STATE_META[s.state];
          return (
            <button key={s.id} onClick={() => onOpen(s)}
                    className="text-left rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#FF6B2B]/30 hover:bg-white/[0.04] transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0`}>
                  <Boxes className="w-5 h-5 text-white/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5">
                    <span>{s.category}</span> · <span className="truncate">{s.warehouse}</span>
                  </div>
                </div>
                <StatePill state={s.state} />
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5">
                <div>
                  <div className="text-[9px] text-white/40 uppercase">Mevcut</div>
                  <div className="text-sm text-white font-medium">{fmtNum(s.current)} <span className="text-[10px] text-white/40">{s.unit}</span></div>
                </div>
                <div>
                  <div className="text-[9px] text-white/40 uppercase">Rezerve</div>
                  <div className="text-sm text-white/70 font-medium">{fmtNum(s.reserved)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/40 uppercase">Kullanılabilir</div>
                  <div className={`text-sm font-medium ${available <= 0 ? "text-red-400" : "text-emerald-400"}`}>{fmtNum(available)}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full ${meta.dot}`} style={{ width: `${Math.min(100, (s.current / (s.min * 2)) * 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-white/50">
                <span>Ort. {fmtTRY(s.avgCost)}/{s.unit}</span>
                <span className="truncate ml-2">{s.supplier}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WarehousesView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    {data.warehouses.map(w => {
      const pct = Math.round((w.occupied / w.capacity) * 100);
      const color = pct > 85 ? "text-red-400" : pct > 65 ? "text-amber-400" : "text-emerald-400";
      return (
        <div key={w.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B2B]/15 border border-[#FF6B2B]/25 flex items-center justify-center">
                <Warehouse className="w-4 h-4 text-[#FF6B2B]" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{w.name}</div>
                <div className="text-[11px] text-white/50">{w.type}</div>
              </div>
            </div>
            <span className={`text-lg font-semibold ${color}`}>%{pct}</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-white/60">
            <div className="flex items-center gap-1.5"><User className="w-3 h-3" /> {w.manager}</div>
            <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {w.location}</div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/5">
            <div className={`h-full rounded-full ${pct > 85 ? "bg-red-400" : pct > 65 ? "bg-amber-400" : "bg-emerald-400"}`}
                 style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
            <div>
              <div className="text-[9px] text-white/40 uppercase">Kapasite</div>
              <div className="text-xs text-white">{fmtNum(w.capacity)}</div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 uppercase">Ürün</div>
              <div className="text-xs text-white">{w.items}</div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 uppercase">Değer</div>
              <div className="text-xs text-white">{fmtTRY(w.value)}</div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const MovementsView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-white/50 text-[10px] uppercase border-b border-white/10 bg-white/[0.02]">
          <th className="text-left px-4 py-2.5 font-medium">Tür</th>
          <th className="text-left px-4 py-2.5 font-medium">Malzeme</th>
          <th className="text-right px-4 py-2.5 font-medium">Miktar</th>
          <th className="text-left px-4 py-2.5 font-medium">Depo</th>
          <th className="text-left px-4 py-2.5 font-medium">Proje</th>
          <th className="text-left px-4 py-2.5 font-medium">İşlem</th>
          <th className="text-left px-4 py-2.5 font-medium">Kim</th>
          <th className="text-right px-4 py-2.5 font-medium">Ne Zaman</th>
        </tr>
      </thead>
      <tbody>
        {data.movements.map(m => (
          <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
            <td className="px-4 py-2.5"><MoveBadge kind={m.kind} /></td>
            <td className="px-4 py-2.5 text-white">{m.material}</td>
            <td className="px-4 py-2.5 text-right text-white font-medium">
              {m.kind === "out" || m.kind === "consume" ? "-" : "+"}{fmtNum(m.qty)} <span className="text-[10px] text-white/40">{m.unit}</span>
            </td>
            <td className="px-4 py-2.5 text-white/70">{m.warehouse}</td>
            <td className="px-4 py-2.5 text-white/70">{m.project}</td>
            <td className="px-4 py-2.5 text-white/60">{m.reason}</td>
            <td className="px-4 py-2.5 text-white/60">{m.actor}</td>
            <td className="px-4 py-2.5 text-right text-white/50">
              {m.whenDays === 0 ? "Bugün" : `${-m.whenDays}g önce`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TransfersView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => {
  const stages = [
    { id: "requested", label: "Talep" },
    { id: "approved", label: "Onaylı" },
    { id: "transit", label: "Yolda" },
    { id: "done", label: "Tamamlandı" },
  ];
  return (
    <div className="space-y-3">
      {data.transfers.map(t => {
        const stageIdx = stages.findIndex(s => s.id === t.status);
        return (
          <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-white text-sm font-semibold">{t.material}</div>
                  <div className="text-[11px] text-white/50">{fmtNum(t.qty)} {t.unit} · {t.from} → {t.to}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                {stages[stageIdx].label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {stages.map((s, i) => (
                <div key={s.id} className="flex-1 flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    i < stageIdx ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : i === stageIdx ? "bg-[#FF6B2B]/20 border-[#FF6B2B]/40 text-[#FF6B2B] animate-pulse"
                                       : "bg-white/5 border-white/10 text-white/30"
                  }`}>
                    {i < stageIdx ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[9px]">{i + 1}</span>}
                  </div>
                  {i < stages.length - 1 && <div className={`flex-1 h-px ${i < stageIdx ? "bg-emerald-500/40" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AssignmentsView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-white/50 text-[10px] uppercase border-b border-white/10 bg-white/[0.02]">
          <th className="text-left px-4 py-2.5 font-medium">Ekipman / Malzeme</th>
          <th className="text-left px-4 py-2.5 font-medium">Personel</th>
          <th className="text-left px-4 py-2.5 font-medium">Departman</th>
          <th className="text-left px-4 py-2.5 font-medium">Proje</th>
          <th className="text-right px-4 py-2.5 font-medium">Verilme</th>
          <th className="text-right px-4 py-2.5 font-medium">Beklenen İade</th>
          <th className="text-center px-4 py-2.5 font-medium">Durum</th>
        </tr>
      </thead>
      <tbody>
        {data.assignments.map(a => {
          const overdue = !a.returned && a.returnDays < 0;
          return (
            <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-white font-medium">{a.item}</td>
              <td className="px-4 py-2.5 text-white/80">{a.employee}</td>
              <td className="px-4 py-2.5 text-white/60">{a.department}</td>
              <td className="px-4 py-2.5 text-white/60">{a.project}</td>
              <td className="px-4 py-2.5 text-right text-white/50">{-a.assignedDays}g önce</td>
              <td className={`px-4 py-2.5 text-right ${overdue ? "text-red-400" : "text-white/70"}`}>
                {a.returned ? "İade edildi" : daysFromNow(a.returnDays)}
              </td>
              <td className="px-4 py-2.5 text-center">
                {a.returned ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">İade Edildi</span>
                ) : overdue ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">Gecikti</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">Zimmetli</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const CountsView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-white/50 text-[10px] uppercase border-b border-white/10 bg-white/[0.02]">
          <th className="text-left px-4 py-2.5 font-medium">Malzeme</th>
          <th className="text-left px-4 py-2.5 font-medium">Depo</th>
          <th className="text-right px-4 py-2.5 font-medium">Beklenen</th>
          <th className="text-right px-4 py-2.5 font-medium">Sayılan</th>
          <th className="text-right px-4 py-2.5 font-medium">Fark</th>
          <th className="text-right px-4 py-2.5 font-medium">Sapma %</th>
          <th className="text-right px-4 py-2.5 font-medium">Düzeltme</th>
        </tr>
      </thead>
      <tbody>
        {data.counts.map(c => {
          const diff = c.counted - c.expected;
          const variance = Math.round((diff / c.expected) * 1000) / 10;
          const negative = diff < 0;
          const big = Math.abs(variance) > 3;
          return (
            <tr key={c.id} className={`border-b border-white/5 last:border-0 ${big ? (negative ? "bg-red-500/[0.04]" : "bg-amber-500/[0.04]") : "hover:bg-white/[0.02]"}`}>
              <td className="px-4 py-2.5 text-white font-medium">{c.material}</td>
              <td className="px-4 py-2.5 text-white/60">{c.warehouse}</td>
              <td className="px-4 py-2.5 text-right text-white/70">{fmtNum(c.expected)} <span className="text-[10px] text-white/40">{c.unit}</span></td>
              <td className="px-4 py-2.5 text-right text-white">{fmtNum(c.counted)}</td>
              <td className={`px-4 py-2.5 text-right font-medium ${negative ? "text-red-400" : diff === 0 ? "text-white/60" : "text-emerald-400"}`}>
                {diff > 0 ? "+" : ""}{diff}
              </td>
              <td className={`px-4 py-2.5 text-right ${big ? (negative ? "text-red-400" : "text-amber-400") : "text-white/50"}`}>
                {variance > 0 ? "+" : ""}{variance}%
              </td>
              <td className="px-4 py-2.5 text-right">
                <button className="px-2 py-1 text-[10px] rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10">Uygula</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const AnalyticsView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-white font-semibold text-sm mb-4">Hızlı Dönen Malzemeler</div>
      <div className="space-y-2">
        {data.stocks.slice(0, 6).map((s, i) => {
          const val = 90 - i * 12;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-[11px] text-white/70 w-40 truncate">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-500/30" style={{ width: `${val}%` }} />
              </div>
              <span className="text-[11px] text-white/60 w-12 text-right">{val}%</span>
            </div>
          );
        })}
      </div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-white font-semibold text-sm mb-4">Yavaş & Ölü Stok</div>
      <div className="space-y-2">
        {data.stocks.slice(6, 12).map((s, i) => {
          const dead = i > 3;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-[11px] text-white/70 w-40 truncate">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5">
                <div className={`h-full rounded-full ${dead ? "bg-red-500/50" : "bg-amber-500/50"}`} style={{ width: `${20 + i * 8}%` }} />
              </div>
              <span className={`text-[10px] w-16 text-right ${dead ? "text-red-400" : "text-amber-400"}`}>
                {dead ? "Dead stock" : "Yavaş"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-white font-semibold text-sm mb-4">Depo Karşılaştırma</div>
      <div className="space-y-3">
        {data.warehouses.map(w => (
          <div key={w.id}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white/70">{w.name}</span>
              <span className="text-white/50">{fmtTRY(w.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]/30"
                   style={{ width: `${(w.value / 5_000_000) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-white font-semibold text-sm mb-4">Sipariş → Teslimat (Satın Alma)</div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Bekliyor", value: 6, color: "bg-amber-500/40" },
          { label: "Kısmi", value: 3, color: "bg-blue-500/40" },
          { label: "Alındı", value: 12, color: "bg-emerald-500/40" },
          { label: "Teslim", value: 9, color: "bg-cyan-500/40" },
        ].map(b => (
          <div key={b.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className={`w-full h-14 rounded ${b.color} mb-2`} />
            <div className="text-white font-semibold text-sm">{b.value}</div>
            <div className="text-white/40 text-[10px]">{b.label}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-white/40 mt-2">Satın alma modülünden görsel senkronizasyon</div>
    </div>
  </div>
);

const CEOView = ({ data }: { data: ReturnType<typeof useWarehouseData> }) => {
  const totalValue = data.warehouses.reduce((s, w) => s + w.value, 0);
  const critical = data.stocks.filter(s => s.state === "critical" || s.state === "out").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#FF6B2B]/10 to-transparent p-5">
          <div className="text-white/50 text-xs mb-1">Envanter Değeri</div>
          <div className="text-white text-3xl font-semibold">{fmtTRY(totalValue)}</div>
          <div className="text-emerald-400 text-[11px] mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +6% önceki aya göre
          </div>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
          <div className="text-white/50 text-xs mb-1">Kritik Stok Kalemleri</div>
          <div className="text-red-400 text-3xl font-semibold">{critical}</div>
          <div className="text-white/50 text-[11px] mt-1">Bu hafta içinde sipariş şart</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-white/50 text-xs mb-1">Aylık Tüketim</div>
          <div className="text-white text-3xl font-semibold">{fmtTRY(1_240_000)}</div>
          <div className="text-white/50 text-[11px] mt-1">4 aktif şantiye</div>
        </div>
      </div>
      <AIInsightsCard />
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="text-white font-semibold text-sm mb-3">Depo Sağlığı</div>
        <div className="space-y-2">
          {data.warehouses.map(w => {
            const pct = Math.round((w.occupied / w.capacity) * 100);
            const health = pct > 90 ? "Riskli" : pct > 70 ? "Yoğun" : "Sağlıklı";
            const color = pct > 90 ? "text-red-400" : pct > 70 ? "text-amber-400" : "text-emerald-400";
            return (
              <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20">
                <div>
                  <div className="text-white text-sm">{w.name}</div>
                  <div className="text-[11px] text-white/50">{w.manager} · %{pct} dolu</div>
                </div>
                <span className={`text-xs font-medium ${color}`}>{health}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// -------- Detail Drawer ---------------------------------------------------

const StockDrawer = ({ stock, onClose, data }: { stock: Stock; onClose: () => void; data: ReturnType<typeof useWarehouseData> }) => {
  const history = data.movements.filter(m => m.material === stock.name).slice(0, 5);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0F1419] border-l border-white/10 overflow-y-auto">
        <div className="sticky top-0 bg-[#0F1419]/95 backdrop-blur border-b border-white/10 p-4 flex items-center justify-between">
          <div>
            <div className="text-white font-semibold">{stock.name}</div>
            <div className="text-[11px] text-white/50">{stock.category} · {stock.warehouse}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="aspect-video rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Boxes className="w-16 h-16 text-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="text-[10px] text-white/40 uppercase">Mevcut</div>
              <div className="text-white font-semibold">{fmtNum(stock.current)} {stock.unit}</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="text-[10px] text-white/40 uppercase">Ort. Maliyet</div>
              <div className="text-white font-semibold">{fmtTRY(stock.avgCost)}</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="text-[10px] text-white/40 uppercase">Tedarikçi</div>
              <div className="text-white/80 text-xs">{stock.supplier}</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="text-[10px] text-white/40 uppercase">Son Alım</div>
              <div className="text-white/80 text-xs">{-stock.lastPurchase}g önce</div>
            </div>
          </div>

          <div>
            <div className="text-white/60 text-xs font-medium mb-2">Fiyat Geçmişi</div>
            <div className="flex items-end gap-1.5 h-16">
              {[70, 85, 78, 92, 88, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#FF6B2B]/40 border border-[#FF6B2B]/30" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div>
            <div className="text-white/60 text-xs font-medium mb-2">Son Hareketler</div>
            <div className="space-y-1.5">
              {history.length === 0 ? (
                <div className="text-[11px] text-white/40 text-center py-3">Kayıt yok</div>
              ) : history.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <MoveBadge kind={m.kind} />
                    <span className="text-[11px] text-white/70">{m.actor}</span>
                  </div>
                  <span className="text-[11px] text-white/60">{fmtNum(m.qty)} {m.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------- Quick Action FAB ------------------------------------------------

const QuickActionFAB = () => {
  const [open, setOpen] = useState(false);
  const actions = [
    { icon: ArrowDownToLine, label: "Malzeme Al", color: "text-emerald-400" },
    { icon: ArrowUpFromLine, label: "Stok Çıkışı", color: "text-red-400" },
    { icon: ArrowLeftRight, label: "Transfer", color: "text-blue-400" },
    { icon: Wrench, label: "Ekipman Zimmetle", color: "text-amber-400" },
    { icon: ClipboardCheck, label: "Sayım", color: "text-[#FF6B2B]" },
  ];
  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-2">
      {open && actions.map(a => (
        <button key={a.label}
                className="px-3 py-2 rounded-full bg-[#151A21] border border-white/10 shadow-xl flex items-center gap-2 hover:border-white/20 animate-in fade-in slide-in-from-bottom-2">
          <a.icon className={`w-4 h-4 ${a.color}`} />
          <span className="text-xs text-white">{a.label}</span>
        </button>
      ))}
      <button onClick={() => setOpen(o => !o)}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#E55A20] shadow-xl shadow-[#FF6B2B]/30 flex items-center justify-center hover:scale-105 transition-transform">
        {open ? <X className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
      </button>
    </div>
  );
};

// -------- Main Page --------------------------------------------------------

type SubTab = "overview" | "stocks" | "warehouses" | "movements" | "transfers" | "assignments" | "counts" | "analytics";

const SUB_TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: "overview", label: "Genel Bakış", icon: BarChart3 },
  { id: "stocks", label: "Stoklar", icon: Package },
  { id: "warehouses", label: "Depolar", icon: Warehouse },
  { id: "movements", label: "Malzeme Hareketleri", icon: RefreshCcw },
  { id: "transfers", label: "Transferler", icon: ArrowLeftRight },
  { id: "assignments", label: "Zimmet", icon: Wrench },
  { id: "counts", label: "Sayımlar", icon: ClipboardCheck },
  { id: "analytics", label: "Analitik", icon: TrendingUp },
];

export default function WarehousePage() {
  const data = useWarehouseData();
  const [tab, setTab] = useState<SubTab>("overview");
  const [ceoMode, setCeoMode] = useState(false);
  const [openStock, setOpenStock] = useState<Stock | null>(null);

  return (
    <div className="min-h-screen bg-[#0F1419] p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-white/40 text-[11px]">
            <Warehouse className="w-3.5 h-3.5" /> DEPO & ENVANTER
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Depo Merkezi</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex items-center gap-1.5"
          >
            <Search className="w-3 h-3" /> Ara / Komut <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/10 border border-white/10">⌘K</kbd>
          </button>
          <button
            onClick={() => setCeoMode(v => !v)}
            className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 border ${
              ceoMode ? "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            <Zap className="w-3 h-3" /> {ceoMode ? "CEO Modu Aktif" : "CEO Modu"}
          </button>
        </div>
      </div>

      {ceoMode ? (
        <CEOView data={data} />
      ) : (
        <>
          <div className="flex items-center gap-1 mb-5 border-b border-white/10 overflow-x-auto">
            {SUB_TABS.map(s => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`px-3 py-2 text-xs flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
                  tab === s.id ? "border-[#FF6B2B] text-white"
                              : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                <s.icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewView data={data} />}
          {tab === "stocks" && <StocksView data={data} onOpen={setOpenStock} />}
          {tab === "warehouses" && <WarehousesView data={data} />}
          {tab === "movements" && <MovementsView data={data} />}
          {tab === "transfers" && <TransfersView data={data} />}
          {tab === "assignments" && <AssignmentsView data={data} />}
          {tab === "counts" && <CountsView data={data} />}
          {tab === "analytics" && <AnalyticsView data={data} />}
        </>
      )}

      {openStock && <StockDrawer stock={openStock} onClose={() => setOpenStock(null)} data={data} />}

      <QuickActionFAB />
    </div>
  );
}
