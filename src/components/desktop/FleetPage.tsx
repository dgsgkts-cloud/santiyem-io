// Sprint 28 — Enterprise Equipment & Fleet Management
// Frontend-only. No backend / schema / business-logic changes.
// Reuses projects + personnel context and renders deterministic demo data.

import { useMemo, useState } from "react";
import {
  Truck, Wrench, Fuel, Users, Clock, BarChart3, Sparkles, Plus, Search,
  Gauge, AlertTriangle, CheckCircle2, XCircle, Activity, TrendingUp, TrendingDown,
  Calendar, MapPin, ChevronRight, X, QrCode, FileText, Zap, Crown, Cog,
  Timer, DollarSign, Building2, Filter, ArrowUpRight, Camera, ShieldCheck,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

// ---------- deterministic helpers ----------
const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
const fmtTRY = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
const fmtNum = (n: number) => n.toLocaleString("tr-TR");

const EQUIPMENT_TYPES = [
  { key: "excavator", name: "Ekskavatör", brand: "Cat", models: ["320", "336", "349"] },
  { key: "loader", name: "Yükleyici", brand: "Volvo", models: ["L60H", "L110H", "L150H"] },
  { key: "bulldozer", name: "Buldozer", brand: "Komatsu", models: ["D65", "D85", "D155"] },
  { key: "crane", name: "Vinç", brand: "Liebherr", models: ["LTM 1050", "LTM 1090"] },
  { key: "concrete-mixer", name: "Beton Mikseri", brand: "Mercedes", models: ["Arocs 3240", "Arocs 4142"] },
  { key: "truck", name: "Damperli Kamyon", brand: "Ford", models: ["Cargo 4142", "Cargo 3548"] },
  { key: "roller", name: "Silindir", brand: "Hamm", models: ["H11i", "H13i"] },
  { key: "forklift", name: "Forklift", brand: "Linde", models: ["H30", "H50"] },
] as const;

type EqStatus = "healthy" | "maintenance-soon" | "in-maintenance" | "broken";
const STATUS_META: Record<EqStatus, { label: string; cls: string; dot: string }> = {
  healthy: { label: "Sağlıklı", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "maintenance-soon": { label: "Bakım Yaklaşıyor", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  "in-maintenance": { label: "Bakımda", cls: "bg-sky-500/10 text-sky-400 border-sky-500/20", dot: "bg-sky-400" },
  broken: { label: "Arızalı", cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

type Equipment = {
  id: string; code: string; type: string; typeKey: string; name: string;
  brand: string; model: string; serial: string; year: number;
  project: string; operator: string; engineHours: number; targetService: number;
  status: EqStatus; health: number; fuelType: "Dizel" | "Benzin";
  hourlyCost: number; purchasePrice: number; utilization: number; idleDays: number;
};

type Maintenance = {
  id: string; equipmentCode: string; equipmentName: string; kind: "scheduled" | "completed" | "overdue" | "urgent";
  title: string; mechanic: string; cost: number; hours: number; whenDays: number;
  parts: string[]; notes: string;
};

type FuelEntry = {
  id: string; equipmentCode: string; equipmentName: string; whenDays: number;
  fuelType: "Dizel" | "Benzin"; liters: number; unitPrice: number; supplier: string;
};

type OperatorAssignment = {
  id: string; operator: string; license: string; equipmentCode: string; equipmentName: string;
  project: string; assignedDays: number; hoursWorked: number; performance: number;
};

const OPERATORS = [
  { name: "Mehmet Yılmaz", license: "G Sınıfı — Ekskavatör" },
  { name: "Ahmet Kaya", license: "G Sınıfı — Yükleyici" },
  { name: "Hasan Demir", license: "F Sınıfı — Vinç" },
  { name: "Mustafa Şahin", license: "E Sınıfı — Kamyon" },
  { name: "Osman Aydın", license: "G Sınıfı — Buldozer" },
  { name: "İbrahim Çelik", license: "F Sınıfı — Forklift" },
  { name: "Ali Aksoy", license: "G Sınıfı — Silindir" },
  { name: "Emre Doğan", license: "E Sınıfı — Mikser" },
];

const MECHANICS = ["Servet Usta", "Recep Usta", "Bayram Usta", "Kadir Usta"];
const FUEL_SUPPLIERS = ["OPET Filo", "Shell Card", "BP Fleet", "Petrol Ofisi"];

// ---------- generators ----------
function makeEquipment(projects: string[]): Equipment[] {
  return EQUIPMENT_TYPES.flatMap((t, ti) =>
    t.models.map((m, mi) => {
      const idx = ti * 4 + mi;
      const r = seed(idx + 3);
      const health = 45 + Math.round(seed(idx + 11) * 55);
      const status: EqStatus =
        health < 55 ? "broken" :
        health < 70 ? "in-maintenance" :
        health < 82 ? "maintenance-soon" : "healthy";
      const engineHours = 800 + Math.round(seed(idx + 19) * 8200);
      const targetService = Math.ceil((engineHours + 40) / 250) * 250;
      return {
        id: `eq-${idx}`,
        code: `EQ-${String(1001 + idx).padStart(4, "0")}`,
        type: t.name,
        typeKey: t.key,
        name: `${t.brand} ${m}`,
        brand: t.brand,
        model: m,
        serial: `${t.brand.slice(0, 2).toUpperCase()}${String(9200 + idx * 37 % 900).padStart(4, "0")}-${2018 + (idx % 6)}`,
        year: 2018 + (idx % 6),
        project: projects[idx % Math.max(projects.length, 1)] ?? "Genel Filo",
        operator: OPERATORS[idx % OPERATORS.length].name,
        engineHours,
        targetService,
        status,
        health,
        fuelType: (t.key === "forklift" ? "Benzin" : "Dizel") as "Benzin" | "Dizel",
        hourlyCost: 180 + Math.round(r * 420),
        purchasePrice: 850_000 + Math.round(seed(idx + 41) * 6_500_000),
        utilization: Math.round(20 + seed(idx + 51) * 75),
        idleDays: Math.round(seed(idx + 71) * 12),
      };
    })
  );
}

function makeMaintenance(equipment: Equipment[]): Maintenance[] {
  const kinds: Maintenance["kind"][] = ["scheduled", "completed", "overdue", "urgent"];
  const titles = ["Yağ ve Filtre Değişimi", "Hidrolik Bakım", "Motor Revizyon", "Fren Sistemi", "Şanzıman Kontrol", "Yürüyüş Takımı"];
  return equipment.slice(0, 18).map((e, i) => {
    const kind = kinds[i % kinds.length];
    return {
      id: `mn-${i}`,
      equipmentCode: e.code,
      equipmentName: e.name,
      kind,
      title: titles[i % titles.length],
      mechanic: MECHANICS[i % MECHANICS.length],
      cost: 3_200 + Math.round(seed(i + 5) * 24_000),
      hours: 2 + Math.round(seed(i + 9) * 12),
      whenDays: (kind === "overdue" ? -3 - (i % 7) : kind === "completed" ? -(i % 20) - 2 : (i % 21) + 1),
      parts: [
        "Motor yağı 10W-40",
        "Yağ filtresi",
        i % 2 === 0 ? "Hidrolik yağı" : "Yakıt filtresi",
      ],
      notes: kind === "urgent" ? "Acil müdahale gerekli — üretim durmuş." : "Planlı bakım aralığı içinde.",
    };
  });
}

function makeFuel(equipment: Equipment[]): FuelEntry[] {
  return Array.from({ length: 32 }, (_, i) => {
    const eq = equipment[i % equipment.length];
    return {
      id: `fuel-${i}`,
      equipmentCode: eq.code,
      equipmentName: eq.name,
      whenDays: -(i % 28) - 1,
      fuelType: eq.fuelType,
      liters: 40 + Math.round(seed(i + 3) * 380),
      unitPrice: 42 + seed(i + 7) * 4,
      supplier: FUEL_SUPPLIERS[i % FUEL_SUPPLIERS.length],
    };
  });
}

function makeAssignments(equipment: Equipment[]): OperatorAssignment[] {
  return equipment.slice(0, 14).map((e, i) => ({
    id: `as-${i}`,
    operator: OPERATORS[i % OPERATORS.length].name,
    license: OPERATORS[i % OPERATORS.length].license,
    equipmentCode: e.code,
    equipmentName: e.name,
    project: e.project,
    assignedDays: 30 + Math.round(seed(i + 4) * 180),
    hoursWorked: 120 + Math.round(seed(i + 8) * 780),
    performance: 65 + Math.round(seed(i + 12) * 32),
  }));
}

// ---------- small UI atoms ----------
const KpiCard = ({ label, value, hint, icon: Icon, tone = "default", trend }: {
  label: string; value: string; hint?: string; icon: any; tone?: "default" | "warn" | "danger" | "ok" | "info"; trend?: number;
}) => {
  const toneCls =
    tone === "warn" ? "text-amber-400" :
    tone === "danger" ? "text-red-400" :
    tone === "ok" ? "text-emerald-400" :
    tone === "info" ? "text-sky-400" : "text-[#FF6B2B]";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center ${toneCls}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <div className={`text-xs flex items-center gap-1 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            %{Math.abs(trend)}
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-white tabular-nums">{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
      {hint && <div className="text-[11px] text-white/35 mt-1">{hint}</div>}
    </div>
  );
};

const HealthDot = ({ score }: { score: number }) => {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-white/70 tabular-nums w-8 text-right">{score}</span>
    </div>
  );
};

const StatusPill = ({ s }: { s: EqStatus }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border ${STATUS_META[s].cls}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
    {STATUS_META[s].label}
  </span>
);

// ---------- main ----------
type Tab = "overview" | "equipment" | "vehicles" | "maintenance" | "fuel" | "operators" | "hours" | "analytics";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Genel Bakış", icon: BarChart3 },
  { id: "equipment", label: "Ekipmanlar", icon: Cog },
  { id: "vehicles", label: "Araçlar", icon: Truck },
  { id: "maintenance", label: "Bakım", icon: Wrench },
  { id: "fuel", label: "Yakıt", icon: Fuel },
  { id: "operators", label: "Operatörler", icon: Users },
  { id: "hours", label: "Çalışma Saatleri", icon: Timer },
  { id: "analytics", label: "Analitik", icon: Activity },
];

export default function FleetPage() {
  const { projects } = useProjects();
  const projectNames = useMemo(
    () => (projects.map((p: any) => p.name).filter(Boolean) as string[]).slice(0, 6),
    [projects]
  );

  const equipment = useMemo(
    () => makeEquipment(projectNames.length ? projectNames : ["Kartal Rezidans", "İzmir Ofis Kompleksi", "Antalya Otel Projesi"]),
    [projectNames]
  );
  const maintenance = useMemo(() => makeMaintenance(equipment), [equipment]);
  const fuel = useMemo(() => makeFuel(equipment), [equipment]);
  const assignments = useMemo(() => makeAssignments(equipment), [equipment]);

  const [tab, setTab] = useState<Tab>("overview");
  const [ceoMode, setCeoMode] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EqStatus | "all">("all");
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  // aggregates
  const totals = useMemo(() => {
    const active = equipment.filter(e => e.status === "healthy" || e.status === "maintenance-soon").length;
    const inMaint = equipment.filter(e => e.status === "in-maintenance").length;
    const broken = equipment.filter(e => e.status === "broken").length;
    const monthFuelLiters = fuel.reduce((s, f) => s + f.liters, 0);
    const monthFuelCost = fuel.reduce((s, f) => s + f.liters * f.unitPrice, 0);
    const monthMaintCost = maintenance.filter(m => m.kind === "completed").reduce((s, m) => s + m.cost, 0);
    const engineHoursToday = equipment.reduce((s, e) => s + (e.utilization / 100) * 8, 0);
    const avgHealth = Math.round(equipment.reduce((s, e) => s + e.health, 0) / equipment.length);
    const fleetValue = equipment.reduce((s, e) => s + e.purchasePrice, 0);
    const idleAssets = equipment.filter(e => e.idleDays >= 5).length;
    return { active, inMaint, broken, monthFuelLiters, monthFuelCost, monthMaintCost, engineHoursToday, avgHealth, fleetValue, idleAssets };
  }, [equipment, fuel, maintenance]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(e => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (![e.name, e.code, e.type, e.operator, e.project].some(v => v.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [equipment, search, statusFilter]);

  return (
    <div className="bg-[#0B0F14] text-white/90">
      {/* header */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0B0F14]/85 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B2B]/25 to-[#FF6B2B]/5 border border-[#FF6B2B]/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#FF6B2B]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white leading-tight">Makine & Ekipman Merkezi</h1>
            <p className="text-xs text-white/50">Filo, bakım, yakıt ve operatör yönetimi — AI destekli</p>
          </div>
          <button
            onClick={() => setCeoMode(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition ${
              ceoMode
                ? "bg-[#FF6B2B]/15 border-[#FF6B2B]/40 text-[#FF6B2B]"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> CEO Modu
          </button>
        </div>

        {!ceoMode && (
          <div className="max-w-[1600px] mx-auto px-6 pb-3 flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition ${
                  tab === t.id
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-white/55 hover:text-white/85 hover:bg-white/5 border border-transparent"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {ceoMode ? (
          <CeoView totals={totals} equipment={equipment} />
        ) : (
          <>
            {/* KPI ribbon (always shown) */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              <KpiCard label="Toplam Ekipman" value={fmtNum(equipment.length)} icon={Cog} />
              <KpiCard label="Aktif" value={fmtNum(totals.active)} icon={CheckCircle2} tone="ok" trend={4} />
              <KpiCard label="Bakımda" value={fmtNum(totals.inMaint)} icon={Wrench} tone="info" />
              <KpiCard label="Arızalı" value={fmtNum(totals.broken)} icon={XCircle} tone="danger" />
              <KpiCard label="Bugünkü Kullanım" value={`${Math.round(totals.engineHoursToday)} sa`} icon={Clock} />
              <KpiCard label="Aylık Yakıt" value={`${fmtNum(totals.monthFuelLiters)} L`} icon={Fuel} tone="warn" trend={-6} />
              <KpiCard label="Bakım Maliyeti" value={fmtTRY(totals.monthMaintCost)} icon={DollarSign} tone="warn" />
              <KpiCard label="Çalışma Saati" value={`${fmtNum(Math.round(equipment.reduce((s, e) => s + e.engineHours, 0)))} sa`} icon={Timer} />
            </div>

            {tab === "overview" && (
              <OverviewTab equipment={equipment} maintenance={maintenance} totals={totals} />
            )}
            {tab === "equipment" && (
              <EquipmentTab
                items={filteredEquipment.filter(e => e.typeKey !== "truck")}
                search={search} setSearch={setSearch}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                onOpen={setSelected}
              />
            )}
            {tab === "vehicles" && (
              <EquipmentTab
                items={filteredEquipment.filter(e => e.typeKey === "truck" || e.typeKey === "concrete-mixer")}
                search={search} setSearch={setSearch}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                onOpen={setSelected}
                isVehicles
              />
            )}
            {tab === "maintenance" && <MaintenanceTab items={maintenance} />}
            {tab === "fuel" && <FuelTab entries={fuel} equipment={equipment} />}
            {tab === "operators" && <OperatorsTab items={assignments} />}
            {tab === "hours" && <WorkingHoursTab equipment={equipment} />}
            {tab === "analytics" && <AnalyticsTab equipment={equipment} fuel={fuel} maintenance={maintenance} />}
          </>
        )}
      </div>

      {selected && <EquipmentDrawer eq={selected} maintenance={maintenance} onClose={() => setSelected(null)} />}

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {[
              { label: "Yakıt Kaydı", icon: Fuel },
              { label: "Bakım Oluştur", icon: Wrench },
              { label: "Operatör Ata", icon: Users },
              { label: "Ekipman Transferi", icon: ArrowUpRight },
              { label: "Muayene Yükle", icon: Camera },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-[#111820] border border-white/10 text-xs text-white/85 hover:bg-white/10 shadow-lg"
              >
                <a.icon className="w-3.5 h-3.5 text-[#FF6B2B]" /> {a.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setFabOpen(v => !v)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8A4B] text-white shadow-xl shadow-[#FF6B2B]/25 flex items-center justify-center hover:scale-105 transition"
          aria-label="Hızlı işlem"
        >
          <Plus className={`w-5 h-5 transition ${fabOpen ? "rotate-45" : ""}`} />
        </button>
      </div>
    </div>
  );
}

// ---------- Overview ----------
function OverviewTab({ equipment, maintenance, totals }: {
  equipment: Equipment[]; maintenance: Maintenance[];
  totals: { fleetValue: number; avgHealth: number; idleAssets: number };
}) {
  const upcoming = maintenance.filter(m => m.kind === "scheduled" || m.kind === "urgent").slice(0, 6);
  const worst = [...equipment].sort((a, b) => a.health - b.health).slice(0, 5);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {/* AI insights */}
        <AIInsights equipment={equipment} />

        {/* worst health list */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Gauge className="w-4 h-4 text-[#FF6B2B]" /> Sağlık Skoru En Düşük Ekipmanlar</h3>
              <p className="text-xs text-white/50 mt-0.5">Bakım / yenileme önceliği önerilenler</p>
            </div>
          </div>
          <div className="space-y-2">
            {worst.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition">
                <div className="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/60">{e.code.slice(-4)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{e.name} <span className="text-white/40 text-xs ml-1">· {e.project}</span></div>
                  <div className="text-[11px] text-white/45">{e.type} · {fmtNum(e.engineHours)} sa</div>
                </div>
                <HealthDot score={e.health} />
                <StatusPill s={e.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* upcoming maintenance */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Wrench className="w-4 h-4 text-sky-400" /> Yaklaşan Bakımlar</h3>
          <div className="space-y-3">
            {upcoming.map(m => (
              <div key={m.id} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 mt-2 rounded-full ${m.kind === "urgent" ? "bg-red-400" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{m.title}</div>
                  <div className="text-[11px] text-white/45">{m.equipmentName} · {m.mechanic} · {fmtTRY(m.cost)}</div>
                </div>
                <div className="text-[11px] text-white/50 tabular-nums whitespace-nowrap">{m.whenDays > 0 ? `+${m.whenDays}g` : `${m.whenDays}g`}</div>
              </div>
            ))}
          </div>
        </div>

        {/* mini stats */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Filo Sağlığı</h3>
          <div>
            <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-white/60">Ortalama sağlık skoru</span><span className="text-xs text-white tabular-nums">{totals.avgHealth}</span></div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" style={{ width: `${totals.avgHealth}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <div className="text-[11px] text-white/50">Filo Değeri</div>
              <div className="text-sm font-semibold text-white mt-0.5">{fmtTRY(totals.fleetValue)}</div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <div className="text-[11px] text-white/50">Atıl Varlık</div>
              <div className="text-sm font-semibold text-amber-400 mt-0.5">{totals.idleAssets} adet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIInsights({ equipment }: { equipment: Equipment[] }) {
  const insights = useMemo(() => {
    const soon = equipment.find(e => e.status === "maintenance-soon");
    const lowUtil = [...equipment].sort((a, b) => a.utilization - b.utilization)[0];
    const idle = equipment.find(e => e.idleDays >= 5);
    return [
      soon && { icon: Wrench, tone: "amber", text: `${soon.name} (${soon.code}) yaklaşık 18 saat içinde bakım gerektirecek.` },
      { icon: Fuel, tone: "orange", text: "Bu ay yakıt tüketimi geçen aya göre %22 arttı — rotasyon ve rölanti kontrolü öneriyoruz." },
      lowUtil && { icon: Gauge, tone: "sky", text: `${lowUtil.name} kullanım oranı %${lowUtil.utilization} — başka projeye yönlendirilebilir.` },
      idle && { icon: Timer, tone: "red", text: `${idle.name} son ${idle.idleDays} gündür atıl — transfer veya kiraya verme değerlendirilmeli.` },
    ].filter(Boolean) as { icon: any; tone: string; text: string }[];
  }, [equipment]);

  return (
    <div className="rounded-xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-[#FF6B2B]/[0.04] to-transparent p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/20 border border-[#FF6B2B]/30 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Filo AI Öngörüleri</div>
          <div className="text-[11px] text-white/50">Gerçek zamanlı — bakım, yakıt ve kullanım verilerinden</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {insights.map((i, idx) => (
          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.04] border border-white/5">
            <i.icon className={`w-4 h-4 mt-0.5 ${
              i.tone === "amber" ? "text-amber-400" :
              i.tone === "red" ? "text-red-400" :
              i.tone === "sky" ? "text-sky-400" : "text-[#FF6B2B]"
            }`} />
            <div className="text-xs text-white/80 leading-relaxed">{i.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Equipment grid ----------
function EquipmentTab({ items, search, setSearch, statusFilter, setStatusFilter, onOpen, isVehicles }: {
  items: Equipment[]; search: string; setSearch: (v: string) => void;
  statusFilter: EqStatus | "all"; setStatusFilter: (v: EqStatus | "all") => void;
  onOpen: (e: Equipment) => void; isVehicles?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="sticky top-[128px] z-20 flex flex-wrap gap-2 p-3 rounded-xl border border-white/10 bg-[#0B0F14]/85 backdrop-blur">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isVehicles ? "Araç ara..." : "Ekipman ara..."}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/40 flex-1"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "healthy", "maintenance-soon", "in-maintenance", "broken"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                statusFilter === s
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-transparent text-white/55 border-white/10 hover:bg-white/5"
              }`}
            >
              {s === "all" ? "Tümü" : STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(e => (
          <button
            key={e.id}
            onClick={() => onOpen(e)}
            className="text-left rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition overflow-hidden group"
          >
            <div className="aspect-[16/8] bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-b border-white/5 flex items-center justify-center relative">
              {isVehicles ? <Truck className="w-12 h-12 text-white/20" /> : <Cog className="w-12 h-12 text-white/20" />}
              <div className="absolute top-2 right-2"><StatusPill s={e.status} /></div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 border border-white/10">
                <QrCode className="w-3 h-3 text-white/60" />
                <span className="text-[10px] text-white/70 font-mono">{e.code}</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-[#FF6B2B] transition">{e.name}</div>
                <div className="text-[11px] text-white/45 mt-0.5">{e.type} · S/N {e.serial}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/60"><Building2 className="w-3 h-3" /> {e.project}</div>
                <div className="flex items-center gap-1.5 text-white/60"><Users className="w-3 h-3" /> {e.operator.split(" ")[0]}</div>
                <div className="flex items-center gap-1.5 text-white/60"><Clock className="w-3 h-3" /> {fmtNum(e.engineHours)} sa</div>
                <div className="flex items-center gap-1.5 text-white/60"><Activity className="w-3 h-3" /> %{e.utilization} kullanım</div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[11px] text-white/50">Sağlık</span>
                <HealthDot score={e.health} />
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center text-sm text-white/50 py-12 border border-dashed border-white/10 rounded-xl">
            Filtreye uygun ekipman bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Maintenance ----------
function MaintenanceTab({ items }: { items: Maintenance[] }) {
  const groups: { key: Maintenance["kind"]; label: string; tone: string }[] = [
    { key: "urgent", label: "Acil", tone: "text-red-400 border-red-500/30 bg-red-500/10" },
    { key: "overdue", label: "Gecikmiş", tone: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    { key: "scheduled", label: "Planlanmış", tone: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
    { key: "completed", label: "Tamamlanan", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      {groups.map(g => {
        const list = items.filter(i => i.kind === g.key);
        return (
          <div key={g.key} className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${g.tone}`}>{g.label}</span>
                <span className="text-xs text-white/50">{list.length}</span>
              </div>
              <button className="text-white/40 hover:text-white/70"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              {list.map(m => (
                <div key={m.id} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 hover:bg-white/[0.06] transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-sm text-white truncate">{m.title}</div>
                    <div className="text-[10px] text-white/45 tabular-nums whitespace-nowrap ml-2">{m.whenDays > 0 ? `+${m.whenDays}g` : `${m.whenDays}g`}</div>
                  </div>
                  <div className="text-[11px] text-white/55">{m.equipmentName}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-white/50">
                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> {m.mechanic}</span>
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {m.hours}s</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {fmtTRY(m.cost)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.parts.slice(0, 3).map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="text-center text-xs text-white/40 py-8">Kayıt yok</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Fuel ----------
function FuelTab({ entries, equipment }: { entries: FuelEntry[]; equipment: Equipment[] }) {
  const byEquipment = useMemo(() => {
    const map = new Map<string, { liters: number; cost: number; name: string }>();
    entries.forEach(f => {
      const prev = map.get(f.equipmentCode) ?? { liters: 0, cost: 0, name: f.equipmentName };
      prev.liters += f.liters;
      prev.cost += f.liters * f.unitPrice;
      map.set(f.equipmentCode, prev);
    });
    return [...map.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 6);
  }, [entries]);

  const maxLiters = Math.max(...byEquipment.map(([_, v]) => v.liters), 1);
  const monthly = Array.from({ length: 6 }, (_, i) => ({
    label: ["Şub", "Mar", "Nis", "May", "Haz", "Tem"][i],
    liters: 3200 + Math.round(seed(i + 3) * 2400),
  }));
  const maxMonth = Math.max(...monthly.map(m => m.liters));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Aylık Yakıt (Litre)</h3>
          <div className="flex items-end gap-3 h-40">
            {monthly.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-white/5 rounded-t-md relative flex items-end" style={{ height: "100%" }}>
                  <div
                    className="w-full bg-gradient-to-t from-[#FF6B2B] to-[#FF8A4B] rounded-t-md"
                    style={{ height: `${(m.liters / maxMonth) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-white/50">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Ekipman Bazında Tüketim</h3>
          <div className="space-y-2.5">
            {byEquipment.map(([code, v]) => (
              <div key={code} className="grid grid-cols-[110px_1fr_90px_90px] items-center gap-3">
                <div className="text-xs text-white/70 truncate">{v.name}</div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]" style={{ width: `${(v.liters / maxLiters) * 100}%` }} />
                </div>
                <div className="text-[11px] text-white/60 tabular-nums text-right">{fmtNum(Math.round(v.liters))} L</div>
                <div className="text-[11px] text-white/50 tabular-nums text-right">{fmtTRY(v.cost)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Son Yakıt Kayıtları</h3>
          <button className="text-xs text-[#FF6B2B] hover:underline">Yeni Kayıt</button>
        </div>
        <div>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0B0F14]/95 backdrop-blur">
              <tr className="text-[11px] text-white/50 uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Tarih</th>
                <th className="text-left px-4 py-2 font-medium">Ekipman</th>
                <th className="text-left px-4 py-2 font-medium">Yakıt</th>
                <th className="text-right px-4 py-2 font-medium">Litre</th>
                <th className="text-right px-4 py-2 font-medium">Birim ₺</th>
                <th className="text-right px-4 py-2 font-medium">Tutar</th>
                <th className="text-left px-4 py-2 font-medium">Tedarikçi</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {entries.slice(0, 20).map(f => (
                <tr key={f.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-2 text-xs text-white/60">{f.whenDays}g</td>
                  <td className="px-4 py-2">{f.equipmentName}</td>
                  <td className="px-4 py-2 text-xs">{f.fuelType}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{f.liters}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-white/60">₺{f.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtTRY(f.liters * f.unitPrice)}</td>
                  <td className="px-4 py-2 text-xs text-white/60">{f.supplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* consume 'equipment' to satisfy lint */}
      <div className="hidden">{equipment.length}</div>
    </div>
  );
}

// ---------- Operators ----------
function OperatorsTab({ items }: { items: OperatorAssignment[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Operatör Atamaları</h3>
        <button className="text-xs text-[#FF6B2B] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Yeni Atama</button>
      </div>
      <div>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0B0F14]/95 backdrop-blur">
            <tr className="text-[11px] text-white/50 uppercase tracking-wider">
              <th className="text-left px-4 py-2 font-medium">Operatör</th>
              <th className="text-left px-4 py-2 font-medium">Ehliyet</th>
              <th className="text-left px-4 py-2 font-medium">Ekipman</th>
              <th className="text-left px-4 py-2 font-medium">Proje</th>
              <th className="text-right px-4 py-2 font-medium">Atama</th>
              <th className="text-right px-4 py-2 font-medium">Çalışma Saati</th>
              <th className="text-left px-4 py-2 font-medium w-[180px]">Performans</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {items.map(a => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/70">
                      {a.operator.split(" ").map(p => p[0]).join("").slice(0, 2)}
                    </div>
                    {a.operator}
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-white/60">{a.license}</td>
                <td className="px-4 py-2">{a.equipmentName} <span className="text-[10px] text-white/45 ml-1">{a.equipmentCode}</span></td>
                <td className="px-4 py-2 text-xs text-white/60">{a.project}</td>
                <td className="px-4 py-2 text-xs text-white/60 text-right">{a.assignedDays}g önce</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtNum(a.hoursWorked)} sa</td>
                <td className="px-4 py-2">
                  <HealthDot score={a.performance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Working Hours ----------
function WorkingHoursTab({ equipment }: { equipment: Equipment[] }) {
  const top = [...equipment].sort((a, b) => b.utilization - a.utilization).slice(0, 10);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Ekipman Kullanım Oranı (Aylık)</h3>
        <div className="space-y-2.5">
          {top.map(e => (
            <div key={e.id} className="grid grid-cols-[1fr_60px] items-center gap-3">
              <div>
                <div className="text-xs text-white/80 truncate">{e.name}</div>
                <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden">
                  <div
                    className={`h-full ${e.utilization >= 70 ? "bg-emerald-500" : e.utilization >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${e.utilization}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-white/70 tabular-nums text-right">%{e.utilization}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Rölanti / Boşta Kalma Analizi</h3>
        <div className="space-y-3">
          {equipment.slice(0, 8).map(e => {
            const idlePct = Math.min(100, e.idleDays * 8);
            return (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{e.name}</div>
                  <div className="text-[11px] text-white/45">{e.project}</div>
                </div>
                <div className="text-xs text-white/60 tabular-nums">{e.idleDays}g boşta</div>
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${idlePct > 50 ? "bg-red-500" : idlePct > 20 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${idlePct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Analytics ----------
function AnalyticsTab({ equipment, fuel, maintenance }: { equipment: Equipment[]; fuel: FuelEntry[]; maintenance: Maintenance[] }) {
  const downtime = equipment.filter(e => e.status === "in-maintenance" || e.status === "broken");
  const totalFuelCost = fuel.reduce((s, f) => s + f.liters * f.unitPrice, 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);
  const lifetime = equipment.slice(0, 6).map(e => ({
    name: e.name,
    total: e.purchasePrice + totalMaintCost / equipment.length + (e.engineHours * 12),
  }));
  const maxLifetime = Math.max(...lifetime.map(l => l.total));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <KpiCard label="Toplam Yakıt Maliyeti" value={fmtTRY(totalFuelCost)} icon={Fuel} tone="warn" hint="Son 30 gün" trend={12} />
      <KpiCard label="Toplam Bakım Maliyeti" value={fmtTRY(totalMaintCost)} icon={Wrench} tone="info" hint="Son 30 gün" trend={-4} />
      <KpiCard label="Downtime" value={`${downtime.length} ekipman`} icon={AlertTriangle} tone="danger" hint="Bakım + arıza" />

      <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Lifetime Maliyet — İlk 6 Ekipman</h3>
        <div className="space-y-2.5">
          {lifetime.map(l => (
            <div key={l.name} className="grid grid-cols-[160px_1fr_100px] items-center gap-3">
              <div className="text-xs text-white/70 truncate">{l.name}</div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500/70 to-sky-400" style={{ width: `${(l.total / maxLifetime) * 100}%` }} />
              </div>
              <div className="text-[11px] text-white/60 tabular-nums text-right">{fmtTRY(l.total)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Operatör Performans Dağılımı</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-semibold text-emerald-400">72%</div>
            <div className="text-[10px] text-white/60 mt-1">Yüksek</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-lg font-semibold text-amber-400">21%</div>
            <div className="text-[10px] text-white/60 mt-1">Orta</div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-lg font-semibold text-red-400">7%</div>
            <div className="text-[10px] text-white/60 mt-1">Düşük</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- CEO View ----------
function CeoView({ totals, equipment }: {
  totals: { fleetValue: number; avgHealth: number; broken: number; inMaint: number; monthFuelCost: number; idleAssets: number };
  equipment: Equipment[];
}) {
  const risk = totals.broken * 3 + totals.inMaint;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard label="Filo Değeri" value={fmtTRY(totals.fleetValue)} icon={DollarSign} tone="ok" />
        <KpiCard label="Filo Sağlığı" value={`${totals.avgHealth}/100`} icon={Gauge} tone={totals.avgHealth >= 75 ? "ok" : totals.avgHealth >= 60 ? "warn" : "danger"} />
        <KpiCard label="Bakım Riski" value={`${risk} puan`} icon={ShieldCheck} tone={risk > 15 ? "danger" : "warn"} />
        <KpiCard label="Atıl Varlıklar" value={`${totals.idleAssets} adet`} icon={Timer} tone="warn" />
        <KpiCard label="Aylık Yakıt Maliyeti" value={fmtTRY(totals.monthFuelCost)} icon={Fuel} tone="warn" trend={12} />
      </div>

      <div className="rounded-xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-transparent to-transparent p-6">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-[#FF6B2B]" />
          <h3 className="text-sm font-semibold text-white">CEO Yönetici Özeti — Filo</h3>
        </div>
        <div className="text-sm text-white/80 space-y-2 leading-relaxed">
          <p>
            Toplam <b className="text-white">{equipment.length}</b> ekipmanlık filonun tahmini değeri <b className="text-white">{fmtTRY(totals.fleetValue)}</b>.
            Ortalama sağlık skoru <b className="text-white">{totals.avgHealth}/100</b>, {totals.avgHealth >= 75 ? "sağlıklı seviyede." : "iyileştirme gerektiriyor."}
          </p>
          <p>
            Bu ay <b className="text-red-400">{totals.broken}</b> ekipman arızalı ve <b className="text-sky-400">{totals.inMaint}</b> ekipman bakımda.
            <b className="text-amber-400"> {totals.idleAssets}</b> adet atıl varlık için transfer / dış kiralama önerilir.
          </p>
          <p>
            Yakıt maliyeti aylık <b className="text-white">{fmtTRY(totals.monthFuelCost)}</b>; rotasyon ve rölanti kontrolü ile ~%15 tasarruf mümkün.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Drawer ----------
function EquipmentDrawer({ eq, maintenance, onClose }: { eq: Equipment; maintenance: Maintenance[]; onClose: () => void }) {
  const history = maintenance.filter(m => m.equipmentCode === eq.code);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] h-full bg-[#0B0F14] border-l border-white/10 overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#0B0F14]/95 backdrop-blur border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Cog className="w-5 h-5 text-[#FF6B2B]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{eq.name}</div>
              <div className="text-[11px] text-white/50">{eq.code} · {eq.type}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-6">
          <div className="aspect-[16/8] rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex items-center justify-center relative">
            <Cog className="w-16 h-16 text-white/20" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 border border-white/10">
              <QrCode className="w-3 h-3 text-white/70" />
              <span className="text-[10px] text-white/80 font-mono">{eq.code}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { l: "Marka / Model", v: `${eq.brand} ${eq.model}` },
              { l: "Seri No", v: eq.serial },
              { l: "Yıl", v: String(eq.year) },
              { l: "Proje", v: eq.project },
              { l: "Operatör", v: eq.operator },
              { l: "Motor Saati", v: `${fmtNum(eq.engineHours)} / ${fmtNum(eq.targetService)} sa` },
              { l: "Yakıt Türü", v: eq.fuelType },
              { l: "Saatlik Maliyet", v: fmtTRY(eq.hourlyCost) },
            ].map(r => (
              <div key={r.l} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/45">{r.l}</div>
                <div className="text-xs text-white/85 mt-1">{r.v}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/70">Sağlık Skoru</span>
              <StatusPill s={eq.status} />
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full ${eq.health >= 80 ? "bg-emerald-500" : eq.health >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${eq.health}%` }} />
            </div>
            <div className="mt-2 text-[11px] text-white/50">Bakım · arıza · yakıt · kullanım · yaş faktörlerinden hesaplanır.</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white"><Wrench className="w-4 h-4 text-sky-400" /> Bakım Geçmişi</div>
            <div className="space-y-2">
              {history.length === 0 && <div className="text-xs text-white/45">Bu ekipman için bakım kaydı yok.</div>}
              {history.map(h => (
                <div key={h.id} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white">{h.title}</div>
                    <div className="text-[10px] text-white/50">{h.whenDays > 0 ? `+${h.whenDays}g` : `${h.whenDays}g`}</div>
                  </div>
                  <div className="text-[11px] text-white/55 mt-0.5">{h.mechanic} · {fmtTRY(h.cost)} · {h.hours}s</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white"><FileText className="w-4 h-4 text-emerald-400" /> Belgeler</div>
            <div className="grid grid-cols-2 gap-2">
              {["Kullanım Kılavuzu", "Garanti Belgesi", "Fatura", "Sertifika", "Muayene Raporu", "Sigorta"].map(d => (
                <div key={d} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white/70">
                  <FileText className="w-3.5 h-3.5 text-white/50" /> {d}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-[#FF6B2B] text-white text-sm hover:bg-[#FF8A4B] transition flex items-center justify-center gap-2">
              <Wrench className="w-3.5 h-3.5" /> Bakım Oluştur
            </button>
            <button className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10 transition flex items-center justify-center gap-2">
              <ArrowUpRight className="w-3.5 h-3.5" /> Transfer Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
