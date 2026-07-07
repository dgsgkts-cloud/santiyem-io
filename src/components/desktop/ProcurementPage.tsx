// Sprint 26 — Procurement & Supply Chain Center
// Frontend-only. No backend/schema changes. Uses existing projects & subcontractors
// as suppliers where possible; otherwise renders deterministic demo data so the
// module feels populated end-to-end.

import { useMemo, useState, useEffect, lazy, Suspense } from "react";
import {
  ShoppingCart, FileText, Truck, Package, Users, BarChart3, Sparkles,
  Plus, Search, Filter, ChevronRight, CheckCircle2, XCircle, Clock,
  AlertTriangle, TrendingUp, Star, Circle, Download, Eye, Award,
  Building2, Calendar, Wallet, ArrowUpRight, ArrowDownRight, Zap,
  ClipboardList, Send, Boxes, ChevronDown, X,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// -------- deterministic demo data ------------------------------------------

const CATS = ["Beton", "Demir", "Kereste", "Elektrik", "Mekanik", "Yalıtım", "Boya", "Seramik"];
const PRIORITIES = ["Yüksek", "Orta", "Düşük"] as const;
const STATUSES = ["Taslak", "Onay Bekliyor", "Onaylandı", "Sipariş Verildi", "İptal"] as const;
const DELIV_STAGES = ["Sipariş", "Hazırlanıyor", "Yolda", "Şantiyede", "Teslim Edildi"] as const;

const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
const fmtTRY = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
const daysFromNow = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
};

type Supplier = {
  id: string; name: string; category: string;
  score: number; delivery: number; quality: number; price: number;
  response: number; payment: number; orders: number; totalSpend: number;
};

type Request = {
  id: string; no: string; project: string; projectId?: string; category: string;
  requester: string; priority: (typeof PRIORITIES)[number];
  budget: number; needBy: number; status: (typeof STATUSES)[number];
  approvalStage: number; // 0..4
};

type Order = {
  id: string; no: string; supplier: string; project: string;
  amount: number; eta: number; paid: boolean; delivery: (typeof DELIV_STAGES)[number];
  category: string;
};

const useDemoData = () => {
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();

  return useMemo(() => {
    const projNames = (projects || []).map((p: any) => p.name).slice(0, 6);
    if (projNames.length === 0) projNames.push("Şantiye A", "Şantiye B", "Şantiye C");

    const supplierSeeds = (subcontractors || []).slice(0, 8).map((s: any) => s.name);
    while (supplierSeeds.length < 8) {
      supplierSeeds.push(["Betonsa", "Erdemir Çelik", "Kalekim", "Filli Boya", "Ege Seramik", "İzocam", "Legrand", "Wilo Pompa"][supplierSeeds.length]);
    }

    const suppliers: Supplier[] = supplierSeeds.map((name, i) => {
      const delivery = 70 + Math.round(seed(i + 1) * 30);
      const quality = 65 + Math.round(seed(i + 2) * 35);
      const price = 60 + Math.round(seed(i + 3) * 40);
      const response = 60 + Math.round(seed(i + 4) * 40);
      const payment = 70 + Math.round(seed(i + 5) * 30);
      const score = Math.round((delivery + quality + price + response + payment) / 5);
      return {
        id: `sup-${i}`, name, category: CATS[i % CATS.length],
        score, delivery, quality, price, response, payment,
        orders: 3 + Math.round(seed(i + 6) * 22),
        totalSpend: Math.round((200000 + seed(i + 7) * 1800000) / 1000) * 1000,
      };
    });

    const requests: Request[] = Array.from({ length: 12 }).map((_, i) => {
      const proj = projNames[i % projNames.length];
      const projMatch = (projects || []).find((p: any) => p.name === proj);
      const st = STATUSES[i % STATUSES.length];
      const stageMap: Record<string, number> = {
        "Taslak": 0, "Onay Bekliyor": 1, "Onaylandı": 3, "Sipariş Verildi": 4, "İptal": 0,
      };
      return {
        id: `req-${i}`,
        no: `PR-2026-${String(1024 + i).padStart(4, "0")}`,
        project: proj,
        projectId: projMatch?.id,
        category: CATS[i % CATS.length],
        requester: ["Ahmet Y.", "Merve K.", "Kerem D.", "Selin A."][i % 4],
        priority: PRIORITIES[i % 3],
        budget: Math.round((50000 + seed(i + 11) * 950000) / 500) * 500,
        needBy: Math.round(seed(i + 12) * 25) - 3,
        status: st,
        approvalStage: stageMap[st] ?? 0,
      };
    });

    const orders: Order[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `po-${i}`,
      no: `PO-2026-${String(2048 + i).padStart(4, "0")}`,
      supplier: suppliers[i % suppliers.length].name,
      project: projNames[i % projNames.length],
      amount: Math.round((80000 + seed(i + 21) * 1200000) / 1000) * 1000,
      eta: Math.round(seed(i + 22) * 18) - 2,
      paid: i % 3 === 0,
      delivery: DELIV_STAGES[i % DELIV_STAGES.length],
      category: CATS[i % CATS.length],
    }));

    return { suppliers, requests, orders, projNames };
  }, [projects, subcontractors]);
};

// -------- UI helpers -------------------------------------------------------

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    "Taslak": "bg-white/5 text-white/60 border-white/10",
    "Onay Bekliyor": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Onaylandı": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Sipariş Verildi": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "İptal": "bg-red-500/10 text-red-400 border-red-500/20",
    "Teslim Edildi": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Yolda": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Şantiyede": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "Hazırlanıyor": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Sipariş": "bg-white/5 text-white/60 border-white/10",
    "Gecikti": "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[status] || "bg-white/5 text-white/60 border-white/10"}`}>
      {status}
    </span>
  );
};

const PriorityDot = ({ p }: { p: string }) => {
  const color = p === "Yüksek" ? "bg-red-400" : p === "Orta" ? "bg-amber-400" : "bg-emerald-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
};

const ScoreRing = ({ score }: { score: number }) => {
  const color = score >= 85 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400";
  return <span className={`text-sm font-semibold ${color}`}>{score}</span>;
};

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

// -------- Sub-views --------------------------------------------------------

const AIInsightsCard = () => {
  const insights = [
    { icon: TrendingUp, tone: "text-amber-400", text: "Çimento fiyatı son 30 günde %8 arttı — beton alımını bu hafta öne çekin." },
    { icon: AlertTriangle, tone: "text-red-400", text: "Erdemir Çelik tedarikçisinde 2 sipariş gecikti; alternatif için Kardemir teklif verdi." },
    { icon: Award, tone: "text-emerald-400", text: "Kalekim son 5 siparişte %100 zamanında teslim — puanını 92'ye taşıdı." },
    { icon: Zap, tone: "text-[#FF6B2B]", text: "PR-2026-1028 için Cuma öncesi sipariş verilmezse bütçe %6 aşacak." },
  ];
  return (
    <div className="rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-white/[0.02] to-transparent p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">AI Satın Alma Öngörüleri</div>
            <div className="text-white/40 text-[11px]">Gerçek zamanlı analiz · şimdi güncellendi</div>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text: "Satın alma modülü için AI özeti hazırla." } }))}
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

const DashboardView = ({ data }: { data: ReturnType<typeof useDemoData> }) => {
  const totalSpend = data.orders.reduce((s, o) => s + o.amount, 0);
  const pendingApprovals = data.requests.filter(r => r.status === "Onay Bekliyor").length;
  const openReqs = data.requests.filter(r => r.status !== "İptal" && r.status !== "Sipariş Verildi").length;
  const delayed = data.orders.filter(o => o.eta < 0).length;
  const avgSup = Math.round(data.suppliers.reduce((s, x) => s + x.score, 0) / data.suppliers.length);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPI icon={ClipboardList} label="Açık Talep" value={openReqs} delta="+3" tone="up" />
        <KPI icon={Clock} label="Bekleyen Onay" value={pendingApprovals} delta="-1" tone="down" />
        <KPI icon={ShoppingCart} label="Bu Ay Sipariş" value={data.orders.length} delta="+12%" tone="up" />
        <KPI icon={Truck} label="Beklenen Teslim" value={data.orders.filter(o => o.delivery !== "Teslim Edildi").length} />
        <KPI icon={AlertTriangle} label="Geciken" value={delayed} delta="+1" tone="down" />
        <KPI icon={Star} label="Tedarikçi Puanı" value={avgSup} delta="+2" tone="up" />
        <KPI icon={Wallet} label="Bütçe Kullanımı" value="%64" delta="+8%" tone="down" />
      </div>

      <AIInsightsCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-semibold text-sm">Aylık Satın Alma Trendi</div>
              <div className="text-white/40 text-[11px]">Son 6 ay · toplam {fmtTRY(totalSpend)}</div>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +18% YoY
            </span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {[65, 82, 58, 91, 76, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6B2B]/50 to-[#FF6B2B]/10 border border-[#FF6B2B]/30 transition-all hover:from-[#FF6B2B]/70"
                     style={{ height: `${h}%` }} />
                <span className="text-[10px] text-white/40">
                  {["Şub", "Mar", "Nis", "May", "Haz", "Tem"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-white font-semibold text-sm mb-4">Kategori Dağılımı</div>
          <div className="space-y-2.5">
            {CATS.slice(0, 6).map((c, i) => {
              const pct = [28, 22, 15, 12, 10, 8][i];
              return (
                <div key={c}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/70">{c}</span>
                    <span className="text-white/40">%{pct}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-[#FF6B2B]/70 rounded-full" style={{ width: `${pct * 3}%` }} />
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

const ApprovalTimeline = ({ stage }: { stage: number }) => {
  const steps = ["Talep", "Yönetici", "Finans", "Direktör", "Onay"];
  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold ${
            i <= stage ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-white/5 text-white/30 border border-white/10"
          }`}>
            {i <= stage ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
          </div>
          <span className="text-[9px] text-white/50 hidden md:inline">{s}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i < stage ? "bg-emerald-500/40" : "bg-white/10"}`} />}
        </div>
      ))}
    </div>
  );
};

const RequestsView = ({ data, onRFQ }: { data: ReturnType<typeof useDemoData>; onRFQ: (r: Request) => void }) => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const filtered = data.requests.filter(r =>
    (status === "all" || r.status === status) &&
    (q === "" || r.no.toLowerCase().includes(q.toLowerCase()) || r.project.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Talep ara…"
                 className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B2B]/50" />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 p-0.5">
          {["all", ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatus(s)}
                    className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                      status === s ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                    }`}>
              {s === "all" ? "Tümü" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(r => (
          <div key={r.id} className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#FF6B2B]/30 hover:bg-white/[0.04] transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">{r.no}</div>
                <div className="text-white text-sm font-semibold mt-0.5 flex items-center gap-2">
                  <PriorityDot p={r.priority} /> {r.category}
                </div>
              </div>
              <StatusPill status={r.status} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/60 mb-2">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{r.project}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5">
              <div>
                <div className="text-[9px] text-white/40 uppercase">Bütçe</div>
                <div className="text-xs text-white font-medium">{fmtTRY(r.budget)}</div>
              </div>
              <div>
                <div className="text-[9px] text-white/40 uppercase">İhtiyaç</div>
                <div className={`text-xs font-medium ${r.needBy < 0 ? "text-red-400" : r.needBy < 5 ? "text-amber-400" : "text-white"}`}>
                  {r.needBy < 0 ? `${-r.needBy}g gecikme` : daysFromNow(r.needBy)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-white/40 uppercase">Talep</div>
                <div className="text-xs text-white font-medium truncate">{r.requester}</div>
              </div>
            </div>
            <ApprovalTimeline stage={r.approvalStage} />
            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex-1 px-2 py-1.5 text-[11px] rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Onayla
              </button>
              <button className="flex-1 px-2 py-1.5 text-[11px] rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" /> Reddet
              </button>
              <button onClick={() => onRFQ(r)} className="flex-1 px-2 py-1.5 text-[11px] rounded-md bg-[#FF6B2B]/15 text-[#FF6B2B] hover:bg-[#FF6B2B]/25 border border-[#FF6B2B]/30 flex items-center justify-center gap-1">
                <Send className="w-3 h-3" /> RFQ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RFQView = ({ data, activeRequest }: { data: ReturnType<typeof useDemoData>; activeRequest: Request | null }) => {
  const req = activeRequest || data.requests[1];
  const offers = data.suppliers.slice(0, 5).map((s, i) => ({
    supplier: s,
    price: Math.round(req.budget * (0.85 + seed(i + 30) * 0.35) / 500) * 500,
    delivery: 3 + Math.round(seed(i + 31) * 12),
    payment: ["Peşin", "30 gün", "60 gün", "45 gün", "Vadeli"][i],
    warranty: `${12 + i * 6} ay`,
  }));
  const best = offers.reduce((a, b) => (b.price < a.price && b.supplier.score > 75 ? b : a));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-white/40 font-mono">{req.no}</div>
          <div className="text-white font-semibold">{req.category} · {req.project}</div>
          <div className="text-[11px] text-white/50 mt-0.5">Bütçe {fmtTRY(req.budget)} · İhtiyaç {daysFromNow(req.needBy)}</div>
        </div>
        <button className="px-3 py-1.5 text-xs rounded-lg bg-[#FF6B2B]/15 text-[#FF6B2B] border border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/25 flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Tedarikçi Ekle
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/50 text-[10px] uppercase border-b border-white/10 bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 font-medium">Tedarikçi</th>
              <th className="text-right px-4 py-2.5 font-medium">Fiyat</th>
              <th className="text-center px-4 py-2.5 font-medium">Teslim</th>
              <th className="text-center px-4 py-2.5 font-medium">Ödeme</th>
              <th className="text-center px-4 py-2.5 font-medium">Garanti</th>
              <th className="text-center px-4 py-2.5 font-medium">Puan</th>
              <th className="text-right px-4 py-2.5 font-medium">Eylem</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(o => {
              const isBest = o.supplier.id === best.supplier.id;
              return (
                <tr key={o.supplier.id} className={`border-b border-white/5 last:border-0 ${isBest ? "bg-emerald-500/[0.04]" : "hover:bg-white/[0.02]"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isBest && <Award className="w-3.5 h-3.5 text-emerald-400" />}
                      <span className="text-white font-medium">{o.supplier.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isBest ? "text-emerald-400" : "text-white"}`}>{fmtTRY(o.price)}</td>
                  <td className="px-4 py-3 text-center text-white/70">{o.delivery} gün</td>
                  <td className="px-4 py-3 text-center text-white/70">{o.payment}</td>
                  <td className="px-4 py-3 text-center text-white/70">{o.warranty}</td>
                  <td className="px-4 py-3 text-center"><ScoreRing score={o.supplier.score} /></td>
                  <td className="px-4 py-3 text-right">
                    <button className={`px-2.5 py-1 text-[11px] rounded-md ${
                      isBest ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                             : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                    }`}>
                      {isBest ? "Sipariş Ver" : "Seç"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrdersView = ({ data }: { data: ReturnType<typeof useDemoData> }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    {data.orders.map(o => (
      <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[11px] font-mono text-white/40">{o.no}</div>
            <div className="text-white text-sm font-semibold mt-0.5">{o.supplier}</div>
            <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> {o.project}
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-semibold">{fmtTRY(o.amount)}</div>
            <span className={`text-[10px] ${o.paid ? "text-emerald-400" : "text-amber-400"}`}>
              {o.paid ? "Ödendi" : "Bekliyor"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-y border-white/5">
          <StatusPill status={o.delivery} />
          <span className={`text-[10px] ${o.eta < 0 ? "text-red-400" : "text-white/50"}`}>
            <Calendar className="w-3 h-3 inline mr-1" />
            ETA {o.eta < 0 ? `${-o.eta}g gecikme` : daysFromNow(o.eta)}
          </span>
        </div>
        <div className="flex gap-1 mt-3">
          <button className="flex-1 px-2 py-1.5 text-[11px] rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" /> Görüntüle
          </button>
          <button className="flex-1 px-2 py-1.5 text-[11px] rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1">
            <Download className="w-3 h-3" /> PDF
          </button>
          <button className="flex-1 px-2 py-1.5 text-[11px] rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Teslim
          </button>
        </div>
      </div>
    ))}
  </div>
);

const DeliveriesView = ({ data }: { data: ReturnType<typeof useDemoData> }) => (
  <div className="space-y-3">
    {data.orders.slice(0, 8).map(o => {
      const stageIdx = DELIV_STAGES.indexOf(o.delivery);
      const delayed = o.eta < 0 && stageIdx < 4;
      return (
        <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white font-semibold text-sm">{o.supplier} · {o.category}</div>
              <div className="text-[11px] text-white/50 font-mono">{o.no} · {o.project}</div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              delayed ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              {delayed ? "Gecikti" : `ETA ${daysFromNow(o.eta)}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {DELIV_STAGES.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                  i < stageIdx ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : i === stageIdx ? (delayed ? "bg-red-500/20 border-red-500/40 text-red-400"
                                                : "bg-[#FF6B2B]/20 border-[#FF6B2B]/40 text-[#FF6B2B] animate-pulse")
                    : "bg-white/5 border-white/10 text-white/30"
                }`}>
                  {i < stageIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-2 h-2 fill-current" />}
                </div>
                <span className={`text-[10px] ${i <= stageIdx ? "text-white/80" : "text-white/30"}`}>{s}</span>
                {i < DELIV_STAGES.length - 1 && (
                  <div className={`h-px w-full -mt-4 ${i < stageIdx ? "bg-emerald-500/40" : "bg-white/10"}`}
                       style={{ position: "relative", top: "-24px", zIndex: -1 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

const SuppliersView = ({ data }: { data: ReturnType<typeof useDemoData> }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {data.suppliers.map(s => {
      const scoreColor = s.score >= 85 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                       : s.score >= 70 ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                       : "text-red-400 bg-red-500/10 border-red-500/30";
      return (
        <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-white font-semibold">{s.name}</div>
              <div className="text-[11px] text-white/50 mt-0.5">{s.category} · {s.orders} sipariş</div>
            </div>
            <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold ${scoreColor}`}>
              {s.score}
            </div>
          </div>
          <div className="space-y-1.5 mt-3">
            {[
              ["Teslimat", s.delivery],
              ["Kalite", s.quality],
              ["Fiyat", s.price],
              ["Yanıt", s.response],
              ["Ödeme", s.payment],
            ].map(([label, v]) => (
              <div key={label as string} className="flex items-center gap-2">
                <span className="text-[10px] text-white/50 w-14">{label}</span>
                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${(v as number) >= 85 ? "bg-emerald-400" : (v as number) >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                       style={{ width: `${v}%` }} />
                </div>
                <span className="text-[10px] text-white/70 w-6 text-right">{v as number}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-white/50">Toplam Ciro</span>
            <span className="text-white font-medium">{fmtTRY(s.totalSpend)}</span>
          </div>
        </div>
      );
    })}
  </div>
);

const AnalyticsView = ({ data }: { data: ReturnType<typeof useDemoData> }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-white font-semibold text-sm mb-4">Tedarikçi Ciro Payı</div>
      <div className="space-y-2">
        {[...data.suppliers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 6).map((s, i) => {
          const max = data.suppliers.reduce((m, x) => Math.max(m, x.totalSpend), 1);
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-[11px] text-white/60 w-32 truncate">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]/30"
                     style={{ width: `${(s.totalSpend / max) * 100}%` }} />
              </div>
              <span className="text-[11px] text-white/70 w-20 text-right">{fmtTRY(s.totalSpend)}</span>
            </div>
          );
        })}
      </div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-white font-semibold text-sm mb-4">Ödeme Yaşlandırması</div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "0-30g", value: 45, color: "bg-emerald-500/40" },
          { label: "31-60g", value: 28, color: "bg-amber-500/40" },
          { label: "61-90g", value: 18, color: "bg-orange-500/40" },
          { label: "90g+", value: 9, color: "bg-red-500/40" },
        ].map(b => (
          <div key={b.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className={`w-full h-16 rounded ${b.color} mb-2`} />
            <div className="text-white font-semibold text-sm">%{b.value}</div>
            <div className="text-white/40 text-[10px]">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// -------- CEO Executive View ----------------------------------------------

const CEOView = ({ data }: { data: ReturnType<typeof useDemoData> }) => {
  const total = data.orders.reduce((s, o) => s + o.amount, 0);
  const largest = [...data.suppliers].sort((a, b) => b.totalSpend - a.totalSpend)[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#FF6B2B]/10 to-transparent p-5">
          <div className="text-white/50 text-xs mb-1">Toplam Satın Alma (Bu Ay)</div>
          <div className="text-white text-3xl font-semibold">{fmtTRY(total)}</div>
          <div className="text-emerald-400 text-[11px] mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +18% önceki aya göre
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-white/50 text-xs mb-1">En Büyük Tedarikçi</div>
          <div className="text-white text-xl font-semibold">{largest?.name}</div>
          <div className="text-white/50 text-[11px] mt-1">{fmtTRY(largest?.totalSpend || 0)} · Puan {largest?.score}</div>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
          <div className="text-white/50 text-xs mb-1">Bütçe Riski</div>
          <div className="text-red-400 text-xl font-semibold">Orta</div>
          <div className="text-white/50 text-[11px] mt-1">2 proje bütçe eşiğinde</div>
        </div>
      </div>
      <AIInsightsCard />
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="text-white font-semibold text-sm mb-3">Yaklaşan Teslimatlar</div>
        <div className="space-y-2">
          {data.orders.filter(o => o.delivery !== "Teslim Edildi").slice(0, 5).map(o => (
            <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20">
              <div>
                <div className="text-white text-sm">{o.supplier} · {o.category}</div>
                <div className="text-[11px] text-white/50">{o.project}</div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm font-medium">{fmtTRY(o.amount)}</div>
                <div className="text-[10px] text-white/50">ETA {daysFromNow(o.eta)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// -------- Quick Create FAB ------------------------------------------------

const QuickCreateFAB = () => {
  const [open, setOpen] = useState(false);
  const actions = [
    { icon: ClipboardList, label: "Yeni Talep", color: "text-[#FF6B2B]" },
    { icon: Users, label: "Yeni Tedarikçi", color: "text-blue-400" },
    { icon: ShoppingCart, label: "Yeni Sipariş", color: "text-emerald-400" },
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

type SubTab = "dashboard" | "requests" | "rfq" | "orders" | "deliveries" | "suppliers" | "analytics";

const SUB_TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Analitik Panosu", icon: BarChart3 },
  { id: "requests", label: "Talepler", icon: ClipboardList },
  { id: "rfq", label: "Teklifler (RFQ)", icon: Send },
  { id: "orders", label: "Siparişler", icon: ShoppingCart },
  { id: "deliveries", label: "Teslimatlar", icon: Truck },
  { id: "suppliers", label: "Tedarikçiler", icon: Users },
  { id: "analytics", label: "Analitik", icon: TrendingUp },
];

export default function ProcurementPage() {
  const data = useDemoData();
  const [tab, setTab] = useState<SubTab>("dashboard");
  const [ceoMode, setCeoMode] = useState(false);
  const [rfqRequest, setRfqRequest] = useState<Request | null>(null);

  const goRFQ = (r: Request) => {
    setRfqRequest(r);
    setTab("rfq");
  };

  return (
    <div className="min-h-screen bg-[#0F1419] p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-white/40 text-[11px]">
            <ShoppingCart className="w-3.5 h-3.5" /> SATIN ALMA & TEDARİK ZİNCİRİ
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Satın Alma Merkezi</h1>
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
        <Suspense fallback={null}><CEOView data={data} /></Suspense>
      ) : (
        <>
          {/* Sub-tab bar */}
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

          {tab === "dashboard" && <DashboardView data={data} />}
          {tab === "requests" && <RequestsView data={data} onRFQ={goRFQ} />}
          {tab === "rfq" && <RFQView data={data} activeRequest={rfqRequest} />}
          {tab === "orders" && <OrdersView data={data} />}
          {tab === "deliveries" && <DeliveriesView data={data} />}
          {tab === "suppliers" && <SuppliersView data={data} />}
          {tab === "analytics" && <AnalyticsView data={data} />}
        </>
      )}

      <QuickCreateFAB />
    </div>
  );
}
